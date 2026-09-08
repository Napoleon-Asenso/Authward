import { NextResponse, type NextRequest } from "next/server";
import { Prisma } from "@prisma/client";
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

interface ExistingUser {
  id: string;
  isVerified: boolean;
}

/** True when Prisma reports a unique-constraint violation (e.g. existing email). */
function isUniqueViolation(err: unknown): boolean {
  return (
    err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002"
  );
}

async function findUserByEmail(email: string): Promise<ExistingUser | null> {
  return prisma.user.findUnique({
    where: { email },
    select: { id: true, isVerified: true },
  });
}

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

  // Fast path: an already-verified account for this email means the signup is
  // a duplicate. Respond idempotently and vaguely (no account enumeration).
  const existing = await findUserByEmail(email);
  if (existing?.isVerified) {
    return NextResponse.json(
      { error: "Unable to create an account with those details." },
      { status: 409 },
    );
  }

  let user = existing;
  let created = false;

  if (!existing) {
    try {
      const passwordHash = await hashPassword(parsed.data.password);
      const row = await prisma.user.create({
        data: {
          email,
          name: normalizeFullName(parsed.data.name),
          passwordHash,
        },
      });
      user = { id: row.id, isVerified: false };
      created = true;
    } catch (err) {
      // Race: a concurrent create-account request for the same email landed
      // first and the unique index on email rejected this insert. Re-read the
      // winner instead of failing, so the request stays idempotent.
      if (!isUniqueViolation(err)) throw err;
      const winner = await findUserByEmail(email);
      if (!winner) throw err;
      // Never overwrite the concurrent user's password/name; only refresh the
      // verification code below.
      user = winner;
      created = false;
    }
  }

  if (user!.isVerified) {
    // A verified account won the race; nothing to create or code to send.
    return NextResponse.json(
      { error: "Unable to create an account with those details." },
      { status: 409 },
    );
  }

  await issueVerificationCode(user!.id, email);

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
    signPending(user!.id),
    pendingCookieOptions(),
  );
  return response;
}
