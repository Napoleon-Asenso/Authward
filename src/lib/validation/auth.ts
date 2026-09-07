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

export const signupSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Name is required.")
    .max(100, "Name must be at most 100 characters."),
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

export type SignupInput = z.infer<typeof signupSchema>;
export type VerifyEmailInput = z.infer<typeof verifyEmailSchema>;
export type SigninInput = z.infer<typeof signinSchema>;
export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;
export type ResendCodeInput = z.infer<typeof resendCodeSchema>;
