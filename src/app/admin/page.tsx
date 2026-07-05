"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { getBrowserClient } from "@/lib/supabase";

export default function AdminHome() {
  const [counts, setCounts] = useState({ videos: 0, eras: 0, moments: 0, featured: 0 });

  useEffect(() => {
    const supabase = getBrowserClient();
    Promise.all([
      supabase.from("videos").select("id, featured"),
      supabase.from("eras").select("slug"),
      supabase.from("timeline_moments").select("id"),
    ]).then(([videos, eras, moments]) => {
      setCounts({
        videos: videos.data?.length ?? 0,
        featured: videos.data?.filter((v) => v.featured).length ?? 0,
        eras: eras.data?.length ?? 0,
        moments: moments.data?.length ?? 0,
      });
    });
  }, []);

  const cards = [
    { href: "/admin/videos", label: "Videos", value: counts.videos, hint: "Add and edit videos — paste a link and it's live." },
    { href: "/admin/videos", label: "Featured", value: counts.featured, hint: "Videos flagged as featured; the newest one opens the homepage." },
    { href: "/admin/eras", label: "Eras", value: counts.eras, hint: "Names, descriptions and colors for every era." },
    { href: "/admin/timeline", label: "Timeline", value: counts.moments, hint: "Career milestones, from 2008 to today." },
  ];

  return (
    <div>
      <h1 className="font-display text-4xl chrome-text">Dashboard</h1>
      <p className="mt-2 text-sm text-muted">
        Everything you save here shows up on the site in seconds — no deploys, no code.
      </p>
      <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map((c) => (
          <Link
            key={c.label}
            href={c.href}
            className="rounded-lg border border-line bg-surface p-5 transition-colors hover:border-accent"
          >
            <p className="text-xs font-semibold uppercase tracking-wider text-muted">{c.label}</p>
            <p className="mt-2 text-4xl font-semibold tabular-nums">{c.value}</p>
            <p className="mt-2 text-xs leading-relaxed text-muted">{c.hint}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
