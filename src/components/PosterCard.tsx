import Link from "next/link";
import type { Poster } from "@/lib/types";

/** True for absolute links that should open the external site in a new tab. */
function isExternal(link: string): boolean {
  return /^https?:\/\//i.test(link);
}

/**
 * A 4:5 poster card (movies / featured). Same chrome-glow hover as the video
 * cards, but portrait. Clicking follows the item's link when it has one —
 * external links (Netflix, Disney+, a trailer…) open in a new tab.
 */
export default function PosterCard({ poster }: { poster: Poster }) {
  const inner = (
    <>
      <div className="relative aspect-[4/5] overflow-hidden rounded-md bg-surface-2 ring-1 ring-line transition-all duration-300 group-hover:ring-accent group-hover:shadow-[0_0_24px_-6px_var(--accent)]">
        {poster.cover_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={poster.cover_url}
            alt={poster.title}
            loading="lazy"
            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-surface-2 to-bg p-4 text-center">
            <span className="font-display text-lg leading-tight chrome-text">{poster.title}</span>
          </div>
        )}
      </div>
      <p className="mt-2 line-clamp-2 text-sm font-medium leading-snug">{poster.title}</p>
      {poster.subtitle && <p className="mt-0.5 line-clamp-1 text-xs text-muted">{poster.subtitle}</p>}
    </>
  );

  const cls = "group w-36 shrink-0 sm:w-44";

  if (!poster.link) {
    return <div className={cls}>{inner}</div>;
  }

  if (isExternal(poster.link)) {
    return (
      <a href={poster.link} target="_blank" rel="noopener noreferrer" className={cls}>
        {inner}
      </a>
    );
  }

  return (
    <Link href={poster.link} className={cls}>
      {inner}
    </Link>
  );
}
