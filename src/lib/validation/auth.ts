import { z } from "zod";

/**
 * RFC 5322-compliant email pattern (pragmatic, ECMAScript-friendly).
 */
const EMAIL_REGEX =
  /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;

/**
 * Password policy: 8-72 chars, at least one uppercase, lowercase, digit and
 * special (non-alphanumeric) character. The 72-char ceiling protects bcrypt
 * from silent input truncation and memory/CPU abuse.
 */
export const passwordSchema = z
  .string()
  .min(8, "Password must be at least 8 characters.")
  .max(72, "Password must be at most 72 characters.")
  .regex(/[A-Z]/, "Password must contain at least one uppercase letter.")
  .regex(/[a-z]/, "Password must contain at least one lowercase letter.")
  .regex(/\d/, "Password must contain at least one digit.")
  .regex(/[^A-Za-z0-9]/, "Password must contain at least one special character.");

/**
 * Full name policy: at least two words (first + last name), each consisting
 * of letters only, separated by a single space (no numbers, symbols, or
 * consecutive/empty words). First/middle/last parts are derived at the app
 * layer; the database keeps a single normalized `name` column per the PRD.
 */
export const NAME_REGEX = /^[A-Za-z]+(?:\s[A-Za-z]+)+$/;

export interface FullName {
  firstName: string;
  middleName: string;
  lastName: string;
}

export function splitFullName(value: string): FullName {
  const parts = value.trim().split(/\s+/).filter(Boolean);
  const [firstName = "", ...rest] = parts;
  const lastName = rest.length > 0 ? rest[rest.length - 1] : "";
  const middleName =
    rest.length > 1 ? rest.slice(0, -1).join(" ") : "";
  return { firstName, middleName, lastName };
}

export function normalizeFullName(value: string): string {
  return value.trim().split(/\s+/).filter(Boolean).join(" ");
}

export const signupSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Name is required.")
    .max(100, "Name must be at most 100 characters.")
    .regex(
      NAME_REGEX,
      "Please enter at least a first and last name using letters only (single space between names).",
    ),
  email: z
    .string()
    .trim()
    .toLowerCase()
    .regex(EMAIL_REGEX, "Enter a valid email address."),
  password: passwordSchema,
});

export const verifyEmailSchema = z.object({
  code: z
    .string()
    .trim()
    .regex(/^[0-9]{6}$/, "Verification code must be exactly 6 digits."),
});

export const signinSchema = z.object({
  email: z
    .string()
    .trim()
    .toLowerCase()
    .regex(EMAIL_REGEX, "Enter a valid email address."),
  password: z.string().min(1, "Password is required."),
});

export const forgotPasswordSchema = z.object({
  email: z
    .string()
    .trim()
    .toLowerCase()
    .regex(EMAIL_REGEX, "Enter a valid email address."),
});

export const resetPasswordSchema = z.object({
  token: z
    .string()
    .trim()
    .min(1, "Reset token is required."),
  password: passwordSchema,
});

export const resendCodeSchema = z.object({
  email: z
    .string()
    .trim()
    .toLowerCase()
    .regex(EMAIL_REGEX, "Enter a valid email address."),
});

/**
 * Client-side helpers so forms validate with the exact same schemas the
 * server uses.
 */
export function fieldError<T extends z.ZodRawShape, K extends keyof T>(
  schema: z.ZodObject<T>,
  field: K,
  value: string,
): string | undefined {
  const result = schema.safeParse({ [field]: value } as Record<string, string>);
  if (result.success) return undefined;
  return result.error.issues.find((issue) => issue.path[0] === field)?.message;
}

export function clientErrors<T extends z.ZodRawShape>(
  schema: z.ZodObject<T>,
  data: Record<string, string>,
): Record<string, string[]> {
  const result = schema.safeParse(data);
  if (result.success) return {};
  const errors: Record<string, string[]> = {};
  for (const issue of result.error.issues) {
    const key = String(issue.path[0] ?? "");
    if (!errors[key]) errors[key] = [];
    errors[key].push(issue.message);
  }
  return errors;
}

export type SignupInput = z.infer<typeof signupSchema>;
export type VerifyEmailInput = z.infer<typeof verifyEmailSchema>;
export type SigninInput = z.infer<typeof signinSchema>;
export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;
export type ResendCodeInput = z.infer<typeof resendCodeSchema>;
