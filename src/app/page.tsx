import EraCarousel from "@/components/EraCarousel";
import Hero from "@/components/Hero";
import Row from "@/components/Row";
import { getEras, getFeatured, getRecent, getVideos } from "@/lib/data";
import { VIDEO_TYPES, VIDEO_TYPE_LABELS } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const [featured, videos, recent, eras] = await Promise.all([
    getFeatured(),
    getVideos(),
    getRecent(12),
    getEras(),
  ]);

  const accents = Object.fromEntries(eras.map((e) => [e.slug, e.accent]));
  const featuredEra = featured?.era_slug
    ? eras.find((e) => e.slug === featured.era_slug) ?? null
    : null;

  return (
    <div className="pb-16">
      {featured ? (
        <Hero video={featured} era={featuredEra} />
      ) : (
        <section className="flex min-h-[60vh] items-end px-6 pb-14">
          <h1 className="font-display text-6xl chrome-text">GAGAFLIX</h1>
        </section>
      )}

      <EraCarousel eras={eras} />

      <Row title="Recently added" videos={recent} accents={accents} />

      {VIDEO_TYPES.map((type) => (
        <Row
          key={type}
          title={VIDEO_TYPE_LABELS[type]}
          videos={videos.filter((v) => v.type === type)}
          accents={accents}
        />
      ))}
    </div>
  );
}
