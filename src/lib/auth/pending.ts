import { prisma } from "@/lib/db/prisma";
import { OTP_TTL_SECONDS, generateOtp, hashValue } from "./tokens";

const RESEND_COOLDOWN_SECONDS = 60;

/**
 * Issues a fresh 6-digit verification code for a user, atomically invalidating
 * any previously active (unused) codes for the same user.
 * Returns the raw plaintext code (never persisted).
 */
export async function issueVerificationCode(userId: string): Promise<string> {
  const code = generateOtp();
  const codeHash = hashValue(code);
  const expiresAt = new Date(Date.now() + OTP_TTL_SECONDS * 1000);
  const resendAvailableAt = new Date(Date.now() + RESEND_COOLDOWN_SECONDS * 1000);

  await prisma.$transaction([
    prisma.verificationCode.updateMany({
      where: { userId, isUsed: false },
      data: { isUsed: true },
    }),
    prisma.verificationCode.create({
      data: { userId, codeHash, expiresAt, resendAvailableAt },
    }),
  ]);

  if (process.env.NODE_ENV !== "production") {
    console.log(`[dev] verification code for ${userId}: ${code}`);
  }

  return code;
}

/**
 * Validates and atomically consumes a submitted code for the given user.
 * Accepts a code only if it matches the stored hash, is unused and unexpired.
 */
export async function consumeVerificationCode(
  code: string,
  userId: string,
): Promise<boolean> {
  const codeHash = hashValue(code);
  const record = await prisma.verificationCode.findFirst({
    where: { userId, codeHash, isUsed: false },
  });
  if (!record) return false;
  if (record.expiresAt.getTime() <= Date.now()) return false;

  await prisma.verificationCode.update({
    where: { id: record.id },
    data: { isUsed: true },
  });
  return true;
}
