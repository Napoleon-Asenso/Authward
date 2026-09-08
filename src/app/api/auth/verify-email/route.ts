import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { consumeVerificationCode } from "@/lib/auth/pending";
import {
  PENDING_COOKIE,
  expiredCookieOptions,
  verifySigned,
} from "@/lib/auth/cookies";
import { requireCsrf } from "@/lib/auth/csrf";
import {
  fieldErrorsFrom,
  readJson,
  unprocessable,
} from "@/lib/auth/http";
import { verifyEmailSchema } from "@/lib/validation/auth";
import { badRequest } from "@/lib/auth/http";
import { unauthorized } from "@/lib/auth/http";
import { rateLimitVerifyEmail } from "@/lib/rate-limit/limiter";
import { tooManyRequests } from "@/lib/auth/http";
import { SIGN_IN_PATH } from "@/lib/auth/constants";

export async function POST(request: NextRequest) {
  const csrf = requireCsrf(request);
  if (csrf) return csrf;

  const body = await readJson(request);
  const parsed = verifyEmailSchema.safeParse(body);
  if (!parsed.success) {
    return unprocessable(fieldErrorsFrom(parsed.error));
  }

  const signed = request.cookies.get(PENDING_COOKIE)?.value;
  const userId = signed ? verifySigned(signed) : null;
  if (!userId) {
    return unauthorized("No pending verification session found.");
  }

  // Every failed attempt has a cost.
  const verified = await rateLimitVerifyEmail(userId);
  if (!verified.allowed) {
    return tooManyRequests(verified.retryAfterSeconds);
  }

  const user = await prisma.user.findFirst({
    where: { id: userId },
    select: { id: true, isVerified: true },
  });
  if (!user || user.isVerified) {
    return unauthorized("No pending verification session found.");
  }

  const consumed = await consumeVerificationCode(parsed.data.code, userId);
  if (!consumed) {
    return badRequest("Invalid or expired verification code.");
  }

  await prisma.user.update({
    where: { id: userId },
    data: { isVerified: true },
  });

  const response = NextResponse.json(
    { message: "Email verified.", redirect: SIGN_IN_PATH },
    { status: 200 },
  );
  response.cookies.set(PENDING_COOKIE, "", expiredCookieOptions());
  return response;
}
