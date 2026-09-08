import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { issueVerificationCode } from "@/lib/auth/pending";
import {
  PENDING_COOKIE,
  pendingCookieOptions,
  signPending,
} from "@/lib/auth/cookies";
import {
  fieldErrorsFrom,
  readJson,
  tooManyRequests,
  unprocessable,
} from "@/lib/auth/http";
import { rateLimitResendPin } from "@/lib/rate-limit/limiter";
import { resendCodeSchema } from "@/lib/validation/auth";
import { VERIFY_EMAIL_PATH } from "@/lib/auth/constants";

const GENERIC_MESSAGE =
  "If an account exists, a verification code has been sent.";

export async function POST(request: Request) {
  const body = await readJson(request);
  const parsed = resendCodeSchema.safeParse(body);
  if (!parsed.success) {
    return unprocessable(fieldErrorsFrom(parsed.error));
  }
  const { email } = parsed.data;

  const limited = rateLimitResendPin(email);
  if (!limited.allowed) {
    return tooManyRequests(limited.retryAfterSeconds);
  }

  const user = await prisma.user.findUnique({
    where: { email },
    select: { id: true, email: true, isVerified: true },
  });

  if (user && !user.isVerified) {
    await issueVerificationCode(user.id, user.email);
    const response = NextResponse.json(
      { message: "Verification code sent.", redirect: VERIFY_EMAIL_PATH },
      { status: 200 },
    );
    response.cookies.set(
      PENDING_COOKIE,
      signPending(user.id),
      pendingCookieOptions(),
    );
    return response;
  }

  return NextResponse.json(
    { message: GENERIC_MESSAGE, redirect: VERIFY_EMAIL_PATH },
    { status: 200 },
  );
}
