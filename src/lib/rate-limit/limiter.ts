/**
 * In-memory sliding window rate limiter. Counters are keyed by an arbitrary
 * string identifier and track request timestamps. Suitable for a single Node
 * process (dev/test and single-instance production deployments).
 */

export interface RateLimitResult {
  allowed: boolean;
  retryAfterSeconds: number;
}

type Bucket = number[];

const buckets = new Map<string, Bucket>();
let lastSweep = Date.now();

function sweep(now: number, windowMs: number): void {
  if (now - lastSweep < 60_000) return;
  lastSweep = now;
  for (const [key, ts] of buckets) {
    const windowStart = now - windowMs;
    const remaining = ts.filter((t) => t > windowStart);
    if (remaining.length === 0) {
      buckets.delete(key);
    } else {
      buckets.set(key, remaining);
    }
  }
}

export function consume(
  key: string,
  limit: number,
  windowMs: number,
): RateLimitResult {
  const now = Date.now();
  sweep(now, windowMs);
  const windowStart = now - windowMs;
  let ts = buckets.get(key) ?? [];

  if (ts.length >= limit) {
    const oldest = Math.min(...ts);
    const retryAfterSeconds = Math.max(
      1,
      Math.ceil((oldest + windowMs - now) / 1000),
    );
    return { allowed: false, retryAfterSeconds };
  }

  ts = ts.filter((t) => t > windowStart);
  ts.push(now);
  buckets.set(key, ts);
  return { allowed: true, retryAfterSeconds: 0 };
}

function normalizeEmail(value: string): string {
  return value.trim().toLowerCase();
}

const MINUTE = 60_000;
const HOUR = 60 * MINUTE;

export const Limits = {
  signup: { limit: 5, windowMs: HOUR },
  signinIp: { limit: 10, windowMs: 15 * MINUTE },
  signinPair: { limit: 5, windowMs: 15 * MINUTE },
  resendPin: { limit: 1, windowMs: MINUTE },
  forgotPassword: { limit: 3, windowMs: HOUR },
  verifyCode: { limit: 5, windowMs: 15 * MINUTE },
} as const;

export function rateLimitSignup(ip: string): RateLimitResult {
  return consume(`signup:${ip}`, Limits.signup.limit, Limits.signup.windowMs);
}

export function rateLimitSignin(ip: string, email: string): RateLimitResult {
  const byIp = consume(
    `signin:ip:${ip}`,
    Limits.signinIp.limit,
    Limits.signinIp.windowMs,
  );
  if (!byIp.allowed) return byIp;
  return consume(
    `signin:pair:${ip}:${normalizeEmail(email)}`,
    Limits.signinPair.limit,
    Limits.signinPair.windowMs,
  );
}

export function rateLimitResendPin(email: string): RateLimitResult {
  return consume(
    `resend:${normalizeEmail(email)}`,
    Limits.resendPin.limit,
    Limits.resendPin.windowMs,
  );
}

export function rateLimitForgotPassword(email: string): RateLimitResult {
  return consume(
    `forgot:${normalizeEmail(email)}`,
    Limits.forgotPassword.limit,
    Limits.forgotPassword.windowMs,
  );
}

export function rateLimitVerifyEmail(userId: string): RateLimitResult {
  return consume(
    `verify:${userId}`,
    Limits.verifyCode.limit,
    Limits.verifyCode.windowMs,
  );
}

/**
 * Extract the client IP. Uses the leftmost entry of the x-forwarded-for header
 * (set by proxies) and falls back to x-real-ip.
 */
export function getClientIp(headers: Headers): string {
  const forwarded = headers.get("x-forwarded-for");
  if (forwarded) {
    const leftmost = forwarded.split(",")[0]?.trim();
    if (leftmost) return leftmost;
  }
  return headers.get("x-real-ip") ?? "127.0.0.1";
}
