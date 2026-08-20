import Link from "next/link";
import Scroller from "./Scroller";
import type { Tour } from "@/lib/types";

/** Home row of tour posters — the way into the Tours section. */
export default function TourCarousel({ tours }: { tours: Tour[] }) {
  if (tours.length === 0) return null;

  return (
    <section className="mt-10">
      <div className="mb-2 flex items-baseline gap-3 px-4 sm:px-6">
        <h2 className="text-sm font-semibold uppercase tracking-[0.25em]">The Tours</h2>
        <span className="text-muted">|</span>
        <Link
          href="/tours"
          className="text-sm font-semibold text-accent transition-opacity hover:opacity-80"
        >
          See All
        </Link>
      </div>
      <Scroller className="flex gap-4 px-6 py-6">
        {tours.map((tour) => (
          <Link
            key={tour.slug}
            href={`/tours/${tour.slug}`}
            className="group shrink-0"
            style={{ "--c": tour.accent } as React.CSSProperties}
          >
            <div className="relative h-56 w-40 overflow-hidden rounded-lg ring-1 ring-line transition-all duration-300 group-hover:ring-2 group-hover:ring-[var(--c)] group-hover:shadow-[0_0_40px_-8px_var(--c)] sm:h-64 sm:w-48">
              {tour.poster_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={tour.poster_url}
                  alt={tour.name}
                  loading="lazy"
                  className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                />
              ) : (
                <div
                  className="flex h-full w-full flex-col items-center justify-center p-4 text-center"
                  style={{
                    background: `radial-gradient(120% 90% at 50% 0%, ${tour.accent}44, var(--surface-2) 75%)`,
                  }}
                >
                  <span
                    className="font-display text-2xl leading-none [text-wrap:balance]"
                    style={{ color: tour.accent }}
                  >
                    {tour.name}
                  </span>
                </div>
              )}
              <div className="absolute inset-x-0 bottom-0 h-1" style={{ background: tour.accent }} />
            </div>
            <p className="mt-2 max-w-40 text-center text-xs font-semibold uppercase tracking-[0.2em] text-muted transition-colors group-hover:text-[var(--c)] sm:max-w-48">
              {tour.years}
            </p>
          </Link>
        ))}
      </Scroller>
    </section>
  );
}
