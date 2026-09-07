import type { Metadata } from "next";
import { AUTH_PATH } from "@/lib/auth/constants";

export const SITE_NAME = "Authward";
export const SITE_TAGLINE = "Secure Authentication";
export const SITE_DESCRIPTION =
  "Authward is a hardened, server-side authentication engine. Register with a verified email, sign in securely, and recover your password — all rendered 100% on the server.";

export const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ?? "https://authward.example.com";

export const siteMetadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: `${SITE_NAME} — ${SITE_TAGLINE}`,
    template: `%s | ${SITE_NAME}`,
  },
  description: SITE_DESCRIPTION,
  applicationName: SITE_NAME,
  authors: [{ name: SITE_NAME, url: SITE_URL }],
  creator: SITE_NAME,
  publisher: SITE_NAME,
  category: "Technology",
  keywords: [
    "authentication",
    "secure authentication",
    "email verification",
    "password reset",
    "password recovery",
    "account security",
    SITE_NAME,
  ],
  alternates: {
    canonical: AUTH_PATH,
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
      "max-video-preview": -1,
    },
  },
  openGraph: {
    type: "website",
    locale: "en_US",
    url: SITE_URL,
    siteName: SITE_NAME,
    title: `${SITE_NAME} — ${SITE_TAGLINE}`,
    description: SITE_DESCRIPTION,
    images: [{ url: "/icon.svg", width: 512, height: 512, alt: `${SITE_NAME} logo` }],
  },
  twitter: {
    card: "summary",
    title: `${SITE_NAME} — ${SITE_TAGLINE}`,
    description: SITE_DESCRIPTION,
    images: ["/icon.svg"],
  },
  appleWebApp: {
    title: SITE_NAME,
    statusBarStyle: "default",
    capable: true,
  },
  formatDetection: {
    telephone: false,
    address: false,
    email: false,
  },
  icons: {
    icon: [{ url: "/icon.svg", type: "image/svg+xml" }],
    shortcut: [{ url: "/icon.svg", type: "image/svg+xml" }],
    apple: [{ url: "/icon.svg", type: "image/svg+xml" }],
  },
};
