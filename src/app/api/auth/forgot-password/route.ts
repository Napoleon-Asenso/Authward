import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { RESET_TTL_SECONDS, generateResetToken, hashValue } from "@/lib/auth/tokens";
import {
  fieldErrorsFrom,
  readJson,
  tooManyRequests,
  unprocessable,
} from "@/lib/auth/http";
import { getClientIp, rateLimitForgotPassword } from "@/lib/rate-limit/limiter";
import { forgotPasswordSchema } from "@/lib/validation/auth";
import { FORGOT_PASSWORD_PATH } from "@/lib/auth/constants";

const GENERIC_MESSAGE =
  "If an account exists, a reset link has been sent.";

export async function POST(request: Request) {
  const body = await readJson(request);
  const parsed = forgotPasswordSchema.safeParse(body);
  if (!parsed.success) {
    return unprocessable(fieldErrorsFrom(parsed.error));
  }
  const { email } = parsed.data;

  const ip = getClientIp(request.headers);
  const limited = rateLimitForgotPassword(email);
  if (!limited.allowed) {
    return tooManyRequests(limited.retryAfterSeconds);
  }

  const user = await prisma.user.findUnique({
    where: { email },
    select: { id: true, isVerified: true },
  });

  if (user?.isVerified) {
    const resetToken = generateResetToken();
    const expiresAt = new Date(Date.now() + RESET_TTL_SECONDS * 1000);
    await prisma.$transaction([
      prisma.passwordResetToken.updateMany({
        where: { userId: user.id, isUsed: false },
        data: { isUsed: true },
      }),
      prisma.passwordResetToken.create({
        data: {
          userId: user.id,
          tokenHash: hashValue(resetToken),
          expiresAt,
        },
      }),
    ]);

    if (process.env.NODE_ENV !== "production") {
      return NextResponse.json(
        { message: GENERIC_MESSAGE, redirect: FORGOT_PASSWORD_PATH, resetToken },
        { status: 200 },
      );
    }
  }

  return NextResponse.json(
    { message: GENERIC_MESSAGE, redirect: FORGOT_PASSWORD_PATH },
    { status: 200 },
  );
}
