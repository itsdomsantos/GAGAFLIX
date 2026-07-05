import { notFound } from "next/navigation";
import EraTheme from "@/components/EraTheme";
import Row from "@/components/Row";
import { getEra, getVideos } from "@/lib/data";
import { VIDEO_TYPES, VIDEO_TYPE_LABELS } from "@/lib/types";

export const dynamic = "force-dynamic";

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

  return (
    <div className="pb-16">
      <EraTheme accent={era.accent} />

      <section className="relative overflow-hidden px-4 pb-12 pt-32 sm:px-6">
        <div
          className="pointer-events-none absolute inset-0 opacity-25"
          style={{
            background: `radial-gradient(80% 120% at 50% -20%, ${era.accent}, transparent 70%)`,
          }}
        />
        <div className="relative mx-auto max-w-7xl">
          <p className="text-xs font-semibold uppercase tracking-[0.25em]" style={{ color: era.accent }}>
            {era.years}
          </p>
          <h1 className="font-display mt-2 text-6xl chrome-text sm:text-8xl [text-wrap:balance]">
            {era.name}
          </h1>
          <p className="mt-4 max-w-2xl text-muted">{era.description}</p>
        </div>
      </section>

      {eraVideos.length === 0 && (
        <p className="px-6 text-muted">
          No videos in this era yet — coming soon, Little Monster. 🐾
        </p>
      )}

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
