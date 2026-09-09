import {
  CSRF_TTL_SECONDS,
  EMAIL_MEMORY_TTL_SECONDS,
  PENDING_COOKIE_TTL_SECONDS,
  SESSION_TTL_SECONDS,
} from "./constants";

/**
 * Explicit authentication cookie attributes. Every attribute is declared
 * here so session, pending-verification, CSRF, and email-prefill cookies share
 * one, documented source of truth.
 *
 * The PRD mandates: httpOnly, secure (production), sameSite "lax", path "/".
 * This module is intentionally free of Node/Edge-specific APIs so it can be
 * imported safely by Edge middleware as well as Node route handlers.
 */
export interface AuthCookieOptions {
  httpOnly: boolean;
  secure: boolean;
  sameSite: "lax";
  path: "/";
  maxAge: number;
}

/** Base attributes shared by every authentication cookie. */
function cookieOptions(
  maxAge: number,
  httpOnly: boolean,
): AuthCookieOptions {
  return {
    httpOnly,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge,
  };
}

/**
 * Session cookie. `httpOnly` so the session token is never exposed to client
 * JavaScript. Persists for a week (matched to the DB Session `expiresAt`).
 */
export function sessionCookieOptions(): AuthCookieOptions {
  return cookieOptions(SESSION_TTL_SECONDS, true);
}

/**
 * Pending-verification cookie. Carries a signed `userId` for the /verify-email
 * journey; `httpOnly` so it cannot be read from client JavaScript.
 */
export function pendingCookieOptions(): AuthCookieOptions {
  return cookieOptions(PENDING_COOKIE_TTL_SECONDS, true);
}

/**
 * CSRF double-submit cookie. Deliberately NOT `httpOnly`: the client must be
 * able to read the value so it can echo it back as the `x-csrf-token` header.
 */
export function csrfCookieOptions(): AuthCookieOptions {
  return cookieOptions(CSRF_TTL_SECONDS, false);
}

/**
 * Email-prefill cookie used to remember the user's email after a password
 * reset. Non-sensitive and readable by the sign-in form to prefill the field.
 */
export function emailMemoryCookieOptions(): AuthCookieOptions {
  return cookieOptions(EMAIL_MEMORY_TTL_SECONDS, false);
}

/** Shared options for expiring/clearing a cookie (`maxAge: 0`). */
export function expiredCookieOptions(): AuthCookieOptions {
  return cookieOptions(0, true);
}
