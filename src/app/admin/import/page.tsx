"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { btnCls, btnGhostCls, inputCls, labelCls } from "@/components/admin/AdminShell";
import { parseSource, youtubeId } from "@/lib/player";
import { getBrowserClient } from "@/lib/supabase";
import { VIDEO_TYPES, VIDEO_TYPE_LABELS, type Era, type VideoType } from "@/lib/types";

// Mesmo visual do inputCls mas SEM w-full — para selects de largura fixa numa
// linha flex. Combinar inputCls (w-full) com w-32 criava um conflito de largura
// que esmagava o campo do título e rebentava a linha para fora do ecrã.
const selectCls =
  "shrink-0 rounded-md border border-line bg-surface-2 px-3 py-2 text-sm outline-none transition-colors focus:border-accent";

interface Row {
  url: string;
  title: string;
  thumbnail: string | null;
  kind: string;
  date: string | null;
  type: VideoType;
  era_slug: string;
}

/** Normaliza um link para detetar duplicados (YouTube pelo id, resto pelo url). */
function normalize(url: string): string {
  const yt = youtubeId(url);
  return yt ? `yt:${yt}` : url.trim().replace(/\/+$/, "");
}

async function mapLimit<T, R>(items: T[], limit: number, fn: (item: T) => Promise<R>) {
  const out: R[] = [];
  let i = 0;
  async function worker() {
    while (i < items.length) {
      const idx = i++;
      out[idx] = await fn(items[idx]);
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
  return out;
}

export default function AdminImport() {
  const [eras, setEras] = useState<Era[]>([]);
  const [raw, setRaw] = useState("");
  const [rows, setRows] = useState<Row[]>([]);
  const [bulkType, setBulkType] = useState<VideoType>("mv");
  const [bulkEra, setBulkEra] = useState("");
  const [analyzing, setAnalyzing] = useState(false);
  const [progress, setProgress] = useState({ done: 0, total: 0 });
  const [importing, setImporting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    getBrowserClient()
      .from("eras")
      .select("*")
      .order("sort")
      .then(({ data }) => setEras((data as Era[]) ?? []));
  }, []);

  const isPlaylist = useMemo(() => {
    const lines = raw.split("\n").map((l) => l.trim()).filter(Boolean);
    if (lines.length !== 1) return false;
    return /[?&]list=|youtube\.com\/(channel\/|@|c\/|user\/)/.test(lines[0]);
  }, [raw]);

  const analyze = useCallback(async () => {
    setError(null);
    setNotice(null);
    setRows([]);
    const lines = Array.from(
      new Set(raw.split("\n").map((l) => l.trim()).filter(Boolean)),
    );
    if (lines.length === 0) return;
    setAnalyzing(true);

    try {
      let built: Row[] = [];

      if (isPlaylist) {
        const res = await fetch(`/api/youtube-playlist?url=${encodeURIComponent(lines[0])}`);
        const data = await res.json();
        if (!data.ok) throw new Error(data.error ?? "Playlist import failed.");
        built = (data.items as { url: string; title: string; thumbnail: string | null; date: string | null }[]).map(
          (it) => ({
            url: it.url,
            title: it.title,
            thumbnail: it.thumbnail,
            kind: "youtube",
            date: it.date,
            type: bulkType,
            era_slug: bulkEra,
          }),
        );
      } else {
        setProgress({ done: 0, total: lines.length });
        built = await mapLimit(lines, 6, async (url) => {
          const res = await fetch(`/api/oembed?url=${encodeURIComponent(url)}`);
          const data = await res.json();
          setProgress((p) => ({ ...p, done: p.done + 1 }));
          return {
            url,
            title: data.title ?? "",
            thumbnail: data.thumbnail ?? null,
            kind: data.kind ?? parseSource(url).kind,
            date: null,
            type: bulkType,
            era_slug: bulkEra,
          } as Row;
        });
      }

      setRows(built);
      if (built.length === 0) setNotice("Nothing to import from what you pasted.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Analyze failed.");
    } finally {
      setAnalyzing(false);
    }
  }, [raw, isPlaylist, bulkType, bulkEra]);

  function applyBulk() {
    setRows((rs) => rs.map((r) => ({ ...r, type: bulkType, era_slug: bulkEra })));
  }

  function updateRow(idx: number, patch: Partial<Row>) {
    setRows((rs) => rs.map((r, i) => (i === idx ? { ...r, ...patch } : r)));
  }

  function removeRow(idx: number) {
    setRows((rs) => rs.filter((_, i) => i !== idx));
  }

  async function importAll() {
    setImporting(true);
    setError(null);
    setNotice(null);
    const supabase = getBrowserClient();

    try {
      const { data: existing } = await supabase.from("videos").select("url");
      const seen = new Set((existing ?? []).map((e: { url: string }) => normalize(e.url)));

      const fresh = rows.filter((r) => r.title.trim() && !seen.has(normalize(r.url)));
      const skipped = rows.length - fresh.length;

      if (fresh.length === 0) {
        setNotice(`Nothing new to import (${skipped} already in the library or without a title).`);
        setImporting(false);
        return;
      }

      const payload = fresh.map((r) => ({
        title: r.title.trim(),
        url: r.url.trim(),
        type: r.type,
        era_slug: r.era_slug || null,
        date: r.date,
        thumbnail_url: null,
        featured: false,
      }));

      const { error } = await supabase.from("videos").insert(payload);
      if (error) throw error;

      setRows([]);
      setRaw("");
      setNotice(`Imported ${fresh.length} video${fresh.length === 1 ? "" : "s"}${skipped ? ` · skipped ${skipped} duplicate/blank` : ""}. 🐾`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Import failed.");
    } finally {
      setImporting(false);
    }
  }

  return (
    <div>
      <h1 className="font-display text-4xl chrome-text">Import</h1>
      <p className="mt-2 max-w-2xl text-sm text-muted">
        Paste many links (one per line) and the titles + thumbnails are fetched for you — or paste a
        single YouTube <strong>playlist</strong>/<strong>channel</strong> URL to pull it whole.
        Pick the era and type, review, and import.
      </p>

      <div className="mt-6 rounded-lg border border-line bg-surface p-5">
        <label htmlFor="links" className={labelCls}>
          Links or a playlist URL
        </label>
        <textarea
          id="links"
          rows={7}
          value={raw}
          onChange={(e) => setRaw(e.target.value)}
          placeholder={`https://www.youtube.com/watch?v=…\nhttps://www.youtube.com/watch?v=…\n\n…or one playlist:\nhttps://www.youtube.com/playlist?list=…`}
          className={`${inputCls} font-mono text-xs leading-relaxed`}
        />

        <div className="mt-4 flex flex-wrap items-end gap-4">
          <div>
            <label htmlFor="bulk-type" className={labelCls}>Type (applied to all)</label>
            <select id="bulk-type" className={inputCls} value={bulkType}
              onChange={(e) => setBulkType(e.target.value as VideoType)}>
              {VIDEO_TYPES.map((t) => (
                <option key={t} value={t}>{VIDEO_TYPE_LABELS[t]}</option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="bulk-era" className={labelCls}>Era (applied to all)</label>
            <select id="bulk-era" className={inputCls} value={bulkEra}
              onChange={(e) => setBulkEra(e.target.value)}>
              <option value="">— no era —</option>
              {eras.map((er) => (
                <option key={er.slug} value={er.slug}>{er.name}</option>
              ))}
            </select>
          </div>
          <button className={btnCls} onClick={analyze} disabled={analyzing || !raw.trim()}>
            {analyzing
              ? isPlaylist
                ? "Loading playlist…"
                : `Fetching ${progress.done}/${progress.total}…`
              : isPlaylist
                ? "Load playlist"
                : "Fetch details"}
          </button>
        </div>
        {isPlaylist && (
          <p className="mt-3 text-xs text-muted">
            Playlist/channel detected — needs a YouTube API key on the server (see README).
          </p>
        )}
      </div>

      {error && <p className="mt-4 rounded-md border border-accent/40 bg-accent/10 px-4 py-2 text-sm">{error}</p>}
      {notice && <p className="mt-4 rounded-md border border-line bg-surface px-4 py-2 text-sm text-muted">{notice}</p>}

      {rows.length > 0 && (
        <>
          <div className="mt-8 flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-lg font-semibold">{rows.length} ready to import</h2>
            <div className="flex gap-2">
              <button className={btnGhostCls} onClick={applyBulk}>
                Re-apply era & type to all
              </button>
              <button className={btnCls} onClick={importAll} disabled={importing}>
                {importing ? "Importing…" : `Import ${rows.length}`}
              </button>
            </div>
          </div>

          <ul className="mt-4 divide-y divide-line rounded-lg border border-line bg-surface">
            {rows.map((r, idx) => (
              <li key={`${r.url}-${idx}`} className="flex items-center gap-3 p-3">
                <div className="aspect-video w-24 shrink-0 overflow-hidden rounded bg-surface-2">
                  {r.thumbnail && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={r.thumbnail} alt="" loading="lazy" className="h-full w-full object-cover" />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <input
                    value={r.title}
                    onChange={(e) => updateRow(idx, { title: e.target.value })}
                    placeholder="Title (required)"
                    className={`${inputCls} text-sm`}
                  />
                  <p className="mt-1 truncate text-[11px] text-muted">
                    <span className="text-accent">{r.kind}</span> · {r.url}
                  </p>
                </div>
                <select className={`${selectCls} w-32 sm:w-40`} value={r.type}
                  onChange={(e) => updateRow(idx, { type: e.target.value as VideoType })}>
                  {VIDEO_TYPES.map((t) => (
                    <option key={t} value={t}>{VIDEO_TYPE_LABELS[t]}</option>
                  ))}
                </select>
                <select className={`${selectCls} w-32 sm:w-44`} value={r.era_slug}
                  onChange={(e) => updateRow(idx, { era_slug: e.target.value })}>
                  <option value="">— no era —</option>
                  {eras.map((er) => (
                    <option key={er.slug} value={er.slug}>{er.name}</option>
                  ))}
                </select>
                <button
                  onClick={() => removeRow(idx)}
                  aria-label="Remove"
                  className="shrink-0 rounded-md border border-line px-3 py-2 text-sm text-muted transition-colors hover:border-accent hover:text-accent"
                >
                  ✕
                </button>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}
