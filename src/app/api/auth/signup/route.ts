import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { hashPassword } from "@/lib/auth/hash";
import { issueVerificationCode } from "@/lib/auth/pending";
import {
  PENDING_COOKIE,
  pendingCookieOptions,
  signPending,
} from "@/lib/auth/cookies";
import { requireCsrf } from "@/lib/auth/csrf";
import {
  fieldErrorsFrom,
  readJson,
  tooManyRequests,
  unprocessable,
} from "@/lib/auth/http";
import { getClientIp, rateLimitSignup } from "@/lib/rate-limit/limiter";
import { signupSchema, normalizeFullName } from "@/lib/validation/auth";
import { VERIFY_EMAIL_PATH } from "@/lib/auth/constants";

export async function POST(request: NextRequest) {
  const csrf = requireCsrf(request);
  if (csrf) return csrf;

  const body = await readJson(request);
  const parsed = signupSchema.safeParse(body);
  if (!parsed.success) {
    return unprocessable(fieldErrorsFrom(parsed.error));
  }

  const ip = getClientIp(request.headers);
  const limited = rateLimitSignup(ip);
  if (!limited.allowed) {
    return tooManyRequests(limited.retryAfterSeconds);
  }

  const { name, email } = parsed.data;
  const existing = await prisma.user.findUnique({
    where: { email },
    select: { id: true, isVerified: true },
  });

  if (existing?.isVerified) {
    // Vague on purpose: never confirm whether an account exists for the given
    // email (account enumeration resistance). Rate limiting bounds abuse.
    return NextResponse.json(
      { error: "Unable to create an account with those details." },
      { status: 409 },
    );
  }

  let userId = existing?.id;
  const created = !existing;

  if (!existing) {
    const passwordHash = await hashPassword(parsed.data.password);
    const user = await prisma.user.create({
      data: {
        email,
        name: normalizeFullName(parsed.data.name),
        passwordHash,
      },
    });
    userId = user.id;
  }

  await issueVerificationCode(userId!, email);

  const response = NextResponse.json(
    {
      message: created
        ? "Account created. Check your email for a verification code."
        : "A fresh verification code has been sent to your email.",
      redirect: VERIFY_EMAIL_PATH,
    },
    { status: created ? 201 : 200 },
  );
  response.cookies.set(
    PENDING_COOKIE,
    signPending(userId!),
    pendingCookieOptions(),
  );
  return response;
}
