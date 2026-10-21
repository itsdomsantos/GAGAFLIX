/**
 * Pictures for news posts that fit the story, never stills from her videos:
 *
 *  1. the article's own photo — the outlet picked it for this very story. Google
 *     News links are resolved to the real article first (resolveGoogleNews).
 *  2. otherwise a real, freely licensed photo of Lady Gaga from Wikimedia Commons,
 *     searched with the story's own words (tour, Grammys, red carpet…), credited
 *     with the photographer and licence, never one used in the last posts.
 */

const UA = "Mozilla/5.0 (compatible; GAGAFLIX-bot/1.0; +https://gagaflix.com)";
const BROWSER_UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36";

/**
 * news.google.com/rss/articles/<id> → the publisher's URL (null when Google won't say).
 * Same exchange the Google News page makes: read the article's signature, then ask
 * the batchexecute endpoint for the target URL.
 */
export async function resolveGoogleNews(url) {
  try {
    const u = new URL(url);
    if (!/news\.google\.com$/.test(u.hostname)) return url;
    const id = u.pathname.split("/").pop();
    const page = await fetch(`https://news.google.com/rss/articles/${id}`, { headers: { "User-Agent": BROWSER_UA }, signal: AbortSignal.timeout(10000) }).then((r) => r.text());
    const sig = page.match(/data-n-a-sg="([^"]+)"/)?.[1];
    const ts = page.match(/data-n-a-ts="([^"]+)"/)?.[1];
    if (!sig || !ts) return null;
    const inner = `["garturlreq",[["X","X",["X","X"],null,null,1,1,"US:en",null,1,null,null,null,null,null,0,1],"X","X",1,[1,1,1],1,1,null,0,0,null,0],"${id}",${ts},"${sig}"]`;
    const body = "f.req=" + encodeURIComponent(JSON.stringify([[["Fbv4je", inner]]]));
    const res = await fetch("https://news.google.com/_/DotsSplashUi/data/batchexecute", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded;charset=UTF-8", "User-Agent": BROWSER_UA },
      body,
      signal: AbortSignal.timeout(10000),
    }).then((r) => r.text());
    const chunk = res.split("\n\n")[1];
    const target = JSON.parse(JSON.parse(chunk)[0][2])[1];
    return /^https?:\/\//.test(target) ? target : null;
  } catch {
    return null;
  }
}

const STOP = new Set(
  "lady gaga gaga the a an and of to in on for with at by from her his is are was new says after as it its this that teases reveals shares just about over into out up how why what when who more major update first".split(" "),
);
/** Words of the headline that can steer a photo search ("Grammys", "tour", "Venice"…). */
const topicWords = (title) =>
  title
    .replace(/[‘’'"“”:,.!?()|–—-]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length > 3 && !STOP.has(w.toLowerCase()) && !/^\d+$/.test(w))
    .slice(0, 3);

const FREE = /^(cc0|public domain|pd|cc by(-sa)? \d)/i;
const clean = (html = "") => html.replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim();

async function commonsSearch(query) {
  const api = new URL("https://commons.wikimedia.org/w/api.php");
  Object.entries({
    action: "query",
    format: "json",
    generator: "search",
    gsrsearch: `${query} filetype:bitmap`,
    gsrnamespace: "6",
    gsrlimit: "40",
    prop: "imageinfo",
    iiprop: "url|size|extmetadata",
    iiurlwidth: "1600",
  }).forEach(([k, v]) => api.searchParams.set(k, v));
  const json = await fetch(api, { headers: { "User-Agent": UA }, signal: AbortSignal.timeout(12000) }).then((r) => r.json());
  return Object.values(json.query?.pages ?? {})
    .map((p) => {
      const info = p.imageinfo?.[0];
      const m = info?.extmetadata ?? {};
      return {
        url: info?.thumburl || info?.url,
        width: info?.width ?? 0,
        height: info?.height ?? 0,
        title: p.title,
        license: m.LicenseShortName?.value ?? "",
        artist: clean(m.Artist?.value) || "Unknown",
        desc: clean(m.ImageDescription?.value).toLowerCase(),
      };
    })
    .filter((p) => p.url && p.width >= 1200 && p.height >= 900 && FREE.test(p.license))
    // photos OF her: her name in the file name or description, no posters, logos or wax figures
    .filter((p) => /gaga/i.test(`${p.title} ${p.desc}`) && !/wax|madame tussauds|poster|logo|album cover|signature|autograph|impersonat|look-?alike|mural|graffiti/i.test(`${p.title} ${p.desc}`));
}

/**
 * Up to `n` free photos for a headline, freshest search first: the story's own words,
 * then her current era on stage, then any good photo of her. Skips URLs in `avoid`.
 */
export async function photosForStory(title, avoid = new Set(), n = 3) {
  const words = topicWords(title);
  const queries = [...(words.length ? [`"Lady Gaga" ${words.join(" ")}`] : []), `"Lady Gaga" Mayhem Ball`, `"Lady Gaga" performing`, `"Lady Gaga"`];
  const seen = new Set();
  const out = [];
  for (const q of queries) {
    let found = [];
    try {
      found = await commonsSearch(q);
    } catch {
      continue;
    }
    // vary the pick between stories (stable for the same headline)
    const seed = [...title].reduce((h, c) => (h * 31 + c.charCodeAt(0)) >>> 0, 7);
    found = found.map((p, i) => ({ p, k: (seed + i * 2654435761) >>> 0 })).sort((a, b) => a.k - b.k).map((x) => x.p);
    for (const p of found) {
      if (avoid.has(p.url) || seen.has(p.url)) continue;
      seen.add(p.url);
      out.push({ url: p.url, credit: `Photo: ${p.artist} / Wikimedia Commons (${p.license}).` });
      if (out.length >= n) return out;
    }
  }
  return out;
}
