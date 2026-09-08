import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { verifyPasswordConstantTime } from "@/lib/auth/hash";
import { issueVerificationCode } from "@/lib/auth/pending";
import { createSession } from "@/lib/auth/sessions";
import { generateSessionToken } from "@/lib/auth/tokens";
import {
  PENDING_COOKIE,
  SESSION_COOKIE,
  pendingCookieOptions,
  sessionCookieOptions,
  signPending,
} from "@/lib/auth/cookies";
import { requireCsrf, rotateCsrf } from "@/lib/auth/csrf";
import {
  fieldErrorsFrom,
  readJson,
  tooManyRequests,
  unprocessable,
  unauthorized,
} from "@/lib/auth/http";
import { getClientIp, rateLimitSignin } from "@/lib/rate-limit/limiter";
import { signinSchema } from "@/lib/validation/auth";
import {
  DASHBOARD_PATH,
  VERIFY_EMAIL_PATH,
} from "@/lib/auth/constants";

export async function POST(request: NextRequest) {
  const csrf = requireCsrf(request);
  if (csrf) return csrf;

  const body = await readJson(request);
  const parsed = signinSchema.safeParse(body);
  if (!parsed.success) {
    return unprocessable(fieldErrorsFrom(parsed.error));
  }
  const { email, password } = parsed.data;

  const ip = getClientIp(request.headers);
  const limited = rateLimitSignin(ip, email);
  if (!limited.allowed) {
    return tooManyRequests(limited.retryAfterSeconds);
  }

  const user = await prisma.user.findUnique({
    where: { email },
    select: { id: true, email: true, name: true, passwordHash: true, isVerified: true },
  });

  const valid = await verifyPasswordConstantTime(
    password,
    user?.passwordHash ?? null,
  );
  if (!valid) {
    return unauthorized("Invalid credentials.");
  }

  if (!user!.isVerified) {
    await issueVerificationCode(user!.id, user!.email);
    const response = NextResponse.json(
      { message: "Please verify your email before signing in.", redirect: VERIFY_EMAIL_PATH },
      { status: 200 },
    );
    response.cookies.set(
      PENDING_COOKIE,
      signPending(user!.id),
      pendingCookieOptions(),
    );
    // Credential proof succeeded; rotate the pre-login CSRF attachment so the
    // token observed before login cannot be reused against this identity.
    rotateCsrf(response);
    return response;
  }

  const sessionToken = generateSessionToken();
  await createSession(user!.id, sessionToken);

  const response = NextResponse.json(
    { message: "Signed in.", redirect: DASHBOARD_PATH },
    { status: 200 },
  );
  response.cookies.set(SESSION_COOKIE, sessionToken, sessionCookieOptions());
  // Rotate the CSRF token after login to break any pre-login fixation.
  rotateCsrf(response);
  return response;
}
