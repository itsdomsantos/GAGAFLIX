import type { Metadata } from "next";
import Link from "next/link";
import BackButton from "@/components/BackButton";
import NewsCard from "@/components/NewsCard";
import { getArticlePreview, getNews } from "@/lib/news";

export const revalidate = 3600;

export const metadata: Metadata = {
  title: "News — GAGAFLIX",
  robots: { index: false, follow: true },
};

function hostOf(url: string | null): string | null {
  try {
    return url ? new URL(url).hostname.replace(/^www\./, "") : null;
  } catch {
    return null;
  }
}

export default async function NewsReader({
  searchParams,
}: {
  searchParams: Promise<{ u?: string }>;
}) {
  const { u } = await searchParams;
  const news = await getNews(40);
  const item = u ? news.find((n) => n.link === u) : null;

  if (!item) {
    return (
      <div className="mx-auto max-w-3xl px-4 pb-16 pt-24 sm:px-6">
        <BackButton />
        <p className="mt-8 text-sm text-muted">
          This story isn’t available anymore.{" "}
          <Link href="/news" className="text-accent hover:underline">
            Back to all news →
          </Link>
        </p>
      </div>
    );
  }

  const preview = await getArticlePreview(item.link);
  const related = news.filter((n) => n.link !== item.link).slice(0, 8);
  const domain = hostOf(item.sourceUrl) ?? hostOf(item.link);
  const favicon = domain ? `https://www.google.com/s2/favicons?domain=${domain}&sz=64` : null;
  const source = item.source ?? domain ?? "the source";
  const when = item.date
    ? new Date(item.date).toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
      })
    : null;

  return (
    <div className="pb-16 pt-20">
      <div className="mx-auto max-w-3xl px-4 sm:px-6">
        <BackButton />

        {/* Hero — the article's share image, or a branded fallback */}
        <div className="relative mt-2 aspect-video w-full overflow-hidden rounded-lg bg-surface-2 ring-1 ring-line">
          {preview.image ? (
            <>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={preview.image} alt="" className="h-full w-full object-cover" />
              <div className="absolute inset-0 bg-gradient-to-t from-bg/80 via-transparent to-transparent" />
            </>
          ) : (
            <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-surface-2 to-bg p-6 text-center">
              <span className="font-display text-3xl chrome-text">{source}</span>
            </div>
          )}
        </div>

        {/* Source + date */}
        <div className="mt-5 flex items-center gap-2 text-sm text-muted">
          {favicon && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={favicon} alt="" width={18} height={18} className="h-[18px] w-[18px] rounded-sm" />
          )}
          <span>{source}</span>
          {when && <span>· {when}</span>}
        </div>

        <h1 className="mt-3 font-display text-3xl chrome-text sm:text-4xl [text-wrap:balance]">
          {item.title}
        </h1>

        {preview.description && (
          <p className="mt-4 text-base leading-relaxed text-text/90">{preview.description}</p>
        )}

        {/* The source is the link */}
        <a
          href={item.link}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-6 inline-flex items-center gap-2 rounded-md bg-accent px-6 py-3 font-semibold text-black transition-transform hover:scale-105"
        >
          Read the full story at {source}
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path d="M7 17 17 7M9 7h8v8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </a>

        <p className="mt-3 text-xs text-muted">
          Opens {source} in a new tab. GAGAFLIX only shows the headline and preview — the full
          article lives at the source.
        </p>
      </div>

      {related.length > 0 && (
        <section className="mx-auto mt-12 max-w-5xl px-4 sm:px-6">
          <h2 className="text-lg font-semibold tracking-wide">Related news</h2>
          <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {related.map((n) => (
              <NewsCard key={n.link} item={n} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
