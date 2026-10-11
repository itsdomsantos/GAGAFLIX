/**
 * GAGAFLIX Instagram autopilot — ONE post a day (GitHub Actions, ~17:00 UTC).
 *
 *   node automation/social/run.mjs                    # auto: picks today's post
 *   node automation/social/run.mjs --slot vault       # force a format: anniversary | weekly | vault | era | reel
 *   node automation/social/run.mjs --dry-run          # render only, never publish
 *   node automation/social/run.mjs --today 2026-10-21 # pretend it's another day (testing)
 *   node automation/social/run.mjs --demo-new 4       # testing: treat the 4 newest videos as added this week
 *
 * What "auto" posts, in order of priority:
 *   1. anniversary — a timeline moment happened on today's day & month → "N years ago today"
 *   2. weekly      — Sunday (or Monday if Sunday was an anniversary): "New this week" carousel
 *                    with the videos added in the last 7 days (needs at least 2). New videos are
 *                    never posted one by one.
 *   3. otherwise the rotation: vault → era → vault → reel (a catalogue video, an era
 *      spotlight, a promo reel), so the feed stays varied every day.
 *
 * Every word comes from the site's own data (timeline + catalogue) — nothing is invented.
 * Without INSTAGRAM_* secrets (or with --dry-run) it only renders: files land in
 * out/social/<date>-<slot>/ and the GitHub run uploads them as an artifact.
 */
import { writeFileSync } from "node:fs";
import { join } from "node:path";
import { VIDEO_TYPE_LABELS } from "../../src/lib/types.ts";
import { ROOT, adminClient, flag, loadSiteData, opt, summary } from "../lib.mjs";
import { instagramConfigured, postCarousel, postImage, postReel } from "./instagram.mjs";
import { openBrowser, renderCards, thumbCandidates } from "./render.mjs";
import { renderReel } from "./reel.mjs";
import { hostFile, loadState, saveState } from "./state.mjs";

const ROTATION = ["vault", "era", "vault", "reel"];
const MIN_WEEKLY = 2;
const BASE_TAGS = ["#LadyGaga", "#LittleMonsters", "#Gaga"];
const NOTE = "Fan-made, non-profit.";

const today = opt("--today") || new Date().toISOString().slice(0, 10);
const now = new Date(`${today}T17:00:00Z`);
const year = Number(today.slice(0, 4));
const db = adminClient();
const live = !flag("--dry-run") && instagramConfigured() && Boolean(db);
const outDir = join(ROOT, "out/social", `${today}-${opt("--slot") || "auto"}`);

/* ---------------- helpers ---------------- */

const tagOf = (s) =>
  "#" + s.normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^A-Za-z0-9]/g, "");
const hashtags = (...extra) => [...new Set([...BASE_TAGS, ...extra.filter(Boolean)])].join(" ");
const dateLabel = (iso) =>
  new Date(`${iso.slice(0, 10)}T12:00:00Z`).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" }).replace(/, /, " · ");
const short = (iso) =>
  new Date(`${iso.slice(0, 10)}T12:00:00Z`).toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" });
const singular = (type) => VIDEO_TYPE_LABELS[type].replace(/s$/, "").replace(/^Docs & Extra$/, "Doc & Extra");
/** The event, unless it just repeats the type ("Official Music Video" on a music video). */
const eventOf = (v) => (v.event && !/^official (music )?video$/i.test(v.event.trim()) ? v.event : null);
const dayNumber = Math.floor(now.getTime() / 864e5);

/** Caption credit for the picture actually used on a card. */
function creditFor(src, video) {
  if (!src) return null;
  if (/i\.ytimg\.com/.test(src) && video) return `Image: thumbnail of “${video.title}” (YouTube).`;
  return "Images © their respective owners.";
}

/* ---------------- what to post ---------------- */

function anniversaries(data, state) {
  return data.moments
    .filter((m) => m.date.slice(5, 10) === today.slice(5, 10) && Number(m.date.slice(0, 4)) < year)
    .filter((m) => !state.posted[`moment:${m.id}:${year}`]);
}

function weeklyVideos(data, state) {
  const dow = now.getUTCDay();
  const recentWeekly = state.lastWeekly && now - new Date(state.lastWeekly) < 3 * 864e5;
  const due = !recentWeekly && (dow === 0 || dow === 1);
  if (!due && opt("--slot") !== "weekly") return [];
  const since = now.getTime() - 7 * 864e5;
  return data.videos
    .filter((v) => v.created_at && new Date(v.created_at).getTime() > since && new Date(v.created_at) <= now)
    .filter((v) => !state.posted[`video:${v.id}`] && thumbCandidates(v).length)
    .sort((a, b) => b.created_at.localeCompare(a.created_at))
    .slice(0, 8);
}

/** A catalogue video not posted in the last year: featured first, then a different pick each day. */
function vaultPick(data, state) {
  const pool = data.videos.filter((v) => thumbCandidates(v).length && !state.posted[`video:${v.id}`]);
  if (!pool.length) return null;
  const featured = pool.filter((v) => v.featured || v.is_hero);
  const list = featured.length && dayNumber % 3 === 0 ? featured : pool;
  return list[dayNumber % list.length];
}

/* ---------------- publishing ---------------- */

async function ship({ slot, files, caption, video }) {
  writeFileSync(join(outDir, "caption.txt"), caption + "\n");
  console.log(`\n── ${slot} ──\n${caption}\n\nfiles:\n${[...(video ? [video] : []), ...files].map((f) => "  " + f).join("\n")}`);
  summary(`## 📸 Instagram · ${slot} · ${today}\n${live ? "Published." : "**Dry run** — nothing published. Download the images from this run's artifacts."}\n\n\`\`\`\n${caption}\n\`\`\``);
  if (!live) {
    console.log("\n(dry run — nothing published)");
    return null;
  }
  const folder = `${today}-${slot}-${Date.now().toString(36)}`;
  const urls = [];
  for (const f of files) urls.push(await hostFile(db, f, folder));
  let id;
  if (video) id = await postReel(await hostFile(db, video, folder), caption, urls[0]);
  else if (urls.length === 1) id = await postImage(urls[0], caption);
  else id = await postCarousel(urls, caption);
  console.log(`✓ published to Instagram (${id})`);
  return id;
}

/* ---------------- formats ---------------- */

async function anniversarySlot(data, state, browser, list) {
  const cards = list.slice(0, 10).map((m) => {
    const era = data.eras.find((e) => e.slug === m.era_slug) ?? null;
    // the era's video closest in time to the moment gives the most fitting photo
    const near = data.videos
      .filter((v) => v.era_slug === m.era_slug && v.date && thumbCandidates(v).length)
      .sort((a, b) => Math.abs(new Date(a.date) - new Date(m.date)) - Math.abs(new Date(b.date) - new Date(m.date)))[0];
    return {
      kind: "anniversary",
      moment: m,
      near,
      images: [m.image_url, ...(near ? thumbCandidates(near) : []), era?.image].filter(Boolean),
      data: {
        accent: era?.accent,
        years: year - Number(m.date.slice(0, 4)),
        dateLabel: dateLabel(m.date),
        title: m.title,
        body: m.body,
        eraName: era?.name,
      },
    };
  });
  const files = await renderCards(cards, outDir, browser);
  const lines = cards.flatMap((c, i) => {
    const m = c.moment;
    const head = `${c.data.years} year${c.data.years === 1 ? "" : "s"} ago today: ${m.title}.`;
    return [...(i ? [""] : []), head, ...(m.body ? [m.body] : [])];
  });
  const eraNames = [...new Set(cards.map((c) => c.data.eraName).filter(Boolean))];
  const credits = [...new Set(cards.map((c) => creditFor(c.chosen, c.chosen === c.moment.image_url ? null : c.near)).filter(Boolean))];
  const caption = [
    lines[0] + " 🖤",
    ...lines.slice(1),
    "",
    eraNames.length === 1 ? `Relive ${/^the /i.test(eraNames[0]) ? "" : "the "}${eraNames[0]} era on GAGAFLIX → link in bio` : "Relive it all on GAGAFLIX → link in bio",
    "",
    ...credits,
    NOTE,
    "",
    hashtags(...eraNames.map(tagOf), "#OnThisDay", "#GagaHistory"),
  ].join("\n");
  const id = await ship({ slot: "anniversary", files, caption });
  return { id, mark: () => list.slice(0, 10).forEach((m) => (state.posted[`moment:${m.id}:${year}`] = now.toISOString())) };
}

async function weeklySlot(data, state, browser, vids) {
  const eraOf = (v) => data.eras.find((e) => e.slug === v.era_slug) ?? null;
  const cards = [
    {
      kind: "weekly",
      data: {
        range: `${short(new Date(now - 6 * 864e5).toISOString())} – ${short(today)}`,
        count: vids.length,
        images: vids.slice(0, 4).map((v) => [...thumbCandidates(v), eraOf(v)?.image].filter(Boolean)),
      },
    },
    ...vids.map((v, i) => ({
      kind: "video",
      video: v,
      images: [...thumbCandidates(v), eraOf(v)?.image].filter(Boolean),
      data: {
        accent: eraOf(v)?.accent,
        label: "New this week",
        page: `${i + 1}/${vids.length}`,
        typeLabel: singular(v.type),
        title: v.title,
        event: eventOf(v),
        year: v.date?.slice(0, 4),
        eraName: eraOf(v)?.name,
        titleMax: 130,
      },
    })),
    { kind: "cta", data: { line: "Watch them all.", sub: "New Lady Gaga videos land on GAGAFLIX every week.", images: data.eras.map((e) => e.image).filter(Boolean) } },
  ];
  const files = await renderCards(cards, outDir, browser);
  const caption = [
    `New on GAGAFLIX this week 🖤 ${vids.length} videos just landed:`,
    "",
    ...vids.map((v) => `• ${v.title}${eventOf(v) ? ` (${eventOf(v)})` : ""}`),
    "",
    "Watch them all → link in bio",
    "",
    cards.some((c) => /i\.ytimg\.com/.test(c.chosen ?? ""))
      ? "Images: video thumbnails (YouTube) © their respective owners."
      : "Images © their respective owners.",
    NOTE,
    "",
    hashtags("#NewMusic", "#GagaFlix"),
  ].join("\n");
  const id = await ship({ slot: "weekly", files, caption });
  return {
    id,
    mark: () => {
      for (const v of vids) state.posted[`video:${v.id}`] = now.toISOString();
      state.lastWeekly = now.toISOString();
    },
  };
}

async function vaultSlot(data, state, browser) {
  const v = vaultPick(data, state);
  if (!v) return null;
  const era = data.eras.find((e) => e.slug === v.era_slug) ?? null;
  const isNew = v.created_at && now - new Date(v.created_at) < 14 * 864e5;
  const card = {
    kind: "video",
    images: [...thumbCandidates(v), era?.image].filter(Boolean),
    data: {
      accent: era?.accent,
      label: isNew ? "New on GAGAFLIX" : "From the vault",
      typeLabel: singular(v.type),
      title: v.title,
      event: eventOf(v),
      year: v.date?.slice(0, 4),
      eraName: era?.name,
    },
  };
  const files = await renderCards([card], outDir, browser);
  const meta = [singular(v.type), eventOf(v), v.date?.slice(0, 4)].filter(Boolean).join(" · ");
  const caption = [
    `${isNew ? "New on GAGAFLIX" : "From the vault"}: ${v.title} 🔥`,
    meta,
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
  const id = await ship({ slot: "vault", files, caption });
  return { id, mark: () => (state.posted[`video:${v.id}`] = now.toISOString()) };
}

async function eraSlot(data, state, browser) {
  const eras = data.eras.filter((e) => e.image);
  if (!eras.length) return null;
  const era = eras[(state.eraIndex || 0) % eras.length];
  const nVideos = data.videos.filter((v) => v.era_slug === era.slug).length;
  const nMoments = data.moments.filter((m) => m.era_slug === era.slug).length;
  const stats = [
    nVideos && `${nVideos} video${nVideos === 1 ? "" : "s"}`,
    nMoments && `${nMoments} moment${nMoments === 1 ? "" : "s"}`,
  ].filter(Boolean).join("  ·  ") || "On GAGAFLIX";
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
  const id = await ship({ slot: "era", files, caption });
  return { id, mark: () => (state.eraIndex = (state.eraIndex || 0) + 1) };
}

async function reelSlot(data, state, browser) {
  const withArt = data.eras.filter((e) => e.image);
  if (withArt.length < 3) return null;
  // six eras, a different window each time, shown in career order
  const offset = (state.reelOffset || 0) % withArt.length;
  const pick = [...withArt.slice(offset), ...withArt.slice(0, offset)].slice(0, 6).sort((a, b) => a.sort - b.sort);
  const firstYear = Math.min(...data.moments.map((m) => Number(m.date.slice(0, 4))));
  const stats = [
    { label: "Videos", value: data.videos.length, plus: true },
    { label: "Eras", value: data.eras.length },
    ...(Number.isFinite(firstYear) ? [{ label: "Years", value: year - firstYear }] : []),
  ];
  const { video, cover } = await renderReel(
    { eras: pick.map((e) => ({ name: e.name, years: e.years, accent: e.accent, image: e.image })), stats },
    outDir,
    browser,
  );
  const first = data.eras[0]?.name, last = data.eras[data.eras.length - 1]?.name;
  const caption = [
    "Every era. Every performance. One place. 🖤",
    "",
    `Music videos, live shows, interviews and fashion${first && last ? `, from ${first} to ${last}` : ""} — ${data.videos.length}+ Lady Gaga videos on GAGAFLIX.`,
    "",
    "Link in bio",
    "",
    "Images © their respective owners.",
    NOTE,
    "",
    hashtags("#GagaEras", "#Reels"),
  ].join("\n");
  const id = await ship({ slot: "reel", files: [cover], caption, video });
  return { id, mark: () => (state.reelOffset = offset + 6) };
}

/* ---------------- main ---------------- */

async function main() {
  const data = await loadSiteData(db);
  if (opt("--demo-new")) {
    const n = Number(opt("--demo-new"));
    data.videos = data.videos.map((v, i) => (i < n ? { ...v, created_at: new Date(now - (i + 1) * 864e5).toISOString() } : v));
  }
  const state = await loadState(db);
  const forced = opt("--slot");
  console.log(`GAGAFLIX autopilot · ${today} · data: ${data.source} · ${live ? "LIVE" : "dry run"}${forced ? ` · slot ${forced}` : ""}`);
  if (live && state.lastPost?.slice(0, 10) === today && !forced) {
    console.log("Already posted today — nothing to do.");
    return;
  }

  const browser = await openBrowser();
  let result = null;
  try {
    const ann = anniversaries(data, state);
    const weekly = weeklyVideos(data, state);
    if ((forced === "anniversary" || (!forced && ann.length)) && ann.length) result = await anniversarySlot(data, state, browser, ann);
    else if ((forced === "weekly" || !forced) && weekly.length >= MIN_WEEKLY) result = await weeklySlot(data, state, browser, weekly);
    else if (forced === "anniversary" || forced === "weekly") console.log(`Nothing for "${forced}" today (anniversaries: ${ann.length}, new videos this week: ${weekly.length}).`);
    else {
      const start = forced ? [forced] : [];
      const order = [...start, ...ROTATION.slice(state.rotation % ROTATION.length), ...ROTATION];
      for (const slot of order) {
        const fn = { vault: vaultSlot, era: eraSlot, reel: reelSlot }[slot];
        if (!fn) throw new Error(`Unknown slot "${slot}"`);
        result = await fn(data, state, browser);
        if (result) {
          if (!forced) result.rotated = true;
          break;
        }
        if (forced) break;
      }
    }
  } finally {
    await browser.close();
  }

  if (!result) {
    console.log("Nothing to post today.");
    return;
  }
  // Remember it only when it really went out (or in local test runs without Supabase).
  if (result.id || !db) {
    result.mark();
    if (result.rotated) state.rotation = (state.rotation || 0) + 1;
    state.lastPost = now.toISOString();
    await saveState(db, state);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
