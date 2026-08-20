import Link from "next/link";
import { getEras } from "@/lib/data";
import type { Era } from "@/lib/types";

export const dynamic = "force-dynamic";

export const metadata = { title: "Eras — GAGAFLIX" };

export default async function ErasPage() {
  const eras = await getEras();

  return (
    <div className="pb-16 pt-24 sm:pt-28">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <h1 className="font-display text-5xl chrome-text sm:text-6xl">Eras</h1>
        <p className="mt-3 max-w-xl text-muted">Every era is a world. Choose your way in.</p>
      </div>

      {/* Desktop: a filmstrip accordion — each era is a panel that expands on hover. */}
      <div className="mt-10 hidden h-[72vh] gap-1.5 px-4 sm:px-6 md:flex">
        {eras.map((era) => (
          <ErasPanel key={era.slug} era={era} />
        ))}
        {eras.length === 0 && <EmptyState />}
      </div>

      {/* Mobile: a stack of full-bleed banners. */}
      <div className="mt-8 flex flex-col gap-2 px-4 sm:px-6 md:hidden">
        {eras.map((era) => (
          <ErasBanner key={era.slug} era={era} />
        ))}
        {eras.length === 0 && <EmptyState />}
      </div>
    </div>
  );
}

/** One vertical panel of the desktop accordion. Collapsed → spine label; hovered → full reveal. */
function ErasPanel({ era }: { era: Era }) {
  return (
    <Link
      href={`/eras/${era.slug}`}
      aria-label={`${era.name} era`}
      className="group/p relative isolate flex min-w-[56px] flex-[1_1_0%] overflow-hidden rounded-lg ring-1 ring-line transition-[flex-grow] duration-500 ease-out hover:flex-[7_1_0%] hover:ring-[var(--c)]"
      style={{ "--c": era.accent } as React.CSSProperties}
    >
      <Backdrop era={era} />

      {/* Collapsed state: the era name written up the spine. */}
      <span className="pointer-events-none absolute inset-0 flex items-center justify-center transition-opacity duration-300 group-hover/p:opacity-0">
        <span
          className="font-display text-2xl tracking-wide [writing-mode:vertical-rl] rotate-180 [text-shadow:0_2px_12px_rgba(0,0,0,0.7)]"
          style={{ color: era.accent }}
        >
          {era.name}
        </span>
      </span>

      {/* Expanded state: revealed on hover. */}
      <div className="pointer-events-none absolute inset-0 flex flex-col justify-end p-6 opacity-0 transition-opacity duration-500 delay-150 group-hover/p:opacity-100">
        <p
          className="text-xs font-semibold uppercase tracking-[0.25em]"
          style={{ color: era.accent }}
        >
          {era.years}
        </p>
        {era.logo_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={era.logo_url} alt={era.name} className="mt-2 max-h-20 w-auto self-start object-contain" />
        ) : (
          <h2 className="font-display mt-1 text-4xl [text-wrap:balance] lg:text-5xl" style={{ color: era.accent }}>
            {era.name}
          </h2>
        )}
        <p className="mt-3 line-clamp-3 max-w-md text-sm text-text/80">{era.description}</p>
        <span
          className="mt-5 inline-flex w-fit items-center gap-2 rounded-md px-4 py-2 text-sm font-semibold text-black"
          style={{ background: era.accent }}
        >
          Enter
          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
            <path d="M5 12h14m-6-6 6 6-6 6" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </span>
      </div>
    </Link>
  );
}

/** One full-bleed banner for the mobile stack. */
function ErasBanner({ era }: { era: Era }) {
  return (
    <Link
      href={`/eras/${era.slug}`}
      className="group relative flex h-40 items-end overflow-hidden rounded-lg ring-1 ring-line"
      style={{ "--c": era.accent } as React.CSSProperties}
    >
      <Backdrop era={era} />
      <div className="relative w-full p-4">
        <p className="text-[11px] font-semibold uppercase tracking-[0.25em]" style={{ color: era.accent }}>
          {era.years}
        </p>
        {era.logo_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={era.logo_url} alt={era.name} className="mt-1 max-h-12 w-auto object-contain" />
        ) : (
          <h2 className="font-display mt-0.5 text-3xl" style={{ color: era.accent }}>
            {era.name}
          </h2>
        )}
        <p className="mt-1 line-clamp-1 text-xs text-text/70">{era.description}</p>
      </div>
    </Link>
  );
}

/** Shared background: the era art (grayscale, revealed in colour on hover) + accent wash. */
function Backdrop({ era }: { era: Era }) {
  return (
    <>
      {era.image_url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={era.image_url}
          alt=""
          className="absolute inset-0 -z-10 h-full w-full object-cover opacity-40 grayscale transition-all duration-500 group-hover/p:opacity-60 group-hover/p:grayscale-0 group-hover:opacity-60 group-hover:grayscale-0"
        />
      ) : (
        <span
          className="absolute inset-0 -z-10"
          style={{ background: `radial-gradient(120% 90% at 50% 0%, ${era.accent}44, var(--surface) 78%)` }}
        />
      )}
      {/* readability wash + accent edge */}
      <span className="absolute inset-0 -z-10 bg-gradient-to-t from-bg via-bg/40 to-bg/10" />
      <span className="absolute inset-x-0 top-0 h-1" style={{ background: era.accent }} />
    </>
  );
}

function EmptyState() {
  return (
    <p className="text-muted">No eras yet — coming soon, Little Monster. 🐾</p>
  );
}
