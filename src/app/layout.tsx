import type { Metadata, Viewport } from "next";
import "./globals.css";
import { siteMetadata } from "@/lib/site";

export const metadata: Metadata = siteMetadata;

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#C900DB" },
    { media: "(prefers-color-scheme: dark)", color: "#1E1A22" },
  ],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen antialiased">{children}</body>
    </html>
  );
}
