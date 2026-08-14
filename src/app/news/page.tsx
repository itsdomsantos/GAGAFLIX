import type { Metadata } from "next";
import NewsCard from "@/components/NewsCard";
import { getNews } from "@/lib/news";

export const revalidate = 3600;

export const metadata: Metadata = {
  title: "News — GAGAFLIX",
  description: "Fresh Lady Gaga headlines from around the web, updated hourly.",
};

export default async function NewsPage() {
  const news = await getNews(40);

  return (
    <div className="mx-auto max-w-5xl px-4 pb-16 pt-24 sm:px-6">
      <h1 className="font-display text-5xl chrome-text">Latest news</h1>
      <p className="mt-2 max-w-2xl text-sm text-muted">
        Fresh Lady Gaga headlines pulled from around the web, updated hourly. Tap any story to
        read it in full at the source.
      </p>

      {news.length === 0 ? (
        <p className="mt-12 text-sm text-muted">
          No headlines right now — check back in a bit. 🐾
        </p>
      ) : (
        <div className="mt-8 grid grid-cols-1 gap-3 sm:grid-cols-2">
          {news.map((n) => (
            <NewsCard key={n.link} item={n} />
          ))}
        </div>
      )}
    </div>
  );
}
