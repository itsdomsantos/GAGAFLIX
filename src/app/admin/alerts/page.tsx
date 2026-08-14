"use client";

import { useCallback, useEffect, useState } from "react";
import { btnCls, btnGhostCls, inputCls } from "@/components/admin/AdminShell";
import { parseSource } from "@/lib/player";
import { getBrowserClient } from "@/lib/supabase";
import type { Video } from "@/lib/types";

const REASON_LABEL: Record<string, string> = {
  removed: "Removed / not found (404)",
  unplayable: "Embedding disabled or private",
};

interface Progress {
  done: number;
  total: number;
  flagged: number;
  cleared: number;
}

export default function AdminAlerts() {
  const [flagged, setFlagged] = useState<Video[]>([]);
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [scanning, setScanning] = useState(false);
  const [progress, setProgress] = useState<Progress | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    const { data, error } = await getBrowserClient()
      .from("videos")
      .select("*")
      .not("unavailable_since", "is", null)
      .order("unavailable_since", { ascending: true });
    if (error) setError(error.message);
    setFlagged((data as Video[]) ?? []);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  /** Ask the server whether a URL is still live. */
  async function checkUrl(url: string): Promise<string> {
    try {
      const res = await fetch(`/api/check-video?url=${encodeURIComponent(url)}`);
      const json = await res.json();
      return json.status ?? "unknown";
    } catch {
      return "unknown";
    }
  }

  /** Scan every video, flagging gone links and clearing recovered ones. */
  async function scanAll() {
    setScanning(true);
    setError(null);
    const supabase = getBrowserClient();
    const { data, error } = await supabase
      .from("videos")
      .select("id, url, unavailable_since");
    if (error) {
      setError(error.message);
      setScanning(false);
      return;
    }
    const rows = (data as Pick<Video, "id" | "url" | "unavailable_since">[]) ?? [];
    const now = new Date().toISOString();
    let flaggedN = 0;
    let clearedN = 0;

    for (let i = 0; i < rows.length; i++) {
      const v = rows[i];
      const status = await checkUrl(v.url);
      if (status === "removed" || status === "unplayable") {
        if (!v.unavailable_since) {
          await supabase
            .from("videos")
            .update({ unavailable_since: now, unavailable_reason: status, last_checked: now })
            .eq("id", v.id);
          flaggedN++;
        } else {
          await supabase.from("videos").update({ last_checked: now }).eq("id", v.id);
        }
      } else if (status === "live" && v.unavailable_since) {
        await supabase
          .from("videos")
          .update({ unavailable_since: null, unavailable_reason: null, last_checked: now })
          .eq("id", v.id);
        clearedN++;
      } else {
        await supabase.from("videos").update({ last_checked: now }).eq("id", v.id);
      }
      setProgress({ done: i + 1, total: rows.length, flagged: flaggedN, cleared: clearedN });
    }

    setScanning(false);
    await load();
  }

  /** Save a replacement link; if it plays, the flag clears automatically. */
  async function saveLink(v: Video) {
    const url = (drafts[v.id] ?? v.url).trim();
    if (!url) return;
    setError(null);
    const status = await checkUrl(url);
    const live = status === "live" || status === "unknown"; // unknown = non-oEmbed source, trust it
    const supabase = getBrowserClient();
    const { error } = await supabase
      .from("videos")
      .update({
        url,
        unavailable_since: live ? null : v.unavailable_since,
        unavailable_reason: live ? null : status,
        last_checked: new Date().toISOString(),
      })
      .eq("id", v.id);
    if (error) setError(error.message);
    else await load();
  }

  async function remove(v: Video) {
    if (!window.confirm(`Delete “${v.title}” for good? This cannot be undone.`)) return;
    const { error } = await getBrowserClient().from("videos").delete().eq("id", v.id);
    if (error) setError(error.message);
    else await load();
  }

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-4xl chrome-text">Alerts</h1>
          <p className="mt-2 max-w-2xl text-sm text-muted">
            Videos whose source went dead are hidden from the site and listed here. Paste a
            working replacement link (same content, another upload) to bring one back, or delete it.
            Runs automatically every day — nothing is ever removed without you.
          </p>
        </div>
        <button className={btnCls} onClick={scanAll} disabled={scanning}>
          {scanning
            ? progress
              ? `Checking ${progress.done}/${progress.total}…`
              : "Checking…"
            : "Check links now"}
        </button>
      </div>

      {progress && !scanning && (
        <p className="mt-4 rounded-md border border-line bg-surface px-4 py-2 text-sm text-muted">
          Checked {progress.total} videos — {progress.flagged} newly flagged, {progress.cleared}{" "}
          recovered.
        </p>
      )}
      {error && (
        <p className="mt-4 rounded-md border border-accent/40 bg-accent/10 px-4 py-2 text-sm">{error}</p>
      )}

      <ul className="mt-6 space-y-3">
        {flagged.map((v) => (
          <li key={v.id} className="rounded-lg border border-line bg-surface p-4">
            <div className="flex flex-wrap items-center gap-3">
              <span className="rounded bg-accent/20 px-2 py-0.5 text-[10px] font-bold uppercase text-accent">
                {REASON_LABEL[v.unavailable_reason ?? ""] ?? "Unavailable"}
              </span>
              <p className="font-medium">{v.title}</p>
              <span className="text-xs text-muted">
                {parseSource(v.url).kind}
                {v.unavailable_since ? ` · since ${v.unavailable_since.slice(0, 10)}` : ""}
              </span>
            </div>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <input
                className={`${inputCls} flex-1`}
                defaultValue={v.url}
                onChange={(e) => setDrafts((d) => ({ ...d, [v.id]: e.target.value }))}
                placeholder="Paste a working replacement link…"
              />
              <button className={btnCls} onClick={() => saveLink(v)}>
                Save &amp; re-check
              </button>
              <button
                className="rounded-md border border-line px-4 py-2 text-sm text-muted transition-colors hover:border-accent hover:text-accent"
                onClick={() => remove(v)}
              >
                Delete
              </button>
            </div>
          </li>
        ))}
        {flagged.length === 0 && (
          <li className="rounded-lg border border-line bg-surface p-6 text-sm text-muted">
            All clear — no broken links right now. 🐾
          </li>
        )}
      </ul>
    </div>
  );
}
