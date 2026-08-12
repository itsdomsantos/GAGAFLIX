"use client";

import Link from "next/link";
import { useEffect, useRef } from "react";
import { heroThumbnail } from "@/lib/player";
import { VIDEO_TYPE_LABELS, type Era, type Video } from "@/lib/types";

export default function Hero({ video, era }: { video: Video; era: Era | null }) {
  const backdrop = heroThumbnail(video);

  const sectionRef = useRef<HTMLElement>(null);
  const backdropRef = useRef<HTMLImageElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const veilRef = useRef<HTMLDivElement>(null);
  const cueRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce) return;

    let raf = 0;
    const update = () => {
      raf = 0;
      const section = sectionRef.current;
      if (!section) return;

      const height = section.offsetHeight || 1;
      // Progresso 0 → 1 conforme o hero sai do topo do ecrã.
      const p = Math.min(Math.max(-section.getBoundingClientRect().top / height, 0), 1);

      if (backdropRef.current) {
        backdropRef.current.style.transform = `scale(${1 + p * 0.14}) translateY(${p * 48}px)`;
        backdropRef.current.style.filter = `brightness(${1 - p * 0.35})`;
      }
      if (contentRef.current) {
        contentRef.current.style.transform = `translateY(${p * -64}px)`;
        contentRef.current.style.opacity = `${Math.max(1 - p * 1.35, 0)}`;
      }
      if (veilRef.current) {
        veilRef.current.style.opacity = `${Math.min(p * 1.2, 1)}`;
      }
      if (cueRef.current) {
        cueRef.current.style.opacity = `${Math.max(1 - p * 4, 0)}`;
      }
    };

    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(update);
    };

    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll, { passive: true });
    return () => {
      if (raf) cancelAnimationFrame(raf);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, []);

  return (
    <section
      ref={sectionRef}
      className="relative flex min-h-[72vh] items-end overflow-hidden"
    >
      {backdrop && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          ref={backdropRef}
          src={backdrop}
          alt=""
          className="absolute inset-0 h-full w-full object-cover will-change-transform"
        />
      )}
      {/* Véus cinematográficos sobre a imagem */}
      <div className="absolute inset-0 bg-gradient-to-t from-bg via-bg/40 to-bg/30" />
      <div className="absolute inset-0 bg-gradient-to-r from-bg/80 via-transparent to-transparent" />
      {/* Véu extra que intensifica no scroll — a secção "afunda" no escuro */}
      <div ref={veilRef} className="absolute inset-0 bg-bg opacity-0" />

      <div
        ref={contentRef}
        className="relative mx-auto w-full max-w-7xl px-4 pb-14 pt-40 will-change-transform sm:px-6"
      >
        {era && (
          <p
            className="mb-3 text-xs font-semibold uppercase tracking-[0.25em]"
            style={{ color: era.accent }}
          >
            {era.name} Era
          </p>
        )}
        <h1 className="font-display max-w-3xl text-5xl leading-none chrome-text sm:text-7xl [text-wrap:balance]">
          {video.title}
        </h1>
        <p className="mt-4 max-w-xl text-sm text-muted">
          {VIDEO_TYPE_LABELS[video.type]}
          {video.event ? ` · ${video.event}` : ""}
          {video.date ? ` · ${video.date.slice(0, 4)}` : ""}
        </p>
        <div className="mt-7 flex flex-wrap items-center gap-3">
          <Link
            href={`/watch/${video.id}`}
            className="inline-flex items-center gap-2 rounded-md bg-accent px-6 py-3 font-semibold text-black transition-transform hover:scale-105"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
              <path d="M8 5v14l11-7L8 5Z" />
            </svg>
            Watch
          </Link>
          {era && (
            <Link
              href={`/eras/${era.slug}`}
              className="inline-flex items-center gap-2 rounded-md border border-line bg-surface/60 px-6 py-3 font-semibold backdrop-blur transition-colors hover:border-era"
            >
              Explore the era
            </Link>
          )}
        </div>
      </div>

      {/* Pista de scroll — desaparece assim que o utilizador rola */}
      <div
        ref={cueRef}
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 bottom-5 flex justify-center"
      >
        <span className="hero-scroll-cue text-muted">
          <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="m6 9 6 6 6-6" />
          </svg>
        </span>
      </div>
    </section>
  );
}
