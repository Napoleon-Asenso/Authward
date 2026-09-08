import { NextResponse, type NextRequest } from "next/server";
import { deleteSession } from "@/lib/auth/sessions";
import {
  SESSION_COOKIE,
  expiredCookieOptions,
} from "@/lib/auth/cookies";
import { requireCsrf } from "@/lib/auth/csrf";
import { CSRF_COOKIE } from "@/lib/auth/constants";
import { SIGN_IN_PATH } from "@/lib/auth/constants";

export async function POST(request: NextRequest) {
  const csrf = requireCsrf(request);
  if (csrf) return csrf;

  const token = request.cookies.get(SESSION_COOKIE)?.value;
  if (token) {
    await deleteSession(token);
  }

  const response = NextResponse.json(
    { message: "Signed out.", redirect: SIGN_IN_PATH },
    { status: 200 },
  );
  response.cookies.set(SESSION_COOKIE, "", expiredCookieOptions());
  // Logout is always server-side: the session is destroyed above and the CSRF
  // attachment is cleared so a fresh (pre-login) token is issued next time.
  response.cookies.set(CSRF_COOKIE, "", expiredCookieOptions());
  return response;
}
