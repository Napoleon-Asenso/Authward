import { NextResponse, type NextRequest } from "next/server";
import {
  AUTH_MODES,
  AUTH_PATH,
  CSRF_COOKIE,
  DASHBOARD_PATH,
  PENDING_COOKIE,
  SESSION_COOKIE,
  SIGN_IN_PATH,
  SIGN_UP_PATH,
  authPageUrl,
  type AuthMode,
} from "@/lib/auth/constants";
import {
  csrfCookieOptions,
  generateCsrfToken,
} from "@/lib/auth/csrf";

const LEGACY_AUTH_PATHS: Partial<Record<string, AuthMode>> = {
  "/signin": AUTH_MODES.signin,
  "/signup": AUTH_MODES.signup,
  "/verify-email": AUTH_MODES.verifyEmail,
  "/forgot-password": AUTH_MODES.forgotPassword,
};

/**
 * Pre-login CSRF attachment: anonymous visitors get a fresh token cookie on
 * their first page load. Existing tokens are left untouched; the token is only
 * rotated at login / password reset and cleared at logout.
 */
function ensureCsrf(response: NextResponse, request: NextRequest): NextResponse {
  if (!request.cookies.get(CSRF_COOKIE)?.value) {
    response.cookies.set(CSRF_COOKIE, generateCsrfToken(), csrfCookieOptions());
  }
  return response;
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (pathname.startsWith("/api")) {
    return NextResponse.next();
  }

  const hasSession = Boolean(request.cookies.get(SESSION_COOKIE)?.value);
  const hasPending = Boolean(request.cookies.get(PENDING_COOKIE)?.value);

  const legacyMode = LEGACY_AUTH_PATHS[pathname];
  if (legacyMode) {
    if (
      legacyMode === AUTH_MODES.verifyEmail &&
      !hasPending &&
      !hasSession
    ) {
      return ensureCsrf(
        NextResponse.redirect(new URL(SIGN_UP_PATH, request.url)),
        request,
      );
    }
    return ensureCsrf(
      NextResponse.redirect(
        new URL(authPageUrl(legacyMode), request.url),
      ),
      request,
    );
  }

  if (pathname === DASHBOARD_PATH && !hasSession) {
    return ensureCsrf(
      NextResponse.redirect(new URL(SIGN_IN_PATH, request.url)),
      request,
    );
  }

  if (pathname === AUTH_PATH) {
    const mode = request.nextUrl.searchParams.get("mode");

    // A signed-in user must still be able to reset a forgotten password, so
    // the password-recovery modes are exempt from the session redirect.
    const recoveryMode =
      mode === AUTH_MODES.resetPassword || mode === AUTH_MODES.forgotPassword;

    if (hasSession && !recoveryMode) {
      return ensureCsrf(
        NextResponse.redirect(new URL(DASHBOARD_PATH, request.url)),
        request,
      );
    }

    if (mode === AUTH_MODES.verifyEmail && !hasPending) {
      return ensureCsrf(
        NextResponse.redirect(new URL(SIGN_UP_PATH, request.url)),
        request,
      );
    }
  }

  if (pathname === "/") {
    return ensureCsrf(
      NextResponse.redirect(
        new URL(hasSession ? DASHBOARD_PATH : SIGN_UP_PATH, request.url),
      ),
      request,
    );
  }

  return ensureCsrf(NextResponse.next(), request);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\..*).*)"],
};