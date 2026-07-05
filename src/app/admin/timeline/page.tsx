"use client";

import { useCallback, useEffect, useState } from "react";
import { btnCls, btnGhostCls, inputCls, labelCls } from "@/components/admin/AdminShell";
import { getBrowserClient } from "@/lib/supabase";
import type { Era, TimelineMoment } from "@/lib/types";

interface FormState {
  id: string | null;
  date: string;
  title: string;
  body: string;
  era_slug: string;
  image_url: string;
}

const empty: FormState = { id: null, date: "", title: "", body: "", era_slug: "", image_url: "" };

export default function AdminTimeline() {
  const [moments, setMoments] = useState<TimelineMoment[]>([]);
  const [eras, setEras] = useState<Era[]>([]);
  const [form, setForm] = useState<FormState | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    const supabase = getBrowserClient();
    const [m, e] = await Promise.all([
      supabase.from("timeline_moments").select("*").order("date"),
      supabase.from("eras").select("*").order("sort"),
    ]);
    setMoments((m.data as TimelineMoment[]) ?? []);
    setEras((e.data as Era[]) ?? []);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  function edit(m: TimelineMoment) {
    setForm({
      id: m.id,
      date: m.date,
      title: m.title,
      body: m.body ?? "",
      era_slug: m.era_slug ?? "",
      image_url: m.image_url ?? "",
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
      date: form.date,
      title: form.title.trim(),
      body: form.body.trim() || null,
      era_slug: form.era_slug || null,
      image_url: form.image_url.trim() || null,
    };
    const result = form.id
      ? await supabase.from("timeline_moments").update(payload).eq("id", form.id)
      : await supabase.from("timeline_moments").insert(payload);
    if (result.error) {
      setError(`Could not save: ${result.error.message}`);
    } else {
      setForm(null);
      await load();
    }
    setBusy(false);
  }

  async function remove(m: TimelineMoment) {
    if (!window.confirm(`Remove “${m.title}” from the timeline?`)) return;
    const { error } = await getBrowserClient().from("timeline_moments").delete().eq("id", m.id);
    if (error) setError(`Could not delete: ${error.message}`);
    else await load();
  }

  return (
    <div>
      <div className="flex items-center justify-between gap-4">
        <h1 className="font-display text-4xl chrome-text">Timeline</h1>
        {!form && (
          <button className={btnCls} onClick={() => setForm(empty)}>
            + New milestone
          </button>
        )}
      </div>

      {error && <p className="mt-4 rounded-md border border-accent/40 bg-accent/10 px-4 py-2 text-sm">{error}</p>}

      {form && (
        <form onSubmit={save} className="mt-6 rounded-lg border border-line bg-surface p-6">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div>
              <label htmlFor="t-date" className={labelCls}>Date</label>
              <input id="t-date" required type="date" className={inputCls} value={form.date}
                onChange={(e) => setForm({ ...form, date: e.target.value })} />
            </div>
            <div>
              <label htmlFor="t-era" className={labelCls}>Era</label>
              <select id="t-era" className={inputCls} value={form.era_slug}
                onChange={(e) => setForm({ ...form, era_slug: e.target.value })}>
                <option value="">— no era —</option>
                {eras.map((er) => (
                  <option key={er.slug} value={er.slug}>{er.name}</option>
                ))}
              </select>
            </div>
            <div className="md:col-span-2">
              <label htmlFor="t-title" className={labelCls}>Title</label>
              <input id="t-title" required className={inputCls} value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                placeholder="Coachella: The Art of Personal Chaos" />
            </div>
            <div className="md:col-span-2">
              <label htmlFor="t-body" className={labelCls}>Text</label>
              <textarea id="t-body" rows={3} className={inputCls} value={form.body}
                onChange={(e) => setForm({ ...form, body: e.target.value })} />
            </div>
            <div className="md:col-span-2">
              <label htmlFor="t-img" className={labelCls}>Image (optional)</label>
              <input id="t-img" type="url" className={inputCls} value={form.image_url}
                onChange={(e) => setForm({ ...form, image_url: e.target.value })}
                placeholder="https://…/moment.jpg" />
            </div>
          </div>
          <div className="mt-6 flex gap-3">
            <button type="submit" disabled={busy} className={btnCls}>
              {busy ? "Saving…" : form.id ? "Save changes" : "Add milestone"}
            </button>
            <button type="button" className={btnGhostCls} onClick={() => setForm(null)}>
              Cancel
            </button>
          </div>
        </form>
      )}

      <ul className="mt-8 divide-y divide-line rounded-lg border border-line bg-surface">
        {moments.map((m) => (
          <li key={m.id} className="flex items-center gap-4 p-3">
            <span
              className="h-3 w-3 shrink-0 rounded-full"
              style={{ background: eras.find((e) => e.slug === m.era_slug)?.accent ?? "var(--accent)" }}
            />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">{m.title}</p>
              <p className="truncate text-xs text-muted">{m.date}</p>
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
        {moments.length === 0 && <li className="p-6 text-sm text-muted">No milestones yet.</li>}
      </ul>
    </div>
  );
}
