import nodemailer, { type Transporter } from "nodemailer";
import { OTP_TTL_SECONDS } from "@/lib/auth/tokens";

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
 * Deliver a single-use email verification code to the address the user
 * supplied at signup, using the SMTP credentials configured in the
 * environment (Gmail recommended). Never rejects: on any configuration or
 * delivery failure the code is logged so it can still be retrieved, and a
 * null result is returned so the API flow is never blocked.
 */
export async function sendVerificationCode(
  to: string,
  code: string,
): Promise<string | null> {
  if (!emailConfigured()) {
    console.warn(
      "[dev mail] SMTP not configured. To deliver verification emails, set SMTP_HOST / SMTP_USER / SMTP_PASS (and optionally SMTP_FROM) in .env.local - code for " +
        `${to}: ${code}`,
    );
    return null;
  }

  try {
    const transport = await getTransport();
    const minutes = Math.floor(OTP_TTL_SECONDS / 60);

    const info = await transport.sendMail({
      from: `"Authward" <${accountFrom()}>`,
      to,
      subject: "Your Authward verification code",
      text: `Your verification code is ${code}. It expires in ${minutes} minutes.`,
      html: `<p>Your verification code is <strong>${code}</strong>.</p><p>It expires in ${minutes} minutes.</p>`,
    });

    console.log(
      `[dev mail] verification code sent to ${to} - messageId: ${info.messageId}`,
    );
    return null;
  } catch (err) {
    console.error(
      `[dev mail] verification code for ${to} (delivery failed) - code: ${code}: ${(err as Error).message}`,
    );
    return null;
  }
}
