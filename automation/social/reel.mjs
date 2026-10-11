/**
 * Promo reel (1080×1920 MP4, ~15 s): era photos with motion, the catalogue's
 * own numbers and a "link in bio" end card. Frames are captured one by one
 * from reel.html and piped into ffmpeg (preinstalled on GitHub runners via apt).
 * The track is silent on purpose — no copyrighted music via the API; add a
 * trending sound in the Instagram app if you want one.
 */
import { spawn } from "node:child_process";
import { mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { asSrc, brandAssets, openBrowser } from "./render.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const FPS = 30;

/**
 * eras: [{ name, years, accent, image }] (4–7 work best)
 * stats: [{ label, value, plus? }]
 */
export async function renderReel({ eras, stats }, outDir, browser) {
  mkdirSync(outDir, { recursive: true });
  const own = !browser;
  browser ??= await openBrowser();
  const page = await browser.newPage({ viewport: { width: 1080, height: 1920 } });
  page.on("pageerror", (e) => console.error("reel page error:", e.message));
  await page.goto(pathToFileURL(join(HERE, "reel.html")).href);
  await page.evaluate(() => document.fonts.ready);

  const duration = Math.round((1.7 + eras.length * 1.35 + 2.7 + 2.4) * 10) / 10;
  const { logo, monogram } = brandAssets();
  await page.evaluate((d) => window.setup(d), {
    eras: eras.map((e) => ({ ...e, image: asSrc(e.image) })),
    stats,
    logo,
    monogram,
    duration,
  });
  await page.evaluate(() => window.imagesReady());
  await page.waitForTimeout(300);

  const video = join(outDir, "reel.mp4");
  const ff = spawn(
    process.env.FFMPEG_PATH || "ffmpeg",
    [
      "-y", "-loglevel", "error",
      "-f", "image2pipe", "-framerate", String(FPS), "-i", "-",
      // silent stereo track: some players (and Instagram's checks) prefer a video with audio
      "-f", "lavfi", "-i", "anullsrc=channel_layout=stereo:sample_rate=44100",
      "-c:v", "libx264", "-preset", "medium", "-crf", "19", "-pix_fmt", "yuv420p", "-r", String(FPS),
      "-c:a", "aac", "-b:a", "128k", "-shortest", "-movflags", "+faststart", video,
    ],
    { stdio: ["pipe", "inherit", "inherit"] },
  );
  const total = Math.round(FPS * duration);
  for (let i = 0; i < total; i++) {
    await page.evaluate((t) => window.render(t), i / FPS);
    const frame = await page.screenshot({ type: "jpeg", quality: 92 });
    if (!ff.stdin.write(frame)) await new Promise((r) => ff.stdin.once("drain", r));
    if (i % (FPS * 5) === 0) console.log(`  reel frame ${i}/${total}`);
  }
  ff.stdin.end();
  const code = await new Promise((r) => ff.on("close", r));
  if (code !== 0) throw new Error(`ffmpeg exited with ${code}`);

  // Cover = the first era, title fully in.
  await page.evaluate((t) => window.render(t), 1.7 + 0.9);
  const cover = join(outDir, "reel-cover.jpg");
  await page.screenshot({ path: cover, type: "jpeg", quality: 92 });
  await page.close();
  if (own) await browser.close();
  return { video, cover, duration };
}
