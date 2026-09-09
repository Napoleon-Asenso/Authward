export const AUTH_PATH = "/auth";

export const AUTH_MODES = {
  signup: "signup",
  signin: "signin",
  verifyEmail: "verify-email",
  forgotPassword: "forgot-password",
  resetPassword: "reset-password",
} as const;

export type AuthMode = (typeof AUTH_MODES)[keyof typeof AUTH_MODES];

export function authPageUrl(
  mode: AuthMode,
  params?: Record<string, string>,
): string {
  const search = new URLSearchParams({ mode });
  if (params) {
    for (const [key, value] of Object.entries(params)) {
      search.set(key, value);
    }
  }
  return `${AUTH_PATH}?${search.toString()}`;
}

export const SIGN_UP_PATH = authPageUrl(AUTH_MODES.signup);
export const SIGN_IN_PATH = authPageUrl(AUTH_MODES.signin);
export const VERIFY_EMAIL_PATH = authPageUrl(AUTH_MODES.verifyEmail);
export const FORGOT_PASSWORD_PATH = authPageUrl(AUTH_MODES.forgotPassword);
export const RESET_PASSWORD_PATH = authPageUrl(AUTH_MODES.resetPassword);
export const DASHBOARD_PATH = "/dashboard";

export const PENDING_COOKIE = "pending_verification_token";
export const SESSION_COOKIE = "session_token";
export const CSRF_COOKIE = "csrf_token";
export const EMAIL_MEMORY_COOKIE = "auth_email_memory";

export const API = {
  signup: "/api/auth/signup",
  verifyEmail: "/api/auth/verify-email",
  signin: "/api/auth/signin",
  forgotPassword: "/api/auth/forgot-password",
  resetPassword: "/api/auth/reset-password",
  resendCode: "/api/auth/resend-code",
  signout: "/api/auth/signout",
} as const;
