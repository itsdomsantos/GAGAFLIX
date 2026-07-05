import Link from "next/link";
import { heroThumbnail } from "@/lib/player";
import { VIDEO_TYPE_LABELS, type Era, type Video } from "@/lib/types";

export default function Hero({ video, era }: { video: Video; era: Era | null }) {
  const backdrop = heroThumbnail(video);

  return (
    <section className="relative flex min-h-[72vh] items-end overflow-hidden">
      {backdrop && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={backdrop}
          alt=""
          className="absolute inset-0 h-full w-full object-cover"
        />
      )}
      {/* Véus cinematográficos sobre a imagem */}
      <div className="absolute inset-0 bg-gradient-to-t from-bg via-bg/40 to-bg/30" />
      <div className="absolute inset-0 bg-gradient-to-r from-bg/80 via-transparent to-transparent" />

      <div className="relative mx-auto w-full max-w-7xl px-4 pb-14 pt-40 sm:px-6">
        {era && (
          <p
            className="mb-3 text-xs font-semibold uppercase tracking-[0.25em]"
            style={{ color: era.accent }}
          >
            Era {era.name}
          </p>
        )}
        <h1 className="font-display max-w-3xl text-5xl leading-none chrome-text sm:text-7xl [text-wrap:balance]">
          {video.title}
        </h1>
        <p className="mt-4 max-w-xl text-sm text-muted">
          {VIDEO_TYPE_LABELS[video.type]}
          {video.event ? ` · ${video.event}` : ""}
          {video.date ? ` · ${video.date.slice(0, 4)}` : ""}
        </p>
        <div className="mt-7 flex flex-wrap items-center gap-3">
          <Link
            href={`/watch/${video.id}`}
            className="inline-flex items-center gap-2 rounded-md bg-accent px-6 py-3 font-semibold text-black transition-transform hover:scale-105"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
              <path d="M8 5v14l11-7L8 5Z" />
            </svg>
            Assistir
          </Link>
          {era && (
            <Link
              href={`/eras/${era.slug}`}
              className="inline-flex items-center gap-2 rounded-md border border-line bg-surface/60 px-6 py-3 font-semibold backdrop-blur transition-colors hover:border-era"
            >
              Explorar a era
            </Link>
          )}
        </div>
      </div>
    </section>
  );
}
