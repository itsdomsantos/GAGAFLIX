"use client";

import { useCallback, useEffect, useState } from "react";
import { btnCls, btnGhostCls, inputCls, labelCls } from "@/components/admin/AdminShell";
import { getBrowserClient } from "@/lib/supabase";
import type { Era } from "@/lib/types";

interface FormState {
  original_slug: string | null;
  slug: string;
  name: string;
  years: string;
  description: string;
  accent: string;
  image_url: string;
  logo_url: string;
  sort: number;
}

const empty: FormState = {
  original_slug: null,
  slug: "",
  name: "",
  years: "",
  description: "",
  accent: "#e04e20",
  image_url: "",
  logo_url: "",
  sort: 99,
};

export default function AdminEras() {
  const [eras, setEras] = useState<Era[]>([]);
  const [form, setForm] = useState<FormState | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    const { data } = await getBrowserClient().from("eras").select("*").order("sort");
    setEras((data as Era[]) ?? []);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  function edit(e: Era) {
    setForm({
      original_slug: e.slug,
      slug: e.slug,
      name: e.name,
      years: e.years ?? "",
      description: e.description ?? "",
      accent: e.accent,
      image_url: e.image_url ?? "",
      logo_url: e.logo_url ?? "",
      sort: e.sort,
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
      description: form.description.trim(),
      accent: form.accent,
      image_url: form.image_url.trim() || null,
      logo_url: form.logo_url.trim() || null,
      sort: form.sort,
    };
    const result = form.original_slug
      ? await supabase.from("eras").update(payload).eq("slug", form.original_slug)
      : await supabase.from("eras").insert(payload);
    if (result.error) {
      setError(`Could not save: ${result.error.message}`);
    } else {
      setForm(null);
      await load();
    }
    setBusy(false);
  }

  async function remove(e: Era) {
    if (!window.confirm(`Delete the “${e.name}” era? Its videos will be left without an era.`)) return;
    const { error } = await getBrowserClient().from("eras").delete().eq("slug", e.slug);
    if (error) setError(`Could not delete: ${error.message}`);
    else await load();
  }

  return (
    <div>
      <div className="flex items-center justify-between gap-4">
        <h1 className="font-display text-4xl chrome-text">Eras</h1>
        {!form && (
          <button className={btnCls} onClick={() => setForm(empty)}>
            + New era
          </button>
        )}
      </div>

      {error && <p className="mt-4 rounded-md border border-accent/40 bg-accent/10 px-4 py-2 text-sm">{error}</p>}

      {form && (
        <form onSubmit={save} className="mt-6 rounded-lg border border-line bg-surface p-6">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div>
              <label htmlFor="e-name" className={labelCls}>Name</label>
              <input id="e-name" required className={inputCls} value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="MAYHEM" />
            </div>
            <div>
              <label htmlFor="e-slug" className={labelCls}>Slug (URL)</label>
              <input id="e-slug" required className={inputCls} value={form.slug}
                onChange={(e) => setForm({ ...form, slug: e.target.value })} placeholder="mayhem" />
            </div>
            <div>
              <label htmlFor="e-years" className={labelCls}>Years</label>
              <input id="e-years" className={inputCls} value={form.years}
                onChange={(e) => setForm({ ...form, years: e.target.value })} placeholder="2025 – now" />
            </div>
            <div>
              <label htmlFor="e-sort" className={labelCls}>Order</label>
              <input id="e-sort" type="number" className={inputCls} value={form.sort}
                onChange={(e) => setForm({ ...form, sort: Number(e.target.value) })} />
            </div>
            <div className="md:col-span-2">
              <label htmlFor="e-desc" className={labelCls}>Description</label>
              <textarea id="e-desc" rows={3} className={inputCls} value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })} />
            </div>
            <div>
              <label htmlFor="e-accent" className={labelCls}>Era color</label>
              <div className="flex items-center gap-3">
                <input id="e-accent" type="color" value={form.accent}
                  onChange={(e) => setForm({ ...form, accent: e.target.value })}
                  className="h-10 w-14 cursor-pointer rounded border border-line bg-surface-2" />
                <code className="text-sm text-muted">{form.accent}</code>
              </div>
            </div>
            <div>
              <label htmlFor="e-img" className={labelCls}>Era artwork (carousel circle + fallback backdrop)</label>
              <input id="e-img" type="url" className={inputCls} value={form.image_url}
                onChange={(e) => setForm({ ...form, image_url: e.target.value })}
                placeholder="https://…/era.jpg" />
            </div>
            <div className="md:col-span-2">
              <label htmlFor="e-logo" className={labelCls}>Era logo (transparent PNG, optional — replaces the text title)</label>
              <input id="e-logo" type="url" className={inputCls} value={form.logo_url}
                onChange={(e) => setForm({ ...form, logo_url: e.target.value })}
                placeholder="https://…/era-logo.png" />
            </div>
          </div>
          <div className="mt-6 flex gap-3">
            <button type="submit" disabled={busy} className={btnCls}>
              {busy ? "Saving…" : form.original_slug ? "Save changes" : "Create era"}
            </button>
            <button type="button" className={btnGhostCls} onClick={() => setForm(null)}>
              Cancel
            </button>
          </div>
        </form>
      )}

      <ul className="mt-8 divide-y divide-line rounded-lg border border-line bg-surface">
        {eras.map((e) => (
          <li key={e.slug} className="flex items-center gap-4 p-3">
            <span className="h-8 w-8 shrink-0 rounded-full ring-1 ring-line" style={{ background: e.accent }} />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">{e.name}</p>
              <p className="truncate text-xs text-muted">{e.years} · /eras/{e.slug}</p>
            </div>
            <button className={btnGhostCls} onClick={() => edit(e)}>Edit</button>
            <button
              className="rounded-md border border-line px-3 py-2 text-sm text-muted transition-colors hover:border-accent hover:text-accent"
              onClick={() => remove(e)}
            >
              Delete
            </button>
          </li>
        ))}
        {eras.length === 0 && <li className="p-6 text-sm text-muted">No eras yet.</li>}
      </ul>
    </div>
  );
}
