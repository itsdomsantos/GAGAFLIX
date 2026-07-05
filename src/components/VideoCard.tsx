import Link from "next/link";
import { autoThumbnail } from "@/lib/player";
import { VIDEO_TYPE_LABELS, type Video } from "@/lib/types";

export default function VideoCard({
  video,
  accent,
}: {
  video: Video;
  accent?: string;
}) {
  const thumb = autoThumbnail(video);
  const year = video.date ? video.date.slice(0, 4) : null;

  return (
    <Link
      href={`/watch/${video.id}`}
      className="group w-44 shrink-0 sm:w-56"
      style={accent ? ({ "--era": accent } as React.CSSProperties) : undefined}
    >
      <div className="relative aspect-video overflow-hidden rounded-md bg-surface-2 ring-1 ring-line transition-all duration-300 group-hover:ring-era group-hover:shadow-[0_0_24px_-6px_var(--era)]">
        {thumb ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={thumb}
            alt=""
            loading="lazy"
            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-surface-2 to-bg">
            <span className="font-display text-2xl chrome-text">GF</span>
          </div>
        )}
        <div className="absolute inset-0 flex items-center justify-center bg-black/0 opacity-0 transition-all duration-300 group-hover:bg-black/30 group-hover:opacity-100">
          <span className="flex h-11 w-11 items-center justify-center rounded-full bg-era text-black">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
              <path d="M8 5v14l11-7L8 5Z" />
            </svg>
          </span>
        </div>
      </div>
      <p className="mt-2 line-clamp-2 text-sm font-medium leading-snug">{video.title}</p>
      <p className="mt-0.5 text-xs text-muted">
        {VIDEO_TYPE_LABELS[video.type]}
        {year ? ` · ${year}` : ""}
      </p>
    </Link>
  );
}
