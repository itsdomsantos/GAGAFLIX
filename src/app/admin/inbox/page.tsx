"use client";

import { useEffect, useState } from "react";
import { btnCls, btnGhostCls, inputCls, labelCls } from "@/components/admin/AdminShell";
import { automationApi } from "@/lib/automation-client";
import { autoThumbnail } from "@/lib/player";
import { getBrowserClient } from "@/lib/supabase";
import {
  VIDEO_TYPES,
  VIDEO_TYPE_LABELS,
  type Era,
  type InboxItem,
  type VideoType,
} from "@/lib/types";

type Tab = "pending" | "rejected" | "approved";

interface Draft {
  title: string;
  type: VideoType;
  era_slug: string;
  event: string;
  date: string;
}

function draftFor(item: InboxItem): Draft {
  return {
    title: item.title,
    type: item.suggested_type ?? "live",
    era_slug: item.suggested_era ?? "",
    // The channel is a good default "event" for talk shows/festivals; Gaga's own
    // channel isn't an event, so leave it blank there.
    event: item.origin === "rss" && !/^lady ?gaga$/i.test(item.channel_name ?? "") ? item.channel_name ?? "" : "",
    date: item.published_at?.slice(0, 10) ?? "",
  };
}

async function fetchInbox(tab: Tab) {
  const supabase = getBrowserClient();
  const [inbox, e] = await Promise.all([
    supabase
      .from("video_inbox")
      .select("*")
      .eq("status", tab)
      .order(tab === "pending" ? "created_at" : "reviewed_at", { ascending: false })
      .limit(200),
    supabase.from("eras").select("*").order("sort"),
  ]);
  const error = inbox.error
    ? inbox.error.message.includes("video_inbox")
      ? "The inbox table doesn't exist yet — run supabase/automation.sql in Supabase (see README → “A tua parte”)."
      : inbox.error.message
    : null;
  return {
    error,
    items: (inbox.data as InboxItem[]) ?? [],
    eras: (e.data as Era[]) ?? [],
  };
}

/**
 * The approval queue. The daily robot (YouTube RSS) and fans (/submit) drop
 * videos here; approving creates the real video, rejecting hides it forever
 * (the robot never suggests a rejected video again).
 */
export default function AdminInbox() {
  const [tab, setTab] = useState<Tab>("pending");
  const [items, setItems] = useState<InboxItem[]>([]);
  const [eras, setEras] = useState<Era[]>([]);
  const [drafts, setDrafts] = useState<Record<string, Draft>>({});
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [reload, setReload] = useState(0);
  const [robot, setRobot] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    fetchInbox(tab).then((res) => {
      if (!alive) return;
      setError(res.error);
      setItems(res.items);
      setDrafts(Object.fromEntries(res.items.map((r) => [r.id, draftFor(r)])));
      setEras(res.eras);
      setLoaded(true);
    });
    return () => {
      alive = false;
    };
  }, [tab, reload]);

  /** Run the YouTube robot now (GitHub Actions), then refresh the list when it's done. */
  async function findNow() {
    setRobot("Starting the robot…");
    const res = await automationApi("POST", { action: "catalog", test: false });
    if (!res.ok) {
      setRobot(res.error ?? "Couldn't start the robot.");
      return;
    }
    setRobot("Looking for new videos — this list refreshes in about a minute…");
    setTimeout(() => {
      setTab("pending");
      setReload((n) => n + 1);
      setRobot("Done — refreshed. (Run details: Admin → Automation.)");
    }, 80_000);
  }

  function patch(id: string, p: Partial<Draft>) {
    setDrafts((d) => ({ ...d, [id]: { ...d[id], ...p } }));
  }

  async function approve(item: InboxItem) {
    const d = drafts[item.id];
    if (!d.title.trim()) {
      setError("Give the video a title before approving.");
      return;
    }
    setBusy(item.id);
    setError(null);
    const supabase = getBrowserClient();
    const { data, error } = await supabase
      .from("videos")
      .insert({
        title: d.title.trim(),
        url: item.url,
        type: d.type,
        era_slug: d.era_slug || null,
        event: d.event.trim() || null,
        date: d.date || null,
        thumbnail_url: item.thumbnail_url,
      })
      .select("id")
      .single();
    if (error) {
      setError(error.message);
      setBusy(null);
      return;
    }
    await supabase
      .from("video_inbox")
      .update({ status: "approved", video_id: data.id, reviewed_at: new Date().toISOString() })
      .eq("id", item.id);
    setItems((list) => list.filter((x) => x.id !== item.id));
    setBusy(null);
  }

  async function setStatus(item: InboxItem, status: Tab) {
    setBusy(item.id);
    const { error } = await getBrowserClient()
      .from("video_inbox")
      .update({ status, reviewed_at: status === "pending" ? null : new Date().toISOString() })
      .eq("id", item.id);
    if (error) setError(error.message);
    else setItems((list) => list.filter((x) => x.id !== item.id));
    setBusy(null);
  }

  async function rejectAll() {
    if (!confirm(`Reject all ${items.length} pending videos?`)) return;
    setBusy("all");
    const { error } = await getBrowserClient()
      .from("video_inbox")
      .update({ status: "rejected", reviewed_at: new Date().toISOString() })
      .in("id", items.map((i) => i.id));
    if (error) setError(error.message);
    else setItems([]);
    setBusy(null);
  }

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-4xl chrome-text">Inbox</h1>
          <p className="mt-2 max-w-2xl text-sm text-muted">
            New videos found every day by the YouTube robot, plus links suggested by fans on{" "}
            <a href="/submit" className="underline hover:text-text">/submit</a>. Check the type and
            era, then approve — it goes live instantly. Rejected videos are never suggested again.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button onClick={findNow} disabled={robot?.startsWith("Looking") || robot?.startsWith("Starting")} className={btnCls}>
            🔎 Find new videos now
          </button>
          {(["pending", "rejected", "approved"] as Tab[]).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`rounded-full border px-4 py-1.5 text-sm capitalize ${
                tab === t ? "border-accent text-text" : "border-line text-muted hover:text-text"
              }`}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      {robot && <p className="mt-6 rounded-md border border-line bg-surface p-3 text-sm">{robot}</p>}
      {error && <p className="mt-6 rounded-md border border-accent/40 bg-accent/10 p-3 text-sm">{error}</p>}

      {loaded && items.length === 0 && !error && (
        <p className="mt-10 text-sm text-muted">
          {tab === "pending" ? "All caught up — nothing waiting for review. 🐾" : `Nothing ${tab} yet.`}
        </p>
      )}

      {tab === "pending" && items.length > 1 && (
        <div className="mt-6 flex justify-end">
          <button onClick={rejectAll} disabled={busy !== null} className={btnGhostCls}>
            Reject all {items.length}
          </button>
        </div>
      )}

      <ul className="mt-6 space-y-4">
        {items.map((item) => {
          const d = drafts[item.id];
          const thumb = item.thumbnail_url ?? autoThumbnail({ url: item.url, thumbnail_url: null });
          return (
            <li key={item.id} className="rounded-lg border border-line bg-surface p-4">
              <div className="flex flex-col gap-4 sm:flex-row">
                <a
                  href={item.url}
                  target="_blank"
                  rel="noreferrer"
                  className="relative block aspect-video w-full shrink-0 overflow-hidden rounded-md bg-surface-2 sm:w-64"
                  title="Open the original"
                >
                  {thumb && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={thumb} alt="" className="h-full w-full object-cover" />
                  )}
                  <span className="absolute left-2 top-2 rounded bg-black/70 px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest">
                    {item.origin === "fan" ? "Fan suggestion" : "Robot"}
                  </span>
                </a>

                <div className="min-w-0 flex-1">
                  <p className="text-xs text-muted">
                    {item.channel_name ?? new URL(item.url).hostname}
                    {item.published_at ? ` · ${item.published_at.slice(0, 10)}` : ""}
                    {item.submitted_by ? ` · from ${item.submitted_by}` : ""}
                  </p>
                  {item.note && (
                    <p className="mt-1 text-sm italic text-muted">“{item.note}”</p>
                  )}

                  {tab === "pending" && d ? (
                    <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
                      <div className="sm:col-span-2">
                        <label className={labelCls}>Title</label>
                        <input
                          className={inputCls}
                          value={d.title}
                          onChange={(e) => patch(item.id, { title: e.target.value })}
                          placeholder="Title shown on GAGAFLIX"
                        />
                      </div>
                      <div>
                        <label className={labelCls}>Type</label>
                        <select
                          className={inputCls}
                          value={d.type}
                          onChange={(e) => patch(item.id, { type: e.target.value as VideoType })}
                        >
                          {VIDEO_TYPES.map((t) => (
                            <option key={t} value={t}>
                              {VIDEO_TYPE_LABELS[t]}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className={labelCls}>Era</label>
                        <select
                          className={inputCls}
                          value={d.era_slug}
                          onChange={(e) => patch(item.id, { era_slug: e.target.value })}
                        >
                          <option value="">— none —</option>
                          {eras.map((e) => (
                            <option key={e.slug} value={e.slug}>
                              {e.name}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className={labelCls}>Event</label>
                        <input
                          className={inputCls}
                          value={d.event}
                          onChange={(e) => patch(item.id, { event: e.target.value })}
                          placeholder="e.g. The Tonight Show"
                        />
                      </div>
                      <div>
                        <label className={labelCls}>Date</label>
                        <input
                          type="date"
                          className={inputCls}
                          value={d.date}
                          onChange={(e) => patch(item.id, { date: e.target.value })}
                        />
                      </div>
                    </div>
                  ) : (
                    <p className="mt-2 font-semibold">{item.title || item.url}</p>
                  )}

                  <div className="mt-4 flex flex-wrap gap-2">
                    {tab === "pending" && (
                      <>
                        <button onClick={() => approve(item)} disabled={busy !== null} className={btnCls}>
                          {busy === item.id ? "Saving…" : "Approve"}
                        </button>
                        <button
                          onClick={() => setStatus(item, "rejected")}
                          disabled={busy !== null}
                          className={btnGhostCls}
                        >
                          Reject
                        </button>
                      </>
                    )}
                    {tab === "rejected" && (
                      <button
                        onClick={() => setStatus(item, "pending")}
                        disabled={busy !== null}
                        className={btnGhostCls}
                      >
                        Back to pending
                      </button>
                    )}
                    {tab === "approved" && item.video_id && (
                      <a href={`/watch/${item.video_id}`} className={btnGhostCls}>
                        View on site
                      </a>
                    )}
                  </div>
                </div>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
