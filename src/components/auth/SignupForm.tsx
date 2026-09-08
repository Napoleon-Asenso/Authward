"use client";

import { useState, type FormEvent } from "react";
import { TextField } from "@/components/form/TextField";
import { FormAlert } from "./FormAlert";
import { postJson } from "./api";
import { API } from "@/lib/auth/constants";
import {
  clientErrors,
  fieldError,
  signupSchema,
  type SignupInput,
} from "@/lib/validation/auth";

export function SignupForm() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const errors = clientErrors(signupSchema, { name, email, password });
    setFieldErrors(errors);
    if (Object.keys(errors).length > 0) return;
    setSubmitting(true);
    setError(null);
    const result = await postJson(API.signup, { name, email, password });
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

  function validateField(field: keyof SignupInput, value: string) {
    const error = fieldError(signupSchema, field, value);
    setFieldErrors((prev) => {
      const next = { ...prev };
      if (error) next[field] = [error];
      else delete next[field];
      return next;
    });
  }

  return (
    <form onSubmit={onSubmit} noValidate className="flex flex-col gap-4">
      <FormAlert message={error} />
      <TextField
        id="signup-name"
        label="Full Name"
        placeholder="Full Name"
        autoComplete="name"
        value={name}
        onChange={(e) => setName(e.target.value)}
        onBlur={() => validateField("name", name)}
        error={fieldErrors.name?.[0]}
        required
      />
      <TextField
        id="signup-email"
        label="Email"
        type="email"
        placeholder="you@example.com"
        autoComplete="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        onBlur={() => validateField("email", email)}
        error={fieldErrors.email?.[0]}
        required
      />
      <TextField
        id="signup-password"
        label="Password"
        isPassword
        placeholder="Enter a strong password"
        autoComplete="new-password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        onBlur={() => validateField("password", password)}
        error={fieldErrors.password?.[0]}
        helperText="8-72 characters with uppercase, lowercase, number and symbol."
        required
      />
      <button
        type="submit"
        disabled={submitting}
        className="mt-2 rounded-md bg-primary px-4 py-2.5 text-sm font-semibold text-on-primary transition hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-surface-container disabled:cursor-not-allowed disabled:opacity-50"
      >
        {submitting ? "Creating account…" : "Create account"}
      </button>
    </form>
  );
}
