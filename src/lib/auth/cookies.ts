import { createHmac, timingSafeEqual } from "node:crypto";

export { PENDING_COOKIE, SESSION_COOKIE } from "./constants";
export {
  expiredCookieOptions,
  pendingCookieOptions,
  sessionCookieOptions,
} from "./cookie-config";

function authSecret(): string {
  const secret = process.env.AUTH_SECRET;
  if (!secret) {
    throw new Error("AUTH_SECRET environment variable is not set.");
  }
  return secret;
}

function hmac(payload: string): string {
  return createHmac("sha256", authSecret()).update(payload).digest("hex");
}

/** Signed value: `<payload>.<hmac>`. The payload here is the userId. */
export function signPending(userId: string): string {
  return `${userId}.${hmac(userId)}`;
}

/** Returns the signed payload (userId) if the signature is valid, else null. */
export function verifySigned(signed: string): string | null {
  const dot = signed.lastIndexOf(".");
  if (dot === -1) return null;
  const payload = signed.slice(0, dot);
  const provided = signed.slice(dot + 1);
  const expected = hmac(payload);
  const a = Buffer.from(provided);
  const b = Buffer.from(expected);
  if (a.length !== b.length) return null;
  return timingSafeEqual(a, b) ? payload : null;
}
