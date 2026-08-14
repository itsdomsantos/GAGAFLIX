/**
 * News aggregator — pulls fresh "Lady Gaga" headlines from the Google News RSS
 * feed (free, no API key). We keep only the title, source, date and a link back
 * to the original article — never the article body — so it's light and stays on
 * the right side of copyright while sending traffic to the sources.
 */

export interface NewsItem {
  title: string;
  link: string;
  source: string | null;
  sourceUrl: string | null;
  date: string | null;
}

const FEED =
  "https://news.google.com/rss/search?q=%22Lady%20Gaga%22&hl=en-US&gl=US&ceid=US:en";

function decode(s: string): string {
  return s
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
    .replace(/<[^>]+>/g, "")
    .replace(/&#39;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&nbsp;/g, " ")
    .trim();
}

function pick(block: string, tag: string): string | null {
  const m = block.match(new RegExp(`<${tag}(?:\\s[^>]*)?>([\\s\\S]*?)</${tag}>`, "i"));
  return m ? decode(m[1]) : null;
}

export async function getNews(limit = 24): Promise<NewsItem[]> {
  try {
    const res = await fetch(FEED, {
      next: { revalidate: 3600 },
      headers: { "user-agent": "Mozilla/5.0 (compatible; GagaflixBot/1.0)" },
    });
    if (!res.ok) return [];
    const xml = await res.text();

    const blocks = xml
      .split(/<item>/)
      .slice(1)
      .map((b) => b.split(/<\/item>/)[0]);

    const out: NewsItem[] = [];
    for (const block of blocks) {
      const rawTitle = pick(block, "title");
      const link = pick(block, "link");
      if (!rawTitle || !link) continue;

      const sm = block.match(/<source[^>]*url="([^"]*)"[^>]*>([\s\S]*?)<\/source>/i);
      const source = sm ? decode(sm[2]) : null;
      const sourceUrl = sm ? sm[1] : null;

      // Google News titles read "Headline - Source"; drop the trailing source.
      let title = rawTitle;
      if (source && title.endsWith(` - ${source}`)) {
        title = title.slice(0, -(source.length + 3)).trim();
      }

      // Relevance filter: keep only stories that actually name Gaga in the
      // headline, dropping articles where she's just a passing mention.
      if (!title.toLowerCase().includes("gaga")) continue;

      out.push({ title, link, source, sourceUrl, date: pick(block, "pubDate") });
      if (out.length >= limit) break;
    }
    return out;
  } catch {
    return [];
  }
}
