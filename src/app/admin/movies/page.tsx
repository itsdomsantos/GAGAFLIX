"use client";

import { useCallback, useEffect, useState } from "react";
import { btnCls, btnGhostCls, inputCls, labelCls } from "@/components/admin/AdminShell";
import { getBrowserClient } from "@/lib/supabase";
import type { Movie } from "@/lib/types";

interface FormState {
  id: string | null;
  title: string;
  subtitle: string;
  cover_url: string;
  link: string;
  sort: string;
}

const empty: FormState = {
  id: null,
  title: "",
  subtitle: "",
  cover_url: "",
  link: "",
  sort: "0",
};

export default function AdminMovies() {
  const [movies, setMovies] = useState<Movie[]>([]);
  const [form, setForm] = useState<FormState | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    const { data } = await getBrowserClient()
      .from("movies")
      .select("*")
      .order("sort", { ascending: true })
      .order("created_at", { ascending: false });
    setMovies((data as Movie[]) ?? []);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  function edit(m: Movie) {
    setForm({
      id: m.id,
      title: m.title,
      subtitle: m.subtitle ?? "",
      cover_url: m.cover_url ?? "",
      link: m.link ?? "",
      sort: String(m.sort),
    });
    setError(null);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!form) return;
    setBusy(true);
    setError(null);
    const payload = {
      title: form.title.trim(),
      subtitle: form.subtitle.trim() || null,
      cover_url: form.cover_url.trim() || null,
      link: form.link.trim() || null,
      sort: Number.parseInt(form.sort, 10) || 0,
    };
    const supabase = getBrowserClient();
    const result = form.id
      ? await supabase.from("movies").update(payload).eq("id", form.id)
      : await supabase.from("movies").insert(payload);
    if (result.error) {
      setError(`Could not save: ${result.error.message}`);
    } else {
      setForm(null);
      await load();
    }
    setBusy(false);
  }

  async function remove(m: Movie) {
    if (!window.confirm(`Delete “${m.title}”? This cannot be undone.`)) return;
    const { error } = await getBrowserClient().from("movies").delete().eq("id", m.id);
    if (error) setError(`Could not delete: ${error.message}`);
    else await load();
  }

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-4xl chrome-text">Movies</h1>
          <p className="mt-2 max-w-2xl text-sm text-muted">
            4:5 poster cards that link out to a streaming service (Netflix, Disney+, Prime…).
            Nothing is hosted here — paste a cover image and the film&apos;s link, and the card
            opens it on its platform. For the homepage <strong>Featured</strong> row, just flag a
            video as featured in <a href="/admin/videos" className="text-accent hover:underline">Videos</a>.
          </p>
        </div>
        {!form && (
          <button className={btnCls} onClick={() => { setForm(empty); setError(null); }}>
            + New movie
          </button>
        )}
      </div>

      {error && (
        <p className="mt-4 rounded-md border border-accent/40 bg-accent/10 px-4 py-2 text-sm">{error}</p>
      )}

      {form && (
        <form onSubmit={save} className="mt-6 rounded-lg border border-line bg-surface p-6">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="md:col-span-2">
              <label htmlFor="m-title" className={labelCls}>Title</label>
              <input
                id="m-title"
                required
                className={inputCls}
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                placeholder="A Star Is Born"
              />
            </div>
            <div>
              <label htmlFor="m-subtitle" className={labelCls}>Subtitle (optional)</label>
              <input
                id="m-subtitle"
                className={inputCls}
                value={form.subtitle}
                onChange={(e) => setForm({ ...form, subtitle: e.target.value })}
                placeholder="2018 · on Netflix"
              />
            </div>
            <div>
              <label htmlFor="m-sort" className={labelCls}>Order (lower shows first)</label>
              <input
                id="m-sort"
                type="number"
                className={inputCls}
                value={form.sort}
                onChange={(e) => setForm({ ...form, sort: e.target.value })}
              />
            </div>
            <div className="md:col-span-2">
              <label htmlFor="m-cover" className={labelCls}>Cover image URL (4:5 poster)</label>
              <input
                id="m-cover"
                type="url"
                className={inputCls}
                value={form.cover_url}
                onChange={(e) => setForm({ ...form, cover_url: e.target.value })}
                placeholder="https://…/poster.jpg"
              />
            </div>
            <div className="md:col-span-2">
              <label htmlFor="m-link" className={labelCls}>Streaming link (opens in a new tab)</label>
              <input
                id="m-link"
                type="url"
                className={inputCls}
                value={form.link}
                onChange={(e) => setForm({ ...form, link: e.target.value })}
                placeholder="https://www.netflix.com/title/…"
              />
            </div>
            {form.cover_url.trim() && (
              <div className="md:col-span-2">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={form.cover_url.trim()}
                  alt="Cover preview"
                  className="aspect-[4/5] w-40 rounded-md object-cover ring-1 ring-line"
                />
              </div>
            )}
          </div>
          <div className="mt-6 flex gap-3">
            <button type="submit" disabled={busy} className={btnCls}>
              {busy ? "Saving…" : form.id ? "Save changes" : "Add movie"}
            </button>
            <button type="button" className={btnGhostCls} onClick={() => setForm(null)}>
              Cancel
            </button>
          </div>
        </form>
      )}

      <ul className="mt-8 divide-y divide-line rounded-lg border border-line bg-surface">
        {movies.map((m) => (
          <li key={m.id} className="flex items-center gap-4 p-3">
            <div className="aspect-[4/5] w-12 shrink-0 overflow-hidden rounded bg-surface-2">
              {m.cover_url && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={m.cover_url} alt="" loading="lazy" className="h-full w-full object-cover" />
              )}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">{m.title}</p>
              <p className="mt-0.5 truncate text-xs text-muted">
                #{m.sort}
                {m.subtitle ? ` · ${m.subtitle}` : ""}
                {m.link ? " · has link" : " · no link yet"}
              </p>
            </div>
            <button className={btnGhostCls} onClick={() => edit(m)}>Edit</button>
            <button
              className="rounded-md border border-line px-3 py-2 text-sm text-muted transition-colors hover:border-accent hover:text-accent"
              onClick={() => remove(m)}
            >
              Delete
            </button>
          </li>
        ))}
        {movies.length === 0 && (
          <li className="p-6 text-sm text-muted">No movies yet — hit “+ New movie”. 🐾</li>
        )}
      </ul>
    </div>
  );
}
