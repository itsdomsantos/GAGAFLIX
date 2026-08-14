import EraCarousel from "@/components/EraCarousel";
import Hero from "@/components/Hero";
import Row from "@/components/Row";
import PosterRow from "@/components/PosterRow";
import { autoThumbnail } from "@/lib/player";
import { getEras, getFeatured, getMovies, getRecent, getVideos } from "@/lib/data";
import { VIDEO_TYPES, VIDEO_TYPE_LABELS } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const [featured, videos, recent, eras, movies] = await Promise.all([
    getFeatured(),
    getVideos(),
    getRecent(12),
    getEras(),
    getMovies(),
  ]);

  const accents = Object.fromEntries(eras.map((e) => [e.slug, e.accent]));

  // Featured row: videos flagged featured, shown as 4:5 posters.
  const featuredItems = videos
    .filter((v) => v.featured)
    .map((v) => ({
      key: v.id,
      title: v.title,
      subtitle: [VIDEO_TYPE_LABELS[v.type], v.date?.slice(0, 4)].filter(Boolean).join(" · "),
      cover: autoThumbnail(v),
      href: `/watch/${v.id}`,
      external: false,
    }));

  // Movies row: poster cards that link out to a streaming service.
  const movieItems = movies.map((m) => ({
    key: m.id,
    title: m.title,
    subtitle: m.subtitle,
    cover: m.cover_url,
    href: m.link,
    external: true,
  }));
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

      <PosterRow title="Featured" items={featuredItems} />

      <EraCarousel eras={eras} />

      <PosterRow title="Movies" items={movieItems} />

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
