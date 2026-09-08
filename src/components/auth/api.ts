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

export async function postJson(
  url: string,
  payload: unknown,
): Promise<ApiResult> {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
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
