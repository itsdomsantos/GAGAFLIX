import Link from "next/link";
import Scroller from "./Scroller";
import type { Tour } from "@/lib/types";

/**
 * Horizontal strip of every tour, shown at the top of a tour page. The current
 * tour is highlighted; picking another navigates there and the whole page
 * re-themes in that tour's accent.
 */
export default function TourSelector({
  tours,
  current,
}: {
  tours: Tour[];
  current: string;
}) {
  if (tours.length <= 1) return null;

  return (
    <Scroller className="flex gap-3 px-4 py-4 sm:px-6">
      {tours.map((tour) => {
        const active = tour.slug === current;
        return (
          <Link
            key={tour.slug}
            href={`/tours/${tour.slug}`}
            aria-current={active ? "page" : undefined}
            className="group relative shrink-0"
            style={{ "--c": tour.accent } as React.CSSProperties}
          >
            <div
              className={`relative flex h-16 w-16 items-center justify-center overflow-hidden rounded-full ring-1 transition-all duration-300 sm:h-20 sm:w-20 ${
                active
                  ? "ring-2 ring-[var(--c)] shadow-[0_0_28px_-6px_var(--c)]"
                  : "ring-line opacity-60 group-hover:opacity-100 group-hover:ring-[var(--c)]"
              }`}
            >
              {tour.poster_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={tour.poster_url} alt={tour.name} className="h-full w-full object-cover" />
              ) : (
                <span
                  className="font-display text-lg leading-none"
                  style={{ color: tour.accent }}
                >
                  {tour.years.replace(/\s*–.*/, "").trim().slice(-2) || "•"}
                </span>
              )}
            </div>
            <p
              className={`mt-1.5 w-16 truncate text-center text-[10px] font-semibold uppercase tracking-wider sm:w-20 ${
                active ? "text-text" : "text-muted"
              }`}
            >
              {tour.name.replace(/^The\s+/, "")}
            </p>
          </Link>
        );
      })}
    </Scroller>
  );
}
