/**
 * YouTube-wide discovery for the catalogue robot (YouTube Data API v3 — free key,
 * no card: 10,000 units/day; a search costs 100, video details cost 1 per 50).
 * Settings live in automation/youtube-search.json.
 *
 *  - fresh:   every query, newest first, uploads from the last few days
 *  - archive: every query inside ONE year (a different year each day), most viewed first
 * Then video details for every candidate: real duration (drops Shorts), views,
 * embeddable only (the site plays videos as embeds), plus the title filters.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { ROOT, opt } from "../lib.mjs";

const API = "https://www.googleapis.com/youtube/v3";
export const youtubeKey = () => process.env.YOUTUBE_API_KEY?.trim() || null;
export const searchConfig = () => JSON.parse(readFileSync(join(ROOT, "automation/youtube-search.json"), "utf8"));

async function api(path, params) {
  const url = `${API}/${path}?${new URLSearchParams({ ...params, key: youtubeKey() })}`;
  const res = await fetch(url, { signal: AbortSignal.timeout(15000) });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json.error?.message || `YouTube API ${res.status}`);
  return json;
}

/** ISO 8601 duration (PT1H2M3S) → seconds. */
export function seconds(iso) {
  const m = iso?.match(/P(?:(\d+)D)?T?(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
  if (!m) return 0;
  return (+m[1] || 0) * 86400 + (+m[2] || 0) * 3600 + (+m[3] || 0) * 60 + (+m[4] || 0);
}

const clock = (s) => (s >= 3600 ? `${Math.floor(s / 3600)}:${String(Math.floor((s % 3600) / 60)).padStart(2, "0")}` : `${Math.floor(s / 60)}`) + `:${String(s % 60).padStart(2, "0")}`;
const compact = (n) => (n >= 1e6 ? `${(n / 1e6).toFixed(1).replace(/\.0$/, "")}M` : n >= 1e3 ? `${Math.round(n / 1e3)}K` : String(n));

/** Title-level filters: must name Gaga, must not be a cover/reaction/etc. */
export function titleProblem(title, cfg) {
  const t = title.toLowerCase();
  if (!/\bgaga\b/.test(t)) return "no Gaga in title";
  const bad = cfg.exclude.find((w) => t.includes(w.toLowerCase()));
  return bad ? `excluded word “${bad}”` : null;
}

/** Details for up to 50 ids per call: duration, views, embeddable, clean title, channel, best thumbnail. */
export async function videoDetails(ids) {
  const out = new Map();
  for (let i = 0; i < ids.length; i += 50) {
    const json = await api("videos", { part: "snippet,contentDetails,statistics,status", id: ids.slice(i, i + 50).join(","), maxResults: "50" });
    for (const v of json.items ?? []) {
      const th = v.snippet.thumbnails ?? {};
      out.set(v.id, {
        title: v.snippet.title,
        channel: v.snippet.channelTitle,
        channelId: v.snippet.channelId,
        published: v.snippet.publishedAt,
        seconds: seconds(v.contentDetails.duration),
        views: Number(v.statistics?.viewCount ?? 0),
        embeddable: v.status?.embeddable !== false,
        live: v.snippet.liveBroadcastContent && v.snippet.liveBroadcastContent !== "none",
        thumbnail: (th.maxres ?? th.standard ?? th.high ?? th.medium ?? th.default)?.url ?? null,
      });
    }
  }
  return out;
}

/** Does this video pass the duration / embeddable / views rules for its kind ("fresh" | "archive" | "rss")? */
export function detailProblem(d, cfg, kind) {
  if (!d) return "not found";
  if (d.live) return "live/upcoming stream";
  if (!d.embeddable) return "embedding disabled";
  if (d.seconds < cfg.minSeconds) return "Short / too short";
  if (d.seconds > cfg.maxSeconds) return "too long";
  const min = kind === "rss" ? 0 : cfg.minViews[kind] ?? 0;
  if (d.views < min) return `only ${d.views} views`;
  return null;
}

export const detailNote = (d) => `${compact(d.views)} views · ${clock(d.seconds)}`;

/**
 * Search YouTube and return candidate ids with their kind.
 * Returns { candidates: Map<id, kind>, log: string[], year }.
 */
export async function searchCandidates(now = new Date()) {
  const cfg = searchConfig();
  const candidates = new Map();
  const log = [];
  const fresh = new Date(now.getTime() - cfg.freshDays * 864e5).toISOString();
  for (const q of cfg.fresh) {
    try {
      const json = await api("search", { part: "id", type: "video", videoEmbeddable: "true", q, order: "date", publishedAfter: fresh, maxResults: "50" });
      const ids = (json.items ?? []).map((i) => i.id.videoId).filter(Boolean);
      ids.forEach((id) => candidates.has(id) || candidates.set(id, "fresh"));
      log.push(`| fresh | ${q} | ${ids.length} |`);
    } catch (err) {
      log.push(`| fresh | ${q} | ⚠️ ${err.message} |`);
    }
  }
  // one year per day, cycling 2008 → this year (--year to force one)
  const years = now.getUTCFullYear() - cfg.firstYear + 1;
  const year = Number(opt("--year")) || cfg.firstYear + (Math.floor(now.getTime() / 864e5) % years);
  for (const q of cfg.archive) {
    try {
      const json = await api("search", {
        part: "id", type: "video", videoEmbeddable: "true", q, order: "viewCount", maxResults: "50",
        publishedAfter: `${year}-01-01T00:00:00Z`, publishedBefore: `${year + 1}-01-01T00:00:00Z`,
      });
      const ids = (json.items ?? []).map((i) => i.id.videoId).filter(Boolean);
      ids.forEach((id) => candidates.has(id) || candidates.set(id, "archive"));
      log.push(`| archive ${year} | ${q} | ${ids.length} |`);
    } catch (err) {
      log.push(`| archive ${year} | ${q} | ⚠️ ${err.message} |`);
    }
  }
  return { candidates, log, year, cfg };
}
