"use client";

import { useCallback, useEffect, useState } from "react";
import { btnCls, btnGhostCls, inputCls, labelCls } from "@/components/admin/AdminShell";
import { getBrowserClient } from "@/lib/supabase";
import {
  POSTER_SECTIONS,
  POSTER_SECTION_LABELS,
  type Poster,
  type PosterSection,
} from "@/lib/types";

interface FormState {
  id: string | null;
  section: PosterSection;
  title: string;
  subtitle: string;
  cover_url: string;
  link: string;
  sort: string;
}

const empty: FormState = {
  id: null,
  section: "featured",
  title: "",
  subtitle: "",
  cover_url: "",
  link: "",
  sort: "0",
};

export default function AdminMovies() {
  const [posters, setPosters] = useState<Poster[]>([]);
  const [form, setForm] = useState<FormState | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    const { data } = await getBrowserClient()
      .from("posters")
      .select("*")
      .order("section", { ascending: true })
      .order("sort", { ascending: true })
      .order("created_at", { ascending: false });
    setPosters((data as Poster[]) ?? []);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  function edit(p: Poster) {
    setForm({
      id: p.id,
      section: p.section,
      title: p.title,
      subtitle: p.subtitle ?? "",
      cover_url: p.cover_url ?? "",
      link: p.link ?? "",
      sort: String(p.sort),
    });
    setError(null);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function newItem(section: PosterSection) {
    setForm({ ...empty, section });
    setError(null);
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!form) return;
    setBusy(true);
    setError(null);
    const payload = {
      section: form.section,
      title: form.title.trim(),
      subtitle: form.subtitle.trim() || null,
      cover_url: form.cover_url.trim() || null,
      link: form.link.trim() || null,
      sort: Number.parseInt(form.sort, 10) || 0,
    };
    const supabase = getBrowserClient();
    const result = form.id
      ? await supabase.from("posters").update(payload).eq("id", form.id)
      : await supabase.from("posters").insert(payload);
    if (result.error) {
      setError(`Could not save: ${result.error.message}`);
    } else {
      setForm(null);
      await load();
    }
    setBusy(false);
  }

  async function remove(p: Poster) {
    if (!window.confirm(`Delete “${p.title}”? This cannot be undone.`)) return;
    const { error } = await getBrowserClient().from("posters").delete().eq("id", p.id);
    if (error) setError(`Could not delete: ${error.message}`);
    else await load();
  }

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-4xl chrome-text">Movies &amp; Featured</h1>
          <p className="mt-2 text-sm text-muted">
            Curated 4:5 poster cards for the homepage. Paste a cover image and, optionally, a
            link — a Netflix/Disney+ title page, a trailer, or an internal <code>/watch/…</code>{" "}
            link. Not tied to any era.
          </p>
        </div>
        {!form && (
          <button className={btnCls} onClick={() => newItem("featured")}>
            + New poster
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
              <label htmlFor="p-section" className={labelCls}>Section</label>
              <select
                id="p-section"
                className={inputCls}
                value={form.section}
                onChange={(e) => setForm({ ...form, section: e.target.value as PosterSection })}
              >
                {POSTER_SECTIONS.map((s) => (
                  <option key={s} value={s}>{POSTER_SECTION_LABELS[s]}</option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="p-sort" className={labelCls}>Order (lower shows first)</label>
              <input
                id="p-sort"
                type="number"
                className={inputCls}
                value={form.sort}
                onChange={(e) => setForm({ ...form, sort: e.target.value })}
              />
            </div>
            <div className="md:col-span-2">
              <label htmlFor="p-title" className={labelCls}>Title</label>
              <input
                id="p-title"
                required
                className={inputCls}
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                placeholder="A Star Is Born"
              />
            </div>
            <div className="md:col-span-2">
              <label htmlFor="p-subtitle" className={labelCls}>Subtitle (optional)</label>
              <input
                id="p-subtitle"
                className={inputCls}
                value={form.subtitle}
                onChange={(e) => setForm({ ...form, subtitle: e.target.value })}
                placeholder="2018 · Drama · on Netflix"
              />
            </div>
            <div className="md:col-span-2">
              <label htmlFor="p-cover" className={labelCls}>Cover image URL (4:5 poster)</label>
              <input
                id="p-cover"
                type="url"
                className={inputCls}
                value={form.cover_url}
                onChange={(e) => setForm({ ...form, cover_url: e.target.value })}
                placeholder="https://…/poster.jpg"
              />
            </div>
            <div className="md:col-span-2">
              <label htmlFor="p-link" className={labelCls}>Link (optional)</label>
              <input
                id="p-link"
                type="url"
                className={inputCls}
                value={form.link}
                onChange={(e) => setForm({ ...form, link: e.target.value })}
                placeholder="https://www.netflix.com/title/… — external opens in a new tab"
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
              {busy ? "Saving…" : form.id ? "Save changes" : "Add poster"}
            </button>
            <button type="button" className={btnGhostCls} onClick={() => setForm(null)}>
              Cancel
            </button>
          </div>
        </form>
      )}

      {POSTER_SECTIONS.map((section) => {
        const items = posters.filter((p) => p.section === section);
        return (
          <section key={section} className="mt-8">
            <div className="flex items-center justify-between gap-4">
              <h2 className="text-lg font-semibold tracking-wide">
                {POSTER_SECTION_LABELS[section]}{" "}
                <span className="text-sm font-normal text-muted">({items.length})</span>
              </h2>
              {!form && (
                <button className={btnGhostCls} onClick={() => newItem(section)}>
                  + Add to {POSTER_SECTION_LABELS[section]}
                </button>
              )}
            </div>
            <ul className="mt-3 divide-y divide-line rounded-lg border border-line bg-surface">
              {items.map((p) => (
                <li key={p.id} className="flex items-center gap-4 p-3">
                  <div className="aspect-[4/5] w-12 shrink-0 overflow-hidden rounded bg-surface-2">
                    {p.cover_url && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={p.cover_url} alt="" loading="lazy" className="h-full w-full object-cover" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{p.title}</p>
                    <p className="mt-0.5 truncate text-xs text-muted">
                      #{p.sort}
                      {p.subtitle ? ` · ${p.subtitle}` : ""}
                      {p.link ? " · has link" : ""}
                    </p>
                  </div>
                  <button className={btnGhostCls} onClick={() => edit(p)}>Edit</button>
                  <button
                    className="rounded-md border border-line px-3 py-2 text-sm text-muted transition-colors hover:border-accent hover:text-accent"
                    onClick={() => remove(p)}
                  >
                    Delete
                  </button>
                </li>
              ))}
              {items.length === 0 && (
                <li className="p-6 text-sm text-muted">
                  Nothing here yet — hit “+ Add to {POSTER_SECTION_LABELS[section]}”. 🐾
                </li>
              )}
            </ul>
          </section>
        );
      })}
    </div>
  );
}
