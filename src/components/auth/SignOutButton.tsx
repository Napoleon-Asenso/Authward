"use client";

import { useState } from "react";
import { API, SIGN_IN_PATH } from "@/lib/auth/constants";

export function SignOutButton() {
  const [busy, setBusy] = useState(false);

  async function onSignOut() {
    setBusy(true);
    try {
      await fetch(API.signout, { method: "POST" });
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
