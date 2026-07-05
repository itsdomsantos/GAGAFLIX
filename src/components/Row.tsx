import Scroller from "./Scroller";
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
    <section className="mt-8">
      <h2 className="px-4 text-lg font-semibold tracking-wide sm:px-6">{title}</h2>
      {/* py-5 dá espaço ao glow do hover para não ser cortado */}
      <Scroller className="flex gap-3 px-4 py-5 sm:px-6">
        {videos.map((v) => (
          <VideoCard
            key={v.id}
            video={v}
            accent={v.era_slug ? accents?.[v.era_slug] : undefined}
          />
        ))}
      </Scroller>
    </section>
  );
}
