import type { Metadata } from "next";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { findSessionUser } from "@/lib/auth/sessions";
import { SignOutButton } from "@/components/auth/SignOutButton";
import { SESSION_COOKIE, SIGN_IN_PATH } from "@/lib/auth/constants";

export const metadata: Metadata = {
  title: "Dashboard",
  description: "Your secure Authward account dashboard.",
};

export default async function DashboardPage() {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  const user = token ? await findSessionUser(token) : null;
  if (!user) {
    redirect(SIGN_IN_PATH);
  }

  return (
    <main className="mx-auto flex h-screen max-w-lg items-center justify-center px-4 py-12">
      <div className="w-full rounded-xl bg-surface-container p-8 shadow-card">
        <h1 className="text-2xl font-bold text-on-surface">
          Welcome, {user.name}
        </h1>
        <p className="mt-2 text-sm text-on-surface-variant">{user.email}</p>
        <div className="mt-6">
          <SignOutButton />
        </div>
      </div>
    </main>
  );
}
