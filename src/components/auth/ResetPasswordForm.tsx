"use client";

import { useState, type FormEvent } from "react";
import { TextField } from "@/components/form/TextField";
import { FormAlert } from "./FormAlert";
import { postJson } from "./api";
import { API } from "@/lib/auth/constants";

interface ResetPasswordFormProps {
  token: string;
}

export function ResetPasswordForm({ token }: ResetPasswordFormProps) {
  const [password, setPassword] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    setFieldErrors({});
    const result = await postJson(API.resetPassword, { token, password });
    setSubmitting(false);
    if (result.ok && result.redirect) {
      window.location.assign(result.redirect);
    } else if (result.fieldErrors) {
      setFieldErrors(result.fieldErrors);
    } else if (result.message) {
      setError(result.message);
    } else {
      setError("Something went wrong. Please try again.");
    }
  }

  return (
    <form onSubmit={onSubmit} noValidate className="flex flex-col gap-4">
      <FormAlert message={error} />
      <TextField
        id="reset-password"
        label="New password"
        isPassword
        placeholder="Enter a new password"
        autoComplete="new-password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        error={fieldErrors.password?.[0]}
        helperText="8-72 characters with uppercase, lowercase, number and symbol."
        required
      />
      <button
        type="submit"
        disabled={submitting}
        className="mt-2 rounded-md bg-primary px-4 py-2.5 text-sm font-semibold text-on-primary transition hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-surface-container disabled:cursor-not-allowed disabled:opacity-50"
      >
        {submitting ? "Resetting…" : "Reset password"}
      </button>
    </form>
  );
}
