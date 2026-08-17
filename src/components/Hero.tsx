"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { autoThumbnail, heroThumbnail, youtubeId } from "@/lib/player";
import { loadYouTubeAPI } from "@/lib/youtube";
import { VIDEO_TYPE_LABELS, type Era, type Video } from "@/lib/types";

/** Hero preview loop window: start at START_SECONDS, loop for LOOP_SECONDS. */
const START_SECONDS = 30;
const LOOP_SECONDS = 20;

export default function Hero({ video, era }: { video: Video; era: Era | null }) {
  const poster = heroThumbnail(video);
  const fallbackPoster = autoThumbnail(video); // hqdefault — always exists for real videos
  const yt = youtubeId(video.url);

  const sectionRef = useRef<HTMLElement>(null);
  const mediaRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const veilRef = useRef<HTMLDivElement>(null);
  const cueRef = useRef<HTMLDivElement>(null);
  // The sharp poster stays on top until the clip is really playing frames
  // (past its start point), then fades away — hiding the grey buffering state.
  const [revealed, setRevealed] = useState(false);

  // Parallax: the backdrop scales, sinks and darkens as the hero scrolls away.
  useEffect(() => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce) return;

    let raf = 0;
    const update = () => {
      raf = 0;
      const section = sectionRef.current;
      if (!section) return;
      const height = section.offsetHeight || 1;
      const p = Math.min(Math.max(-section.getBoundingClientRect().top / height, 0), 1);

      if (mediaRef.current) {
        mediaRef.current.style.transform = `scale(${1 + p * 0.14}) translateY(${p * 48}px)`;
        mediaRef.current.style.filter = `brightness(${1 - p * 0.35})`;
      }
      if (contentRef.current) {
        contentRef.current.style.transform = `translateY(${p * -64}px)`;
        contentRef.current.style.opacity = `${Math.max(1 - p * 1.35, 0)}`;
      }
      if (veilRef.current) veilRef.current.style.opacity = `${Math.min(p * 1.2, 1)}`;
      if (cueRef.current) cueRef.current.style.opacity = `${Math.max(1 - p * 4, 0)}`;
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

  // Muted autoplay of the featured clip, looping only its first LOOP_SECONDS.
  // This also guarantees a live backdrop even when a video's static thumbnail
  // is missing/broken.
  useEffect(() => {
    if (!yt) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    let alive = true;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let player: any;
    let iv: ReturnType<typeof setInterval> | undefined;

    loadYouTubeAPI().then((YT) => {
      if (!alive || !document.getElementById("hero-yt")) return;
      player = new YT.Player("hero-yt", {
        videoId: yt,
        width: "100%",
        height: "100%",
        playerVars: {
          autoplay: 1,
          mute: 1,
          controls: 0,
          playsinline: 1,
          modestbranding: 1,
          rel: 0,
          fs: 0,
          disablekb: 1,
          iv_load_policy: 3,
          start: START_SECONDS,
        },
        events: {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          onReady: (e: any) => {
            try {
              e.target.mute();
              e.target.playVideo();
            } catch {
              /* ignore */
            }
          },
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          onStateChange: (e: any) => {
            if (e.data === YT.PlayerState.ENDED) {
              try {
                e.target.seekTo(START_SECONDS);
                e.target.playVideo();
              } catch {
                /* ignore */
              }
            }
          },
        },
      });

      iv = setInterval(() => {
        try {
          const t = player?.getCurrentTime ? player.getCurrentTime() : 0;
          // Real playback has started (advanced past the seek point) → reveal.
          if (t >= START_SECONDS + 0.4) setRevealed(true);
          if (t >= START_SECONDS + LOOP_SECONDS) player.seekTo(START_SECONDS);
        } catch {
          /* ignore */
        }
      }, 300);
    });

    return () => {
      alive = false;
      if (iv) clearInterval(iv);
      try {
        player?.destroy?.();
      } catch {
        /* ignore */
      }
      setRevealed(false);
    };
  }, [yt]);

  return (
    <section ref={sectionRef} className="relative flex min-h-[72vh] items-end overflow-hidden">
      <div ref={mediaRef} className="absolute inset-0 overflow-hidden will-change-transform">
        {yt && (
          <div
            key={yt}
            className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2"
            style={{
              width: "100vw",
              height: "56.25vw",
              minWidth: "177.78vh",
              minHeight: "100vh",
            }}
          >
            <div id="hero-yt" className="h-full w-full" />
          </div>
        )}

        {poster && (
          // Sharp poster on top; fades out only once real frames are playing,
          // so the player's grey buffering state is never seen.
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={poster}
            alt=""
            className="pointer-events-none absolute inset-0 h-full w-full object-cover transition-opacity duration-1000"
            style={{ opacity: revealed ? 0 : 1 }}
            onError={(e) => {
              if (fallbackPoster && e.currentTarget.src !== fallbackPoster) {
                e.currentTarget.src = fallbackPoster;
              }
            }}
          />
        )}
      </div>

      {/* Cinematic veils over the backdrop */}
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-bg via-bg/40 to-bg/30" />
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-bg/80 via-transparent to-transparent" />
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

      {/* Scroll cue — fades out as soon as the user scrolls */}
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
