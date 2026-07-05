import Link from "next/link";
import { notFound } from "next/navigation";
import EraTheme from "@/components/EraTheme";
import Row from "@/components/Row";
import { getEra, getVideos } from "@/lib/data";
import { heroThumbnail } from "@/lib/player";
import { VIDEO_TYPES, VIDEO_TYPE_LABELS } from "@/lib/types";

export const dynamic = "force-dynamic";

/** Cada era é uma réplica da homepage, dedicada só a essa era. */
export default async function EraPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const [era, videos] = await Promise.all([getEra(slug), getVideos()]);
  if (!era) notFound();

  const eraVideos = videos.filter((v) => v.era_slug === era.slug);
  const accents = { [era.slug]: era.accent };

  const heroVideo = eraVideos.find((v) => v.featured) ?? eraVideos[0] ?? null;
  const backdrop = heroVideo ? heroThumbnail(heroVideo) : era.image_url;

  const recent = [...eraVideos]
    .sort((a, b) => (b.created_at ?? "").localeCompare(a.created_at ?? ""))
    .slice(0, 12);

  return (
    <div className="pb-16">
      <EraTheme accent={era.accent} />

      {/* Hero da era — como a homepage, mas deste mundo */}
      <section className="relative flex min-h-[64vh] items-end overflow-hidden">
        {backdrop && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={backdrop} alt="" className="absolute inset-0 h-full w-full object-cover" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-bg via-bg/50 to-bg/30" />
        <div className="absolute inset-0 bg-gradient-to-r from-bg/80 via-transparent to-transparent" />
        <div
          className="pointer-events-none absolute inset-0 opacity-30"
          style={{
            background: `radial-gradient(80% 120% at 50% -20%, ${era.accent}, transparent 70%)`,
          }}
        />

        <div className="relative mx-auto w-full max-w-7xl px-4 pb-12 pt-36 sm:px-6">
          <p
            className="text-xs font-semibold uppercase tracking-[0.25em]"
            style={{ color: era.accent }}
          >
            {era.years}
          </p>
          {era.logo_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={era.logo_url}
              alt={era.name}
              className="mt-3 max-h-32 max-w-[80vw] object-contain sm:max-h-44"
            />
          ) : (
            <h1 className="font-display mt-2 text-6xl chrome-text sm:text-8xl [text-wrap:balance]">
              {era.name}
            </h1>
          )}
          <p className="mt-4 max-w-2xl text-sm text-muted sm:text-base">{era.description}</p>
          {heroVideo && (
            <div className="mt-7">
              <Link
                href={`/watch/${heroVideo.id}`}
                className="inline-flex items-center gap-2 rounded-md px-6 py-3 font-semibold text-black transition-transform hover:scale-105"
                style={{ background: era.accent }}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                  <path d="M8 5v14l11-7L8 5Z" />
                </svg>
                Watch {heroVideo.title}
              </Link>
            </div>
          )}
        </div>
      </section>

      {eraVideos.length === 0 && (
        <p className="px-6 pt-10 text-muted">
          No videos in this era yet — coming soon, Little Monster. 🐾
        </p>
      )}

      <Row title={`New in ${era.name}`} videos={recent} accents={accents} />

      {VIDEO_TYPES.map((type) => (
        <Row
          key={type}
          title={VIDEO_TYPE_LABELS[type]}
          videos={eraVideos.filter((v) => v.type === type)}
          accents={accents}
        />
      ))}
    </div>
  );
}
