"use client";

import { useState, type FormEvent } from "react";
import { TextField } from "@/components/form/TextField";
import { FormAlert } from "./FormAlert";
import { postJson } from "./api";
import { API } from "@/lib/auth/constants";
import {
  clientErrors,
  fieldError,
  forgotPasswordSchema,
  type ForgotPasswordInput,
} from "@/lib/validation/auth";

export function ForgotPasswordForm() {
  const [email, setEmail] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const errors = clientErrors(forgotPasswordSchema, { email });
    setFieldErrors(errors);
    if (Object.keys(errors).length > 0) return;
    setSubmitting(true);
    setError(null);
    setMessage(null);
    const result = await postJson(API.forgotPassword, { email });
    setSubmitting(false);
    if (result.fieldErrors) {
      setFieldErrors(result.fieldErrors);
    } else if (result.message) {
      setMessage(result.message);
    } else {
      setError("Something went wrong. Please try again.");
    }
  }

  function validateEmail() {
    const error = fieldError(forgotPasswordSchema, "email", email);
    setFieldErrors((prev) => {
      const next = { ...prev };
      if (error) next.email = [error];
      else delete next.email;
      return next;
    });
  }

  return (
    <form onSubmit={onSubmit} noValidate className="flex flex-col gap-4">
      <FormAlert message={error} />
      {message && (
        <div
          role="status"
          aria-live="polite"
          className="rounded-md border border-outline bg-surface-variant px-3 py-2 text-sm text-on-surface-variant"
        >
          {message}
        </div>
      )}
      <TextField
        id="forgot-email"
        label="Email"
        type="email"
        placeholder="you@example.com"
        autoComplete="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        onBlur={validateEmail}
        error={fieldErrors.email?.[0]}
        required
      />
      <button
        type="submit"
        disabled={submitting}
        className="mt-2 rounded-md bg-primary px-4 py-2.5 text-sm font-semibold text-on-primary transition hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-surface-container disabled:cursor-not-allowed disabled:opacity-50"
      >
        {submitting ? "Sending…" : "Send Reset Link"}
      </button>
    </form>
  );
}
