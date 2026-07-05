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
    { href: "/admin/videos", label: "Vídeos", value: counts.videos, hint: "Adicionar e editar vídeos — cola um link e está no ar." },
    { href: "/admin/videos", label: "Em destaque", value: counts.featured, hint: "Vídeos marcados como destaque; o mais recente abre a homepage." },
    { href: "/admin/eras", label: "Eras", value: counts.eras, hint: "Nomes, descrições e cores de cada era." },
    { href: "/admin/timeline", label: "Timeline", value: counts.moments, hint: "Os marcos da carreira, de 2008 até hoje." },
  ];

  return (
    <div>
      <h1 className="font-display text-4xl chrome-text">Painel</h1>
      <p className="mt-2 text-sm text-muted">
        Tudo o que gravas aqui aparece no site em segundos — sem deploys, sem código.
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
