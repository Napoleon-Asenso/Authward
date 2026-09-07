import { NextResponse, type NextRequest } from "next/server";
import {
  AUTH_MODES,
  AUTH_PATH,
  DASHBOARD_PATH,
  PENDING_COOKIE,
  SESSION_COOKIE,
  SIGN_IN_PATH,
  SIGN_UP_PATH,
  authPageUrl,
  type AuthMode,
} from "@/lib/auth/constants";

const LEGACY_AUTH_PATHS: Partial<Record<string, AuthMode>> = {
  "/signin": AUTH_MODES.signin,
  "/signup": AUTH_MODES.signup,
  "/verify-email": AUTH_MODES.verifyEmail,
  "/forgot-password": AUTH_MODES.forgotPassword,
  "/reset-password": AUTH_MODES.resetPassword,
};

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
      return NextResponse.redirect(new URL(SIGN_UP_PATH, request.url));
    }
    const args = request.nextUrl.searchParams;
    const params: Record<string, string> = {};
    if (legacyMode === AUTH_MODES.resetPassword && args.get("token")) {
      params.token = args.get("token")!;
    }
    return NextResponse.redirect(
      new URL(authPageUrl(legacyMode, params), request.url),
    );
  }

  if (pathname === DASHBOARD_PATH && !hasSession) {
    return NextResponse.redirect(new URL(SIGN_IN_PATH, request.url));
  }

  if (pathname === AUTH_PATH) {
    const mode = request.nextUrl.searchParams.get("mode");

    if (hasSession) {
      return NextResponse.redirect(new URL(DASHBOARD_PATH, request.url));
    }

    if (mode === AUTH_MODES.verifyEmail && !hasPending) {
      return NextResponse.redirect(new URL(SIGN_UP_PATH, request.url));
    }
  }

  if (pathname === "/") {
    return NextResponse.redirect(
      new URL(hasSession ? DASHBOARD_PATH : SIGN_IN_PATH, request.url),
    );
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\..*).*)"],
};