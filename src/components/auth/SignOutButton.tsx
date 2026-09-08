"use client";

import { useState } from "react";
import { API, CSRF_COOKIE, SIGN_IN_PATH } from "@/lib/auth/constants";

function csrfHeader(): string | undefined {
  const cookie = document.cookie
    .split(";")
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${CSRF_COOKIE}=`));
  return cookie ? cookie.slice(CSRF_COOKIE.length + 1) : undefined;
}

export function SignOutButton() {
  const [busy, setBusy] = useState(false);

  async function onSignOut() {
    setBusy(true);
    try {
      const headers: Record<string, string> = {};
      const csrf = csrfHeader();
      if (csrf) headers["x-csrf-token"] = csrf;
      await fetch(API.signout, { method: "POST", headers });
    } finally {
      window.location.assign(SIGN_IN_PATH);
    }
  }

  return (
    <button
      type="button"
      onClick={onSignOut}
      disabled={busy}
      className="rounded-md border border-outline px-4 py-2 text-sm font-medium text-on-surface transition hover:bg-surface-variant focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-surface-container disabled:cursor-not-allowed disabled:opacity-50"
    >
      {busy ? "Signing out…" : "Sign out"}
    </button>
  );
}
