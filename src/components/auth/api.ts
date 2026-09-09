import { CSRF_COOKIE } from "@/lib/auth/constants";

/** Reads a browser cookie by name (client-side only). Returns null if absent. */
export function readCookie(name: string): string | null {
  if (typeof document === "undefined") return null;
  const match = document.cookie
    .split(";")
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${name}=`));
  return match ? match.slice(name.length + 1) : null;
}

export interface ApiResult {
  ok: boolean;
  status: number;
  message?: string;
  fieldErrors?: Record<string, string[]>;
  redirect?: string;
  resetToken?: string;
}

interface JsonShape {
  message?: unknown;
  error?: unknown;
  fieldErrors?: unknown;
  redirect?: unknown;
  resetToken?: unknown;
}

/**
 * Read the double-submit CSRF cookie set by the server and echo it back as a
 * header so mutating endpoints can verify origin authenticity.
 */
function csrfHeader(): string | undefined {
  const cookie = document.cookie
    .split(";")
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${CSRF_COOKIE}=`));
  return cookie ? cookie.slice(CSRF_COOKIE.length + 1) : undefined;
}

export async function postJson(
  url: string,
  payload: unknown,
): Promise<ApiResult> {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  const csrf = csrfHeader();
  if (csrf) headers["x-csrf-token"] = csrf;

  const res = await fetch(url, {
    method: "POST",
    headers,
    body: JSON.stringify(payload),
  });

  let data: JsonShape = {};
  try {
    data = (await res.json()) as JsonShape;
  } catch {
    data = {};
  }

  const errorMessage =
    typeof data.message === "string"
      ? data.message
      : typeof data.error === "string"
        ? data.error
        : undefined;

  return {
    ok: res.ok,
    status: res.status,
    message: errorMessage,
    fieldErrors:
      data.fieldErrors && typeof data.fieldErrors === "object"
        ? (data.fieldErrors as Record<string, string[]>)
        : undefined,
    redirect: typeof data.redirect === "string" ? data.redirect : undefined,
    resetToken: typeof data.resetToken === "string" ? data.resetToken : undefined,
  };
}
