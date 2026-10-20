/**
 * GAGAFLIX Instagram autopilot (GitHub Actions). Three runs a day:
 *
 *   --slot news    ×2 a day — one Lady Gaga news story each run (Lady Gaga Now first, then
 *                  Billboard, Variety…, see automation/news-sources.json). Never the same
 *                  story twice, not even told by another outlet.
 *   --slot extra   ×1 a day — the "special" post, by priority:
 *                    1. today   — a moment from the site's timeline or an entry in the LGN
 *                                 calendar happens today ("N years ago today", "Today: …")
 *                    2. new     — videos added to GAGAFLIX since the last one (one post,
 *                                 a carousel when there are several — never one per video)
 *                    3. promo   — rotation: from the vault → era spotlight → site reel
 *
 * Force one format to test it: --slot today | new | vault | era | reel
 * Testing flags: --dry-run · --today 2026-10-21 · --demo-new 3 (treat the 3 newest videos as
 * just added) · --news-file feed.xml · --calendar-file cal.ics
 *
 * Every word comes from the site's own data or from the source it credits — nothing is
 * invented. Without INSTAGRAM_* secrets (or with --dry-run) it only renders: files land in
 * out/social/<date>-<slot>/ and the GitHub run uploads them as an artifact.
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { VIDEO_TYPE_LABELS } from "../../src/lib/types.ts";
import { ROOT, SITE_URL, adminClient, flag, loadSiteData, opt, summary } from "../lib.mjs";
import { todaysEvents } from "./calendar.mjs";
import { instagramConfigured, postCarousel, postImage, postReel } from "./instagram.mjs";
import { enrich, freshNews, newsKey, sameStory, sentences } from "./news.mjs";
import { openBrowser, renderCards, thumbCandidates } from "./render.mjs";
import { renderSiteReel } from "./site-reel.mjs";
import { hostFile, loadState, saveState } from "./state.mjs";

// promo rotation for the extra slot. Reels are NOT in it: the owner edits every promo reel
// before it goes out, so the reel slot only renders one (see reelPost) and never publishes.
const PROMOS = ["vault", "era"];
const BASE_TAGS = ["#LadyGaga", "#LittleMonsters", "#Gaga"];
const NOTE = "Fan-made, non-profit.";
// the article's own photo (credited) unless NEWS_ARTICLE_IMAGES=0; outlet logos/placeholders are skipped
const ARTICLE_IMAGES = process.env.NEWS_ARTICLE_IMAGES !== "0";
const articlePhoto = (url) => (url && !/logo|default|placeholder|favicon|sprite|blank/i.test(url) ? [url] : []);

const slot = opt("--slot") || "extra";
const today = opt("--today") || new Date().toISOString().slice(0, 10);
const now = opt("--today") ? new Date(`${today}T17:00:00Z`) : new Date();
const year = Number(today.slice(0, 4));
const db = adminClient();
const live = !flag("--dry-run") && instagramConfigured() && Boolean(db);
const outDir = join(ROOT, "out/social", `${today}-${slot}-${now.getUTCHours()}h`);

/* ---------------- helpers ---------------- */

const tagOf = (s) => "#" + s.normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^A-Za-z0-9]/g, "");
const hashtags = (...extra) => [...new Set([...BASE_TAGS, ...extra.filter(Boolean)])].join(" ");
const dateLabel = (iso) =>
  new Date(`${iso.slice(0, 10)}T12:00:00Z`)
    .toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" })
    .replace(/, /, " · ");
const short = (iso) => new Date(`${iso.slice(0, 10)}T12:00:00Z`).toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" });
const singular = (type) => VIDEO_TYPE_LABELS[type].replace(/s$/, "").replace(/^Docs & Extra$/, "Doc & Extra");
/** The event, unless it just repeats the type ("Official Music Video" on a music video). */
const eventOf = (v) => (v.event && !/^official (music )?video$/i.test(v.event.trim()) ? v.event : null);
const dayNumber = Math.floor(now.getTime() / 864e5);
const norm = (t) => t.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, " ").trim();
const theEra = (name) => `${/^the /i.test(name) ? "" : "the "}${name} era`;

/** Caption credit for the picture actually used on a card. */
function creditFor(src, video) {
  if (!src) return null;
  if (/i\.ytimg\.com/.test(src) && video) return `Image: thumbnail of “${video.title}” (YouTube).`;
  return "Images © their respective owners.";
}

/**
 * The best Gaga photo from our own catalogue for a piece of text: a video whose
 * title is named in it, else an era that is named, else the current era (a
 * different video each day so the feed doesn't repeat one picture).
 */
/** Videos whose picture went out recently (state.recentPhotos) are skipped, so the feed never repeats a photo. */
const pickedNow = [];
const hash = (t) => [...t].reduce((h, c) => (h * 31 + c.charCodeAt(0)) >>> 0, 7);
function pickFresh(pool, seed, state) {
  if (!pool.length) return null;
  const recent = new Set([...(state?.recentPhotos ?? []), ...pickedNow]);
  const fresh = pool.filter((v) => !recent.has(v.id));
  const list = fresh.length ? fresh : pool;
  const v = list[hash(seed) % list.length];
  pickedNow.push(v.id);
  return v;
}

const GENERIC = new Set(["live", "interview", "performance", "official", "full", "full show", "full concert", "concert", "music video", "red carpet", "behind the scenes", "speech", "acceptance speech"]);

function photoFor(text, data, state) {
  const t = ` ${norm(text)} `;
  const eraOf = (slug) => data.eras.find((e) => e.slug === slug) ?? null;
  const withThumb = data.videos.filter((v) => thumbCandidates(v).length);
  // "Lady Gaga - Bad Romance (Official Music Video)" → "bad romance": the artist prefix is not a title,
  // and every story says "Lady Gaga" (this used to match one video for every story)
  const shortTitle = (v) => {
    const parts = v.title.split(/\s[—–-]\s|:\s/);
    const main = parts.length > 1 && /^\s*(lady\s+)?gaga\b/i.test(parts[0]) ? parts[1] : parts[0];
    const n = norm(main.split(/\s\(/)[0]);
    return GENERIC.has(n) || /\bgaga\b/.test(n) ? "" : n;
  };
  const named = withThumb
    .filter((v) => shortTitle(v).length >= 4 && t.includes(` ${shortTitle(v)} `))
    .sort((a, b) => Number(b.type === "mv") - Number(a.type === "mv") || shortTitle(b).length - shortTitle(a).length);
  if (named.length) {
    pickedNow.push(named[0].id);
    return { video: named[0], era: eraOf(named[0].era_slug) };
  }
  const era = [...data.eras].sort((a, b) => b.name.length - a.name.length).find((e) => norm(e.name).length >= 4 && t.includes(` ${norm(e.name.split(":")[0])} `));
  if (era) return { video: pickFresh(withThumb.filter((v) => v.era_slug === era.slug), text, state), era };
  // nothing named: any era — music videos and performances, never the same picture twice in a row
  const showy = withThumb.filter((v) => v.type === "mv" || v.type === "live");
  const video = pickFresh(showy.length ? showy : withThumb, text, state);
  return { video, era: video ? eraOf(video.era_slug) : null };
}
const imagesOf = ({ video, era }) => [...(video ? thumbCandidates(video) : []), era?.image].filter(Boolean);

/* ---------------- publishing ---------------- */

async function ship({ kind, files, caption, video }) {
  mkdirSync(outDir, { recursive: true });
  writeFileSync(join(outDir, "caption.txt"), caption + "\n");
  console.log(`\n── ${slot} · ${kind} ──\n${caption}\n\nfiles:\n${[...(video ? [video] : []), ...files].map((f) => "  " + f).join("\n")}`);
  summary(`## 📸 Instagram · ${slot} · ${kind} · ${today}\n${live ? "Published." : "**Dry run** — nothing published. Download the images from this run's artifacts."}\n\n\`\`\`\n${caption}\n\`\`\``);
  if (!live) {
    console.log("\n(dry run — nothing published)");
    return null;
  }
  const folder = `${today}-${kind}-${Date.now().toString(36)}`;
  const urls = [];
  for (const f of files) urls.push(await hostFile(db, f, folder));
  let id;
  if (video) id = await postReel(await hostFile(db, video, folder), caption, urls[0]);
  else if (urls.length === 1) id = await postImage(urls[0], caption);
  else id = await postCarousel(urls, caption);
  console.log(`✓ published to Instagram (${id})`);
  return id;
}

/* ---------------- news ---------------- */

async function newsPost(data, state, browser) {
  const stories = await freshNews(state, now);
  console.log(`${stories.length} fresh Gaga stories`);
  if (!stories.length) return null;
  const story = await enrich(stories[0]);
  const match = photoFor(`${story.title} ${story.summary}`, data, state);
  const images = [...(ARTICLE_IMAGES ? articlePhoto(story.articleImage) : []), ...imagesOf(match)];
  const card = {
    kind: "news",
    images,
    data: { accent: match.era?.accent, outlet: story.outlet, dateLabel: short(story.date), title: story.title, summary: story.summary, titleMax: 120, titleLines: 4 },
  };
  const files = await renderCards([card], outDir, browser);
  const credit = card.chosen && card.chosen === story.articleImage ? `Image via ${story.outlet}.` : creditFor(card.chosen, match.video);
  const caption = [
    `${story.title} 📰`,
    ...(story.summary ? ["", story.summary] : []),
    "",
    `Source: ${story.outlet}.`,
    "Every Lady Gaga era, video and moment on GAGAFLIX → link in bio",
    "",
    credit,
    NOTE,
    "",
    hashtags("#GagaNews", match.era && tagOf(match.era.name)),
  ]
    .filter((l) => l !== null)
    .join("\n");
  const id = await ship({ kind: "news", files, caption });
  return {
    id,
    mark: () => {
      state.posted[newsKey(story.url)] = now.toISOString();
      state.recentNews = [...(state.recentNews ?? []), { title: story.title, at: now.toISOString() }].filter((r) => now - new Date(r.at) < 10 * 864e5).slice(-80);
    },
  };
}

/* ---------------- extra: today ---------------- */

async function todayPost(data, state, browser) {
  const moments = data.moments
    .filter((m) => m.date.slice(5, 10) === today.slice(5, 10) && Number(m.date.slice(0, 4)) < year)
    .filter((m) => !state.posted[`moment:${m.id}:${year}`]);
  const events = (await todaysEvents(state, today)).filter((ev) => !moments.some((m) => sameStory(m.title, ev.title)));
  if (!moments.length && !events.length) return null;

  const items = [
    ...moments.map((m) => {
      const era = data.eras.find((e) => e.slug === m.era_slug) ?? null;
      // the era's video closest in time to the moment gives the most fitting photo
      const near = data.videos
        .filter((v) => v.era_slug === m.era_slug && v.date && thumbCandidates(v).length)
        .sort((a, b) => Math.abs(new Date(a.date) - new Date(m.date)) - Math.abs(new Date(b.date) - new Date(m.date)))[0];
      const years = year - Number(m.date.slice(0, 4));
      return {
        key: `moment:${m.id}:${year}`,
        line: `${years} year${years === 1 ? "" : "s"} ago today: ${m.title}.`,
        body: m.body,
        source: null,
        era,
        video: near,
        card: {
          kind: "anniversary",
          images: [m.image_url, ...(near ? thumbCandidates(near) : []), era?.image].filter(Boolean),
          data: { accent: era?.accent, years, dateLabel: dateLabel(m.date), title: m.title, body: m.body, eraName: era?.name },
        },
      };
    }),
    ...events.map((ev) => {
      let match = photoFor(`${ev.title} ${ev.description ?? ""}`, data, state);
      // curated anniversaries know their era: use its photo and hashtag
      const knownEra = ev.era && match.era?.slug !== ev.era ? data.eras.find((e) => e.slug === ev.era) : null;
      if (knownEra) {
        const pool = data.videos.filter((v) => v.era_slug === knownEra.slug && thumbCandidates(v).length);
        match = { era: knownEra, video: pickFresh(pool, ev.title, state) };
      }
      const body = sentences(ev.description, ev.title, 220) || null;
      const line = ev.years
        ? `${ev.years} year${ev.years === 1 ? "" : "s"} ago today: ${ev.title}.`
        : ev.anniversary
          ? `On this day: ${ev.title}.`
          : `Today: ${ev.title}.`;
      return {
        key: ev.key,
        line,
        body,
        source: "Lady Gaga Now calendar",
        era: match.era,
        video: match.video,
        card: {
          kind: "anniversary",
          images: [...(ARTICLE_IMAGES ? articlePhoto(ev.image) : []), ...imagesOf(match)],
          data: {
            accent: match.era?.accent,
            years: ev.years,
            pill: ev.anniversary ? undefined : "Today",
            bigWord: "Today",
            bigLabel: ev.anniversary ? ["In Gaga", "history"] : ["Lady", "Gaga"],
            dateLabel: ev.from ? dateLabel(`${ev.from}${today.slice(4)}`) : dateLabel(today),
            title: ev.title,
            body,
            location: ev.location,
            footRight: "gagaflix.com",
          },
        },
      };
    }),
  ].slice(0, 10);

  const files = await renderCards(items.map((i) => i.card), outDir, browser);
  const eraNames = [...new Set(items.map((i) => i.era?.name).filter(Boolean))];
  const credits = [...new Set(items.map((i) => (i.card.chosen && i.card.chosen === i.card.images[0] && !/ytimg|\/eras\//.test(i.card.chosen) && i.source ? "Image via Lady Gaga Now." : creditFor(i.card.chosen, i.video))).filter(Boolean))];
  const caption = [
    items[0].line + " 🖤",
    ...(items[0].body ? [items[0].body] : []),
    ...items.slice(1).flatMap((i) => ["", i.line, ...(i.body ? [i.body] : [])]),
    "",
    eraNames.length === 1 ? `Relive ${theEra(eraNames[0])} on GAGAFLIX → link in bio` : "Relive it all on GAGAFLIX → link in bio",
    "",
    ...(items.some((i) => i.source) ? ["Dates: Lady Gaga Now calendar (ladygaganow.net)."] : []),
    ...credits,
    NOTE,
    "",
    hashtags(...eraNames.map(tagOf), "#OnThisDay", "#GagaHistory"),
  ].join("\n");
  const id = await ship({ kind: "today", files, caption });
  return { id, mark: () => items.forEach((i) => (state.posted[i.key] = now.toISOString())) };
}

/* ---------------- extra: new content ---------------- */

async function newPost(data, state, browser) {
  const since = Math.max(now - 3 * 864e5, state.lastNewAt ? new Date(state.lastNewAt).getTime() : 0);
  const vids = data.videos
    .filter((v) => v.created_at && new Date(v.created_at).getTime() > since && new Date(v.created_at) <= now)
    .filter((v) => !state.posted[`video:${v.id}`] && thumbCandidates(v).length)
    .sort((a, b) => b.created_at.localeCompare(a.created_at))
    .slice(0, 8);
  if (!vids.length) return null;
  const eraOf = (v) => data.eras.find((e) => e.slug === v.era_slug) ?? null;
  const videoCard = (v, i) => ({
    kind: "video",
    video: v,
    images: [...thumbCandidates(v), eraOf(v)?.image].filter(Boolean),
    data: {
      accent: eraOf(v)?.accent,
      label: "New on GAGAFLIX",
      page: vids.length > 1 ? `${i + 1}/${vids.length}` : "",
      typeLabel: singular(v.type),
      title: v.title,
      event: eventOf(v),
      year: v.date?.slice(0, 4),
      eraName: eraOf(v)?.name,
      titleMax: 130,
    },
  });
  const cards =
    vids.length === 1
      ? [videoCard(vids[0], 0)]
      : [
          {
            kind: "weekly",
            data: {
              pill: "Just added",
              headline: "Just<br/>added",
              range: short(today),
              count: vids.length,
              images: vids.slice(0, 4).map((v) => [...thumbCandidates(v), eraOf(v)?.image].filter(Boolean)),
            },
          },
          ...vids.map(videoCard),
          { kind: "cta", data: { line: "Watch them all.", sub: "New Lady Gaga videos land on GAGAFLIX all the time.", images: data.eras.map((e) => e.image).filter(Boolean) } },
        ];
  const files = await renderCards(cards, outDir, browser);
  const caption = [
    vids.length === 1 ? `New on GAGAFLIX: ${vids[0].title} 🔥` : `Just added to GAGAFLIX 🔥 ${vids.length} new videos:`,
    "",
    ...(vids.length === 1
      ? [[singular(vids[0].type), eventOf(vids[0]), vids[0].date?.slice(0, 4)].filter(Boolean).join(" · ")]
      : vids.map((v) => `• ${v.title}${eventOf(v) ? ` (${eventOf(v)})` : ""}`)),
    "",
    vids.length === 1 ? "Watch it on GAGAFLIX → link in bio" : "Watch them all → link in bio",
    "",
    cards.some((c) => /i\.ytimg\.com/.test(c.chosen ?? "")) ? "Images: video thumbnails (YouTube) © their respective owners." : "Images © their respective owners.",
    NOTE,
    "",
    hashtags("#GagaFlix", ...[...new Set(vids.map((v) => eraOf(v)?.name).filter(Boolean))].map(tagOf)),
  ].join("\n");
  const id = await ship({ kind: "new", files, caption });
  return {
    id,
    mark: () => {
      for (const v of vids) state.posted[`video:${v.id}`] = now.toISOString();
      state.lastNewAt = now.toISOString();
    },
  };
}

/* ---------------- extra: promo ---------------- */

/** A catalogue video not posted in the last year: featured first, then a different pick each day. */
async function vaultPost(data, state, browser) {
  const pool = data.videos.filter((v) => thumbCandidates(v).length && !state.posted[`video:${v.id}`]);
  if (!pool.length) return null;
  const featured = pool.filter((v) => v.featured || v.is_hero);
  const v = (featured.length && dayNumber % 3 === 0 ? featured : pool)[dayNumber % (featured.length && dayNumber % 3 === 0 ? featured : pool).length];
  const era = data.eras.find((e) => e.slug === v.era_slug) ?? null;
  const card = {
    kind: "video",
    images: [...thumbCandidates(v), era?.image].filter(Boolean),
    data: { accent: era?.accent, label: "From the vault", typeLabel: singular(v.type), title: v.title, event: eventOf(v), year: v.date?.slice(0, 4), eraName: era?.name },
  };
  const files = await renderCards([card], outDir, browser);
  const caption = [
    `From the vault: ${v.title} 🔥`,
    [singular(v.type), eventOf(v), v.date?.slice(0, 4)].filter(Boolean).join(" · "),
    "",
    "Watch it on GAGAFLIX → link in bio",
    "",
    creditFor(card.chosen, v),
    NOTE,
    "",
    hashtags(era && tagOf(era.name), tagOf(VIDEO_TYPE_LABELS[v.type])),
  ]
    .filter((l) => l !== null)
    .join("\n");
  const id = await ship({ kind: "vault", files, caption });
  return { id, mark: () => (state.posted[`video:${v.id}`] = now.toISOString()) };
}

async function eraPost(data, state, browser) {
  const eras = data.eras.filter((e) => e.image);
  if (!eras.length) return null;
  const era = eras[(state.eraIndex || 0) % eras.length];
  const nVideos = data.videos.filter((v) => v.era_slug === era.slug).length;
  const nMoments = data.moments.filter((m) => m.era_slug === era.slug).length;
  const stats =
    [nVideos && `${nVideos} video${nVideos === 1 ? "" : "s"}`, nMoments && `${nMoments} moment${nMoments === 1 ? "" : "s"}`].filter(Boolean).join("  ·  ") || "On GAGAFLIX";
  const files = await renderCards(
    [{ kind: "era", images: [era.image], data: { accent: era.accent, name: era.name, years: era.years, description: era.description, eraLogo: era.logo_url, stats } }],
    outDir,
    browser,
  );
  const caption = [
    `Era spotlight: ${era.name} (${era.years}) 🖤`,
    "",
    era.description,
    "",
    nVideos ? `${nVideos} ${era.name} video${nVideos === 1 ? "" : "s"} in one place → link in bio` : "Explore the era on GAGAFLIX → link in bio",
    "",
    "Images © their respective owners.",
    NOTE,
    "",
    hashtags(tagOf(era.name), "#GagaEras"),
  ].join("\n");
  const id = await ship({ kind: "era", files, caption });
  return { id, mark: () => (state.eraIndex = (state.eraIndex || 0) + 1) };
}

/** The real site, filmed on a phone: home, eras, a video, timeline, tours, search. */
async function reelPost(data, state, browser) {
  const firstYear = Math.min(...data.moments.map((m) => Number(m.date.slice(0, 4))));
  const { video, cover } = await renderSiteReel(
    {
      site: process.env.REEL_SITE_URL || SITE_URL,
      videos: data.videos,
      eras: data.eras,
      stats: { videos: data.videos.length, eras: data.eras.length, years: Number.isFinite(firstYear) ? year - firstYear : null },
    },
    outDir,
    browser,
  );
  const caption = [
    "Every era. Every performance. One place. 🖤",
    "",
    `GAGAFLIX is the Lady Gaga streaming archive: ${data.videos.length}+ music videos, live shows, interviews and fashion moments, organised by era, a timeline of her whole career, tour setlists you can tap, and instant search.`,
    "",
    "Free, no sign-up → link in bio",
    "",
    NOTE,
    "",
    hashtags("#GagaFlix", "#GagaEras"),
  ].join("\n");
  // never published: hosted for download so the owner can edit it and post it themselves
  mkdirSync(outDir, { recursive: true });
  writeFileSync(join(outDir, "caption.txt"), caption + "\n");
  let links = "";
  if (db) {
    const folder = `drafts/${today}-reel-${Date.now().toString(36)}`;
    const [videoUrl, coverUrl] = [await hostFile(db, video, folder), await hostFile(db, cover, folder)];
    links = `\n\nDownload: ${videoUrl}\nCover: ${coverUrl}`;
  }
  console.log(`\n── reel (draft, NOT published) ──\n${caption}\n\nfiles:\n  ${video}\n  ${cover}${links}`);
  summary(`## 🎬 Site reel — draft for you to edit (not published)${links.replace(/\n/g, "\n\n")}\n\nAlso in this run's artifacts.\n\n\`\`\`\n${caption}\n\`\`\``);
  return null;
}

/* ---------------- main ---------------- */

const FORMATS = { news: newsPost, today: todayPost, new: newPost, vault: vaultPost, era: eraPost, reel: reelPost };

async function main() {
  const data = await loadSiteData(db);
  if (opt("--demo-new")) {
    const n = Number(opt("--demo-new"));
    data.videos = data.videos.map((v, i) => (i < n ? { ...v, created_at: new Date(now - (i + 1) * 36e5).toISOString() } : v));
  }
  const state = await loadState(db);
  console.log(`GAGAFLIX autopilot · ${today} · slot ${slot} · data: ${data.source} · ${live ? "LIVE" : "dry run"}`);

  if (slot === "extra" && live && state.lastExtra?.slice(0, 10) === today) {
    console.log("Today's extra post already went out — nothing to do.");
    return;
  }

  const browser = await openBrowser();
  let result = null;
  let promoUsed = false;
  try {
    if (slot === "extra") {
      result = (await todayPost(data, state, browser)) ?? (await newPost(data, state, browser));
      if (!result) {
        // promo rotation; if one format has nothing to show, try the next
        for (let k = 0; k < PROMOS.length && !result; k++) {
          result = await FORMATS[PROMOS[((state.promoIndex || 0) + k) % PROMOS.length]](data, state, browser);
          if (result) state.promoIndex = (state.promoIndex || 0) + k; // advanced below once it went out
        }
        promoUsed = Boolean(result);
      }
    } else {
      const fn = FORMATS[slot];
      if (!fn) throw new Error(`Unknown slot "${slot}" — use news, extra, today, new, vault, era or reel`);
      result = await fn(data, state, browser);
    }
  } finally {
    await browser.close();
  }

  if (!result) {
    console.log(slot === "news" ? "No new Lady Gaga story since the last post — skipping this slot." : "Nothing to post.");
    return;
  }
  // Remember it only when it really went out (or in local test runs without Supabase).
  if (result.id || !db) {
    result.mark();
    state.recentPhotos = [...(state.recentPhotos ?? []), ...pickedNow].slice(-40);
    if (promoUsed) state.promoIndex = (state.promoIndex || 0) + 1;
    if (slot === "extra") state.lastExtra = now.toISOString();
    await saveState(db, state);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
