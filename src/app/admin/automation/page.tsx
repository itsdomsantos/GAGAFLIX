"use client";

import { useEffect, useState } from "react";
import { btnCls, btnGhostCls } from "@/components/admin/AdminShell";
import { automationApi, type AutomationAction, type Run } from "@/lib/automation-client";

const ACTIONS: { action: AutomationAction; label: string; hint: string; instagram: boolean }[] = [
  { action: "catalog", label: "🔎 Find new videos now", hint: "Reads the YouTube channels right now. New videos land in the Inbox for you to approve (~1 min).", instagram: false },
  { action: "news", label: "📰 Post a news story now", hint: "Picks the freshest Lady Gaga story not posted yet and puts it on Instagram (~3 min).", instagram: true },
  { action: "extra", label: "✨ Post today's extra", hint: "Today's anniversary / calendar date, else the videos just added, else a promo (~3 min).", instagram: true },
  { action: "reel", label: "🎬 Post the site reel", hint: "Films the live site on a phone and posts it as a reel (~6 min).", instagram: true },
  { action: "trailer", label: "🎞️ Make the YouTube trailer", hint: "Renders the 60 s 4K trailer from the live site (~30 min). Download it from the run's Artifacts — nothing is uploaded to YouTube.", instagram: false },
];

function badge(r: Run) {
  if (r.status !== "completed") return { text: r.status === "queued" ? "Queued" : "Running…", cls: "border-amber-400/50 text-amber-300" };
  if (r.conclusion === "success") return { text: "Done ✓", cls: "border-emerald-400/50 text-emerald-300" };
  if (r.conclusion === "cancelled" || r.conclusion === "skipped") return { text: "Cancelled", cls: "border-line text-muted" };
  return { text: "Failed ✗", cls: "border-accent/60 text-accent" };
}

const ago = (iso: string) => {
  const m = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
  return m < 1 ? "just now" : m < 60 ? `${m} min ago` : m < 1440 ? `${Math.round(m / 60)} h ago` : `${Math.round(m / 1440)} d ago`;
};

/**
 * One-click buttons for the GitHub Actions automations (the same jobs that run
 * on their own every day), plus their latest runs.
 */
export default function AdminAutomation() {
  const [runs, setRuns] = useState<Run[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState<AutomationAction | null>(null);
  const [test, setTest] = useState(false);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    let alive = true;
    let timer: ReturnType<typeof setTimeout> | undefined;
    automationApi("GET").then((res) => {
      if (!alive) return;
      if (res.ok) {
        setRuns(res.runs ?? []);
        setError(null);
      } else setError(res.error ?? "Couldn't load the runs.");
      // refresh every 10 s while something is running, otherwise every minute
      const running = (res.runs ?? []).some((r) => r.status !== "completed");
      timer = setTimeout(() => setTick((n) => n + 1), running ? 10_000 : 60_000);
    });
    return () => {
      alive = false;
      clearTimeout(timer);
    };
  }, [tick]);

  async function start(action: AutomationAction, instagram: boolean) {
    if (instagram && !test && !confirm("Post this on Instagram now?")) return;
    setBusy(action);
    setNotice(null);
    const res = await automationApi("POST", { action, test });
    setBusy(null);
    if (!res.ok) {
      setError(res.error ?? "Couldn't start it.");
      return;
    }
    setError(null);
    setNotice(
      action === "catalog"
        ? "Started — new videos will appear in the Inbox in about a minute."
        : action === "trailer"
          ? "Rendering — in ~30 min open the run below → Artifacts → gagaflix-trailer."
        : test
          ? "Test run started — the images will be in the run's “Artifacts” on GitHub."
          : "Started — it will be on Instagram in a few minutes.",
    );
    setTimeout(() => setTick((n) => n + 1), 4000); // GitHub needs a moment to list the new run
  }

  return (
    <div>
      <h1 className="font-display text-4xl chrome-text">Automation</h1>
      <p className="mt-2 max-w-2xl text-sm text-muted">
        These run on their own every day (videos 05:23 UTC · Instagram 11:37, 17:07 and 20:37 UTC). Use the
        buttons to run one right now. Until Instagram is connected, Instagram buttons only render the post
        (test mode).
      </p>

      <label className="mt-6 inline-flex cursor-pointer items-center gap-3 text-sm">
        <input type="checkbox" checked={test} onChange={(e) => setTest(e.target.checked)} className="h-4 w-4 accent-[var(--accent)]" />
        Test only — render the Instagram post, don&apos;t publish it
      </label>

      {error && <p className="mt-4 rounded-md border border-accent/40 bg-accent/10 p-3 text-sm">{error}</p>}
      {notice && <p className="mt-4 rounded-md border border-line bg-surface p-3 text-sm">{notice}</p>}

      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
        {ACTIONS.map((a) => (
          <div key={a.action} className="rounded-lg border border-line bg-surface p-5">
            <button onClick={() => start(a.action, a.instagram)} disabled={busy !== null} className={btnCls}>
              {busy === a.action ? "Starting…" : a.label}
            </button>
            <p className="mt-3 text-xs leading-relaxed text-muted">{a.hint}</p>
          </div>
        ))}
      </div>

      <div className="mt-10 flex items-center justify-between">
        <h2 className="text-lg font-semibold">Latest runs</h2>
        <button onClick={() => setTick((n) => n + 1)} className={btnGhostCls}>
          Refresh
        </button>
      </div>
      <ul className="mt-4 divide-y divide-line rounded-lg border border-line bg-surface">
        {runs.length === 0 && <li className="p-4 text-sm text-muted">No runs yet.</li>}
        {runs.map((r) => {
          const b = badge(r);
          return (
            <li key={r.id} className="flex flex-wrap items-center gap-3 p-4 text-sm">
              <span className={`rounded-full border px-2.5 py-0.5 text-xs font-semibold ${b.cls}`}>{b.text}</span>
              <span className="font-medium">{r.name}</span>
              <span className="text-muted">
                {r.event === "schedule" ? "scheduled" : "manual"} · {ago(r.createdAt)}
              </span>
              <a href={r.url} target="_blank" rel="noreferrer" className="ml-auto text-muted underline hover:text-text">
                Open on GitHub
              </a>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
