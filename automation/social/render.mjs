/**
 * Renders Instagram cards (1080×1350 JPEG — the Instagram API only takes JPEG)
 * from template.html with headless Chromium (Playwright).
 */
import { existsSync, mkdirSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { chromium } from "playwright";
import { ROOT } from "../lib.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));

/** Local paths → file:// URLs the page can load; URLs pass through. */
export const asSrc = (p) => (!p ? null : /^(https?|file|data):/.test(p) ? p : pathToFileURL(p).href);

/** public/logo.png (the real wordmark) once you add it; otherwise the typographic one. */
export function brandAssets() {
  const logoPath = ["png", "webp", "svg"].map((e) => join(ROOT, "public", `logo.${e}`)).find(existsSync);
  const svg = readFileSync(join(ROOT, "src/app/icon.svg"), "utf8")
    .replace(/<svg[^>]*>/, '<svg class="monogram" viewBox="0 0 512 512" xmlns="http://www.w3.org/2000/svg">')
    // drop the rounded app-icon tile, keep the flame G + glow
    .replace(/<rect[^>]*\/>/g, "");
  return { logo: asSrc(logoPath), monogram: svg };
}

/** YouTube thumbnail candidates, sharpest first. */
export function thumbCandidates(video) {
  const list = [];
  if (video.poster_url) list.push(video.poster_url);
  if (video.thumbnail_url && !/i\.ytimg\.com|img\.youtube\.com/.test(video.thumbnail_url)) list.push(video.thumbnail_url);
  const yt =
    video.url.match(/youtu\.be\/([\w-]{6,})/)?.[1] ||
    video.url.match(/youtube\.com\/(?:watch\?(?:.*&)?v=|embed\/|shorts\/|live\/)([\w-]{6,})/)?.[1];
  if (yt) list.push(`https://i.ytimg.com/vi/${yt}/maxresdefault.jpg`, `https://i.ytimg.com/vi/${yt}/hqdefault.jpg`);
  else if (video.thumbnail_url) list.push(video.thumbnail_url);
  return list;
}

export async function openBrowser() {
  return chromium.launch(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {});
}

/** First candidate image that actually loads at a usable size (YouTube serves a 120px grey placeholder for missing maxres). */
async function firstGood(page, candidates) {
  return page.evaluate(
    (list) =>
      (async () => {
        for (const src of list) {
          if (!src) continue;
          const ok = await new Promise((done) => {
            const img = new Image();
            const timer = setTimeout(() => done(false), 8000);
            img.onload = () => (clearTimeout(timer), done(img.naturalWidth >= 400));
            img.onerror = () => (clearTimeout(timer), done(false));
            img.referrerPolicy = "no-referrer";
            img.src = src;
          });
          if (ok) return src;
        }
        return null;
      })(),
    candidates.map(asSrc),
  );
}

/**
 * cards: [{ kind, data, images?: string[] }] — `images` are candidates for
 * data.image (first that loads wins). Writes NN-kind.jpg files, returns paths.
 */
export async function renderCards(cards, outDir, browser) {
  mkdirSync(outDir, { recursive: true });
  const own = !browser;
  browser ??= await openBrowser();
  const page = await browser.newPage({ viewport: { width: 1080, height: 1350 } });
  await page.goto(pathToFileURL(join(HERE, "template.html")).href);
  await page.evaluate(() => document.fonts.ready);
  const brand = brandAssets();
  const files = [];
  for (const [i, c] of cards.entries()) {
    const data = { ...brand, ...c.data };
    if (c.images) data.image = await firstGood(page, c.images);
    c.chosen = data.image ?? null; // which picture was used — the caption credits it
    if (data.images) {
      const ok = [];
      for (const group of data.images) {
        const src = await firstGood(page, Array.isArray(group) ? group : [group]);
        if (src) ok.push(src);
      }
      data.images = ok;
    }
    if (data.eraLogo) data.eraLogo = asSrc(data.eraLogo);
    await page.evaluate(([k, d]) => window.renderCard(k, d), [c.kind, data]);
    await page.evaluate(() => window.imagesReady());
    await page.waitForTimeout(150);
    const file = join(outDir, `${String(i + 1).padStart(2, "0")}-${c.kind}.jpg`);
    await page.screenshot({ path: file, type: "jpeg", quality: 92 });
    files.push(file);
  }
  await page.close();
  if (own) await browser.close();
  return files;
}
