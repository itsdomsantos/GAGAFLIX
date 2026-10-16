/**
 * Films the real GAGAFLIX site while a script uses it — shared by the Instagram reel
 * (phone) and the YouTube trailer (desktop).
 *
 * Slow motion: while filming, the site runs `slow`× slower — its clock and timers and every
 * element.animate() via an init script, CSS animations/transitions via the DevTools
 * Animation domain (each one re-timed as it starts) — so back-to-back sharp screenshots
 * become smooth footage. (Not Chromium's global animation playback rate: with it, the
 * site's era transition left its colour strips stuck over the page.)
 * Every time given to a script is in VIDEO ms.
 *
 * Local previews without YouTube access: REEL_MOCK_IMAGES=1 swaps YouTube thumbnails for
 * the era photos in public/eras/ (preview only — never used for a real post).
 */
import { spawn } from "node:child_process";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { ROOT } from "../lib.mjs";

/**
 * ffmpeg H.264 encoder fed with JPEG frames on stdin. With `audio` (a wav/m4a path) the
 * track is muxed in; otherwise a silent stereo track is added (some players expect one).
 */
export function encoder(file, { fps = 30, audio = null, crf = 19, preset = "medium" } = {}) {
  const ff = spawn(
    process.env.FFMPEG_PATH || "ffmpeg",
    [
      "-y", "-loglevel", "error",
      "-f", "image2pipe", "-framerate", String(fps), "-i", "-",
      ...(audio ? ["-i", audio] : ["-f", "lavfi", "-i", "anullsrc=channel_layout=stereo:sample_rate=48000"]),
      "-c:v", "libx264", "-preset", preset, "-crf", String(crf), "-pix_fmt", "yuv420p", "-r", String(fps),
      "-c:a", "aac", "-b:a", audio ? "256k" : "128k", "-shortest", "-movflags", "+faststart", file,
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
 * Which videos really play: asks YouTube's oEmbed (free, no key) about each candidate.
 * 200 = plays, 401/403 = embedding disabled, 404 = gone. Returns { ok: Set, bad: Set };
 * anything we couldn't check (network) is in neither — callers prefer `ok`, never use `bad`.
 * The reel and the trailer only ever open videos from `ok` (or, offline, not in `bad`).
 */
export async function checkPlayable(videos, max = 800) {
  const ok = new Set();
  const bad = new Set();
  const yt = (u) => u.match(/youtu\.be\/([\w-]{6,})/)?.[1] || u.match(/youtube\.com\/(?:watch\?(?:.*&)?v=|embed\/|shorts\/|live\/)([\w-]{6,})/)?.[1];
  const queue = videos.filter((v) => yt(v.url)).slice(0, max);
  const worker = async () => {
    for (let v = queue.shift(); v; v = queue.shift()) {
      try {
        const res = await fetch(`https://www.youtube.com/oembed?format=json&url=${encodeURIComponent(v.url)}`, { signal: AbortSignal.timeout(8000) });
        if (res.ok) ok.add(v.id);
        else if ([401, 403, 404].includes(res.status)) bad.add(v.id);
      } catch {
        /* offline / blocked: unknown */
      }
    }
  };
  await Promise.all(Array.from({ length: 16 }, worker)); // 16 at a time — polite to YouTube
  return { ok, bad };
}

/** Pick from `candidates` (in order) a video that plays: verified first, else not known-bad. */
export function pickPlayable(candidates, { ok, bad }) {
  return candidates.find((v) => ok.has(v.id)) ?? candidates.find((v) => !bad.has(v.id)) ?? null;
}

const IPHONE_UA =
  "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1";

/**
 * @param browser  a Playwright Chromium browser (see render.mjs openBrowser)
 * @param opts     { site, viewport: {width,height}, dpr, mobile, slow, quality }
 */
export async function createRecorder(browser, { site, viewport, dpr = 2, mobile = false, slow = 3, quality = 82 }) {
  const SITE = site.replace(/\/$/, "");
  const SLOW = Math.max(1, slow);
  const sleepUntil = (t0, ms) => new Promise((r) => setTimeout(r, Math.max(0, t0 + ms * SLOW - Date.now())));

  const ctx = await browser.newContext({
    viewport,
    deviceScaleFactor: dpr,
    isMobile: mobile,
    hasTouch: mobile,
    // the site is a PWA: its service worker would fetch images outside our control
    serviceWorkers: "block",
    ...(mobile ? { userAgent: IPHONE_UA } : {}),
  });
  // no "Add to Home Screen" sheet over the footage
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
    // Web Animations (the era transition strips…): stretch duration and delay.
    const animate = Element.prototype.animate;
    Element.prototype.animate = function (keyframes, opts) {
      const o = typeof opts === "number" ? { duration: opts * k } : { ...opts, duration: (opts?.duration ?? 0) * k, delay: (opts?.delay ?? 0) * k };
      return animate.call(this, keyframes, o);
    };
  }, SLOW);
  // no analytics hits from the robot
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
  /** CSS animations & transitions: re-time each one as it starts (Web Animations are patched in-page). */
  let cssSlowed = false;
  const slowAnimations = async () => {
    if (SLOW <= 1) return;
    try {
      await cdp.send("Animation.enable");
      if (!cssSlowed) {
        cssSlowed = true;
        cdp.on("Animation.animationStarted", ({ animation: a }) => {
          if (a.type === "WebAnimation" || !a.source) return;
          cdp.send("Animation.setTiming", { animationId: a.id, duration: a.source.duration * SLOW, delay: a.source.delay * SLOW }).catch(() => {});
        });
      }
    } catch {
      /* not fatal: CSS animations just play at normal speed */
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

  /** Smooth, eased scroll inside the page (`ms` in video ms — the slow clock stretches it). */
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
        const c =
          how === "middle"
            ? els.sort((a, b) => Math.abs(a.r.left + a.r.width / 2 - innerWidth / 2) - Math.abs(b.r.left + b.r.width / 2 - innerWidth / 2))[0]
            : els[0];
        return { x: c.r.left + c.r.width / 2, y: c.r.top + c.r.height / 2 };
      },
      [sel, pick],
    );
  /** Centre of a fixed control (floating buttons sit near the screen edge, so no margin rules). */
  const control = (sel) =>
    page.evaluate((s) => {
      const el = [...document.querySelectorAll(s)].find((e) => e.getBoundingClientRect().width > 4);
      if (!el) return null;
      const r = el.getBoundingClientRect();
      return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
    }, sel);
  /** Animate a horizontal scroller so `sel` sits in its middle (`ms` in video ms). */
  const centreInScroller = (sel, ms = 1000) =>
    page.evaluate(
      ([s, dur]) =>
        new Promise((done) => {
          const link = document.querySelector(s);
          const box = link?.closest("[data-scroller]") ?? link?.parentElement;
          if (!link || !box) return done();
          const from = box.scrollLeft;
          const to = Math.max(0, link.offsetLeft - (box.clientWidth - link.offsetWidth) / 2);
          const st = performance.now();
          const step = () => {
            const p = Math.min(1, (performance.now() - st) / dur);
            box.scrollLeft = from + (to - from) * (p < 0.5 ? 4 * p * p * p : 1 - (-2 * p + 2) ** 3 / 2);
            if (p < 1) requestAnimationFrame(step);
            else done();
          };
          requestAnimationFrame(step);
        }),
      [sel, ms],
    );

  /**
   * Record `ms` (video ms) of the live page while `script({ at, tap, mark, t0 })` drives it.
   * `at(ms)` waits until that video time. Returns { frames: [{t, data}], taps: [{t, x, y}], marks, ms }.
   */
  async function take(ms, script) {
    await page.bringToFront(); // a background tab gets its timers & animations throttled
    await slowAnimations();
    const frames = [];
    const taps = [];
    const marks = {};
    const t0 = Date.now();
    const at = (videoMs) => sleepUntil(t0, videoMs);
    const tap = async (pt) => {
      if (!pt) return false;
      taps.push({ t: (Date.now() - t0) / SLOW, x: pt.x, y: pt.y });
      await page.mouse.click(pt.x, pt.y);
      return true;
    };
    const mark = (name) => (marks[name] = (Date.now() - t0) / SLOW);
    const driving = (async () => {
      try {
        await script?.({ at, tap, mark, t0 });
      } catch (err) {
        console.warn(`  recorder: a step failed (${err.message.split("\n")[0]}) — keeping what was filmed`);
      }
    })();
    while (Date.now() - t0 < ms * SLOW) {
      const t = (Date.now() - t0) / SLOW;
      try {
        const buf = await page.screenshot({ type: "jpeg", quality });
        frames.push({ t, data: buf.toString("base64"), url: page.url() });
      } catch {
        await new Promise((r) => setTimeout(r, 30)); // mid-navigation: try again
      }
    }
    await driving;
    if (!frames.length) frames.push({ t: 0, data: (await page.screenshot({ type: "jpeg", quality })).toString("base64"), url: page.url() });
    if (process.env.REEL_DEBUG) console.log("  [debug]", page.url(), frames.length, "frames", JSON.stringify(taps));
    return { frames, taps, marks, ms };
  }

  /** The recorded frame to show at video time `vt` (ms). Keeps an index for speed. */
  const frameAt = (rec, vt, state = { i: 0 }) => {
    while (state.i + 1 < rec.frames.length && rec.frames[state.i + 1].t <= vt) state.i++;
    state.url = rec.frames[state.i].url;
    return rec.frames[state.i].data;
  };

  return { page, open, take, scrollTo, yFor, centre, control, centreInScroller, frameAt, slow: SLOW, close: () => ctx.close() };
}
