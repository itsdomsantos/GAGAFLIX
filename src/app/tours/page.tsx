import Link from "next/link";
import { getTours } from "@/lib/data";

export const dynamic = "force-dynamic";

export const metadata = { title: "Tours — GAGAFLIX" };

export default async function ToursPage() {
  const tours = await getTours();

  return (
    <div className="mx-auto max-w-7xl px-4 pb-16 pt-28 sm:px-6">
      <h1 className="font-display text-5xl chrome-text sm:text-6xl">Tours</h1>
      <p className="mt-3 max-w-xl text-muted">
        Every tour is a show. Step into the setlist.
      </p>

      <div className="mt-10 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
        {tours.map((tour) => (
          <Link
            key={tour.slug}
            href={`/tours/${tour.slug}`}
            className="group relative flex aspect-[4/5] flex-col justify-end overflow-hidden rounded-lg bg-surface p-5 ring-1 ring-line transition-all duration-300 hover:ring-[var(--c)] hover:shadow-[0_0_32px_-8px_var(--c)]"
            style={{ "--c": tour.accent } as React.CSSProperties}
          >
            {tour.poster_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={tour.poster_url}
                alt=""
                className="absolute inset-0 h-full w-full object-cover opacity-40 transition-all duration-500 group-hover:opacity-60 group-hover:scale-105"
              />
            ) : (
              <div
                className="absolute inset-0"
                style={{
                  background: `radial-gradient(120% 90% at 50% 0%, ${tour.accent}33, var(--surface) 72%)`,
                }}
              />
            )}
            <div className="absolute inset-x-0 top-0 h-1" style={{ background: tour.accent }} />
            <div className="relative">
              <p className="text-[11px] uppercase tracking-[0.25em] text-muted">{tour.years}</p>
              <h2
                className="font-display mt-1 text-2xl leading-none [text-wrap:balance] sm:text-3xl"
                style={{ color: tour.accent }}
              >
                {tour.name}
              </h2>
              {tour.tagline && (
                <p className="mt-2 line-clamp-2 text-xs text-muted">{tour.tagline}</p>
              )}
            </div>
          </Link>
        ))}
        {tours.length === 0 && (
          <p className="text-muted">No tours yet — coming soon, Little Monster. 🐾</p>
        )}
      </div>
    </div>
  );
}
