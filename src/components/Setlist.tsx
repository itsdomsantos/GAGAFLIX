import Link from "next/link";
import type { TourSong } from "@/lib/types";

/**
 * The interactive setlist — the heart of a tour page. Songs are shown in the
 * exact order performed, grouped by their act (the `note`). A song whose
 * `video_id` matches an available video is clickable and opens that
 * performance; songs without a clip yet show greyed.
 */
export default function Setlist({
  songs,
  accent,
  validVideoIds,
}: {
  songs: TourSong[];
  accent: string;
  validVideoIds: Set<string>;
}) {
  if (songs.length === 0) {
    return (
      <p className="px-4 text-muted sm:px-6">
        Setlist coming soon — the alignment for this tour hasn&apos;t been added yet. 🐾
      </p>
    );
  }

  // Split into act groups whenever the note (act label) changes.
  const groups: { note: string | null; songs: TourSong[] }[] = [];
  for (const song of songs) {
    const last = groups[groups.length - 1];
    if (last && last.note === song.note) last.songs.push(song);
    else groups.push({ note: song.note, songs: [song] });
  }

  return (
    <div className="space-y-8">
      {groups.map((group, gi) => (
        <div key={gi}>
          {group.note && (
            <h3
              className="mb-3 px-1 text-xs font-semibold uppercase tracking-[0.25em]"
              style={{ color: accent }}
            >
              {group.note}
            </h3>
          )}
          <ol className="overflow-hidden rounded-lg border border-line bg-surface">
            {group.songs.map((song) => {
              const playable = !!song.video_id && validVideoIds.has(song.video_id);
              const row = (
                <>
                  <span
                    className="w-8 shrink-0 text-right font-display text-lg tabular-nums"
                    style={{ color: playable ? accent : "var(--muted)" }}
                  >
                    {song.position}
                  </span>
                  <span
                    className={`min-w-0 flex-1 truncate text-sm font-medium sm:text-base ${
                      playable ? "" : "text-muted"
                    }`}
                  >
                    {song.song}
                  </span>
                  {playable ? (
                    <span
                      className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-black transition-transform group-hover:scale-110"
                      style={{ background: accent }}
                    >
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                        <path d="M8 5v14l11-7L8 5Z" />
                      </svg>
                    </span>
                  ) : (
                    <span className="shrink-0 text-[10px] uppercase tracking-wider text-muted/60">
                      soon
                    </span>
                  )}
                </>
              );

              const base =
                "flex items-center gap-4 border-b border-line px-4 py-3 last:border-b-0";

              return playable ? (
                <li key={song.id}>
                  <Link
                    href={`/watch/${song.video_id}`}
                    className={`group ${base} transition-colors hover:bg-surface-2`}
                  >
                    {row}
                  </Link>
                </li>
              ) : (
                <li key={song.id} className={base}>
                  {row}
                </li>
              );
            })}
          </ol>
        </div>
      ))}
    </div>
  );
}
