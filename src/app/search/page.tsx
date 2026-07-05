"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { autoThumbnail } from "@/lib/player";
import { VIDEO_TYPE_LABELS, type Era, type Video } from "@/lib/types";

export default function SearchPage() {
  const [query, setQuery] = useState("");
  const [videos, setVideos] = useState<Video[]>([]);
  const [eras, setEras] = useState<Era[]>([]);
  const [loaded, setLoaded] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
    fetch("/api/videos")
      .then((r) => r.json())
      .then((data) => {
        setVideos(data.videos ?? []);
        setEras(data.eras ?? []);
      })
      .finally(() => setLoaded(true));
  }, []);

  const eraName = useMemo(
    () => Object.fromEntries(eras.map((e) => [e.slug, e.name])),
    [eras],
  );

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    return videos.filter((v) => {
      const haystack = [
        v.title,
        v.event ?? "",
        v.era_slug ? eraName[v.era_slug] ?? "" : "",
        VIDEO_TYPE_LABELS[v.type],
        v.date ?? "",
      ]
        .join(" ")
        .toLowerCase();
      return q.split(/\s+/).every((term) => haystack.includes(term));
    });
  }, [query, videos, eraName]);

  return (
    <div className="mx-auto max-w-4xl px-4 pb-20 pt-28 sm:px-6">
      <label htmlFor="search" className="sr-only">
        Search videos
      </label>
      <input
        ref={inputRef}
        id="search"
        type="search"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="poker face snl, abracadabra, chromatica…"
        className="w-full rounded-lg border border-line bg-surface px-5 py-4 text-lg outline-none transition-colors placeholder:text-muted focus:border-era"
      />

      <div className="mt-8">
        {query.trim() === "" && (
          <p className="text-muted">
            Type anything — a title, event, era or year. Tip: press{" "}
            <kbd className="rounded border border-line bg-surface px-1.5 py-0.5 text-xs">/</kbd>{" "}
            to open search from any page.
          </p>
        )}
        {query.trim() !== "" && loaded && results.length === 0 && (
          <p className="text-muted">Nothing found for “{query}”. 🐾</p>
        )}

        <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {results.map((v) => {
            const thumb = autoThumbnail(v);
            return (
              <li key={v.id}>
                <Link
                  href={`/watch/${v.id}`}
                  className="group flex gap-3 rounded-lg p-2 ring-1 ring-transparent transition-all hover:bg-surface hover:ring-line"
                >
                  <div className="relative aspect-video w-36 shrink-0 overflow-hidden rounded bg-surface-2">
                    {thumb && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={thumb} alt="" loading="lazy" className="h-full w-full object-cover" />
                    )}
                  </div>
                  <div className="min-w-0 py-1">
                    <p className="line-clamp-2 text-sm font-medium">{v.title}</p>
                    <p className="mt-1 text-xs text-muted">
                      {VIDEO_TYPE_LABELS[v.type]}
                      {v.era_slug && eraName[v.era_slug] ? ` · ${eraName[v.era_slug]}` : ""}
                      {v.date ? ` · ${v.date.slice(0, 4)}` : ""}
                    </p>
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}
