import VideoCard from "./VideoCard";
import type { Video } from "@/lib/types";

export default function Row({
  title,
  videos,
  accents,
}: {
  title: string;
  videos: Video[];
  /** Mapa era_slug → cor, para o glow de hover de cada cartão. */
  accents?: Record<string, string>;
}) {
  if (videos.length === 0) return null;

  return (
    <section className="mt-10">
      <h2 className="mb-3 px-4 text-lg font-semibold tracking-wide sm:px-6">{title}</h2>
      <div className="no-scrollbar flex gap-3 overflow-x-auto px-4 pb-2 sm:px-6">
        {videos.map((v) => (
          <VideoCard
            key={v.id}
            video={v}
            accent={v.era_slug ? accents?.[v.era_slug] : undefined}
          />
        ))}
      </div>
    </section>
  );
}
