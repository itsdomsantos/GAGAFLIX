import Link from "next/link";
import { getEras } from "@/lib/data";

export const dynamic = "force-dynamic";

export const metadata = { title: "Eras — GAGAFLIX" };

export default async function ErasPage() {
  const eras = await getEras();

  return (
    <div className="mx-auto max-w-7xl px-4 pb-16 pt-28 sm:px-6">
      <h1 className="font-display text-5xl chrome-text sm:text-6xl">Eras</h1>
      <p className="mt-3 max-w-xl text-muted">
        Cada era é um mundo. Escolhe por onde entrar.
      </p>

      <div className="mt-10 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {eras.map((era) => (
          <Link
            key={era.slug}
            href={`/eras/${era.slug}`}
            className="group relative overflow-hidden rounded-lg bg-surface p-6 ring-1 ring-line transition-all duration-300 hover:ring-[var(--card-accent)] hover:shadow-[0_0_32px_-8px_var(--card-accent)]"
            style={{ "--card-accent": era.accent } as React.CSSProperties}
          >
            {era.image_url && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={era.image_url}
                alt=""
                className="absolute inset-0 h-full w-full object-cover opacity-25 transition-opacity duration-300 group-hover:opacity-40"
              />
            )}
            <div
              className="absolute inset-x-0 top-0 h-1"
              style={{ background: era.accent }}
            />
            <div className="relative">
              <p className="text-xs uppercase tracking-[0.25em] text-muted">{era.years}</p>
              <h2
                className="font-display mt-2 text-4xl transition-colors duration-300"
                style={{ color: era.accent }}
              >
                {era.name}
              </h2>
              <p className="mt-3 line-clamp-3 text-sm text-muted">{era.description}</p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
