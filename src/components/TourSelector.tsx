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
    <Scroller className="flex items-start gap-4 px-4 py-4 sm:px-6">
      {tours.map((tour) => {
        const active = tour.slug === current;
        return (
          <Link
            key={tour.slug}
            href={`/tours/${tour.slug}`}
            aria-current={active ? "page" : undefined}
            className="group flex w-16 shrink-0 flex-col items-center sm:w-20"
            style={{ "--c": tour.accent } as React.CSSProperties}
          >
            <div
              className={`relative h-16 w-16 overflow-hidden rounded-full ring-1 transition-all duration-300 sm:h-20 sm:w-20 ${
                active
                  ? "ring-2 ring-[var(--c)] shadow-[0_0_24px_-8px_var(--c)]"
                  : "ring-line opacity-70 group-hover:opacity-100 group-hover:ring-[var(--c)]"
              }`}
            >
              {tour.poster_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={tour.poster_url} alt={tour.name} className="h-full w-full object-cover" />
              ) : (
                <span
                  aria-hidden="true"
                  className="block h-full w-full"
                  style={{
                    background: `radial-gradient(120% 120% at 30% 20%, ${tour.accent}, color-mix(in srgb, ${tour.accent} 30%, var(--surface-2)) 78%)`,
                  }}
                />
              )}
            </div>
            <p
              className={`mt-2 w-full text-center text-[10px] font-semibold uppercase leading-tight tracking-wider [text-wrap:balance] transition-colors ${
                active ? "text-text" : "text-muted group-hover:text-text"
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
