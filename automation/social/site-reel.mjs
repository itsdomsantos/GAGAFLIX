/**
 * GAGAFLIX site reel — 1080×1920 MP4, ~23 s. The REAL site, filmed on a phone
 * (390×844), scene by scene: home → an era (the whole site re-colours) → a video →
 * timeline → a tour setlist → search. Copy sits above the phone; wordmark intro
 * and "link in bio" end card. Only the site's own interface — never clips of videos.
 *
 *   REEL_SITE_URL=https://gagaflix.com node automation/social/run.mjs --slot reel --dry-run
 *
 * Local preview without YouTube access: REEL_MOCK_IMAGES=1 swaps YouTube thumbnails for
 * the era photos in public/eras/ (preview only — never used for a real post).
 * The track is silent on purpose (no licensed music via the API); add a sound in the app.
 */
import { spawn } from "node:child_process";
import { mkdirSync, readFileSync, readdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { ROOT } from "../lib.mjs";
import { openBrowser } from "./render.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const FPS = 30;
const PHONE = { width: 390, height: 844 };

const ease = (x) => 1 - (1 - Math.min(1, Math.max(0, x))) ** 3;
const easeInOut = (x) => {
  const t = Math.min(1, Math.max(0, x));
  return t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2;
};

function encoder(file) {
  const ff = spawn(
    process.env.FFMPEG_PATH || "ffmpeg",
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
    userAgent:
      "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1",
  });
  // no "Add to Home Screen" sheet over the footage, and no analytics hits from the robot
  await ctx.addInitScript(() => {
    try {
      localStorage.setItem("gf-a2hs-seen", "1");
    } catch {}
  });
  await ctx.route("**/api/track**", (r) => r.fulfill({ status: 204, body: "" }));
  if (process.env.REEL_MOCK_IMAGES === "1") {
    const art = readdirSync(join(ROOT, "public/eras")).filter((f) => f.endsWith(".png"));
    let n = 0;
    await ctx.route(/i\.ytimg\.com|img\.youtube\.com/, (r) =>
      r.fulfill({ contentType: "image/png", body: readFileSync(join(ROOT, "public/eras", art[n++ % art.length])) }),
    );
  }
  const page = await ctx.newPage();
  const open = async (path) => {
    try {
      const res = await page.goto(SITE + path, { waitUntil: "networkidle", timeout: 60000 });
      if (!res || res.status() >= 400) return false;
    } catch {
      return false;
    }
    await page.waitForTimeout(900);
    return true;
  };
  const scrollTo = (y) => page.evaluate((v) => window.scrollTo(0, v), Math.round(y));
  const maxScroll = (cap) => page.evaluate((c) => Math.min(c, document.documentElement.scrollHeight - innerHeight), cap);

  // ---- the compositor ----
  const comp = await browser.newPage({ viewport: { width: 540, height: 960 }, deviceScaleFactor: 2 });
  await comp.goto(pathToFileURL(join(HERE, "site-reel.html")).href);
  await comp.evaluate(() => document.fonts.ready);

  const video = join(outDir, "reel.mp4");
  const cover = join(outDir, "reel-cover.jpg");
  const enc = encoder(video);
  let frame = 0;
  let src = null;
  let coverDone = false;

  // what the reel films — picked from the catalogue
  const bySlug = Object.fromEntries(eras.map((e) => [e.slug, e]));
  const count = (slug) => videos.filter((v) => v.era_slug === slug).length;
  const era = [...eras].sort((a, b) => count(b.slug) - count(a.slug) || b.sort - a.sort)[0];
  const star = videos.find((v) => v.is_hero) ?? videos.find((v) => v.featured) ?? videos[0];
  const starEra = star?.era_slug ? bySlug[star.era_slug] : null;
  const query = (star?.title.split(/\s[—–-]\s|\s\(/)[0] ?? "bad romance").toLowerCase();

  const emit = async (state) => {
    await comp.evaluate((s) => window.set(s), state);
    await enc.write(await comp.screenshot({ type: "jpeg", quality: 90 }));
    frame++;
    if (frame % (FPS * 5) === 0) console.log(`  site reel ${frame / FPS}s`);
  };
  /** Film the phone for `secs`: `step(i, n)` drives the site; the screen is re-grabbed at 15 fps. */
  const film = async (secs, copy, accent, step, { enterFrom = 1 } = {}) => {
    const n = Math.round(secs * FPS);
    for (let i = 0; i < n; i++) {
      await step?.(i, n);
      if (i % 2 === 0 || !src) src = `data:image/jpeg;base64,${(await page.screenshot({ type: "jpeg", quality: 80 })).toString("base64")}`;
      const t = frame / FPS;
      await emit({
        accent,
        phone: { src, enter: enterFrom < 1 ? enterFrom + (1 - enterFrom) * ease(i / 14) : 1, y: Math.sin(t * 1.3) * 3, scale: 0.97 + 0.03 * ease(i / 8) },
        copy: { ...copy, p: i / 12, out: i > n - 6 ? (i - (n - 6)) / 6 : 0 },
        flash: i < 4 ? 0.35 * (1 - i / 4) : 0,
      });
      if (!coverDone && copy.cover && i === Math.floor(n * 0.6)) {
        await comp.screenshot({ path: cover, type: "jpeg", quality: 92 });
        coverDone = true;
      }
    }
  };

  // 0 · hook — the wordmark
  for (let i = 0, n = Math.round(1.6 * FPS); i < n; i++) await emit({ accent: "#e04e20", hook: i / n });

  // 1 · home
  if (await open("/")) {
    const max = await maxScroll(1400);
    await film(3.6, { k: "01 · Home", t: "Every era. One home.", s: "Music videos, live shows, interviews and fashion — all of Lady Gaga in one place.", cover: true }, "#e04e20",
      (i, n) => scrollTo(max * easeInOut((i - 20) / (n - 20))), { enterFrom: 0 });
  }
  // 2 · an era — the site re-colours itself
  if (era && (await open(`/eras/${era.slug}`))) {
    const max = await maxScroll(900);
    await film(3.2, { k: "02 · Eras", t: `Each era, its own world.`, s: `${era.name}: the whole site takes on its colour.` }, era.accent,
      (i, n) => scrollTo(max * easeInOut((i - 18) / (n - 18))));
  }
  // 3 · a video
  if (star && (await open(`/watch/${star.id}`))) {
    await film(2.8, { k: "03 · Watch", t: "Every performance, one tap.", s: "It plays straight from the original source." }, starEra?.accent ?? "#e04e20",
      (i, n) => scrollTo(260 * easeInOut((i - 30) / (n - 30))));
  }
  // 4 · timeline
  if (await open("/timeline")) {
    const max = await maxScroll(3200);
    await film(3.0, { k: "04 · Timeline", t: "Her whole career, day by day.", s: stats.years ? `${stats.years} years of moments, from the start to today.` : "Every milestone, from the start to today." }, "#e04e20",
      (i, n) => scrollTo(max * easeInOut(i / n)));
  }
  // 5 · a tour setlist
  if ((await open("/tours/the-mayhem-ball")) || (await open("/tours"))) {
    const max = await maxScroll(1600);
    await film(3.0, { k: "05 · Tours", t: "Setlists you can tap.", s: "Every song, straight to the performance." }, "#e04e20",
      (i, n) => scrollTo(max * easeInOut((i - 10) / (n - 10))));
  }
  // 6 · search, typed live
  if (await open("/search")) {
    await page.locator("input").first().click().catch(() => {});
    await film(3.0, { k: "06 · Search", t: "Find anything in a second.", s: "Press / on desktop — or just start typing." }, "#e04e20", async (i) => {
      const chars = Math.floor(Math.max(0, i - 10) / 3);
      if (chars > 0 && chars <= query.length && (i - 10) % 3 === 0) {
        await page.keyboard.type(query[chars - 1]);
        await page.waitForTimeout(40);
      }
    });
  }

  // 7 · end card
  const statLine = [stats.videos && `${stats.videos}+ videos`, stats.eras && `${stats.eras} eras`, stats.years && `${stats.years} years`].filter(Boolean).join("  ·  ");
  for (let i = 0, n = Math.round(3 * FPS); i < n; i++) await emit({ accent: "#e04e20", end: i / n, stats: statLine });

  await enc.end();
  if (!coverDone) await comp.screenshot({ path: cover, type: "jpeg", quality: 92 });
  await comp.close();
  await ctx.close();
  if (own) await browser.close();
  return { video, cover, duration: frame / FPS };
}
