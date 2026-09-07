import { createHash, randomBytes, randomInt, randomUUID } from "node:crypto";

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

/** Cryptographically secure 6-digit verification code. */
export function generateOtp(): string {
  return String(randomInt(0, 1_000_000)).padStart(6, "0");
}

export function generateSessionToken(): string {
  return randomBytesHex(32);
}

export function generateResetToken(): string {
  return randomUUID();
}
