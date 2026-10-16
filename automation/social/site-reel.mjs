/**
 * GAGAFLIX site reel — 1080×1920 MP4, ~25 s.
 *
 *  1. Hook: Lady Gaga, era after era (photos flashing), then the GAGAFLIX wordmark.
 *     Drop a vertical clip at automation/social/reel-intro.mp4 (or REEL_INTRO=path) and
 *     it plays under the same text instead of the photos (first 4 s).
 *  2. The REAL site on a phone, recorded in real time while the reel uses it — a ring
 *     shows every tap: home → swipe the eras → tap one (the whole site re-colours) →
 *     open a video → a tour setlist, tap a song → the timeline → live search.
 *  3. End card over a collage of the eras: wordmark, "link in bio".
 * Only the site's own interface and stills — never clips of Gaga's videos.
 *
 *   REEL_SITE_URL=https://gagaflix.com node automation/social/run.mjs --slot reel --dry-run
 * Local preview without YouTube: REEL_MOCK_IMAGES=1 swaps YouTube thumbnails for the era photos.
 * The track is silent on purpose (no licensed music via the API); add a sound in the app.
 */
import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, readdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { asSrc, openBrowser } from "./render.mjs";
import { checkPlayable, createRecorder, encoder } from "./site-recorder.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const FPS = 30;
const PHONE = { width: 390, height: 844 };
const FFMPEG = process.env.FFMPEG_PATH || "ffmpeg";

/** Slow-motion factor while filming the site (see site-recorder.mjs). */
const SLOW = Math.max(1, Number(process.env.REEL_SLOWMO || 3));
const clamp = (x) => Math.min(1, Math.max(0, x));

/** Owner's intro clip → JPEG frames (max 4 s), or null. */
function introFrames() {
  const clip = process.env.REEL_INTRO || join(HERE, "reel-intro.mp4");
  if (!existsSync(clip)) return null;
  const dir = mkdtempSync(join(tmpdir(), "gf-intro-"));
  const r = spawnSync(FFMPEG, ["-loglevel", "error", "-t", "4", "-i", clip, "-vf", `fps=${FPS},scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920`, "-q:v", "3", join(dir, "%04d.jpg")]);
  if (r.status !== 0) {
    console.warn("  intro clip could not be read — using the photos instead");
    return null;
  }
  const files = readdirSync(dir).filter((f) => f.endsWith(".jpg")).sort();
  return files.length ? files.map((f) => pathToFileURL(join(dir, f)).href) : null;
}

/**
 * { site, videos, eras, stats: { videos, eras, years } } → { video, cover }
 */
export async function renderSiteReel({ site, videos, eras, stats }, outDir, browser) {
  mkdirSync(outDir, { recursive: true });
  const own = !browser;
  browser ??= await openBrowser();
  // ---- the site, on a phone (filmed in slow motion, see site-recorder.mjs) ----
  const rec0 = await createRecorder(browser, { site, viewport: PHONE, dpr: 2, mobile: true, slow: SLOW });
  const { page, open, take, scrollTo, yFor, centre, centreInScroller } = rec0;

  // ---- what the reel uses — picked from the catalogue ----
  const count = (slug) => videos.filter((v) => v.era_slug === slug).length;
  const showEra = eras.find((e) => e.slug === "chromatica") ?? [...eras].sort((a, b) => count(b.slug) - count(a.slug))[0];
  const star = videos.find((v) => v.is_hero) ?? videos.find((v) => v.featured) ?? videos[0];
  const query = (star?.title.split(/\s[—–-]\s|\s\(/)[0] ?? "bad romance").toLowerCase();
  const photos = eras.filter((e) => e.image).map((e) => asSrc(e.image));
  // only ever open videos whose player really works (YouTube oEmbed check)
  const playable = await checkPlayable(videos);
  const canPlay = (v) => (playable.ok.size ? playable.ok.has(v.id) : !playable.bad.has(v.id));
  const linksTo = (scope, list) => list.filter(canPlay).map((v) => `${scope} a[href="/watch/${v.id}"]`).join(", ") || `${scope} a[href^="/watch/"]`;
  const eraCards = linksTo("[data-scroller]", videos.filter((v) => v.era_slug === showEra?.slug));
  const setlistSongs = linksTo("ol", videos);
  console.log(`  playable videos: ${playable.ok.size} verified, ${playable.bad.size} broken (never shown)`);

  // ---- the compositor ----
  const comp = await browser.newPage({ viewport: { width: 540, height: 960 }, deviceScaleFactor: 2 });
  await comp.goto(pathToFileURL(join(HERE, "site-reel.html")).href);
  await comp.evaluate(() => document.fonts.ready);
  await comp.evaluate((d) => window.setup(d), { collage: photos });

  const video = join(outDir, "reel.mp4");
  const cover = join(outDir, "reel-cover.jpg");
  const enc = encoder(video, { fps: FPS });
  let frame = 0;
  const emit = async (state) => {
    await comp.evaluate((s) => window.set(s), state);
    await enc.write(await comp.screenshot({ type: "jpeg", quality: 90 }));
    frame++;
    if (frame % (FPS * 5) === 0) console.log(`  site reel ${frame / FPS}s`);
  };

  /**
   * Turn a recorded take into video frames. `copies`: [{ at (ms), k, t, s, accent }].
   * `enterPhone`: the phone rises into view at the start of the take.
   */
  async function play(rec, copies, { enterPhone = false } = {}) {
    const cursor = { i: 0 };
    const n = Math.round((rec.ms / 1000) * FPS);
    for (let i = 0; i < n; i++) {
      const vt = (i / FPS) * 1000;
      const copy = [...copies].reverse().find((c) => c.at <= vt) ?? copies[0];
      const tap = rec.taps.find((tp) => vt >= tp.t - 180 && vt <= tp.t + 650);
      const fadeOut = i > n - 5 ? (i - (n - 5)) / 5 : 0;
      await emit({
        accent: copy.accent,
        phone: { src: `data:image/jpeg;base64,${rec0.frameAt(rec, vt, cursor)}`, enter: enterPhone ? clamp(i / 14) : 1 },
        tap: tap ? { x: tap.x, y: tap.y, p: (vt - (tap.t - 180)) / 830 } : null,
        copy: { k: copy.k, t: copy.t, s: copy.s, a: Math.min(clamp((vt - copy.at) / 250), 1 - fadeOut), rise: clamp((vt - copy.at) / 400) },
        flash: i < 4 ? 0.3 * (1 - i / 4) : 0,
      });
    }
  }

  // ===== 0 · hook — Lady Gaga, era after era (or the owner's clip), then the wordmark =====
  const clip = introFrames();
  const hookSecs = clip ? Math.min(4, clip.length / FPS) : 2.8;
  const hookN = Math.round(hookSecs * FPS);
  const PER = 9; // frames per photo
  for (let i = 0; i < hookN; i++) {
    const t = i / FPS;
    const logo = clamp((t - (hookSecs - 0.85)) / 0.3);
    const idx = Math.floor(i / PER) % Math.max(1, photos.length);
    const era = eras.filter((e) => e.image)[idx];
    await emit({
      accent: era?.accent ?? "#e04e20",
      hook: {
        img: clip ? clip[Math.min(i, clip.length - 1)] : photos[idx],
        zoom: clip ? 1 : 1.14 - 0.06 * ((i % PER) / PER),
        flash: clip ? 0 : i % PER < 2 ? 0.45 * (1 - (i % PER) / 2) : 0,
        text: clamp((t - 0.2) / 0.35) * (1 - logo),
        logo,
      },
    });
    if (i === Math.round(hookN * 0.55)) await comp.screenshot({ path: cover, type: "jpeg", quality: 92 });
  }

  const HOME = "#e04e20";
  // ===== A · home → swipe the eras → tap one (site re-colours) → open a video =====
  if (await open("/")) {
    const rec = await take(10400, async ({ at, tap, mark }) => {
      // the era carousel's circles are labelled "<Era> era"
      const CIRCLE = 'a[aria-label$=" era"]';
      const target = `a[aria-label="${showEra?.name} era"]`;
      await at(350);
      const y = await yFor(CIRCLE, 0.4);
      if (y != null) await scrollTo(y, 1400);
      await at(1850);
      // swipe the carousel until the chosen era sits in the middle, like a thumb would
      await centreInScroller(target, 1000);
      await at(3050);
      mark("era");
      await tap((await centre(target)) ?? (await centre(CIRCLE, "middle")));
      await at(4800);
      const y2 = await yFor(eraCards, 0.5);
      if (y2 != null) await scrollTo(y2, 1300);
      await at(6350);
      mark("watch");
      await tap(await centre(eraCards));
      await at(8300);
      await scrollTo(300, 1000);
    });
    const eraAccent = showEra?.accent ?? HOME;
    await play(
      rec,
      [
        { at: 0, k: "01 · Home", t: "Every era. One home.", s: "Music videos, live shows, interviews and fashion — all of Lady Gaga.", accent: HOME },
        { at: (rec.marks.era ?? 2950) - 250, k: "02 · Eras", t: "Tap an era. The site changes colour.", s: `Every era is its own world — ${showEra?.name ?? "MAYHEM"} turns everything ${showEra?.slug === "chromatica" ? "pink" : "to its colour"}.`, accent: eraAccent },
        { at: (rec.marks.watch ?? 6350) - 250, k: "03 · Watch", t: "Every performance, one tap.", s: "It plays straight from the original source.", accent: eraAccent },
      ],
      { enterPhone: true },
    );
  }

  // ===== B · a tour setlist → tap a song → its performance =====
  if ((await open("/tours/the-mayhem-ball")) || (await open("/tours"))) {
    const rec = await take(4200, async ({ at, tap }) => {
      await at(250);
      const y = await yFor(setlistSongs, 0.5);
      if (y != null) await scrollTo(y, 1600);
      await at(2350);
      await tap(await centre(setlistSongs));
    });
    await play(rec, [{ at: 0, k: "04 · Tours", t: "Tap a song. Watch it live.", s: "Every tour, its setlist in order — each song opens the performance.", accent: HOME }]);
  }

  // ===== C · the timeline =====
  if (await open("/timeline")) {
    const rec = await take(2800, async ({ at }) => {
      await at(150);
      const max = await page.evaluate(() => Math.min(3600, document.documentElement.scrollHeight - innerHeight));
      await scrollTo(max, 2500);
    });
    await play(rec, [{ at: 0, k: "05 · Timeline", t: "Her whole career, day by day.", s: stats.years ? `${stats.years} years of moments, from the start to today.` : "Every milestone, from the start to today.", accent: HOME }]);
  }

  // ===== D · live search =====
  if (await open("/search")) {
    const rec = await take(3400, async ({ at, tap }) => {
      await at(250);
      await tap(await centre("input"));
      await at(600);
      await page.keyboard.type(query, { delay: 85 * SLOW });
    });
    await play(rec, [{ at: 0, k: "06 · Search", t: "Find anything in a second.", s: "Songs, shows, interviews — just start typing.", accent: HOME }]);
  }

  // ===== end card =====
  const statLine = [stats.videos && `${stats.videos}+ videos`, stats.eras && `${stats.eras} eras`, stats.years && `${stats.years} years`].filter(Boolean).join("  ·  ");
  for (let i = 0, n = Math.round(3 * FPS); i < n; i++) await emit({ accent: HOME, end: i / n, stats: statLine });

  await enc.end();
  await comp.close();
  await rec0.close();
  if (own) await browser.close();
  return { video, cover, duration: frame / FPS };
}
