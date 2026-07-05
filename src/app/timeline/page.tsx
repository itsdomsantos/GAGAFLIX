import { getEras, getTimeline } from "@/lib/data";

export const dynamic = "force-dynamic";

export const metadata = { title: "Timeline — GAGAFLIX" };

const monthNames = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

function formatDate(iso: string) {
  const [y, m] = iso.split("-");
  const month = monthNames[Number(m) - 1] ?? "";
  return `${month} ${y}`;
}

export default async function TimelinePage() {
  const [moments, eras] = await Promise.all([getTimeline(), getEras()]);
  const accentOf = (slug: string | null) =>
    (slug && eras.find((e) => e.slug === slug)?.accent) || "var(--accent)";

  return (
    <div className="mx-auto max-w-3xl px-4 pb-20 pt-28 sm:px-6">
      <h1 className="font-display text-5xl chrome-text sm:text-6xl">Timeline</h1>
      <p className="mt-3 text-muted">2008 → today. The story, milestone by milestone.</p>

      <ol className="relative mt-12 border-l border-line pl-8">
        {moments.map((m) => {
          const accent = accentOf(m.era_slug);
          return (
            <li key={m.id} className="relative mb-12 last:mb-0">
              <span
                className="absolute -left-[37px] top-1 h-4 w-4 rounded-full ring-4 ring-bg"
                style={{ background: accent }}
              />
              <p
                className="text-xs font-semibold uppercase tracking-[0.25em]"
                style={{ color: accent }}
              >
                {formatDate(m.date)}
              </p>
              <h2 className="mt-1 text-2xl font-semibold [text-wrap:balance]">{m.title}</h2>
              {m.body && <p className="mt-2 max-w-prose text-muted">{m.body}</p>}
              {m.image_url && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={m.image_url}
                  alt=""
                  className="mt-4 max-h-72 rounded-lg object-cover ring-1 ring-line"
                />
              )}
            </li>
          );
        })}
      </ol>
    </div>
  );
}
