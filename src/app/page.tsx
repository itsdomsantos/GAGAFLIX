import EraCarousel from "@/components/EraCarousel";
import Hero from "@/components/Hero";
import Row from "@/components/Row";
import PosterRow from "@/components/PosterRow";
import { getEras, getFeatured, getPosters, getRecent, getVideos } from "@/lib/data";
import { POSTER_SECTION_LABELS, VIDEO_TYPES, VIDEO_TYPE_LABELS } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const [featured, videos, recent, eras, featuredPosters, moviePosters] = await Promise.all([
    getFeatured(),
    getVideos(),
    getRecent(12),
    getEras(),
    getPosters("featured"),
    getPosters("movies"),
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

      <PosterRow title={POSTER_SECTION_LABELS.featured} posters={featuredPosters} />

      <EraCarousel eras={eras} />

      <PosterRow title={POSTER_SECTION_LABELS.movies} posters={moviePosters} />

      <Row title="Recently added" videos={recent} accents={accents} />
      {/* limit to 20 videos per type */}
      {VIDEO_TYPES.map((type) => {
        const videosForType = videos.filter((v) => v.type === type);
        return (
          <Row
            key={type}
            title={VIDEO_TYPE_LABELS[type]}
            videos={videosForType.slice(0, 20)}
            accents={accents}
          />
        );
      })}
    </div>
  );
}
