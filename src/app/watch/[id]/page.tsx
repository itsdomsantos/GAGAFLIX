import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { cache } from "react";
import BackButton from "@/components/BackButton";
import EraTheme from "@/components/EraTheme";
import Player from "@/components/Player";
import Row from "@/components/Row";
import { getEras, getVideo, getVideos } from "@/lib/data";
import { heroThumbnail, parseSource } from "@/lib/player";
import { SITE_NAME, SITE_URL } from "@/lib/site";
import { VIDEO_TYPE_LABELS, type Era, type Video } from "@/lib/types";

export const dynamic = "force-dynamic";

const loadVideo = cache(getVideo);
const loadEras = cache(getEras);

/** One plain sentence built only from the catalogue's own fields. */
function describe(video: Video, era: Era | null): string {
  const bits = [VIDEO_TYPE_LABELS[video.type].replace(/s$/, ""), video.event, era ? `${era.name} era` : null, video.date?.slice(0, 4)];
  return `Lady Gaga — ${video.title}. ${bits.filter(Boolean).join(" · ")}. Watch it on GAGAFLIX, the Lady Gaga fan archive.`;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const [video, eras] = await Promise.all([loadVideo(id), loadEras()]);
  if (!video) return { title: "Video not found" };
  const era = eras.find((e) => e.slug === video.era_slug) ?? null;
  const description = describe(video, era);
  const image = heroThumbnail(video);
  return {
    title: `${video.title} — Lady Gaga`,
    description,
    alternates: { canonical: `/watch/${video.id}` },
    openGraph: {
      type: "video.other",
      title: `${video.title} — Lady Gaga`,
      description,
      url: `/watch/${video.id}`,
      images: image ? [{ url: image, alt: video.title }] : undefined,
    },
    twitter: { card: "summary_large_image", title: video.title, description },
  };
}

/** schema.org VideoObject — lets Google show the page in video results. */
function videoJsonLd(video: Video, era: Era | null) {
  const src = parseSource(video.url);
  const embedUrl =
    src.kind === "youtube"
      ? `https://www.youtube.com/embed/${src.id}`
      : src.kind === "vimeo"
        ? `https://player.vimeo.com/video/${src.id}`
        : src.kind === "dailymotion"
          ? `https://www.dailymotion.com/embed/video/${src.id}`
          : undefined;
  const thumb = heroThumbnail(video);
  const json = {
    "@context": "https://schema.org",
    "@type": "VideoObject",
    name: `${video.title} — Lady Gaga`,
    description: describe(video, era),
    thumbnailUrl: thumb ? [thumb.startsWith("/") ? `${SITE_URL}${thumb}` : thumb] : undefined,
    uploadDate: video.date ?? video.created_at?.slice(0, 10),
    url: `${SITE_URL}/watch/${video.id}`,
    embedUrl,
    contentUrl: src.kind === "file" ? video.url : undefined,
    genre: VIDEO_TYPE_LABELS[video.type],
    isPartOf: { "@type": "WebSite", name: SITE_NAME, url: SITE_URL },
  };
  // "<" escaped so a title can never close the script tag.
  return JSON.stringify(json).replace(/</g, "\\u003c");
}

export default async function WatchPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [video, videos, eras] = await Promise.all([
    loadVideo(id),
    getVideos(),
    loadEras(),
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
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: videoJsonLd(video, era) }}
      />
      {era && <EraTheme accent={era.accent} />}

      <div className="mx-auto max-w-5xl px-4 sm:px-6">
        <BackButton />
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
              {era.name} Era →
            </Link>
          )}
        </div>
      </div>

      <Row title="You'll also love" videos={related} accents={accents} />
    </div>
  );
}
