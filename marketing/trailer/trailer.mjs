/**
 * GAGAFLIX YouTube trailer — 60 s, 16:9, 4K (3840×2160) at 24 fps, with an original score.
 *
 *   node --no-warnings marketing/trailer/trailer.mjs            # films https://gagaflix.com
 *   TRAILER_RES=1080 node --no-warnings marketing/trailer/trailer.mjs   # 1920×1080, faster
 *   SITE_URL=http://localhost:3000 REEL_MOCK_IMAGES=1 node …    # local preview
 *
 * ACT I  (0–17 s)  cinematic cold open: your compilation (marketing/trailer/intro.mp4, muted)
 *                  or the era photos, letterboxed, with taiko hits on title cards built from
 *                  the site's own numbers → riser → silence → BRAAM → the GAGAFLIX logo.
 * ACT II (17–48 s) the REAL site on a desktop, in a floating browser window, every feature
 *                  on a beat: home, eras (the site re-colours), watch, tour setlists,
 *                  timeline, search, news, the music player, the chatbot.
 * ACT III          final BRAAM → end card: gagaflix.com · free · fan-made · non-profit.
 *
 * Only videos that really play are ever opened (YouTube oEmbed check). Score: score.py
 * (numpy), generated from the same timeline so every hit lands on a cut.
 * Writes out/trailer/: gagaflix-trailer.mp4, thumbnail.jpg, youtube.txt.
 */
import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, readdirSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { ROOT, SITE_URL, adminClient, loadSiteData } from "../../automation/lib.mjs";
import { asSrc, openBrowser } from "../../automation/social/render.mjs";
import { checkPlayable, createRecorder, encoder } from "../../automation/social/site-recorder.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const OUT = join(ROOT, "out/trailer");
const FPS = 24;
const DPR = process.env.TRAILER_RES === "1080" ? 1 : 2;
const SLOW = Math.max(1, Number(process.env.TRAILER_SLOWMO || (DPR === 2 ? 6 : 4)));
const SITE = (process.env.TRAILER_SITE_URL || SITE_URL).replace(/\/$/, "");
const FFMPEG = process.env.FFMPEG_PATH || "ffmpeg";
const HOME = "#e04e20";

const clamp = (x) => Math.min(1, Math.max(0, x));
const ease = (x) => 1 - (1 - clamp(x)) ** 3;

/* ------------------------------------------------------------------ timeline */

const CARDS = [2.2, 4.6, 7.0];
const RISER1 = [9.4, 12.4];
const DROP = 12.9;
const ACT2 = 17.0;
// [key, seconds] — the features, in order (take A covers home → eras → watch in one go)
const FEATURES = [
  ["home", 3.2],
  ["eras", 4.6],
  ["watch", 3.2],
  ["tours", 3.8],
  ["timeline", 3.0],
  ["search", 3.4],
  ["news", 3.0],
  ["music", 3.2],
  ["chat", 3.6],
];
const CUTS = [];
{
  let t = ACT2;
  for (const [, d] of FEATURES) {
    CUTS.push(+t.toFixed(2));
    t += d;
  }
}
const ACT2_END = CUTS.at(-1) + FEATURES.at(-1)[1]; // 48.0
const RISER2 = [ACT2_END - 2.5, ACT2_END];
const FINAL = ACT2_END + 0.5;
const DURATION = 60;
const start = (key) => CUTS[FEATURES.findIndex(([k]) => k === key)];

/* ------------------------------------------------------------------ helpers */

/** Owner's compilation → muted JPEG frames covering act I, or null. */
function introFrames() {
  const clip = process.env.TRAILER_INTRO || join(HERE, "intro.mp4");
  if (!existsSync(clip)) return null;
  const dir = mkdtempSync(join(tmpdir(), "gf-trailer-intro-"));
  const r = spawnSync(FFMPEG, [
    "-loglevel", "error", "-t", String(RISER1[1]), "-i", clip, "-an",
    "-vf", `fps=${FPS},scale=1920:1080:force_original_aspect_ratio=increase,crop=1920:1080`, "-q:v", "3", join(dir, "%05d.jpg"),
  ]);
  if (r.status !== 0) {
    console.warn("intro clip could not be read — using the era photos instead");
    return null;
  }
  const files = readdirSync(dir).filter((f) => f.endsWith(".jpg")).sort();
  return files.length ? files.map((f) => pathToFileURL(join(dir, f)).href) : null;
}

function makeScore(file) {
  const timeline = {
    duration: DURATION,
    cards: CARDS,
    riser1: RISER1,
    drop: DROP,
    act2: [ACT2, ACT2_END],
    cuts: CUTS,
    riser2: RISER2,
    final: FINAL,
    silence: [[RISER1[1], DROP], [ACT2_END, FINAL]],
    bpm: 96,
  };
  const r = spawnSync("python3", [join(HERE, "score.py"), file, JSON.stringify(timeline)], { stdio: "inherit" });
  if (r.status !== 0) throw new Error("score.py failed (is numpy installed? pip install numpy)");
}

/* ------------------------------------------------------------------ main */

async function main() {
  mkdirSync(OUT, { recursive: true });
  const data = await loadSiteData(adminClient());
  const { eras, videos, moments } = data;
  const year = new Date().getUTCFullYear();
  const firstYear = Math.min(...moments.map((m) => Number(m.date.slice(0, 4))));
  const years = Number.isFinite(firstYear) ? year - firstYear : null;
  console.log(`trailer · ${SITE} · ${DPR === 2 ? "4K" : "1080p"} · slow-mo ${SLOW}× · ${videos.length} videos`);

  const wav = join(OUT, "score.wav");
  makeScore(wav);

  // what the trailer uses — only videos that really play
  const playable = await checkPlayable(videos);
  const canPlay = (v) => (playable.ok.size ? playable.ok.has(v.id) : !playable.bad.has(v.id));
  const linksTo = (scope, list) => list.filter(canPlay).map((v) => `${scope} a[href="/watch/${v.id}"]`).join(", ") || `${scope} a[href^="/watch/"]`;
  console.log(`playable videos: ${playable.ok.size} verified, ${playable.bad.size} broken (never shown)`);
  const count = (slug) => videos.filter((v) => v.era_slug === slug).length;
  const showEra = eras.find((e) => e.slug === "chromatica") ?? [...eras].sort((a, b) => count(b.slug) - count(a.slug))[0];
  const eraCards = linksTo("[data-scroller]", videos.filter((v) => v.era_slug === showEra?.slug));
  const setlistSongs = linksTo("ol", videos);
  const star = videos.find((v) => (v.is_hero || v.featured) && canPlay(v)) ?? videos.find(canPlay) ?? videos[0];
  const query = (star?.title.split(/\s[—–-]\s|\s\(/)[0] ?? "bad romance").toLowerCase();
  const photos = eras.filter((e) => e.image).map((e) => ({ src: asSrc(e.image), accent: e.accent }));

  const browser = await openBrowser();

  /* ---------- 1 · film the site (all takes first, then compose) ---------- */
  const rec = await createRecorder(browser, { site: SITE, viewport: { width: 1440, height: 900 }, dpr: DPR === 2 ? 2 : 1.4, slow: SLOW, quality: 84 });
  const { page, open, take, scrollTo, yFor, centre, control, centreInScroller } = rec;
  const takes = []; // { from (s), rec, accentAt(vt) }
  const CIRCLE = 'a[aria-label$=" era"]';
  const eraLink = `a[aria-label="${showEra?.name} era"]`;
  const ms = (key) => FEATURES.find(([k]) => k === key)[1] * 1000;

  if (await open("/")) {
    // home → eras → watch, one continuous take
    const total = ms("home") + ms("eras") + ms("watch");
    const eStart = ms("home");
    const wStart = eStart + ms("eras");
    const r = await take(total, async ({ at, tap }) => {
      await at(300);
      await scrollTo(260, 2200);
      await at(eStart + 100);
      const y = await yFor(CIRCLE, 0.42);
      if (y != null) await scrollTo(y, 900);
      await centreInScroller(eraLink, 900);
      await at(eStart + 2000);
      await tap((await centre(eraLink)) ?? (await centre(CIRCLE, "middle")));
      await at(eStart + 3500);
      const y2 = await yFor(eraCards, 0.55);
      if (y2 != null) await scrollTo(y2, 900);
      await at(wStart + 250);
      await tap(await centre(eraCards));
      await at(wStart + 1900);
      await scrollTo(220, 900);
    });
    takes.push({ from: start("home"), rec: r, accent: (vt) => (vt > eStart + 2300 ? showEra?.accent ?? HOME : HOME) });
  }
  if ((await open("/tours/the-mayhem-ball")) || (await open("/tours"))) {
    const r = await take(ms("tours"), async ({ at, tap }) => {
      await at(150);
      const y = await yFor(setlistSongs, 0.55);
      if (y != null) await scrollTo(y, 1500);
      await at(2100);
      await tap(await centre(setlistSongs));
    });
    takes.push({ from: start("tours"), rec: r });
  }
  if (await open("/timeline")) {
    const r = await take(ms("timeline"), async ({ at }) => {
      await at(100);
      const max = await page.evaluate(() => Math.min(4200, document.documentElement.scrollHeight - innerHeight));
      await scrollTo(max, 2800);
    });
    takes.push({ from: start("timeline"), rec: r });
  }
  if (await open("/")) {
    const r = await take(ms("search"), async ({ at }) => {
      await at(300);
      await page.keyboard.press("/"); // the site's shortcut: "/" opens search anywhere
      await at(1000);
      await page.locator("input").first().click().catch(() => {});
      await page.keyboard.type(query, { delay: 70 * SLOW });
    });
    takes.push({ from: start("search"), rec: r });
  }
  if (await open("/news")) {
    const r = await take(ms("news"), async ({ at }) => {
      await at(200);
      await scrollTo(900, 2600);
    });
    takes.push({ from: start("news"), rec: r });
  }
  if (await open(`/eras/${showEra?.slug ?? ""}`)) {
    const r = await take(ms("music"), async ({ at, tap }) => {
      await at(400);
      await tap(await control('button[aria-label="Open music"]'));
    });
    takes.push({ from: start("music"), rec: r, accent: () => showEra?.accent ?? HOME });
  }
  if (await open("/")) {
    const r = await take(ms("chat"), async ({ at, tap }) => {
      await at(300);
      await tap(await control('button[aria-label="Open chat"]'));
      await at(1300);
      await page.locator('input[placeholder^="Ask"]').first().click().catch(() => {});
      await page.keyboard.type("Recommend an iconic live performance", { delay: 45 * SLOW });
    });
    takes.push({ from: start("chat"), rec: r });
  }
  await rec.close();

  /* ---------- 2 · compose every frame ---------- */
  const comp = await browser.newPage({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: DPR });
  await comp.goto(pathToFileURL(join(HERE, "trailer.html")).href);
  await comp.evaluate(() => document.fonts.ready);
  await comp.evaluate((d) => window.setup(d), { collage: [...photos, ...photos].map((p) => p.src) });

  const video = join(OUT, "gagaflix-trailer.mp4");
  const enc = encoder(video, { fps: FPS, audio: wav, crf: DPR === 2 ? 17 : 18, preset: "medium" });
  const emit = async (state) => {
    await comp.evaluate((s) => window.set(s), state);
    await enc.write(await comp.screenshot({ type: "jpeg", quality: 92 }));
  };

  const clip = introFrames();
  const FEATURE_COPY = {
    home: ["01 — Home", "Every era. One home.", "The whole Lady Gaga universe: music videos, live shows, interviews and fashion."],
    eras: ["02 — Eras", "Each era, its own world.", "Pick one and the whole site takes on its colour."],
    watch: ["03 — Watch", "Every performance, one click.", "It plays straight from the original source."],
    tours: ["04 — Tours", "Setlists you can play.", "Every tour in show order — each song opens its performance."],
    timeline: ["05 — Timeline", "Her career, day by day.", years ? `${years} years of milestones, from the start to today.` : "Every milestone, from the start to today."],
    search: ["06 — Search", "Find anything. Instantly.", "Press / anywhere and start typing."],
    news: ["07 — News", "Her news, every day.", "Fresh Lady Gaga headlines from around the web."],
    music: ["08 — Music", "A soundtrack while you browse.", "Her songs on a spinning record, one click away."],
    chat: ["09 — Ask", "Ask Mother Monster.", "A chatbot that knows the eras, the shows — and the catalogue."],
  };
  const cards = [
    years && { at: CARDS[0], big: `${years} years.`, sub: "Of Lady Gaga" },
    { at: CARDS[1], big: `${eras.length} eras.`, sub: "Every one of them" },
    { at: CARDS[2], big: `${videos.length}+ videos.`, sub: "One place" },
  ].filter(Boolean);
  const cursors = new Map();

  const total = Math.round(DURATION * FPS);
  let thumbDone = false;
  for (let i = 0; i < total; i++) {
    const t = i / FPS;

    // ---- ACT I: footage + cards ----
    if (t < DROP) {
      if (t >= RISER1[1]) {
        await emit({ black: 1 }); // the breath of silence before the drop
        continue;
      }
      // which still/clip frame: one per card section, then accelerating cuts in the riser
      let idx;
      let local;
      if (t < RISER1[0]) {
        const sec = CARDS.filter((c) => c <= t).length;
        idx = sec;
        local = (t - (sec ? CARDS[sec - 1] : 0)) / 2.4;
      } else {
        const u = (t - RISER1[0]) / (RISER1[1] - RISER1[0]);
        const k = Math.floor(u * u * 22); // cuts get faster and faster
        idx = 4 + k;
        local = 0.5;
      }
      const ph = photos[idx % photos.length];
      const card = [...cards].reverse().find((c) => t >= c.at && t < c.at + 2.25);
      const hitAge = Math.min(...[...CARDS].map((c) => (t >= c ? t - c : 99)));
      const cutFlash = t >= RISER1[0] ? (((t - RISER1[0]) * 7) % 1 < 0.25 ? 0.25 : 0) : 0;
      await emit({
        accent: ph?.accent ?? HOME,
        black: t < 1 ? 1 - t : 0,
        film: {
          img: clip ? clip[Math.min(i, clip.length - 1)] : ph?.src,
          zoom: clip ? 1.02 : 1.14 - 0.08 * clamp(local),
          x: clip ? 0 : (idx % 2 ? -1 : 1) * 30 * clamp(local),
          flash: Math.max(hitAge < 0.18 ? 0.6 * (1 - hitAge / 0.18) : 0, cutFlash),
          card: card ? { big: card.big, sub: card.sub, p: Math.min(ease((t - card.at) / 0.12), 1 - ease((t - card.at - 1.95) / 0.3)), grow: (t - card.at) / 0.5 } : null,
        },
      });
      continue;
    }

    // ---- logo ----
    if (t < ACT2) {
      const p = (t - DROP) / (ACT2 - DROP);
      await emit({ accent: HOME, logo: { p }, black: t > ACT2 - 0.25 ? (t - (ACT2 - 0.25)) / 0.25 : 0 });
      if (!thumbDone && p > 0.55) {
        await comp.screenshot({ path: join(OUT, "thumbnail-4k.jpg"), type: "jpeg", quality: 92 });
        thumbDone = true;
      }
      continue;
    }

    // ---- ACT II: the site ----
    if (t < ACT2_END) {
      const fi = Math.max(0, CUTS.findLastIndex((c) => c <= t));
      const [key, dur] = FEATURES[fi];
      const u = (t - CUTS[fi]) / dur;
      const tk = [...takes].reverse().find((x) => x.from <= t + 1e-6);
      const vt = (t - (tk?.from ?? CUTS[fi])) * 1000;
      if (!cursors.has(tk)) cursors.set(tk, { i: 0 });
      const cur = cursors.get(tk);
      const src = tk ? `data:image/jpeg;base64,${rec.frameAt(tk.rec, vt, cur)}` : null;
      const tap = tk?.rec.taps.find((tp) => vt >= tp.t - 200 && vt <= tp.t + 700);
      const [k, title, sub] = FEATURE_COPY[key];
      const sinceCut = t - CUTS[fi];
      await emit({
        accent: tk?.accent?.(vt) ?? HOME,
        black: t > ACT2_END - 0.3 ? (t - (ACT2_END - 0.3)) / 0.3 : sinceCut < 0.08 && fi === 0 ? 1 - sinceCut / 0.08 : 0,
        stage: {
          src,
          url: (cur.url || SITE).replace(/^https?:\/\/[^/]+/, "gagaflix.com"),
          rot: (fi % 2 ? 9 : -11) * (1 - 0.45 * ease(u)),
          tilt: 3 - 1.5 * u,
          scale: 0.95 + 0.05 * ease(u),
          k, t: title, s: sub,
          copy: ease(sinceCut / 0.45),
          flash: sinceCut < 0.16 ? 0.45 * (1 - sinceCut / 0.16) : 0,
          beam: Math.sin(t * 0.4),
          tap: tap ? { x: tap.x, y: tap.y, p: (vt - (tap.t - 200)) / 900 } : null,
        },
      });
      continue;
    }

    // ---- ACT III: silence, final hit, end card ----
    if (t < FINAL) {
      await emit({ black: 1 });
      continue;
    }
    const p = (t - FINAL) / 3.2;
    await emit({ accent: HOME, end: clamp(p), black: t > DURATION - 1.4 ? (t - (DURATION - 1.4)) / 1.4 : 0 });
    if (i % (FPS * 5) === 0) console.log(`  composed ${Math.round(t)}s`);
  }
  await enc.end();
  await browser.close();

  // YouTube thumbnail (1280×720, < 2 MB) + text
  spawnSync(FFMPEG, ["-y", "-loglevel", "error", "-i", join(OUT, "thumbnail-4k.jpg"), "-vf", "scale=1280:720", "-q:v", "3", join(OUT, "thumbnail.jpg")]);
  writeFileSync(
    join(OUT, "youtube.txt"),
    [
      "TITLE",
      "GAGAFLIX — The Lady Gaga Streaming Archive (Trailer)",
      "",
      "DESCRIPTION",
      `Every era. Every performance. One place. GAGAFLIX gathers ${videos.length}+ Lady Gaga music videos, live performances, interviews and fashion moments, organised by era — with tour setlists you can play, a timeline of her whole career, daily news and instant search.`,
      "",
      `Watch free, no sign-up: ${SITE}`,
      "",
      "GAGAFLIX is a free, fan-made, non-profit archive by Little Monsters, for Little Monsters. Every video plays from its original platform; nothing is hosted on the site. Not affiliated with Lady Gaga, Interscope Records or Universal Music Group.",
      "Music: original score made for GAGAFLIX.",
      "",
      "TAGS",
      "Lady Gaga, GAGAFLIX, Little Monsters, Lady Gaga eras, Mayhem, Lady Gaga live, Lady Gaga music videos, Lady Gaga performances, Chromatica, Born This Way, The Fame Monster",
      "",
    ].join("\n"),
  );
  console.log(`\n✓ ${video}\n  ${join(OUT, "thumbnail.jpg")}\n  ${join(OUT, "youtube.txt")}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
