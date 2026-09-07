import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { hashPassword } from "@/lib/auth/hash";
import { SIGN_IN_PATH } from "@/lib/auth/constants";
import { SESSION_COOKIE } from "@/lib/auth/cookies";
import { hashValue } from "@/lib/auth/tokens";
import {
  fieldErrorsFrom,
  readJson,
  tooManyRequests,
  unprocessable,
  badRequest,
} from "@/lib/auth/http";
import { consume, getClientIp } from "@/lib/rate-limit/limiter";
import { resetPasswordSchema } from "@/lib/validation/auth";

const RESET_LIMIT = { limit: 5, windowMs: 15 * 60 * 1000 };

export async function POST(request: Request) {
  const body = await readJson(request);
  const parsed = resetPasswordSchema.safeParse(body);
  if (!parsed.success) {
    return unprocessable(fieldErrorsFrom(parsed.error));
  }
  const { token, password } = parsed.data;

  const ip = getClientIp(request.headers);
  const limited = consume(`reset:${ip}`, RESET_LIMIT.limit, RESET_LIMIT.windowMs);
  if (!limited.allowed) {
    return tooManyRequests(limited.retryAfterSeconds);
  }

  const tokenHash = hashValue(token);
  const record = await prisma.passwordResetToken.findFirst({
    where: { tokenHash, isUsed: false },
    select: { id: true, userId: true, expiresAt: true },
  });
  if (!record || record.expiresAt.getTime() <= Date.now()) {
    return badRequest("Invalid or expired reset token.");
  }

  const passwordHash = await hashPassword(password);

  await prisma.$transaction(async (tx) => {
    await tx.user.update({
      where: { id: record.userId },
      data: { passwordHash },
    });
    await tx.passwordResetToken.update({
      where: { id: record.id },
      data: { isUsed: true },
    });
    await tx.session.deleteMany({ where: { userId: record.userId } });
  });

  const response = NextResponse.json(
    { message: "Password reset successfully.", redirect: SIGN_IN_PATH },
    { status: 200 },
  );
  // A reset invalidates any existing sessions server-side; clear the cookie too.
  response.cookies.set(SESSION_COOKIE, "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });
  return response;
}
