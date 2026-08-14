import Link from "next/link";
import type { NewsItem } from "@/lib/news";

function hostOf(url: string | null): string | null {
  try {
    return url ? new URL(url).hostname.replace(/^www\./, "") : null;
  } catch {
    return null;
  }
}

/** "3h ago", "2d ago", or a short date for older stories. */
function timeAgo(date: string | null): string | null {
  if (!date) return null;
  const t = new Date(date).getTime();
  if (Number.isNaN(t)) return null;
  const mins = Math.round((Date.now() - t) / 60000);
  if (mins < 60) return `${Math.max(1, mins)}m ago`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(t).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export default function NewsCard({ item }: { item: NewsItem }) {
  const domain = hostOf(item.sourceUrl) ?? hostOf(item.link);
  const favicon = domain
    ? `https://www.google.com/s2/favicons?domain=${domain}&sz=64`
    : null;
  const when = timeAgo(item.date);

  return (
    <Link
      href={`/news/read?u=${encodeURIComponent(item.link)}`}
      className="group flex gap-3 rounded-lg border border-line bg-surface p-3 transition-colors hover:border-accent"
    >
      <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded bg-surface-2">
        {favicon ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={favicon} alt="" width={20} height={20} className="h-5 w-5" />
        ) : (
          <span className="text-xs text-muted">📰</span>
        )}
      </span>
      <span className="min-w-0 flex-1">
        <span className="line-clamp-2 text-sm font-medium leading-snug transition-colors group-hover:text-accent">
          {item.title}
        </span>
        <span className="mt-1 block truncate text-xs text-muted">
          {item.source ?? domain ?? "Source"}
          {when ? ` · ${when}` : ""}
        </span>
      </span>
    </Link>
  );
}
