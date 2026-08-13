"use client";

import { useEffect, useMemo, useState } from "react";
import { getBrowserClient } from "@/lib/supabase";

type ViewRow = {
  path: string;
  referrer: string | null;
  visitor_id: string | null;
  country: string | null;
  created_at: string;
};

const RANGES = [
  { days: 7, label: "7 days" },
  { days: 30, label: "30 days" },
  { days: 90, label: "90 days" },
];

/** Turn a path into a friendly label for the dashboard. */
function prettyPath(path: string): string {
  if (path === "/") return "Home";
  if (path === "/eras") return "Eras";
  if (path === "/timeline") return "Timeline";
  if (path === "/search") return "Search";
  const parts = path.split("/").filter(Boolean);
  if (parts[0] === "eras" && parts[1]) return `Era · ${parts[1]}`;
  if (parts[0] === "watch") return "Watch";
  return path;
}

/** ISO country code → flag emoji + English name for the dashboard. */
const COUNTRY_NAMES =
  typeof Intl !== "undefined" && "DisplayNames" in Intl
    ? new Intl.DisplayNames(["en"], { type: "region" })
    : null;

function prettyCountry(code: string): string {
  if (code === "??") return "Unknown";
  const flag = /^[A-Z]{2}$/.test(code)
    ? String.fromCodePoint(...[...code].map((c) => 0x1f1e6 + c.charCodeAt(0) - 65))
    : "🏳️";
  let name = code;
  try {
    name = COUNTRY_NAMES?.of(code) ?? code;
  } catch {
    name = code;
  }
  return `${flag}  ${name}`;
}

function startOfDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

function dayKey(d: Date): string {
  return startOfDay(d).toISOString().slice(0, 10);
}

export default function AdminStats() {
  const [days, setDays] = useState(30);
  const [rows, setRows] = useState<ViewRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    setRows(null);
    setError(null);
    const since = new Date(Date.now() - days * 86_400_000).toISOString();
    getBrowserClient()
      .from("page_views")
      .select("path, referrer, visitor_id, country, created_at")
      .gte("created_at", since)
      .order("created_at", { ascending: false })
      .limit(50_000)
      .then(({ data, error }) => {
        if (!alive) return;
        if (error) {
          setError(error.message);
          setRows([]);
        } else {
          setRows((data as ViewRow[]) ?? []);
        }
      });
    return () => {
      alive = false;
    };
  }, [days]);

  const stats = useMemo(() => {
    if (!rows) return null;
    const todayKey = dayKey(new Date());

    const uniqueVisitors = new Set<string>();
    const viewsToday = rows.filter((r) => dayKey(new Date(r.created_at)) === todayKey).length;

    const pageCounts = new Map<string, number>();
    const refCounts = new Map<string, number>();
    const countryCounts = new Map<string, number>();
    const perDay = new Map<string, number>();

    // Seed every day in the window so the chart has no gaps.
    for (let i = days - 1; i >= 0; i--) {
      perDay.set(dayKey(new Date(Date.now() - i * 86_400_000)), 0);
    }

    for (const r of rows) {
      if (r.visitor_id) uniqueVisitors.add(r.visitor_id);
      pageCounts.set(r.path, (pageCounts.get(r.path) ?? 0) + 1);
      const ref = r.referrer && r.referrer.trim() ? r.referrer : "Direct / none";
      refCounts.set(ref, (refCounts.get(ref) ?? 0) + 1);
      const country = r.country && r.country.trim() ? r.country : "??";
      countryCounts.set(country, (countryCounts.get(country) ?? 0) + 1);
      const k = dayKey(new Date(r.created_at));
      if (perDay.has(k)) perDay.set(k, (perDay.get(k) ?? 0) + 1);
    }

    const topPages = [...pageCounts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 8);
    const topRefs = [...refCounts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 8);
    const topCountries = [...countryCounts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 10);
    const series = [...perDay.entries()].sort((a, b) => a[0].localeCompare(b[0]));

    return {
      total: rows.length,
      unique: uniqueVisitors.size,
      today: viewsToday,
      perDayAvg: Math.round(rows.length / days),
      topPages,
      topRefs,
      topCountries,
      series,
    };
  }, [rows, days]);

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-4xl chrome-text">Access stats</h1>
          <p className="mt-2 text-sm text-muted">
            Private, cookie-free analytics — every visit is counted straight into your own
            database. No Google, no third parties.
          </p>
        </div>
        <div className="flex gap-2">
          {RANGES.map((r) => (
            <button
              key={r.days}
              onClick={() => setDays(r.days)}
              className={`rounded-md border px-3 py-1.5 text-sm transition-colors ${
                days === r.days
                  ? "border-accent text-text"
                  : "border-line text-muted hover:border-accent"
              }`}
            >
              {r.label}
            </button>
          ))}
        </div>
      </div>

      {rows === null && <p className="mt-10 text-sm text-muted">Loading…</p>}

      {error && (
        <div className="mt-8 rounded-lg border border-line bg-surface p-6 text-sm text-muted">
          <p className="font-semibold text-accent">Couldn&apos;t load stats.</p>
          <p className="mt-2">
            Make sure the <code className="rounded bg-surface-2 px-1.5 py-0.5">page_views</code> table
            exists — run the analytics block at the bottom of{" "}
            <code className="rounded bg-surface-2 px-1.5 py-0.5">supabase/schema.sql</code> in your
            Supabase SQL editor.
          </p>
          <p className="mt-2 text-xs opacity-70">{error}</p>
        </div>
      )}

      {stats && !error && (
        <>
          <div className="mt-8 grid grid-cols-2 gap-4 lg:grid-cols-4">
            <StatCard label="Total views" value={stats.total} hint={`in the last ${days} days`} />
            <StatCard label="Unique visitors" value={stats.unique} hint="by anonymous device id" />
            <StatCard label="Views today" value={stats.today} hint="since midnight" />
            <StatCard label="Daily average" value={stats.perDayAvg} hint="views per day" />
          </div>

          <BarChart series={stats.series} />

          <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
            <RankList
              title="Top pages"
              rows={stats.topPages.map(([k, v]) => [prettyPath(k), v])}
              total={stats.total}
            />
            <RankList
              title="Traffic sources"
              rows={stats.topRefs.map(([k, v]) => [k, v])}
              total={stats.total}
            />
          </div>

          <div className="mt-6">
            <RankList
              title="Countries"
              rows={stats.topCountries.map(([k, v]) => [prettyCountry(k), v])}
              total={stats.total}
            />
          </div>

          {stats.total === 0 && (
            <p className="mt-8 text-sm text-muted">
              No visits recorded yet in this window. Once the site is live (and your Supabase
              variables are set), views will show up here within seconds.
            </p>
          )}
        </>
      )}
    </div>
  );
}

function StatCard({ label, value, hint }: { label: string; value: number; hint: string }) {
  return (
    <div className="rounded-lg border border-line bg-surface p-5">
      <p className="text-xs font-semibold uppercase tracking-wider text-muted">{label}</p>
      <p className="mt-2 text-4xl font-semibold tabular-nums">{value.toLocaleString()}</p>
      <p className="mt-2 text-xs text-muted">{hint}</p>
    </div>
  );
}

function BarChart({ series }: { series: [string, number][] }) {
  const max = Math.max(1, ...series.map(([, v]) => v));
  return (
    <div className="mt-6 rounded-lg border border-line bg-surface p-5">
      <p className="text-xs font-semibold uppercase tracking-wider text-muted">Views per day</p>
      <div className="mt-4 flex h-40 items-end gap-[2px]">
        {series.map(([day, count]) => (
          <div key={day} className="group relative flex-1" title={`${day}: ${count}`}>
            <div
              className="w-full rounded-sm bg-accent/70 transition-colors group-hover:bg-accent"
              style={{ height: `${Math.max(2, (count / max) * 100)}%` }}
            />
            <div className="pointer-events-none absolute -top-7 left-1/2 z-10 -translate-x-1/2 whitespace-nowrap rounded bg-surface-2 px-2 py-1 text-[10px] tabular-nums opacity-0 shadow transition-opacity group-hover:opacity-100">
              {count} · {day.slice(5)}
            </div>
          </div>
        ))}
      </div>
      {series.length > 0 && (
        <div className="mt-2 flex justify-between text-[10px] text-muted">
          <span>{series[0][0].slice(5)}</span>
          <span>{series[series.length - 1][0].slice(5)}</span>
        </div>
      )}
    </div>
  );
}

function RankList({
  title,
  rows,
  total,
}: {
  title: string;
  rows: [string, number][];
  total: number;
}) {
  return (
    <div className="rounded-lg border border-line bg-surface p-5">
      <p className="text-xs font-semibold uppercase tracking-wider text-muted">{title}</p>
      <div className="mt-4 space-y-2.5">
        {rows.length === 0 && <p className="text-sm text-muted">No data yet.</p>}
        {rows.map(([label, count]) => {
          const pct = total > 0 ? Math.round((count / total) * 100) : 0;
          return (
            <div key={label}>
              <div className="flex items-baseline justify-between gap-3 text-sm">
                <span className="truncate" title={label}>
                  {label}
                </span>
                <span className="shrink-0 tabular-nums text-muted">
                  {count.toLocaleString()} · {pct}%
                </span>
              </div>
              <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-surface-2">
                <div className="h-full rounded-full bg-accent/70" style={{ width: `${pct}%` }} />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
