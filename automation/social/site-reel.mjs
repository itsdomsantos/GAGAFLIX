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
import { spawn, spawnSync } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { ROOT } from "../lib.mjs";
import { asSrc, openBrowser } from "./render.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const FPS = 30;
const PHONE = { width: 390, height: 844 };
const FFMPEG = process.env.FFMPEG_PATH || "ffmpeg";

const clamp = (x) => Math.min(1, Math.max(0, x));
/**
 * Slow motion: while filming, the site runs SLOW× slower (its clock, timers, animation
 * frames and CSS/WAAPI animations), so the ~12 sharp captures per real second become
 * ~36 per second of video — smooth at 30 fps. Every time in the scripts below is in
 * video ms; sleepUntil converts it to real time.
 */
const SLOW = Math.max(1, Number(process.env.REEL_SLOWMO || 3));
const sleepUntil = (t0, ms) => new Promise((r) => setTimeout(r, Math.max(0, t0 + ms * SLOW - Date.now())));

function encoder(file) {
  const ff = spawn(
    FFMPEG,
    [
      "-y", "-loglevel", "error",
      "-f", "image2pipe", "-framerate", String(FPS), "-i", "-",
      "-f", "lavfi", "-i", "anullsrc=channel_layout=stereo:sample_rate=44100",
      "-c:v", "libx264", "-preset", "medium", "-crf", "19", "-pix_fmt", "yuv420p", "-r", String(FPS),
      "-c:a", "aac", "-b:a", "128k", "-shortest", "-movflags", "+faststart", file,
    ],
    { stdio: ["pipe", "inherit", "inherit"] },
  );
  return {
    write: async (buf) => {
      if (!ff.stdin.write(buf)) await new Promise((r) => ff.stdin.once("drain", r));
    },
    end: async () => {
      ff.stdin.end();
      const code = await new Promise((r) => ff.on("close", r));
      if (code !== 0) throw new Error(`ffmpeg exited with ${code}`);
    },
  };
}

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
  const SITE = site.replace(/\/$/, "");

  // ---- the site, on a phone ----
  const ctx = await browser.newContext({
    viewport: PHONE,
    deviceScaleFactor: 2,
    isMobile: true,
    hasTouch: true,
    // the site is a PWA: its service worker would fetch images outside our control
    serviceWorkers: "block",
    userAgent:
      "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1",
  });
  // no "Add to Home Screen" sheet over the footage, and no analytics hits from the robot
  await ctx.addInitScript(() => {
    try {
      localStorage.setItem("gf-a2hs-seen", "1");
    } catch {}
  });
  // the slow clock: page time and timers run SLOW× slower
  await ctx.addInitScript((k) => {
    if (k <= 1) return;
    const realNow = performance.now.bind(performance);
    const realDate = Date.now;
    const p0 = realNow();
    const d0 = realDate();
    performance.now = () => p0 + (realNow() - p0) / k;
    Date.now = () => d0 + (realDate() - d0) / k;
    const st = window.setTimeout.bind(window);
    const si = window.setInterval.bind(window);
    window.setTimeout = (fn, ms = 0, ...a) => st(fn, ms * k, ...a);
    window.setInterval = (fn, ms = 0, ...a) => si(fn, ms * k, ...a);
    // requestAnimationFrame is left alone: Chromium's animation playback rate (below)
    // already slows the animation-frame timeline, so scaling it here would slow it twice.
  }, SLOW);
  await ctx.route("**/api/track**", (r) => r.fulfill({ status: 204, body: "" }));
  if (process.env.REEL_MOCK_IMAGES === "1") {
    const art = readdirSync(join(ROOT, "public/eras")).filter((f) => f.endsWith(".png"));
    let n = 0;
    await ctx.route(/i\.ytimg\.com|img\.youtube\.com/, (r) =>
      r.fulfill({ contentType: "image/png", body: readFileSync(join(ROOT, "public/eras", art[n++ % art.length])) }),
    );
  }
  const page = await ctx.newPage();
  const cdp = await ctx.newCDPSession(page);
  /** CSS transitions/animations and element.animate() — slowed to match the slow clock. */
  const slowAnimations = async () => {
    try {
      await cdp.send("Animation.enable");
      await cdp.send("Animation.setPlaybackRate", { playbackRate: 1 / SLOW });
    } catch {
      /* not fatal: animations just play at normal speed */
    }
  };

  const open = async (path) => {
    try {
      const res = await page.goto(SITE + path, { waitUntil: "networkidle", timeout: 60000 });
      if (!res || res.status() >= 400) return false;
    } catch {
      return false;
    }
    await page.waitForTimeout(700);
    return true;
  };

  /** Smooth, eased scroll inside the page (real time). */
  const scrollTo = (y, ms) =>
    page.evaluate(
      ([to, dur]) =>
        new Promise((done) => {
          const from = scrollY;
          const s = performance.now();
          const step = () => {
            const p = Math.min(1, (performance.now() - s) / dur);
            const e = p < 0.5 ? 4 * p * p * p : 1 - (-2 * p + 2) ** 3 / 2;
            scrollTo(0, from + (to - from) * e);
            if (p < 1) requestAnimationFrame(step);
            else done();
          };
          requestAnimationFrame(step);
        }),
      [Math.max(0, Math.round(y)), ms],
    );
  /** Page y that puts the element at `frac` of the screen height. */
  const yFor = (sel, frac = 0.45) =>
    page.evaluate(
      ([s, f]) => {
        const el = document.querySelector(s);
        if (!el) return null;
        return scrollY + el.getBoundingClientRect().top - innerHeight * f;
      },
      [sel, frac],
    );
  /** Centre of the first matching element that is on screen (or null). */
  const centre = (sel, pick = "first") =>
    page.evaluate(
      ([s, how]) => {
        const els = [...document.querySelectorAll(s)]
          .map((el) => ({ el, r: el.getBoundingClientRect() }))
          .filter(({ r }) => r.width > 8 && r.height > 8 && r.top >= 60 && r.bottom <= innerHeight - 70 && r.left >= 0 && r.right <= innerWidth);
        if (!els.length) return null;
        const c = how === "middle" ? els.sort((a, b) => Math.abs(a.r.left + a.r.width / 2 - innerWidth / 2) - Math.abs(b.r.left + b.r.width / 2 - innerWidth / 2))[0] : els[0];
        return { x: c.r.left + c.r.width / 2, y: c.r.top + c.r.height / 2 };
      },
      [sel, pick],
    );

  /**
   * Record `ms` (video ms) of the live page while `script(t0, tap, mark)` drives it, in
   * slow motion: sharp full-resolution captures back to back, timestamps divided by SLOW,
   * so animations (the era transition, carousels, typing) come out smooth at 30 fps.
   * Returns { frames: [{t, data}], taps: [{t, x, y}], marks, ms }.
   */
  async function take(ms, script) {
    await page.bringToFront(); // a background tab gets its timers & animations throttled
    await slowAnimations();
    const frames = [];
    const taps = [];
    const marks = {};
    const t0 = Date.now();
    const tap = async (pt) => {
      if (!pt) return false;
      taps.push({ t: (Date.now() - t0) / SLOW, x: pt.x, y: pt.y });
      await page.mouse.click(pt.x, pt.y);
      return true;
    };
    const mark = (name) => (marks[name] = (Date.now() - t0) / SLOW);
    const driving = (async () => {
      try {
        await script?.(t0, tap, mark);
      } catch (err) {
        console.warn(`  reel: a step failed (${err.message.split("\n")[0]}) — keeping what was filmed`);
      }
    })();
    while (Date.now() - t0 < ms * SLOW) {
      const at = (Date.now() - t0) / SLOW;
      try {
        const buf = await page.screenshot({ type: "jpeg", quality: 82 });
        frames.push({ t: at, data: buf.toString("base64") });
      } catch {
        await new Promise((r) => setTimeout(r, 30)); // mid-navigation: try again
      }
    }
    await driving;
    if (process.env.REEL_DEBUG) console.log("  [debug]", page.url(), frames.length, "frames", JSON.stringify(taps), await page.evaluate(() => {
      const c = [...document.querySelectorAll("div")].find((d) => getComputedStyle(d).zIndex === "100");
      return "veil:" + (c ? `${c.style.background || "-"} pe=${c.style.pointerEvents}` : "none");
    }));
    return { frames, taps, marks, ms };
  }

  // ---- what the reel uses — picked from the catalogue ----
  const count = (slug) => videos.filter((v) => v.era_slug === slug).length;
  const showEra = eras.find((e) => e.slug === "chromatica") ?? [...eras].sort((a, b) => count(b.slug) - count(a.slug))[0];
  const star = videos.find((v) => v.is_hero) ?? videos.find((v) => v.featured) ?? videos[0];
  const query = (star?.title.split(/\s[—–-]\s|\s\(/)[0] ?? "bad romance").toLowerCase();
  const photos = eras.filter((e) => e.image).map((e) => asSrc(e.image));

  // ---- the compositor ----
  const comp = await browser.newPage({ viewport: { width: 540, height: 960 }, deviceScaleFactor: 2 });
  await comp.goto(pathToFileURL(join(HERE, "site-reel.html")).href);
  await comp.evaluate(() => document.fonts.ready);
  await comp.evaluate((d) => window.setup(d), { collage: photos });

  const video = join(outDir, "reel.mp4");
  const cover = join(outDir, "reel-cover.jpg");
  const enc = encoder(video);
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
    let fi = 0;
    const n = Math.round((rec.ms / 1000) * FPS);
    for (let i = 0; i < n; i++) {
      const vt = (i / FPS) * 1000;
      while (fi + 1 < rec.frames.length && rec.frames[fi + 1].t <= vt) fi++;
      const copy = [...copies].reverse().find((c) => c.at <= vt) ?? copies[0];
      const tap = rec.taps.find((tp) => vt >= tp.t - 180 && vt <= tp.t + 650);
      const fadeOut = i > n - 5 ? (i - (n - 5)) / 5 : 0;
      await emit({
        accent: copy.accent,
        phone: { src: `data:image/jpeg;base64,${rec.frames[fi].data}`, enter: enterPhone ? clamp(i / 14) : 1 },
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
    const rec = await take(10400, async (t0, tap, mark) => {
      // the era carousel's circles are labelled "<Era> era"
      const CIRCLE = 'a[aria-label$=" era"]';
      const target = `a[aria-label="${showEra?.name} era"]`;
      await sleepUntil(t0, 350);
      const y = await yFor(CIRCLE, 0.4);
      if (y != null) await scrollTo(y, 1400);
      await sleepUntil(t0, 1850);
      // swipe the carousel until the chosen era sits in the middle, like a thumb would
      await page.evaluate(
        ([circle, sel]) =>
          new Promise((done) => {
            const link = document.querySelector(sel) ?? document.querySelector(circle);
            const box = link?.closest("[data-scroller]") ?? link?.parentElement;
            if (!link || !box) return done();
            const from = box.scrollLeft;
            const to = Math.max(0, link.offsetLeft - (box.clientWidth - link.offsetWidth) / 2);
            const s = performance.now();
            const step = () => {
              const p = Math.min(1, (performance.now() - s) / 1000);
              box.scrollLeft = from + (to - from) * (p < 0.5 ? 4 * p * p * p : 1 - (-2 * p + 2) ** 3 / 2);
              if (p < 1) requestAnimationFrame(step);
              else done();
            };
            requestAnimationFrame(step);
          }),
        [CIRCLE, target],
      );
      await sleepUntil(t0, 3050);
      mark("era");
      await tap((await centre(target)) ?? (await centre(CIRCLE, "middle")));
      await sleepUntil(t0, 4800);
      const y2 = await yFor('[data-scroller] a[href^="/watch/"]', 0.5);
      if (y2 != null) await scrollTo(y2, 1300);
      await sleepUntil(t0, 6350);
      mark("watch");
      await tap(await centre('[data-scroller] a[href^="/watch/"]'));
      await sleepUntil(t0, 8300);
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
    const rec = await take(4200, async (t0, tap) => {
      await sleepUntil(t0, 250);
      const y = await yFor('ol a[href^="/watch/"]', 0.5);
      if (y != null) await scrollTo(y, 1600);
      await sleepUntil(t0, 2350);
      await tap(await centre('ol a[href^="/watch/"]'));
    });
    await play(rec, [{ at: 0, k: "04 · Tours", t: "Tap a song. Watch it live.", s: "Every tour, its setlist in order — each song opens the performance.", accent: HOME }]);
  }

  // ===== C · the timeline =====
  if (await open("/timeline")) {
    const rec = await take(2800, async (t0) => {
      await sleepUntil(t0, 150);
      const max = await page.evaluate(() => Math.min(3600, document.documentElement.scrollHeight - innerHeight));
      await scrollTo(max, 2500);
    });
    await play(rec, [{ at: 0, k: "05 · Timeline", t: "Her whole career, day by day.", s: stats.years ? `${stats.years} years of moments, from the start to today.` : "Every milestone, from the start to today.", accent: HOME }]);
  }

  // ===== D · live search =====
  if (await open("/search")) {
    const rec = await take(3400, async (t0, tap) => {
      await sleepUntil(t0, 250);
      await tap(await centre("input"));
      await sleepUntil(t0, 600);
      await page.keyboard.type(query, { delay: 85 * SLOW });
    });
    await play(rec, [{ at: 0, k: "06 · Search", t: "Find anything in a second.", s: "Songs, shows, interviews — just start typing.", accent: HOME }]);
  }

  // ===== end card =====
  const statLine = [stats.videos && `${stats.videos}+ videos`, stats.eras && `${stats.eras} eras`, stats.years && `${stats.years} years`].filter(Boolean).join("  ·  ");
  for (let i = 0, n = Math.round(3 * FPS); i < n; i++) await emit({ accent: HOME, end: i / n, stats: statLine });

  await enc.end();
  await comp.close();
  await ctx.close();
  if (own) await browser.close();
  return { video, cover, duration: frame / FPS };
}
