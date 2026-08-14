"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { heroThumbnail, youtubeId } from "@/lib/player";
import { VIDEO_TYPE_LABELS, type Era, type Video } from "@/lib/types";

export default function Hero({ video, era }: { video: Video; era: Era | null }) {
  const backdrop = heroThumbnail(video);
  const yt = youtubeId(video.url);

  // O vídeo de fundo só entra depois de montar (evita SSR) e se o utilizador
  // não pediu menos movimento. A thumbnail fica por baixo como poster.
  const [playVideo, setPlayVideo] = useState(false);
  const [videoReady, setVideoReady] = useState(false);

  const sectionRef = useRef<HTMLElement>(null);
  const mediaRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const veilRef = useRef<HTMLDivElement>(null);
  const cueRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (!reduce && yt) setPlayVideo(true);
    if (reduce) return;

    let raf = 0;
    const update = () => {
      raf = 0;
      const section = sectionRef.current;
      if (!section) return;

      const height = section.offsetHeight || 1;
      // Progresso 0 → 1 conforme o hero sai do topo do ecrã.
      const p = Math.min(Math.max(-section.getBoundingClientRect().top / height, 0), 1);

      if (mediaRef.current) {
        mediaRef.current.style.transform = `scale(${1 + p * 0.14}) translateY(${p * 48}px)`;
        mediaRef.current.style.filter = `brightness(${1 - p * 0.35})`;
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
  }, [yt]);

  const embedUrl = yt
    ? `https://www.youtube-nocookie.com/embed/${yt}?autoplay=1&mute=1&loop=1&playlist=${yt}&controls=0&modestbranding=1&rel=0&playsinline=1&disablekb=1&fs=0&iv_load_policy=3`
    : null;

  return (
    <section
      ref={sectionRef}
      className="relative flex min-h-[72vh] items-end overflow-hidden"
    >
      <div ref={mediaRef} className="absolute inset-0 will-change-transform">
        {backdrop && (
          // Poster: a thumbnail cobre a secção enquanto o vídeo ainda não toca.
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={backdrop}
            alt=""
            className="absolute inset-0 h-full w-full object-cover"
          />
        )}
        {playVideo && embedUrl && (
          <div
            className={`absolute inset-0 overflow-hidden transition-opacity duration-700 ${
              videoReady ? "opacity-100" : "opacity-0"
            }`}
          >
            <iframe
              src={embedUrl}
              title={video.title}
              onLoad={() => setVideoReady(true)}
              allow="autoplay; encrypted-media"
              // Sobredimensiona o iframe 16:9 para cobrir a secção sem barras pretas.
              style={{
                position: "absolute",
                top: "50%",
                left: "50%",
                transform: "translate(-50%, -50%)",
                width: "max(100vw, 177.78vh)",
                height: "max(56.25vw, 100vh)",
                border: 0,
                pointerEvents: "none",
              }}
            />
          </div>
        )}
      </div>
      {/* Véus cinematográficos sobre a imagem */}
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-bg via-bg/40 to-bg/30" />
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-bg/80 via-transparent to-transparent" />
      {/* Véu extra que intensifica no scroll — a secção "afunda" no escuro */}
      <div ref={veilRef} className="pointer-events-none absolute inset-0 bg-bg opacity-0" />

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
