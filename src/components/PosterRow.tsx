import Scroller from "./Scroller";
import PosterCard from "./PosterCard";
import type { Poster } from "@/lib/types";

/** A horizontal row of 4:5 poster cards. Renders nothing when empty. */
export default function PosterRow({ title, posters }: { title: string; posters: Poster[] }) {
  if (posters.length === 0) return null;

  return (
    <section className="mt-8">
      <h2 className="px-4 text-lg font-semibold tracking-wide sm:px-6">{title}</h2>
      <Scroller className="flex gap-3 px-4 py-5 sm:px-6">
        {posters.map((p) => (
          <PosterCard key={p.id} poster={p} />
        ))}
      </Scroller>
    </section>
  );
}
