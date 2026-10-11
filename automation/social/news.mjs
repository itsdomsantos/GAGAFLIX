/**
 * Lady Gaga news for the Instagram autopilot. Reads the RSS feeds in
 * automation/news-sources.json (free, no key), keeps stories with "Gaga" in the
 * headline, drops junk (deals, quizzes…), merges the same story told by
 * several outlets and never repeats what was already posted.
 *
 * Words on the card are the outlet's own: its headline and the summary it
 * publishes in its feed / share preview — trimmed to whole sentences, never
 * rewritten, always credited.
 */
import { readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { ROOT, opt } from "../lib.mjs";

const UA = "Mozilla/5.0 (compatible; GAGAFLIX-bot/1.0; +https://gagaflix.com)";
const MAX_AGE_H = Number(process.env.NEWS_MAX_AGE_HOURS || 48);
const JUNK = /\b(deals?|% off|coupon|discount|promo code|shop(ping)?|buy now|quiz|horoscope|giveaway|best (gifts|buys))\b/i;

const entity = (s) =>
  s
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
    .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCodePoint(parseInt(n, 16)))
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&nbsp;/g, " ")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&");
const text = (s) => entity(entity(s ?? "").replace(/<[^>]+>/g, " ")).replace(/\s+/g, " ").trim();
const tag = (xml, name) => xml.match(new RegExp(`<${name}(?:\\s[^>]*)?>([\\s\\S]*?)</${name}>`, "i"))?.[1] ?? null;

/** RSS 2.0 and Atom entries → { title, url, date, excerpt, image, outlet }. */
export function parseNewsFeed(xml) {
  const items = [...xml.matchAll(/<(item|entry)(?:\s[^>]*)?>([\s\S]*?)<\/\1>/gi)].map((m) => m[2]);
  return items.map((it) => {
    const link =
      text(tag(it, "link")) ||
      it.match(/<link[^>]+rel="alternate"[^>]+href="([^"]+)"/i)?.[1] ||
      it.match(/<link[^>]+href="([^"]+)"/i)?.[1] ||
      "";
    const image =
      it.match(/<media:content[^>]+url="([^"]+)"[^>]*(?:medium="image"|type="image)/i)?.[1] ||
      it.match(/<media:content[^>]+url="([^"]+\.(?:jpe?g|png|webp)[^"]*)"/i)?.[1] ||
      it.match(/<media:thumbnail[^>]+url="([^"]+)"/i)?.[1] ||
      it.match(/<enclosure[^>]+url="([^"]+)"[^>]+type="image/i)?.[1] ||
      (tag(it, "content:encoded") ?? tag(it, "description") ?? "").match(/<img[^>]+src=["']([^"']+)["']/i)?.[1] ||
      null;
    const outlet = text(tag(it, "source")) || null;
    return {
      title: text(tag(it, "title")),
      url: entity(link.trim()),
      date: text(tag(it, "pubDate") || tag(it, "published") || tag(it, "updated") || tag(it, "dc:date")) || null,
      excerpt: text(tag(it, "description") || tag(it, "summary") || ""),
      image: image ? entity(image) : null,
      outlet,
    };
  });
}

/** Whole sentences only, up to `max` characters (a summary cut mid-sentence reads as nonsense). */
export function sentences(s, title, max = 240) {
  if (!s) return "";
  const clean = s.replace(/\s*(The post .* appeared first on .*|Continue reading.*|Read more.*|\[…\]|\[\.\.\.\])$/i, "").trim();
  // aggregator "descriptions" that just repeat the headline aren't summaries
  if (!clean || norm(clean).startsWith(norm(title).slice(0, 40))) return "";
  const parts = clean.match(/[^.!?]+[.!?]+(["”’)]+)?/g) ?? [];
  let out = "";
  for (const p of parts) {
    if ((out + p).trim().length > max) break;
    out += p;
  }
  return out.trim().length >= 40 ? out.trim() : "";
}

const norm = (t) => t.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, " ").trim();
const STOP = new Set("lady gaga the a an and of to in on for with at by from her his is are was new says after as it its this that".split(" "));
const words = (t) => new Set(norm(t).split(" ").filter((w) => w.length > 2 && !STOP.has(w)));

/** Same story told by two outlets? (shared meaningful words) */
export function sameStory(a, b) {
  const A = words(a), B = words(b);
  if (!A.size || !B.size) return false;
  let shared = 0;
  for (const w of A) if (B.has(w)) shared++;
  return shared / Math.min(A.size, B.size) >= 0.6;
}

export const newsKey = (url) => {
  try {
    const u = new URL(url);
    return "news:" + (u.hostname.replace(/^www\./, "") + u.pathname).replace(/\/$/, "").toLowerCase();
  } catch {
    return "news:" + url;
  }
};

async function fetchText(url, timeout = 10000) {
  const res = await fetch(url, { headers: { "User-Agent": UA, Accept: "application/rss+xml, application/xml, text/html;q=0.8, */*;q=0.5" }, signal: AbortSignal.timeout(timeout) });
  if (!res.ok) throw new Error(`${res.status}`);
  return res.text();
}

const meta = (html, p) =>
  html.match(new RegExp(`<meta[^>]+(?:property|name)=["'](?:og:)?${p}["'][^>]+content=["']([^"']*)["']`, "i"))?.[1] ??
  html.match(new RegExp(`<meta[^>]+content=["']([^"']*)["'][^>]+(?:property|name)=["'](?:og:)?${p}["']`, "i"))?.[1] ??
  null;

/** What an article page publishes about itself (share title/summary/image, publish date). */
export function articleMeta(html) {
  const get = (p) => (meta(html, p) ? entity(meta(html, p)) : null);
  return {
    title: get("title"),
    description: get("description"),
    image: get("image"),
    date:
      get("article:published_time") ||
      html.match(/<time[^>]+datetime=["']([^"']+)["']/i)?.[1] ||
      html.match(/"datePublished"\s*:\s*"([^"]+)"/)?.[1] ||
      null,
  };
}

async function sharePreview(url) {
  try {
    const m = articleMeta((await fetchText(url, 8000)).slice(0, 300_000));
    return { description: m.description, image: m.image };
  } catch {
    return { description: null, image: null };
  }
}

const isFeed = (xml) => /<(rss|feed|rdf:RDF)[\s>]/i.test(xml.slice(0, 2000)) && /<(item|entry)[\s>]/i.test(xml);

/**
 * One source → feed entries. Tries each candidate feed URL; if none answers
 * with a real feed and the source has a `page`, reads the news listing and
 * each article's own share data instead (works whatever CMS the site runs).
 */
export async function readSource(source) {
  for (const url of [source.feed ?? []].flat()) {
    try {
      const xml = await fetchText(url);
      if (isFeed(xml)) return parseNewsFeed(xml);
    } catch {
      /* try the next candidate */
    }
  }
  if (!source.page) throw new Error("no feed answered");
  const html = await fetchText(source.page);
  const re = new RegExp(source.linkPattern);
  const links = [...new Set([...html.matchAll(/href=["']([^"'#]+)["']/gi)].map((m) => new URL(entity(m[1]), source.page).href))]
    .filter((u) => re.test(u))
    .slice(0, 8);
  const out = [];
  for (const url of links) {
    try {
      const m = articleMeta((await fetchText(url, 8000)).slice(0, 400_000));
      if (m.title && m.date) out.push({ title: m.title.replace(/\s+[-|–]\s+Lady Gaga Now$/i, ""), url, date: m.date, excerpt: m.description ?? "", image: m.image, outlet: null });
    } catch {
      /* skip that article */
    }
  }
  return out;
}

/**
 * Fresh, not-yet-posted Gaga stories, best first.
 * --news-file <xml> reads one saved feed instead of the network (testing).
 */
export async function freshNews(state, now = new Date()) {
  const { sources } = JSON.parse(readFileSync(join(ROOT, "automation/news-sources.json"), "utf8"));
  const file = opt("--news-file");
  const feeds = file
    ? [{ source: { name: opt("--news-source") || "Lady Gaga Now", priority: 5 }, entries: parseNewsFeed(readFileSync(resolve(file), "utf8")) }]
    : await Promise.all(
        sources.map(async (source) => {
          try {
            return { source, entries: await readSource(source) };
          } catch (err) {
            console.warn(`  news: ${source.name} failed (${err.message})`);
            return { source, entries: [] };
          }
        }),
      );

  const recent = (state.recentNews ?? []).map((r) => r.title);
  const cutoff = now.getTime() - MAX_AGE_H * 36e5;
  const all = [];
  for (const { source, entries } of feeds) {
    for (const e of entries) {
      let title = e.title;
      const outlet = source.aggregator ? e.outlet || source.name : source.name;
      // Google News headlines end in " - Outlet"
      if (source.aggregator && e.outlet && title.endsWith(` - ${e.outlet}`)) title = title.slice(0, -(e.outlet.length + 3));
      if ((source.requireGaga !== false && !/\bgaga\b/i.test(title)) || JUNK.test(title)) continue;
      const t = e.date ? new Date(e.date).getTime() : NaN;
      if (!Number.isFinite(t) || t < cutoff || t > now.getTime() + 36e5) continue;
      if (state.posted?.[newsKey(e.url)] || recent.some((r) => sameStory(r, title))) continue;
      all.push({
        title,
        url: e.url,
        outlet,
        date: new Date(t).toISOString(),
        excerpt: source.aggregator ? "" : e.excerpt,
        image: source.aggregator ? null : e.image,
        priority: source.priority ?? 1,
        aggregator: Boolean(source.aggregator),
      });
    }
  }
  // one telling per story: the most trusted outlet, then the earliest
  const stories = [];
  for (const it of all.sort((a, b) => b.priority - a.priority || a.date.localeCompare(b.date))) {
    if (!stories.some((s) => sameStory(s.title, it.title))) stories.push(it);
  }
  // newest first, but a direct outlet beats an aggregator headline from the same day
  return stories.sort((a, b) => Number(a.aggregator) - Number(b.aggregator) || b.date.localeCompare(a.date));
}

/** Fill the outlet's own summary (and share image, if allowed) for the chosen story. */
export async function enrich(story) {
  let summary = sentences(story.excerpt, story.title);
  let image = story.image;
  if (!story.aggregator && (!summary || !image)) {
    const p = await sharePreview(story.url);
    summary ||= sentences(p.description, story.title);
    image ||= p.image;
  }
  return { ...story, summary, articleImage: image };
}
