import type { Metadata } from "next";
import Link from "next/link";
import { cookies } from "next/headers";
import { AuthCard } from "@/components/auth/AuthCard";
import { SignupForm } from "@/components/auth/SignupForm";
import { SigninForm } from "@/components/auth/SigninForm";
import { VerifyEmailForm } from "@/components/auth/VerifyEmailForm";
import { ForgotPasswordForm } from "@/components/auth/ForgotPasswordForm";
import { ResetPasswordForm } from "@/components/auth/ResetPasswordForm";
import { prisma } from "@/lib/db/prisma";
import { PENDING_COOKIE, verifySigned } from "@/lib/auth/cookies";
import { hashValue } from "@/lib/auth/tokens";
import {
  AUTH_MODES,
  authPageUrl,
  type AuthMode,
} from "@/lib/auth/constants";

interface AuthSearchParams {
  mode?: string | string[];
  token?: string | string[];
}

const modeLabels: Record<AuthMode, { title: string; subtitle: string }> = {
  [AUTH_MODES.signup]: {
    title: "Create your account",
    subtitle: "Enter your details below to create your account",
  },
  [AUTH_MODES.signin]: {
    title: "Welcome back",
    subtitle: "Sign in to your account",
  },
  [AUTH_MODES.verifyEmail]: {
    title: "Verify your email",
    subtitle: "Enter the 6-digit code sent to your inbox.",
  },
  [AUTH_MODES.forgotPassword]: {
    title: "Reset Password",
    subtitle:
      "Enter your email address and we'll send you a link to reset your password",
  },
  [AUTH_MODES.resetPassword]: {
    title: "Reset your password",
    subtitle: "Choose a new password for your account.",
  },
};

const modeMetadata: Record<AuthMode, Metadata> = {
  [AUTH_MODES.signup]: {
    title: "Create account",
    description:
      "Create your Authward account with a verified email and a strong password.",
  },
  [AUTH_MODES.signin]: {
    title: "Sign in",
    description: "Sign in to your Authward account securely.",
  },
  [AUTH_MODES.verifyEmail]: {
    title: "Verify email",
    description: "Verify your email address with the 6-digit code we sent you.",
  },
  [AUTH_MODES.forgotPassword]: {
    title: "Forgot password",
    description:
      "Request a secure password reset link for your Authward account.",
  },
  [AUTH_MODES.resetPassword]: {
    title: "Reset password",
    description: "Choose a new, strong password for your Authward account.",
  },
};

const linkClass =
  "text-primary underline-offset-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-surface-container";

function parseMode(value: string | string[] | undefined): AuthMode {
  const mode = Array.isArray(value) ? value[0] : value;
  if (mode && (Object.values(AUTH_MODES) as string[]).includes(mode)) {
    return mode as AuthMode;
  }
  return AUTH_MODES.signup;
}

export async function generateMetadata({
  searchParams,
}: {
  searchParams: Promise<AuthSearchParams>;
}): Promise<Metadata> {
  const params = await searchParams;
  return modeMetadata[parseMode(params.mode)];
}

export default async function AuthPage({
  searchParams,
}: {
  searchParams: Promise<AuthSearchParams>;
}) {
  const params = await searchParams;
  const mode = parseMode(params.mode);
  const token = typeof params.token === "string" ? params.token : undefined;
  const { title, subtitle } = modeLabels[mode];

  let pendingEmail = "";
  if (mode === AUTH_MODES.verifyEmail) {
    const store = await cookies();
    const signed = store.get(PENDING_COOKIE)?.value;
    const userId = signed ? verifySigned(signed) : null;
    if (userId) {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { email: true },
      });
      pendingEmail = user?.email ?? "";
    }
  }

  let resetTokenValid = false;
  if (mode === AUTH_MODES.resetPassword && token) {
    const record = await prisma.passwordResetToken.findFirst({
      where: { tokenHash: hashValue(token), isUsed: false },
      select: { expiresAt: true },
    });
    resetTokenValid =
      record !== null && record.expiresAt.getTime() > Date.now();
  }

  let content: React.ReactNode;
  let footer: React.ReactNode;

  switch (mode) {
    case AUTH_MODES.signup:
      content = <SignupForm />;
      footer = (
        <p>
          Already have an account?{" "}
          <Link href={authPageUrl(AUTH_MODES.signin)} className={linkClass}>
            Sign in
          </Link>
        </p>
      );
      break;

    case AUTH_MODES.verifyEmail:
      content = <VerifyEmailForm initialEmail={pendingEmail} />;
      footer = (
        <div className="flex flex-col gap-1">
          <Link href={authPageUrl(AUTH_MODES.signin)} className={linkClass}>
            Sign in
          </Link>
          {!pendingEmail && (
            <p>
              No pending verification found.{" "}
              <Link href={authPageUrl(AUTH_MODES.signup)} className={linkClass}>
                Sign up again
              </Link>
              .
            </p>
          )}
        </div>
      );
      break;

    case AUTH_MODES.forgotPassword:
      content = <ForgotPasswordForm />;
      footer = (
        <p>
          <Link href={authPageUrl(AUTH_MODES.signin)} className={linkClass}>
            Back to sign in
          </Link>
        </p>
      );
      break;

    case AUTH_MODES.resetPassword:
      if (!token || !resetTokenValid) {
        content = (
          <p className="text-sm text-on-surface-variant">
            Please request a fresh reset link to continue.
          </p>
        );
        footer = (
          <p>
            <Link
              href={authPageUrl(AUTH_MODES.forgotPassword)}
              className={linkClass}
            >
              Request a new link
            </Link>
          </p>
        );
      } else {
        content = <ResetPasswordForm token={token} />;
        footer = (
          <p>
            <Link href={authPageUrl(AUTH_MODES.signin)} className={linkClass}>
              Back to sign in
            </Link>
          </p>
        );
      }
      break;

    default:
      content = <SigninForm />;
      footer = (
        <div className="flex flex-col gap-1">
          <Link
            href={authPageUrl(AUTH_MODES.forgotPassword)}
            className={linkClass}
          >
            Forgot password?
          </Link>
          <p>
            No account?{" "}
            <Link href={authPageUrl(AUTH_MODES.signup)} className={linkClass}>
              Create one
            </Link>
          </p>
        </div>
      );
  }

  return (
    <AuthCard title={title} subtitle={subtitle} footer={footer}>
      {content}
    </AuthCard>
  );
}