import { BrandLogo } from "@/components/brand/BrandLogo";

interface AuthCardProps {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
}

export function AuthCard({
  title,
  subtitle,
  children,
  footer,
}: AuthCardProps) {
  return (
<main className="flex h-screen items-center justify-center bg-surface px-4 py-10">
      <div className="w-full max-w-md rounded-xl bg-surface-container p-8 shadow-card">
        <div className="mb-6 flex justify-center">
          <BrandLogo />
        </div>
        <h1 className="text-center text-2xl font-bold text-on-surface">{title}</h1>
        {subtitle && (
          <p className="mt-1 text-center text-sm text-on-surface-variant">{subtitle}</p>
        )}
        <div className="mt-6">{children}</div>
        {footer && (
          <div className="mt-6 text-center text-sm text-on-surface-variant">
            {footer}
          </div>
        )}
      </div>
    </main>
  );
}
