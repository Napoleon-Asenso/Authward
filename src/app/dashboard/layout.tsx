import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { findSessionUser } from "@/lib/auth/sessions";
import { SESSION_COOKIE, SIGN_IN_PATH } from "@/lib/auth/constants";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  const user = token ? await findSessionUser(token) : null;
  if (!user) {
    redirect(SIGN_IN_PATH);
  }
  return (
    <div className="h-screen bg-surface">{children}</div>
  );
}
