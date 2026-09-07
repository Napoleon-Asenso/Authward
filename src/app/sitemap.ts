import type { MetadataRoute } from "next";
import { AUTH_PATH, DASHBOARD_PATH } from "@/lib/auth/constants";
import { SITE_URL } from "@/lib/site";

export default function sitemap(): MetadataRoute.Sitemap {
  const routes: Array<{
    path: string;
    priority: number;
  }> = [
    { path: AUTH_PATH, priority: 1 },
    { path: DASHBOARD_PATH, priority: 0.5 },
  ];

  const now = new Date();

  return routes.map(({ path, priority }) => ({
    url: `${SITE_URL}${path}`,
    lastModified: now,
    changeFrequency: "monthly",
    priority,
  }));
}