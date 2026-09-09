"use client";

import { useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { TextField } from "@/components/form/TextField";
import { FormAlert } from "./FormAlert";
import { postJson, readCookie } from "./api";
import { API, FORGOT_PASSWORD_PATH, EMAIL_MEMORY_COOKIE } from "@/lib/auth/constants";
import {
  clientErrors,
  fieldError,
  signinSchema,
  type SigninInput,
} from "@/lib/validation/auth";

export function SigninForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    const remembered = readCookie(EMAIL_MEMORY_COOKIE);
    if (remembered) setEmail(remembered);
  }, []);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const errors = clientErrors(signinSchema, { email, password });
    setFieldErrors(errors);
    if (Object.keys(errors).length > 0) return;
    setSubmitting(true);
    setError(null);
    const result = await postJson(API.signin, { email, password });
    setSubmitting(false);
    if (result.ok && result.redirect) {
      setSubmitted(true);
      window.location.assign(result.redirect);
    } else if (result.fieldErrors) {
      setFieldErrors(result.fieldErrors);
    } else if (result.message) {
      setError(result.message);
    } else {
      setError("Something went wrong. Please try again.");
    }
  }

  function validateEmailLive(value: string) {
    setFieldErrors((prev) => {
      const next = { ...prev };
      const flag = value.length > 0 && !value.includes("@");
      if (flag) {
        next.email = ["Please include an @ followed by the domain (e.g. you@example.com)."];
      } else {
        delete next.email;
      }
      return next;
    });
  }

  function validateField(field: keyof SigninInput, value: string) {
    const error = fieldError(signinSchema, field, value);
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
        id="signin-email"
        label="Email"
        type="email"
        placeholder="you@example.com"
        autoComplete="email"
        autoFocus
        value={email}
        onChange={(e) => {
          setEmail(e.target.value);
          validateEmailLive(e.target.value);
        }}
        onBlur={() => validateField("email", email)}
        completed={submitted}
        error={fieldErrors.email?.[0]}
        required
      />
      <TextField
        id="signin-password"
        label="Password"
        isPassword
        placeholder="Enter your password"
        autoComplete="current-password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        onBlur={() => validateField("password", password)}
        completed={submitted}
        error={fieldErrors.password?.[0]}
        required
      />
      <div className="-mt-2 flex justify-end">
        <Link
          href={FORGOT_PASSWORD_PATH}
          className="text-xs font-medium text-primary underline-offset-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-surface"
        >
          Forgot password?
        </Link>
      </div>
      <button
        type="submit"
        disabled={submitting}
        className="mt-2 flex items-center justify-center gap-2 rounded-md bg-primary px-4 py-2.5 text-sm font-semibold text-on-primary transition hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-surface-container disabled:cursor-not-allowed disabled:opacity-50"
      >
        {submitting && (
          <span
            aria-hidden="true"
            className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent"
          />
        )}
        {submitting ? "Signing in…" : "Sign in"}
      </button>
    </form>
  );
}
