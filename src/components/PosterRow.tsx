import Scroller from "./Scroller";
import PosterCard, { type PosterItem } from "./PosterCard";

/** A horizontal row of 4:5 poster cards. Renders nothing when empty. */
export default function PosterRow({ title, items }: { title: string; items: PosterItem[] }) {
  if (items.length === 0) return null;

  return (
    <section className="mt-8">
      <h2 className="px-4 text-lg font-semibold tracking-wide sm:px-6">{title}</h2>
      <Scroller className="flex gap-3 px-4 py-5 sm:px-6">
        {items.map((item) => (
          <PosterCard key={item.key} item={item} />
        ))}
      </Scroller>
    </section>
  );
}
