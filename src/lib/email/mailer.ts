import nodemailer, { type Transporter } from "nodemailer";
import { OTP_TTL_SECONDS } from "@/lib/auth/tokens";

let transporter: Transporter | null = null;

function buildTransport(): Transporter | null {
  const host = process.env.SMTP_HOST;
  if (!host) return null;

  const port = Number(process.env.SMTP_PORT ?? 587);
  const secure = process.env.SMTP_SECURE === "true";
  const auth =
    process.env.SMTP_USER || process.env.SMTP_PASS
      ? {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS,
        }
      : undefined;

  return nodemailer.createTransport({ host, port, secure, auth });
}

function getTransporter(): Transporter | null {
  if (!transporter) transporter = buildTransport();
  return transporter;
}

function from(): string {
  return process.env.SMTP_FROM ?? process.env.SMTP_USER ?? "no-reply@authward.local";
}

/**
 * Delivers a single-use email verification code to the given address.
 * When SMTP is not configured (local/dev) the code is logged instead so the
 * full flow remains testable without a mail server; real delivery is disabled
 * only when an SMTP host is absent.
 */
export async function sendVerificationCode(
  to: string,
  code: string,
): Promise<void> {
  const transport = getTransporter();
  if (!transport) {
    if (process.env.NODE_ENV !== "production") {
      console.log(`[dev mail] verification code for ${to}: ${code}`);
    }
    return;
  }

  const minutes = Math.floor(OTP_TTL_SECONDS / 60);
  await transport.sendMail({
    from: from(),
    to,
    subject: "Your Authward verification code",
    text: `Your verification code is ${code}. It expires in ${minutes} minutes.`,
    html: `<p>Your verification code is <strong>${code}</strong>.</p><p>It expires in ${minutes} minutes.</p>`,
  });
}
