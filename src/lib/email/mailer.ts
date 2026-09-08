import nodemailer, { type Transporter } from "nodemailer";
import { OTP_TTL_SECONDS, RESET_TTL_SECONDS } from "@/lib/auth/tokens";
import { AUTH_MODES, authPageUrl } from "@/lib/auth/constants";

const SEND_ATTEMPTS = 3;
const TRANSPORT_TIMEOUT_MS = 15_000;

let transportPromise: Promise<Transporter> | null = null;

function emailConfigured(): boolean {
  return Boolean(
    process.env.SMTP_USER &&
      process.env.SMTP_PASS &&
      process.env.SMTP_HOST,
  );
}

function accountFrom(): string {
  return process.env.SMTP_FROM ?? process.env.SMTP_USER ?? "no-reply@authward.local";
}

function appBaseUrl(): string {
  return process.env.APP_BASE_URL ?? "http://localhost:3000";
}

async function createTransport(): Promise<Transporter> {
  let lastError: unknown;
  for (let attempt = 0; attempt < SEND_ATTEMPTS; attempt++) {
    try {
      return nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: Number(process.env.SMTP_PORT ?? 587),
        secure: process.env.SMTP_SECURE === "true",
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS,
        },
        connectionTimeout: TRANSPORT_TIMEOUT_MS,
        greetingTimeout: TRANSPORT_TIMEOUT_MS,
        socketTimeout: TRANSPORT_TIMEOUT_MS,
      });
    } catch (err) {
      lastError = err;
      await new Promise((resolve) => setTimeout(resolve, 500 * (attempt + 1)));
    }
  }
  throw lastError;
}

function getTransport(): Promise<Transporter> {
  if (!transportPromise) {
    transportPromise = createTransport();
  }
  return transportPromise;
}

/**
 * Common nodemailer delivery. Never rejects: configuration or delivery
 * failures are logged and a null result returned so callers never block.
 */
async function sendMail(
  to: string,
  subject: string,
  text: string,
  html: string,
): Promise<string | null> {
  if (!emailConfigured()) {
    console.warn(
      "[dev mail] SMTP not configured. Set SMTP_HOST / SMTP_USER / SMTP_PASS (and optionally SMTP_FROM) in .env.local - message for " +
        `${to}: ${subject} :: ${text}`,
    );
    return null;
  }

  let lastError: unknown;
  for (let attempt = 0; attempt < SEND_ATTEMPTS; attempt++) {
    try {
      const transport = await getTransport();
      const info = await transport.sendMail({
        from: `"Authward" <${accountFrom()}>`,
        to,
        subject,
        text,
        html,
      });
      console.log(
        `[dev mail] sent to ${to} - ${subject} - messageId: ${info.messageId}`,
      );
      return null;
    } catch (err) {
      lastError = err;
      // A stale/closed connection may be the cause; drop it so the next
      // attempt builds a fresh transport.
      transportPromise = null;
      await new Promise((resolve) => setTimeout(resolve, 1000 * (attempt + 1)));
    }
  }
  console.error(
    `[dev mail] delivery failed for ${to} - ${subject}: ${(lastError as Error).message}`,
  );
  return null;
}

/**
 * Email a single-use 6-digit verification code to the address the user
 * supplied at signup.
 */
export async function sendVerificationCode(
  to: string,
  code: string,
): Promise<string | null> {
  const minutes = Math.floor(OTP_TTL_SECONDS / 60);
  return sendMail(
    to,
    "Your Authward verification code",
    `Your verification code is ${code}. It expires in ${minutes} minutes.`,
    `<p>Your verification code is <strong>${code}</strong>.</p><p>It expires in ${minutes} minutes.</p>`,
  );
}

/**
 * Email a single-use password-reset link to the user's address. The link
 * points to the reset-password form carrying the opaque reset token.
 */
export async function sendPasswordResetLink(
  to: string,
  token: string,
): Promise<string | null> {
  const minutes = Math.floor(RESET_TTL_SECONDS / 60);
  const link = `${appBaseUrl()}${authPageUrl(AUTH_MODES.resetPassword, { token })}`;
  console.log(`[dev mail] reset link for ${to}: ${link}`);
  return sendMail(
    to,
    "Reset your Authward password",
    `Click the link below to reset your password. It expires in ${minutes} minutes.\n${link}`,
    `<p>Click <a href="${link}">here</a> to reset your password.</p><p>It expires in ${minutes} minutes.</p>`,
  );
}
