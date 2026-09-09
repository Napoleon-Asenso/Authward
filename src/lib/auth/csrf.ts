import { NextResponse, type NextRequest } from "next/server";
import { CSRF_COOKIE } from "./constants";
import { csrfCookieOptions } from "./cookie-config";
import { forbidden } from "./http";

export { csrfCookieOptions } from "./cookie-config";

/**
 * Cryptographically random 256-bit token. Uses the Web Crypto platform API so
 * the same module is safe in both the Edge runtime (middleware) and Node route
 * handlers.
 */
export function generateCsrfToken(): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return Array.from(bytes)
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

/** Constant-time compare without Node-only crypto (works in Edge too). */
function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return diff === 0;
}

/**
 * Double-submit CSRF verification: the token echoed in a request header must
 * match the csrf cookie for that browser session.
 */
export function verifyCsrfToken(
  presented: string | null | undefined,
  cookieValue: string | undefined,
): boolean {
  if (!presented || !cookieValue) return false;
  return safeEqual(presented, cookieValue);
}

/**
 * Guard for mutating requests. Returns a 403 response when the CSRF token is
 * missing or does not match the cookie; returns null when the request passes.
 */
export function requireCsrf(request: NextRequest): NextResponse | null {
  const presented = request.headers.get("x-csrf-token");
  const cookieValue = request.cookies.get(CSRF_COOKIE)?.value;
  if (!verifyCsrfToken(presented, cookieValue)) {
    return forbidden("Security check failed. Please try again.");
  }
  return null;
}

/** Rotate the CSRF token: attach a fresh value to the given response. */
export function rotateCsrf(response: NextResponse): void {
  response.cookies.set(CSRF_COOKIE, generateCsrfToken(), csrfCookieOptions());
}