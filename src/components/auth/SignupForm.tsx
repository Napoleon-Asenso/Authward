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

interface PasswordRule {
  key:
    | "length"
    | "lowercase"
    | "uppercase"
    | "number"
    | "special";
  label: string;
  check: (value: string) => boolean;
}

const PASSWORD_RULES: PasswordRule[] = [
  {
    key: "length",
    label: "Minimum of 8 characters",
    check: (value) => value.length >= 8,
  },
  {
    key: "lowercase",
    label: "1 lowercase letter",
    check: (value) => /[a-z]/.test(value),
  },
  {
    key: "uppercase",
    label: "1 uppercase letter",
    check: (value) => /[A-Z]/.test(value),
  },
  {
    key: "number",
    label: "1 number",
    check: (value) => /\d/.test(value),
  },
  {
    key: "special",
    label: "1 special character",
    check: (value) => /[^A-Za-z0-9]/.test(value),
  },
];

export function SignupForm() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [metRules, setMetRules] = useState<Record<string, boolean>>({});
  const [passwordTouched, setPasswordTouched] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const isFilled =
    name.trim().length > 0 &&
    email.trim().length > 0 &&
    password.length > 0;

  const passwordCompliant = PASSWORD_RULES.every((rule) =>
    rule.check(password),
  );

  const remainingRules = PASSWORD_RULES.filter(
    (rule) => !metRules[rule.key],
  );

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

  function validateNameLive(value: string) {
    const hasInvalidChars = /[^A-Za-z\s]/.test(value);
    const hasConsecutiveSpaces = /\s{2,}/.test(value);
    if (hasInvalidChars || hasConsecutiveSpaces) {
      setFieldErrors((prev) => ({
        ...prev,
        name: ["Name may only contain letters, separated by single spaces."],
      }));
      return;
    }
    setFieldErrors((prev) => {
      const next = { ...prev };
      delete next.name;
      return next;
    });
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
        onChange={(e) => {
          setName(e.target.value);
          validateNameLive(e.target.value);
        }}
        onBlur={() => validateField("name", name)}
        completed={submitted}
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
        id="signup-password"
        label="Password"
        isPassword
        placeholder="Enter a strong password"
        autoComplete="new-password"
        value={password}
        onChange={(e) => {
          const value = e.target.value;
          setPassword(value);
          setPasswordTouched(true);
          setMetRules((prev) => {
            let changed = false;
            const next = { ...prev };
            for (const rule of PASSWORD_RULES) {
              if (!next[rule.key] && rule.check(value)) {
                next[rule.key] = true;
                changed = true;
              }
            }
            return changed ? next : prev;
          });
        }}
        onFocus={() => setPasswordTouched(true)}
        onBlur={() => validateField("password", password)}
        completed={submitted}
        error={fieldErrors.password?.[0]}
        required
      />
      {passwordTouched && remainingRules.length > 0 && (
        <ul className="flex flex-col gap-1 text-xs text-on-surface-variant/60">
          {remainingRules.map((rule) => (
            <li key={rule.key} className="flex items-center gap-2">
              <span aria-hidden="true">•</span>
              {rule.label}
            </li>
          ))}
        </ul>
      )}
      <button
        type="submit"
        disabled={!isFilled || submitting || !passwordCompliant}
        className="mt-2 flex items-center justify-center gap-2 rounded-md bg-primary px-4 py-2.5 text-sm font-semibold text-on-primary transition hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-surface disabled:cursor-not-allowed disabled:opacity-50"
      >
        {submitting && (
          <span
            aria-hidden="true"
            className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent"
          />
        )}
        {submitting ? "Creating account…" : "Create account"}
      </button>
    </form>
  );
}
