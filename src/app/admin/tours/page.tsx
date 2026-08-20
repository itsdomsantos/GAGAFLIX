"use client";

import { useCallback, useEffect, useState } from "react";
import { btnCls, btnGhostCls, inputCls, labelCls } from "@/components/admin/AdminShell";
import { getBrowserClient } from "@/lib/supabase";
import type { Tour, TourSong, TourStat } from "@/lib/types";

interface FormState {
  original_slug: string | null;
  slug: string;
  name: string;
  years: string;
  tagline: string;
  description: string;
  accent: string;
  poster_url: string;
  backdrop_url: string;
  logo_url: string;
  era_slug: string;
  stats: TourStat[];
  sort: number;
}

const empty: FormState = {
  original_slug: null,
  slug: "",
  name: "",
  years: "",
  tagline: "",
  description: "",
  accent: "#e04e20",
  poster_url: "",
  backdrop_url: "",
  logo_url: "",
  era_slug: "",
  stats: [],
  sort: 99,
};

type VideoOption = { id: string; title: string };

export default function AdminTours() {
  const [tours, setTours] = useState<Tour[]>([]);
  const [videos, setVideos] = useState<VideoOption[]>([]);
  const [form, setForm] = useState<FormState | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [setlistFor, setSetlistFor] = useState<Tour | null>(null);

  const load = useCallback(async () => {
    const supabase = getBrowserClient();
    const [{ data: t }, { data: v }] = await Promise.all([
      supabase.from("tours").select("*").order("sort"),
      supabase.from("videos").select("id, title").order("date", { ascending: false }),
    ]);
    setTours((t as Tour[]) ?? []);
    setVideos((v as VideoOption[]) ?? []);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  function edit(t: Tour) {
    setForm({
      original_slug: t.slug,
      slug: t.slug,
      name: t.name,
      years: t.years ?? "",
      tagline: t.tagline ?? "",
      description: t.description ?? "",
      accent: t.accent,
      poster_url: t.poster_url ?? "",
      backdrop_url: t.backdrop_url ?? "",
      logo_url: t.logo_url ?? "",
      era_slug: t.era_slug ?? "",
      stats: t.stats ?? [],
      sort: t.sort,
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
      slug: form.slug.trim().toLowerCase().replace(/\s+/g, "-"),
      name: form.name.trim(),
      years: form.years.trim(),
      tagline: form.tagline.trim() || null,
      description: form.description.trim(),
      accent: form.accent,
      poster_url: form.poster_url.trim() || null,
      backdrop_url: form.backdrop_url.trim() || null,
      logo_url: form.logo_url.trim() || null,
      era_slug: form.era_slug.trim() || null,
      stats: form.stats.filter((s) => s.label.trim() || s.value.trim()),
      sort: form.sort,
    };
    const result = form.original_slug
      ? await supabase.from("tours").update(payload).eq("slug", form.original_slug)
      : await supabase.from("tours").insert(payload);
    if (result.error) {
      setError(`Could not save: ${result.error.message}`);
    } else {
      setForm(null);
      await load();
    }
    setBusy(false);
  }

  async function remove(t: Tour) {
    if (!window.confirm(`Delete the “${t.name}” tour? Its setlist will be removed too.`)) return;
    const { error } = await getBrowserClient().from("tours").delete().eq("slug", t.slug);
    if (error) setError(`Could not delete: ${error.message}`);
    else await load();
  }

  return (
    <div>
      <div className="flex items-center justify-between gap-4">
        <h1 className="font-display text-4xl chrome-text">Tours</h1>
        {!form && (
          <button className={btnCls} onClick={() => setForm(empty)}>
            + New tour
          </button>
        )}
      </div>

      {error && (
        <p className="mt-4 rounded-md border border-accent/40 bg-accent/10 px-4 py-2 text-sm">{error}</p>
      )}

      {form && (
        <form onSubmit={save} className="mt-6 rounded-lg border border-line bg-surface p-6">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div>
              <label htmlFor="t-name" className={labelCls}>Name</label>
              <input id="t-name" required className={inputCls} value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="The Mayhem Ball" />
            </div>
            <div>
              <label htmlFor="t-slug" className={labelCls}>Slug (URL)</label>
              <input id="t-slug" required className={inputCls} value={form.slug}
                onChange={(e) => setForm({ ...form, slug: e.target.value })} placeholder="the-mayhem-ball" />
            </div>
            <div>
              <label htmlFor="t-years" className={labelCls}>Years</label>
              <input id="t-years" className={inputCls} value={form.years}
                onChange={(e) => setForm({ ...form, years: e.target.value })} placeholder="2025 – now" />
            </div>
            <div>
              <label htmlFor="t-sort" className={labelCls}>Order</label>
              <input id="t-sort" type="number" className={inputCls} value={form.sort}
                onChange={(e) => setForm({ ...form, sort: Number(e.target.value) })} />
            </div>
            <div className="md:col-span-2">
              <label htmlFor="t-tagline" className={labelCls}>Tagline (one punchy line)</label>
              <input id="t-tagline" className={inputCls} value={form.tagline}
                onChange={(e) => setForm({ ...form, tagline: e.target.value })}
                placeholder="Of velvet, vice and a gothic dream." />
            </div>
            <div className="md:col-span-2">
              <label htmlFor="t-desc" className={labelCls}>Description</label>
              <textarea id="t-desc" rows={3} className={inputCls} value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })} />
            </div>
            <div>
              <label htmlFor="t-accent" className={labelCls}>Tour color (re-themes the page)</label>
              <div className="flex items-center gap-3">
                <input id="t-accent" type="color" value={form.accent}
                  onChange={(e) => setForm({ ...form, accent: e.target.value })}
                  className="h-10 w-14 cursor-pointer rounded border border-line bg-surface-2" />
                <code className="text-sm text-muted">{form.accent}</code>
              </div>
            </div>
            <div>
              <label htmlFor="t-era" className={labelCls}>Era slug (optional link)</label>
              <input id="t-era" className={inputCls} value={form.era_slug}
                onChange={(e) => setForm({ ...form, era_slug: e.target.value })} placeholder="mayhem" />
            </div>
            <div>
              <label htmlFor="t-poster" className={labelCls}>Poster (4:5, grid + selector)</label>
              <input id="t-poster" type="url" className={inputCls} value={form.poster_url}
                onChange={(e) => setForm({ ...form, poster_url: e.target.value })}
                placeholder="https://…/poster.jpg" />
            </div>
            <div>
              <label htmlFor="t-backdrop" className={labelCls}>Backdrop (wide hero image)</label>
              <input id="t-backdrop" type="url" className={inputCls} value={form.backdrop_url}
                onChange={(e) => setForm({ ...form, backdrop_url: e.target.value })}
                placeholder="https://…/backdrop.jpg" />
            </div>
            <div className="md:col-span-2">
              <label htmlFor="t-logo" className={labelCls}>Logo (transparent PNG, optional — replaces the text title)</label>
              <input id="t-logo" type="url" className={inputCls} value={form.logo_url}
                onChange={(e) => setForm({ ...form, logo_url: e.target.value })}
                placeholder="https://…/tour-logo.png" />
            </div>
          </div>

          {/* Stats grid editor */}
          <div className="mt-6">
            <label className={labelCls}>Stats grid (label + value)</label>
            <div className="space-y-2">
              {form.stats.map((stat, i) => (
                <div key={i} className="flex items-center gap-2">
                  <input className={inputCls} value={stat.label} placeholder="Shows"
                    onChange={(e) => {
                      const stats = [...form.stats];
                      stats[i] = { ...stats[i], label: e.target.value };
                      setForm({ ...form, stats });
                    }} />
                  <input className={inputCls} value={stat.value} placeholder="20"
                    onChange={(e) => {
                      const stats = [...form.stats];
                      stats[i] = { ...stats[i], value: e.target.value };
                      setForm({ ...form, stats });
                    }} />
                  <button type="button"
                    className="shrink-0 rounded-md border border-line px-3 py-2 text-sm text-muted hover:border-accent hover:text-accent"
                    onClick={() => setForm({ ...form, stats: form.stats.filter((_, j) => j !== i) })}>
                    ✕
                  </button>
                </div>
              ))}
            </div>
            <button type="button" className={`${btnGhostCls} mt-2`}
              onClick={() => setForm({ ...form, stats: [...form.stats, { label: "", value: "" }] })}>
              + Add stat
            </button>
          </div>

          <div className="mt-6 flex gap-3">
            <button type="submit" disabled={busy} className={btnCls}>
              {busy ? "Saving…" : form.original_slug ? "Save changes" : "Create tour"}
            </button>
            <button type="button" className={btnGhostCls} onClick={() => setForm(null)}>
              Cancel
            </button>
          </div>
        </form>
      )}

      <ul className="mt-8 divide-y divide-line rounded-lg border border-line bg-surface">
        {tours.map((t) => (
          <li key={t.slug} className="flex items-center gap-4 p-3">
            <span className="h-8 w-8 shrink-0 rounded-full ring-1 ring-line" style={{ background: t.accent }} />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">{t.name}</p>
              <p className="truncate text-xs text-muted">{t.years} · /tours/{t.slug}</p>
            </div>
            <button className={btnGhostCls} onClick={() => setSetlistFor(t)}>Setlist</button>
            <button className={btnGhostCls} onClick={() => edit(t)}>Edit</button>
            <button
              className="rounded-md border border-line px-3 py-2 text-sm text-muted transition-colors hover:border-accent hover:text-accent"
              onClick={() => remove(t)}
            >
              Delete
            </button>
          </li>
        ))}
        {tours.length === 0 && <li className="p-6 text-sm text-muted">No tours yet.</li>}
      </ul>

      {setlistFor && (
        <SetlistEditor
          tour={setlistFor}
          videos={videos}
          onClose={() => setSetlistFor(null)}
        />
      )}
    </div>
  );
}

/** Modal-ish setlist editor for one tour: reorder songs, attach a video to each. */
function SetlistEditor({
  tour,
  videos,
  onClose,
}: {
  tour: Tour;
  videos: VideoOption[];
  onClose: () => void;
}) {
  const [songs, setSongs] = useState<TourSong[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    const { data } = await getBrowserClient()
      .from("tour_setlist")
      .select("*")
      .eq("tour_slug", tour.slug)
      .order("position");
    setSongs((data as TourSong[]) ?? []);
  }, [tour.slug]);

  useEffect(() => {
    load();
  }, [load]);

  function addRow() {
    const nextPos = songs.length ? Math.max(...songs.map((s) => s.position)) + 1 : 1;
    setSongs([
      ...songs,
      { id: `new-${Date.now()}`, tour_slug: tour.slug, position: nextPos, song: "", note: "", video_id: null },
    ]);
  }

  function update(i: number, patch: Partial<TourSong>) {
    const next = [...songs];
    next[i] = { ...next[i], ...patch };
    setSongs(next);
  }

  async function saveAll() {
    setBusy(true);
    setError(null);
    const supabase = getBrowserClient();
    // Replace the whole setlist for this tour: delete then re-insert in order.
    const del = await supabase.from("tour_setlist").delete().eq("tour_slug", tour.slug);
    if (del.error) {
      setError(`Could not save: ${del.error.message}`);
      setBusy(false);
      return;
    }
    const rows = songs
      .filter((s) => s.song.trim())
      .map((s, i) => ({
        tour_slug: tour.slug,
        position: i + 1,
        song: s.song.trim(),
        note: s.note?.trim() || null,
        video_id: s.video_id || null,
      }));
    if (rows.length) {
      const ins = await supabase.from("tour_setlist").insert(rows);
      if (ins.error) {
        setError(`Could not save: ${ins.error.message}`);
        setBusy(false);
        return;
      }
    }
    setBusy(false);
    await load();
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/70 p-4 backdrop-blur-sm">
      <div className="my-8 w-full max-w-3xl rounded-lg border border-line bg-surface p-6">
        <div className="flex items-center justify-between gap-4">
          <h2 className="font-display text-2xl chrome-text">Setlist · {tour.name}</h2>
          <button className={btnGhostCls} onClick={onClose}>Close</button>
        </div>
        <p className="mt-2 text-xs text-muted">
          Songs play in this order. Attach a video to make a song clickable; leave it empty to show it greyed.
          Use the note field for act names (e.g. “Act I — …”).
        </p>

        {error && (
          <p className="mt-4 rounded-md border border-accent/40 bg-accent/10 px-4 py-2 text-sm">{error}</p>
        )}

        <div className="mt-5 space-y-2">
          {songs.map((s, i) => (
            <div key={s.id} className="rounded-md border border-line bg-surface-2 p-3">
              <div className="flex items-center gap-2">
                <span className="w-6 shrink-0 text-center text-sm text-muted">{i + 1}</span>
                <input className={inputCls} value={s.song} placeholder="Song title"
                  onChange={(e) => update(i, { song: e.target.value })} />
                <button type="button"
                  className="shrink-0 rounded-md border border-line px-3 py-2 text-sm text-muted hover:border-accent hover:text-accent"
                  onClick={() => setSongs(songs.filter((_, j) => j !== i))}>
                  ✕
                </button>
              </div>
              <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2">
                <input className={inputCls} value={s.note ?? ""} placeholder="Act / note (optional)"
                  onChange={(e) => update(i, { note: e.target.value })} />
                <select className={inputCls} value={s.video_id ?? ""}
                  onChange={(e) => update(i, { video_id: e.target.value || null })}>
                  <option value="">— No video yet —</option>
                  {videos.map((v) => (
                    <option key={v.id} value={v.id}>{v.title}</option>
                  ))}
                </select>
              </div>
            </div>
          ))}
          {songs.length === 0 && (
            <p className="rounded-md border border-line bg-surface-2 p-4 text-sm text-muted">
              No songs yet — add the first one.
            </p>
          )}
        </div>

        <div className="mt-4 flex flex-wrap gap-3">
          <button type="button" className={btnGhostCls} onClick={addRow}>+ Add song</button>
          <button type="button" disabled={busy} className={btnCls} onClick={saveAll}>
            {busy ? "Saving…" : "Save setlist"}
          </button>
        </div>
      </div>
    </div>
  );
}
