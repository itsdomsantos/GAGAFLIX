import Link from "next/link";

export interface PosterItem {
  key: string;
  title: string;
  subtitle?: string | null;
  cover?: string | null;
  /** Destination — internal (/watch/…) or external (a streaming service). */
  href?: string | null;
  /** When true, open the link in a new tab (used for streaming services). */
  external?: boolean;
}

/**
 * A 4:5 poster card. Same chrome-glow hover as the video cards, but portrait —
 * used both for featured videos and for movies that link out to a streaming
 * service. External links open in a new tab.
 */
export default function PosterCard({ item }: { item: PosterItem }) {
  const inner = (
    <>
      <div className="relative aspect-[4/5] overflow-hidden rounded-md bg-surface-2 ring-1 ring-line transition-all duration-300 group-hover:ring-accent group-hover:shadow-[0_0_24px_-6px_var(--accent)]">
        {item.cover ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={item.cover}
            alt={item.title}
            loading="lazy"
            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-surface-2 to-bg p-4 text-center">
            <span className="font-display text-lg leading-tight chrome-text">{item.title}</span>
          </div>
        )}
        <div className="absolute inset-0 flex items-center justify-center bg-black/0 opacity-0 transition-all duration-300 group-hover:bg-black/25 group-hover:opacity-100">
          <span className="flex h-11 w-11 items-center justify-center rounded-full bg-accent text-black">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
              <path d="M8 5v14l11-7L8 5Z" />
            </svg>
          </span>
        </div>
      </div>
      <p className="mt-2 line-clamp-2 text-sm font-medium leading-snug">{item.title}</p>
      {item.subtitle && <p className="mt-0.5 line-clamp-1 text-xs text-muted">{item.subtitle}</p>}
    </>
  );

  const cls = "group w-36 shrink-0 sm:w-44";

  if (!item.href) return <div className={cls}>{inner}</div>;

  if (item.external) {
    return (
      <a href={item.href} target="_blank" rel="noopener noreferrer" className={cls}>
        {inner}
      </a>
    );
  }

  return (
    <Link href={item.href} className={cls}>
      {inner}
    </Link>
  );
}
