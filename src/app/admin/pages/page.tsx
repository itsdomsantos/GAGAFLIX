"use client";

import { useCallback, useEffect, useState } from "react";
import { getBrowserClient } from "@/lib/supabase";
import { TOGGLE_PAGES } from "@/lib/pages";

export default function AdminPages() {
  const [hidden, setHidden] = useState<string[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const load = useCallback(async () => {
    const { data } = await getBrowserClient()
      .from("site_settings")
      .select("value")
      .eq("key", "nav")
      .maybeSingle();
    const list = (data?.value as { hidden?: string[] } | null)?.hidden;
    setHidden(Array.isArray(list) ? list : []);
    setLoaded(true);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function toggle(key: string) {
    const next = hidden.includes(key)
      ? hidden.filter((k) => k !== key)
      : [...hidden, key];
    setHidden(next);
    setSaved(false);
    setBusy(true);
    setError(null);
    const { error } = await getBrowserClient()
      .from("site_settings")
      .upsert({ key: "nav", value: { hidden: next } }, { onConflict: "key" });
    if (error) {
      setError(`Could not save: ${error.message}`);
      // roll back the optimistic change
      setHidden(hidden);
    } else {
      setSaved(true);
    }
    setBusy(false);
  }

  return (
    <div>
      <div className="flex items-center justify-between gap-4">
        <h1 className="font-display text-4xl chrome-text">Pages</h1>
        {busy ? (
          <span className="text-sm text-muted">Saving…</span>
        ) : saved ? (
          <span className="text-sm text-accent">Saved ✓</span>
        ) : null}
      </div>
      <p className="mt-3 max-w-xl text-sm text-muted">
        Hide a page to remove it from the top menu and the mobile bar. The page
        itself stays reachable by its direct link — this only tidies the nav.
        Home and Search are always shown.
      </p>

      {error && (
        <p className="mt-4 rounded-md border border-accent/40 bg-accent/10 px-4 py-2 text-sm">{error}</p>
      )}

      <ul className="mt-8 divide-y divide-line rounded-lg border border-line bg-surface">
        {TOGGLE_PAGES.map((page) => {
          const isHidden = hidden.includes(page.key);
          return (
            <li key={page.key} className="flex items-center gap-4 p-4">
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium">{page.label}</p>
                <p className="text-xs text-muted">{page.href}</p>
              </div>
              <span
                className={`text-xs font-semibold uppercase tracking-wider ${
                  isHidden ? "text-muted" : "text-accent"
                }`}
              >
                {isHidden ? "Hidden" : "Visible"}
              </span>
              <button
                type="button"
                role="switch"
                aria-checked={!isHidden}
                aria-label={`Toggle ${page.label}`}
                disabled={!loaded || busy}
                onClick={() => toggle(page.key)}
                className={`relative h-6 w-11 shrink-0 rounded-full transition-colors disabled:opacity-50 ${
                  isHidden ? "bg-surface-2 ring-1 ring-line" : "bg-accent"
                }`}
              >
                <span
                  className={`absolute top-0.5 h-5 w-5 rounded-full bg-white transition-all ${
                    isHidden ? "left-0.5" : "left-[22px]"
                  }`}
                />
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
