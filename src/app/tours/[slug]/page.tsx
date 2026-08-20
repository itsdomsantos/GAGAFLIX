import { notFound } from "next/navigation";
import EraTheme from "@/components/EraTheme";
import Row from "@/components/Row";
import Setlist from "@/components/Setlist";
import TourSelector from "@/components/TourSelector";
import { getEras, getSetlist, getTour, getTours, getVideos } from "@/lib/data";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const tour = await getTour(slug);
  return { title: tour ? `${tour.name} — GAGAFLIX` : "Tours — GAGAFLIX" };
}

/**
 * A tour page: the whole thing re-themes in the tour's accent. Hero + selector,
 * a stats grid of headline facts, the interactive setlist and — when tagged —
 * a row of every clip from this tour.
 */
export default async function TourPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const [tour, tours, setlist, videos, eras] = await Promise.all([
    getTour(slug),
    getTours(),
    getSetlist(slug),
    getVideos(),
    getEras(),
  ]);
  if (!tour) notFound();

  const validVideoIds = new Set(videos.map((v) => v.id));
  const accents = Object.fromEntries(eras.map((e) => [e.slug, e.accent]));
  accents[slug] = tour.accent;

  const tourClips = videos.filter((v) => v.tour_slug === slug);
  const backdrop = tour.backdrop_url ?? tour.poster_url;

  return (
    <div className="pb-16">
      <EraTheme accent={tour.accent} />

      {/* Hero — full-bleed, tinted by the tour accent */}
      <section className="relative flex min-h-[62vh] items-end overflow-hidden">
        {backdrop && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={backdrop} alt="" className="absolute inset-0 h-full w-full object-cover" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-bg via-bg/60 to-bg/30" />
        <div
          className="pointer-events-none absolute inset-0 opacity-40"
          style={{
            background: `radial-gradient(80% 120% at 50% -10%, ${tour.accent}, transparent 70%)`,
          }}
        />
        <div className="relative mx-auto w-full max-w-7xl px-4 pb-12 pt-36 sm:px-6">
          <p
            className="text-xs font-semibold uppercase tracking-[0.25em]"
            style={{ color: tour.accent }}
          >
            Tour · {tour.years}
          </p>
          {tour.logo_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={tour.logo_url}
              alt={tour.name}
              className="mt-3 max-h-32 max-w-[80vw] object-contain sm:max-h-44"
            />
          ) : (
            <h1 className="font-display mt-2 text-5xl chrome-text sm:text-7xl [text-wrap:balance]">
              {tour.name}
            </h1>
          )}
          {tour.tagline && (
            <p className="mt-3 text-lg italic text-text/90 sm:text-xl">{tour.tagline}</p>
          )}
          <p className="mt-3 max-w-2xl text-sm text-muted sm:text-base">{tour.description}</p>
        </div>
      </section>

      {/* Switch tours — re-themes the whole page */}
      <section className="mt-4">
        <h2 className="mb-1 px-4 text-xs font-semibold uppercase tracking-[0.25em] text-muted sm:px-6">
          Switch tour
        </h2>
        <TourSelector tours={tours} current={slug} />
      </section>

      {/* Stats grid */}
      {tour.stats.length > 0 && (
        <section className="mx-auto mt-8 max-w-7xl px-4 sm:px-6">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {tour.stats.map((stat, i) => (
              <div
                key={i}
                className="rounded-lg border border-line bg-surface p-4 text-center"
              >
                <p
                  className="font-display text-3xl leading-none sm:text-4xl"
                  style={{ color: tour.accent }}
                >
                  {stat.value}
                </p>
                <p className="mt-2 text-[11px] uppercase tracking-wider text-muted">
                  {stat.label}
                </p>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* The setlist — the heart of the page */}
      <section className="mx-auto mt-12 max-w-3xl px-4 sm:px-6">
        <h2 className="mb-6 font-display text-3xl chrome-text sm:text-4xl">Setlist</h2>
        <Setlist songs={setlist} accent={tour.accent} validVideoIds={validVideoIds} />
      </section>

      {tourClips.length > 0 && (
        <Row title={`From ${tour.name}`} videos={tourClips} accents={accents} />
      )}
    </div>
  );
}
