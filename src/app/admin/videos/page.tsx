"use client";

import { useCallback, useEffect, useState } from "react";
import { btnCls, btnGhostCls, inputCls, labelCls } from "@/components/admin/AdminShell";
import { autoThumbnail, parseSource } from "@/lib/player";
import { getBrowserClient } from "@/lib/supabase";
import { VIDEO_TYPES, VIDEO_TYPE_LABELS, type Era, type Video, type VideoType } from "@/lib/types";

interface FormState {
  id: string | null;
  title: string;
  url: string;
  type: VideoType;
  era_slug: string;
  event: string;
  date: string;
  thumbnail_url: string;
  featured: boolean;
}

const empty: FormState = {
  id: null,
  title: "",
  url: "",
  type: "live",
  era_slug: "",
  event: "",
  date: "",
  thumbnail_url: "",
  featured: false,
};

export default function AdminVideos() {
  const [videos, setVideos] = useState<Video[]>([]);
  const [eras, setEras] = useState<Era[]>([]);
  const [form, setForm] = useState<FormState | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");

  const load = useCallback(async () => {
    const supabase = getBrowserClient();
    const [v, e] = await Promise.all([
      supabase.from("videos").select("*").order("date", { ascending: false }),
      supabase.from("eras").select("*").order("sort"),
    ]);
    setVideos((v.data as Video[]) ?? []);
    setEras((e.data as Era[]) ?? []);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  function edit(v: Video) {
    setForm({
      id: v.id,
      title: v.title,
      url: v.url,
      type: v.type,
      era_slug: v.era_slug ?? "",
      event: v.event ?? "",
      date: v.date ?? "",
      thumbnail_url: v.thumbnail_url ?? "",
      featured: v.featured,
    });
    setError(null);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!form) return;
    setBusy(true);
    setError(null);
    const supabase = getBrowserClient();
    const payload = {
      title: form.title.trim(),
      url: form.url.trim(),
      type: form.type,
      era_slug: form.era_slug || null,
      event: form.event.trim() || null,
      date: form.date || null,
      thumbnail_url: form.thumbnail_url.trim() || null,
      featured: form.featured,
    };
    const result = form.id
      ? await supabase.from("videos").update(payload).eq("id", form.id)
      : await supabase.from("videos").insert(payload);
    if (result.error) {
      setError(`Could not save: ${result.error.message}`);
    } else {
      setForm(null);
      await load();
    }
    setBusy(false);
  }

  async function remove(v: Video) {
    if (!window.confirm(`Delete “${v.title}”? This cannot be undone.`)) return;
    const { error } = await getBrowserClient().from("videos").delete().eq("id", v.id);
    if (error) setError(`Could not delete: ${error.message}`);
    else await load();
  }

  const previewThumb = form
    ? autoThumbnail({ url: form.url, thumbnail_url: form.thumbnail_url || null })
    : null;
  const sourceKind = form && form.url ? parseSource(form.url).kind : null;

  const q = query.trim().toLowerCase();
  const shown = q
    ? videos.filter((v) => {
        const eraName = v.era_slug
          ? eras.find((e) => e.slug === v.era_slug)?.name ?? v.era_slug
          : "";
        const haystack = [
          v.title,
          v.event ?? "",
          eraName,
          VIDEO_TYPE_LABELS[v.type],
          v.date ?? "",
        ]
          .join(" ")
          .toLowerCase();
        return q.split(/\s+/).every((term) => haystack.includes(term));
      })
    : videos;

  return (
    <div>
      <div className="flex items-center justify-between gap-4">
        <h1 className="font-display text-4xl chrome-text">Videos</h1>
        {!form && (
          <button className={btnCls} onClick={() => setForm(empty)}>
            + New video
          </button>
        )}
      </div>

      {error && <p className="mt-4 rounded-md border border-accent/40 bg-accent/10 px-4 py-2 text-sm">{error}</p>}

      {form && (
        <form onSubmit={save} className="mt-6 rounded-lg border border-line bg-surface p-6">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="md:col-span-2">
              <label htmlFor="v-title" className={labelCls}>Title</label>
              <input id="v-title" required className={inputCls} value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                placeholder="Poker Face — Dailymotion rip 2009" />
            </div>
            <div className="md:col-span-2">
              <label htmlFor="v-url" className={labelCls}>
                Video link {sourceKind && <span className="ml-2 rounded bg-surface-2 px-1.5 py-0.5 text-[10px] normal-case text-accent">player: {sourceKind}</span>}
              </label>
              <input id="v-url" required type="url" className={inputCls} value={form.url}
                onChange={(e) => setForm({ ...form, url: e.target.value })}
                placeholder="youtube · dailymotion · vimeo · x.com · drive.google · streamable · archive.org · facebook · .mp4 · .m3u8" />
            </div>
            <div>
              <label htmlFor="v-type" className={labelCls}>Type</label>
              <select id="v-type" className={inputCls} value={form.type}
                onChange={(e) => setForm({ ...form, type: e.target.value as VideoType })}>
                {VIDEO_TYPES.map((t) => (
                  <option key={t} value={t}>{VIDEO_TYPE_LABELS[t]}</option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="v-era" className={labelCls}>Era</label>
              <select id="v-era" className={inputCls} value={form.era_slug}
                onChange={(e) => setForm({ ...form, era_slug: e.target.value })}>
                <option value="">— no era —</option>
                {eras.map((er) => (
                  <option key={er.slug} value={er.slug}>{er.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="v-event" className={labelCls}>Event (optional)</label>
              <input id="v-event" className={inputCls} value={form.event}
                onChange={(e) => setForm({ ...form, event: e.target.value })}
                placeholder="Coachella, SNL, VMAs…" />
            </div>
            <div>
              <label htmlFor="v-date" className={labelCls}>Date</label>
              <input id="v-date" type="date" className={inputCls} value={form.date}
                onChange={(e) => setForm({ ...form, date: e.target.value })} />
            </div>
            <div className="md:col-span-2">
              <label htmlFor="v-thumb" className={labelCls}>Thumbnail (optional — automatic for YouTube)</label>
              <input id="v-thumb" type="url" className={inputCls} value={form.thumbnail_url}
                onChange={(e) => setForm({ ...form, thumbnail_url: e.target.value })}
                placeholder="https://…/image.jpg" />
            </div>
            {previewThumb && (
              <div className="md:col-span-2">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={previewThumb} alt="Thumbnail preview" className="h-28 rounded-md object-cover ring-1 ring-line" />
              </div>
            )}
            <label className="flex items-center gap-2 text-sm md:col-span-2">
              <input type="checkbox" checked={form.featured}
                onChange={(e) => setForm({ ...form, featured: e.target.checked })}
                className="h-4 w-4 accent-[var(--accent)]" />
              Feature on the homepage (hero)
            </label>
          </div>
          <div className="mt-6 flex gap-3">
            <button type="submit" disabled={busy} className={btnCls}>
              {busy ? "Saving…" : form.id ? "Save changes" : "Add video"}
            </button>
            <button type="button" className={btnGhostCls} onClick={() => setForm(null)}>
              Cancel
            </button>
          </div>
        </form>
      )}

      {!form && videos.length > 0 && (
        <div className="mt-8 flex items-center gap-3">
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search videos — title, event, era, year…"
            className={inputCls}
          />
          <span className="shrink-0 text-xs text-muted tabular-nums">
            {shown.length}/{videos.length}
          </span>
        </div>
      )}

      <ul className="mt-4 divide-y divide-line rounded-lg border border-line bg-surface">
        {shown.map((v) => {
          const thumb = autoThumbnail(v);
          return (
            <li key={v.id} className="flex items-center gap-4 p-3">
              <div className="aspect-video w-28 shrink-0 overflow-hidden rounded bg-surface-2">
                {thumb && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={thumb} alt="" loading="lazy" className="h-full w-full object-cover" />
                )}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">
                  {v.featured && <span className="mr-2 rounded bg-accent/20 px-1.5 py-0.5 text-[10px] font-bold uppercase text-accent">Hero</span>}
                  {v.title}
                </p>
                <p className="mt-0.5 truncate text-xs text-muted">
                  {VIDEO_TYPE_LABELS[v.type]}
                  {v.era_slug ? ` · ${eras.find((e) => e.slug === v.era_slug)?.name ?? v.era_slug}` : ""}
                  {v.date ? ` · ${v.date}` : ""} · {parseSource(v.url).kind}
                </p>
              </div>
              <button className={btnGhostCls} onClick={() => edit(v)}>Edit</button>
              <button
                className="rounded-md border border-line px-3 py-2 text-sm text-muted transition-colors hover:border-accent hover:text-accent"
                onClick={() => remove(v)}
              >
                Delete
              </button>
            </li>
          );
        })}
        {videos.length === 0 && (
          <li className="p-6 text-sm text-muted">No videos yet — hit “+ New video” and paste your first link. 🐾</li>
        )}
        {videos.length > 0 && shown.length === 0 && (
          <li className="p-6 text-sm text-muted">No videos match “{query}”.</li>
        )}
      </ul>
    </div>
  );
}
