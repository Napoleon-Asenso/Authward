import { createHash, randomBytes, randomUUID } from "node:crypto";

/** Seconds these single-use codes/tokens remain valid. */
export const OTP_TTL_SECONDS = 15 * 60;
export const RESET_TTL_SECONDS = 15 * 60;
export const SESSION_TTL_SECONDS = 60 * 60 * 24 * 7;
export const PENDING_COOKIE_TTL_SECONDS = 15 * 60;

/**
 * Deterministic hash of a raw token/code. Raw codes are stored nowhere; only
 * this digest is persisted so leaked DB rows cannot be replayed directly.
 */
export function hashValue(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

export function randomBytesHex(bytes: number): string {
  return randomBytes(bytes).toString("hex");
}

/**
 * Cryptographically secure 6-digit verification code.
 *
 * Derived from a 256-bit `crypto.randomBytes(32)` buffer interpreted as a
 * big-endian integer, reduced modulo 1_000_000. Rejection sampling discards
 * values in the small upper remainder so every code 000000-999999 is equally
 * likely (the raw entropy space is far larger than the code range).
 */
export function generateOtp(): string {
  const RANGE = 1_000_000n;
  const MAX_BYTES = 32;
  const max = 1n << BigInt(MAX_BYTES * 8);
  const acceptableMax = max - (max % RANGE);

  for (;;) {
    let n = 0n;
    for (const byte of randomBytes(MAX_BYTES)) {
      n = (n << 8n) | BigInt(byte);
    }
    if (n < acceptableMax) {
      return String(n % RANGE).padStart(6, "0");
    }
  }
}

export function generateSessionToken(): string {
  return randomBytesHex(32);
}

export function generateResetToken(): string {
  return randomUUID();
}
