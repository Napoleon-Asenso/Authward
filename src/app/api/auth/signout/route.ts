import { NextResponse, type NextRequest } from "next/server";
import { deleteSession } from "@/lib/auth/sessions";
import {
  SESSION_COOKIE,
  expiredCookieOptions,
} from "@/lib/auth/cookies";
import { SIGN_IN_PATH } from "@/lib/auth/constants";

export async function POST(request: NextRequest) {
  const token = request.cookies.get(SESSION_COOKIE)?.value;
  if (token) {
    await deleteSession(token);
  }

  const response = NextResponse.json(
    { message: "Signed out.", redirect: SIGN_IN_PATH },
    { status: 200 },
  );
  response.cookies.set(SESSION_COOKIE, "", expiredCookieOptions());
  return response;
}
