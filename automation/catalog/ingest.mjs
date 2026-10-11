/**
 * Catalogue robot — runs daily on GitHub Actions.
 *
 *   node automation/catalog/ingest.mjs              # reads every channel in automation/channels.json
 *   node automation/catalog/ingest.mjs --dry-run    # show what would enter the inbox, write nothing
 *   node automation/catalog/ingest.mjs --feed-file feed.xml   # offline test with a saved RSS feed
 *
 * For each channel it reads the public YouTube RSS feed (latest ~15 uploads,
 * no API key), keeps videos with "Gaga" in the title (any video from Gaga's
 * own channel), skips anything already in the catalogue or already in the
 * inbox (approved OR rejected), and adds the rest to public.video_inbox as
 * "pending" with a suggested type and era. Nothing goes public until you
 * approve it in /admin/inbox.
 *
 * Without SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY it runs as --dry-run.
 */
import { readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { mentionsGaga, suggestEra, suggestType } from "../../src/lib/classify.ts";
import { ROOT, adminClient, flag, loadSiteData, opt, summary, youtubeId } from "../lib.mjs";

const UA = "Mozilla/5.0 (compatible; GAGAFLIX-bot/1.0; +https://gagaflix.com)";
const MAX_AGE_DAYS = Number(process.env.INGEST_MAX_AGE_DAYS || 45);

const decode = (s) =>
  s
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
    .trim();

const tag = (xml, name) => {
  const m = xml.match(new RegExp(`<${name}[^>]*>([\\s\\S]*?)</${name}>`));
  return m ? decode(m[1]) : null;
};

/** Parse a YouTube channel feed (Atom) into plain entries. */
export function parseFeed(xml) {
  const channelName = tag(xml.split("<entry>")[0], "title");
  return [...xml.matchAll(/<entry>([\s\S]*?)<\/entry>/g)].map(([, e]) => {
    const id = tag(e, "yt:videoId");
    const thumb = e.match(/<media:thumbnail url="([^"]+)"/)?.[1] ?? null;
    return {
      source_id: id,
      url: `https://www.youtube.com/watch?v=${id}`,
      title: tag(e, "title") ?? "",
      published_at: tag(e, "published"),
      thumbnail_url: thumb ?? (id ? `https://i.ytimg.com/vi/${id}/hqdefault.jpg` : null),
      channel_name: channelName,
    };
  });
}

/** @handle → UC… channel id, read from the public channel page (no key). */
async function resolveHandle(handle) {
  const res = await fetch(`https://www.youtube.com/${handle}`, {
    headers: { "User-Agent": UA, "Accept-Language": "en" },
  });
  if (!res.ok) throw new Error(`channel page ${res.status}`);
  const html = await res.text();
  const id =
    html.match(/<link rel="canonical" href="https:\/\/www\.youtube\.com\/channel\/(UC[\w-]{22})"/)?.[1] ??
    html.match(/"externalId":"(UC[\w-]{22})"/)?.[1] ??
    html.match(/"channelId":"(UC[\w-]{22})"/)?.[1];
  if (!id) throw new Error("channel id not found on the page");
  return id;
}

async function fetchFeed(channel) {
  const id = channel.id || (await resolveHandle(channel.handle));
  const res = await fetch(`https://www.youtube.com/feeds/videos.xml?channel_id=${id}`, {
    headers: { "User-Agent": UA },
  });
  if (!res.ok) throw new Error(`feed ${res.status}`);
  return { id, xml: await res.text() };
}

async function main() {
  const db = flag("--dry-run") ? null : adminClient();
  const dry = !db;
  const { channels } = JSON.parse(readFileSync(join(ROOT, "automation/channels.json"), "utf8"));
  const { eras, videos, moments, source } = await loadSiteData(adminClient());

  // Everything we already know about: catalogue + the whole inbox history.
  const known = new Set(videos.map((v) => youtubeId(v.url)).filter(Boolean));
  const knownUrls = new Set(videos.map((v) => v.url.trim()));
  if (db) {
    const { data, error } = await db.from("video_inbox").select("source_id, url");
    if (error) throw new Error(`video_inbox: ${error.message} — did you run supabase/automation.sql?`);
    for (const r of data) {
      if (r.source_id) known.add(r.source_id);
      knownUrls.add(r.url.trim());
    }
  }

  const cutoff = Date.now() - MAX_AGE_DAYS * 864e5;
  const fresh = [];
  const report = [];

  const feeds = opt("--feed-file")
    ? [{ channel: { name: "local file", requireGaga: true }, xml: readFileSync(resolve(opt("--feed-file")), "utf8") }]
    : channels.map((channel) => ({ channel }));

  for (const f of feeds) {
    const { channel } = f;
    let xml = f.xml;
    try {
      if (!xml) xml = (await fetchFeed(channel)).xml;
    } catch (err) {
      console.warn(`✗ ${channel.name}: ${err.message}`);
      report.push(`| ${channel.name} | ⚠️ ${err.message} | |`);
      continue;
    }
    const entries = parseFeed(xml);
    let kept = 0;
    for (const e of entries) {
      if (!e.source_id) continue;
      if (channel.requireGaga !== false && !mentionsGaga(e.title)) continue;
      if (e.published_at && new Date(e.published_at).getTime() < cutoff) continue;
      if (known.has(e.source_id) || knownUrls.has(e.url)) continue;
      known.add(e.source_id);
      fresh.push({
        ...e,
        channel_name: e.channel_name || channel.name,
        origin: "rss",
        status: "pending",
        suggested_type: suggestType(e.title) ?? channel.defaultType ?? null,
        suggested_era: suggestEra(e.title, e.published_at, eras, moments),
      });
      kept++;
    }
    console.log(`✓ ${channel.name}: ${entries.length} in feed, ${kept} new`);
    report.push(`| ${channel.name} | ${entries.length} | ${kept} |`);
  }

  for (const r of fresh) {
    console.log(`  + [${r.suggested_type ?? "?"} · ${r.suggested_era ?? "?"}] ${r.title}  (${r.channel_name})`);
  }

  if (!dry && fresh.length) {
    const { error } = await db
      .from("video_inbox")
      .upsert(fresh, { onConflict: "source_id", ignoreDuplicates: true });
    if (error) throw new Error(`insert failed: ${error.message}`);
  }

  const verdict = dry
    ? `Dry run (data: ${source}) — ${fresh.length} video(s) would enter the inbox.`
    : `${fresh.length} new video(s) added to the inbox → review them at /admin/inbox.`;
  console.log(`\n${verdict}`);
  summary(
    [
      "## 🎬 GAGAFLIX catalogue robot",
      verdict,
      "",
      "| Channel | In feed | New |",
      "|---|---|---|",
      ...report,
      "",
      ...fresh.map((r) => `- **${r.title}** — ${r.channel_name} · ${r.suggested_type ?? "?"} · ${r.suggested_era ?? "?"}`),
    ].join("\n"),
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
