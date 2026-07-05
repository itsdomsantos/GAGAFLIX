import Link from "next/link";
import { notFound } from "next/navigation";
import EraTheme from "@/components/EraTheme";
import Player from "@/components/Player";
import Row from "@/components/Row";
import { getEras, getVideo, getVideos } from "@/lib/data";
import { VIDEO_TYPE_LABELS } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function WatchPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [video, videos, eras] = await Promise.all([
    getVideo(id),
    getVideos(),
    getEras(),
  ]);
  if (!video) notFound();

  const era = video.era_slug ? eras.find((e) => e.slug === video.era_slug) ?? null : null;
  const accents = Object.fromEntries(eras.map((e) => [e.slug, e.accent]));

  const related = videos
    .filter(
      (v) =>
        v.id !== video.id &&
        (v.era_slug === video.era_slug || v.type === video.type),
    )
    .slice(0, 12);

  return (
    <div className="pb-16 pt-20">
      {era && <EraTheme accent={era.accent} />}

      <div className="mx-auto max-w-5xl px-4 sm:px-6">
        <Player url={video.url} title={video.title} />

        <div className="mt-6 flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="font-display text-4xl chrome-text sm:text-5xl [text-wrap:balance]">
              {video.title}
            </h1>
            <p className="mt-2 text-sm text-muted">
              {VIDEO_TYPE_LABELS[video.type]}
              {video.event ? ` · ${video.event}` : ""}
              {video.date ? ` · ${video.date}` : ""}
            </p>
          </div>
          {era && (
            <Link
              href={`/eras/${era.slug}`}
              className="rounded-full border border-line px-4 py-2 text-sm transition-colors hover:border-era"
              style={{ color: era.accent }}
            >
              Era {era.name} →
            </Link>
          )}
        </div>
      </div>

      <Row title="Também vais adorar" videos={related} accents={accents} />
    </div>
  );
}
