import type { MetadataRoute } from "next";
import { getEras, getHiddenPages, getTours, getVideos } from "@/lib/data";
import { TOGGLE_PAGES } from "@/lib/pages";
import { SITE_URL } from "@/lib/site";

// Rebuilt at most once an hour, so new videos reach Google without a deploy.
export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [eras, tours, videos, hidden] = await Promise.all([
    getEras(),
    getTours(),
    getVideos(),
    getHiddenPages(),
  ]);
  const now = new Date();
  const pages = TOGGLE_PAGES.filter((p) => !hidden.includes(p.key));

  return [
    { url: SITE_URL, lastModified: now, changeFrequency: "daily", priority: 1 },
    ...pages.map((p) => ({
      url: `${SITE_URL}${p.href}`,
      lastModified: now,
      changeFrequency: "weekly" as const,
      priority: 0.7,
    })),
    { url: `${SITE_URL}/submit`, changeFrequency: "monthly", priority: 0.3 },
    ...(hidden.includes("eras")
      ? []
      : eras.map((e) => ({
          url: `${SITE_URL}/eras/${e.slug}`,
          changeFrequency: "weekly" as const,
          priority: 0.8,
        }))),
    ...(hidden.includes("tours")
      ? []
      : tours.map((t) => ({
          url: `${SITE_URL}/tours/${t.slug}`,
          changeFrequency: "monthly" as const,
          priority: 0.6,
        }))),
    ...videos.map((v) => ({
      url: `${SITE_URL}/watch/${v.id}`,
      lastModified: v.created_at ? new Date(v.created_at) : undefined,
      changeFrequency: "monthly" as const,
      priority: 0.6,
    })),
  ];
}
