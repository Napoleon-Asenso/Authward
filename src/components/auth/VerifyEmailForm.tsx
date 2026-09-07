"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { TextField } from "@/components/form/TextField";
import { FormAlert } from "./FormAlert";
import { postJson } from "./api";
import { API } from "@/lib/auth/constants";

const COOLDOWN_SECONDS = 60;

export function VerifyEmailForm({ initialEmail }: { initialEmail: string }) {
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});
  const [resending, setResending] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [cooldown, setCooldown] = useState(COOLDOWN_SECONDS);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    timer.current = setInterval(() => {
      setCooldown((c) => {
        if (c <= 0 && timer.current) {
          clearInterval(timer.current);
          return 0;
        }
        return c - 1;
      });
    }, 1000);
    return () => {
      if (timer.current) clearInterval(timer.current);
    };
  }, []);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    setInfo(null);
    setFieldErrors({});
    const result = await postJson(API.verifyEmail, { code });
    setSubmitting(false);
    if (result.ok && result.redirect) {
      window.location.assign(result.redirect);
    } else if (result.fieldErrors) {
      setFieldErrors(result.fieldErrors);
    } else if (result.message) {
      setError(result.message);
    }
  }

  async function onResend() {
    setResending(true);
    setError(null);
    setInfo(null);
    const result = await postJson(API.resendCode, { email: initialEmail });
    setResending(false);
    if (result.redirect) window.location.assign(result.redirect);
    else if (result.message) setInfo(result.message);
    else setError("Unable to resend code.");
    setCooldown(COOLDOWN_SECONDS);
  }

  return (
    <form onSubmit={onSubmit} noValidate className="flex flex-col gap-4">
      <FormAlert message={error} />
      {info && (
        <div
          role="status"
          aria-live="polite"
          className="rounded-md border border-outline bg-surface-variant px-3 py-2 text-sm text-on-surface-variant"
        >
          {info}
        </div>
      )}
      <TextField
        id="verify-code"
        label="Verification code"
        inputMode="numeric"
        maxLength={6}
        value={code}
        onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
        error={fieldErrors.code?.[0]}
        helperText="Enter the 6-digit code sent to your email."
        required
      />
      <button
        type="submit"
        disabled={submitting}
        className="mt-2 rounded-md bg-primary px-4 py-2.5 text-sm font-semibold text-on-primary transition hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-surface-container disabled:cursor-not-allowed disabled:opacity-50"
      >
        {submitting ? "Verifying…" : "Verify email"}
      </button>
      <button
        type="button"
        onClick={onResend}
        disabled={resending || cooldown > 0}
        className="text-sm text-primary underline-offset-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-surface-container disabled:cursor-not-allowed disabled:opacity-50"
      >
        {cooldown > 0
          ? `Resend code in ${cooldown}s`
          : resending
            ? "Resending…"
            : "Resend code"}
      </button>
    </form>
  );
}
