import nodemailer, { type Transporter } from "nodemailer";
import { OTP_TTL_SECONDS } from "@/lib/auth/tokens";

const SEND_ATTEMPTS = 3;
const TRANSPORT_TIMEOUT_MS = 10_000;
const ACCOUNT_TIMEOUT_MS = 15_000;

let transportPromise: Promise<Transporter> | null = null;

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error("Timed out")), ms);
    promise.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (err) => {
        clearTimeout(timer);
        reject(err);
      },
    );
  });
}

/**
 * Lazily obtains a reusable Ethereal test-mail SMTP provider. Ethereal hands
 * back a real inbox plus a web preview URL for every message, so the flow is
 * fully testable without supplying production credentials. A single provider
 * is reused across the process; each outgoing message still gets its own
 * unique preview link. Account creation is time-bounded and retried to shrug
 * off transient network blips.
 */
async function createEtherealTransport(): Promise<Transporter> {
  let lastError: unknown;
  for (let attempt = 0; attempt < SEND_ATTEMPTS; attempt++) {
    try {
      const account = await withTimeout(
        nodemailer.createTestAccount(),
        ACCOUNT_TIMEOUT_MS,
      );
      return nodemailer.createTransport({
        host: account.smtp.host,
        port: account.smtp.port,
        secure: account.smtp.secure,
        auth: { user: account.user, pass: account.pass },
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
    transportPromise = createEtherealTransport();
  }
  return transportPromise;
}

/**
 * Delivers a single-use email verification code to the given address via
 * Ethereal. Guarantees it never rejects: failures are logged (along with the
 * code, so it can still be retrieved) and a null preview URL is returned.
 */
export async function sendVerificationCode(
  to: string,
  code: string,
): Promise<string | null> {
  try {
    const transport = await getTransport();
    const minutes = Math.floor(OTP_TTL_SECONDS / 60);

    const info = await transport.sendMail({
      from: '"Authward" <no-reply@authward.local>',
      to,
      subject: "Your Authward verification code",
      text: `Your verification code is ${code}. It expires in ${minutes} minutes.`,
      html: `<p>Your verification code is <strong>${code}</strong>.</p><p>It expires in ${minutes} minutes.</p>`,
    });

    const previewUrl = nodemailer.getTestMessageUrl(info) || null;
    console.log(
      `[dev mail] verification email for ${to} - code: ${code} - preview: ${previewUrl}`,
    );
    return previewUrl;
  } catch (err) {
    console.error(
      `[dev mail] FAKED verification code for ${to} (email delivery failed) - code: ${code}: ${(err as Error).message}`,
    );
    return null;
  }
}
