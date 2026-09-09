import type { Metadata } from "next";
import Link from "next/link";
import { prisma } from "@/lib/db/prisma";
import { hashValue } from "@/lib/auth/tokens";
import { AuthCard } from "@/components/auth/AuthCard";
import { ResetPasswordForm } from "@/components/auth/ResetPasswordForm";
import { authPageUrl, AUTH_MODES } from "@/lib/auth/constants";

export const metadata: Metadata = {
  title: "Reset password",
  description: "Choose a new, strong password for your Authward account.",
};

interface ResetPasswordSearchParams {
  token?: string | string[];
}

const linkClass =
  "text-primary underline-offset-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-surface-container";

async function resolveToken(
  token: string | string[] | undefined,
): Promise<string | undefined> {
  const raw = Array.isArray(token) ? token[0] : token;
  return raw && raw.length > 0 ? raw : undefined;
}

export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<ResetPasswordSearchParams>;
}) {
  const params = await searchParams;
  const token = await resolveToken(params.token);

  let tokenValid = false;
  if (token) {
    const record = await prisma.passwordResetToken.findFirst({
      where: { tokenHash: hashValue(token), isUsed: false },
      select: { expiresAt: true },
    });
    tokenValid = record !== null && record.expiresAt.getTime() > Date.now();
  }

  const title = "Reset your password";
  const subtitle = "Choose a new password for your account.";

  if (!token || !tokenValid) {
    return (
      <AuthCard title={title} subtitle={subtitle}>
        <p role="alert" className="text-sm text-on-surface-variant">
          This reset link is invalid or has expired. Please request a fresh
          reset link to continue.
        </p>
        <p className="mt-4 text-center text-sm text-on-surface-variant">
          <Link
            href={authPageUrl(AUTH_MODES.forgotPassword)}
            className={linkClass}
          >
            Request a new link
          </Link>
        </p>
      </AuthCard>
    );
  }

  return (
    <AuthCard title={title} subtitle={subtitle}>
      <ResetPasswordForm token={token} />
      <p className="mt-6 text-center text-sm text-on-surface-variant">
        <Link href={authPageUrl(AUTH_MODES.signin)} className={linkClass}>
          Back to sign in
        </Link>
      </p>
    </AuthCard>
  );
}
