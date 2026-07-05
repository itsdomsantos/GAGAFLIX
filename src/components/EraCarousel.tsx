import Link from "next/link";
import type { Era } from "@/lib/types";

/** O carrossel circular das eras — a assinatura do GAGAFLIX original. */
export default function EraCarousel({ eras }: { eras: Era[] }) {
  if (eras.length === 0) return null;

  return (
    <section className="mt-10">
      <div className="mb-2 flex items-baseline gap-3 px-4 sm:px-6">
        <h2 className="text-sm font-semibold uppercase tracking-[0.25em]">The Eras</h2>
        <span className="text-muted">|</span>
        <Link
          href="/eras"
          className="text-sm font-semibold text-accent transition-opacity hover:opacity-80"
        >
          Watch All
        </Link>
      </div>
      {/* py-8 dá espaço ao glow do hover para não ser cortado pelo overflow */}
      <div className="no-scrollbar flex snap-x gap-6 overflow-x-auto px-6 py-8 sm:gap-9">
        {eras.map((era) => (
          <Link
            key={era.slug}
            href={`/eras/${era.slug}`}
            aria-label={`${era.name} era`}
            className="group shrink-0 snap-start"
            style={{ "--c": era.accent } as React.CSSProperties}
          >
            <div className="relative h-36 w-36 overflow-hidden rounded-full ring-1 ring-line transition-all duration-300 group-hover:ring-2 group-hover:ring-[var(--c)] group-hover:shadow-[0_0_40px_-6px_var(--c)] sm:h-48 sm:w-48">
              {era.image_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={era.image_url}
                  alt={era.name}
                  loading="lazy"
                  className="h-full w-full object-cover grayscale transition-all duration-500 group-hover:scale-105 group-hover:grayscale-0"
                />
              ) : (
                <div
                  className="flex h-full w-full items-center justify-center p-4 text-center"
                  style={{
                    background: `radial-gradient(120% 120% at 30% 20%, ${era.accent}33, var(--surface-2) 70%)`,
                  }}
                >
                  <span
                    className="font-display text-2xl leading-none [text-wrap:balance]"
                    style={{ color: era.accent }}
                  >
                    {era.name}
                  </span>
                </div>
              )}
            </div>
            <p className="mt-3 max-w-36 text-center text-xs font-semibold uppercase tracking-[0.2em] text-muted transition-colors group-hover:text-[var(--c)] sm:max-w-48">
              {era.name}
            </p>
          </Link>
        ))}
      </div>
    </section>
  );
}
