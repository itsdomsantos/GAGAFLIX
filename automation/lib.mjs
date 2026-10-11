/**
 * Shared plumbing for the GitHub Action scripts (catalogue robot + Instagram
 * autopilot). Plain Node 22: the .ts files under src/lib are imported directly
 * (Node strips the type annotations), so the robot uses exactly the same seed
 * content and suggestion rules as the site.
 */
import { appendFileSync, existsSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { createClient } from "@supabase/supabase-js";
import { seedEras, seedTimeline, seedVideos } from "../src/lib/seed.ts";

export const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
export const SITE_URL = (process.env.SITE_URL || "https://gagaflix.com").replace(/\/$/, "");

const cleanUrl = (raw) => raw.trim().replace(/\/rest\/v1\/?$/, "").replace(/\/+$/, "");

/** Service-role client (bypasses RLS) — null when the secrets aren't set. */
export function adminClient() {
  const url = cleanUrl(process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || "");
  const key = (process.env.SUPABASE_SERVICE_ROLE_KEY || "").trim();
  if (!url || !key) return null;
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}

export function supabaseBaseUrl() {
  return cleanUrl(process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || "");
}

/** public/eras/<slug>.png when the era has no image set in /admin (same rule as the site). */
function localEraArt(slug) {
  for (const ext of ["png", "jpg", "jpeg", "webp"]) {
    const p = join(ROOT, "public", "eras", `${slug}.${ext}`);
    if (existsSync(p)) return p;
  }
  return null;
}

/**
 * Eras, visible videos and timeline — from Supabase when connected, otherwise
 * the site's seed content (so dry runs work with zero setup).
 * Era images come back as { image: absolute URL or local file path }.
 */
export async function loadSiteData(db = adminClient()) {
  let eras = seedEras;
  let videos = seedVideos;
  let moments = seedTimeline;
  let source = "seed";
  if (db) {
    const [e, v, t] = await Promise.all([
      db.from("eras").select("*").order("sort"),
      db.from("videos").select("*"),
      db.from("timeline_moments").select("*").order("date"),
    ]);
    for (const r of [e, v, t]) if (r.error) throw new Error(`Supabase: ${r.error.message}`);
    eras = e.data;
    videos = v.data.filter((x) => !x.unavailable_since);
    moments = t.data;
    source = "supabase";
  }
  const withArt = eras.map((era) => ({
    ...era,
    image: absolutise(era.image_url) || localEraArt(era.slug),
  }));
  return { eras: withArt, videos, moments, source };
}

/** "/eras/x.png" (a site path) → a URL the renderer can load. */
export function absolutise(url) {
  if (!url) return null;
  if (/^https?:\/\//.test(url)) return url;
  if (url.startsWith("/")) {
    const local = join(ROOT, "public", url);
    return existsSync(local) ? local : `${SITE_URL}${url}`;
  }
  return url;
}

export function youtubeId(url) {
  const m =
    url.match(/youtu\.be\/([\w-]{6,})/) ||
    url.match(/youtube\.com\/(?:watch\?(?:.*&)?v=|embed\/|shorts\/|live\/)([\w-]{6,})/);
  return m ? m[1] : null;
}

/** Appends Markdown to the GitHub Actions run summary (no-op locally). */
export function summary(md) {
  if (process.env.GITHUB_STEP_SUMMARY) appendFileSync(process.env.GITHUB_STEP_SUMMARY, md + "\n");
}

export const args = process.argv.slice(2);
export const flag = (n) => args.includes(n);
export const opt = (n) => (args.includes(n) ? args[args.indexOf(n) + 1] : undefined);
