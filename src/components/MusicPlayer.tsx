"use client";

import { usePathname } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { autoThumbnail, youtubeId } from "@/lib/player";
import { seedVideos } from "@/lib/seed";
import { getBrowserClient, hasSupabase } from "@/lib/supabase";
import type { Video } from "@/lib/types";

interface Track {
  id: string;
  title: string;
  ytId: string;
  cover: string | null;
  year: string | null;
}

/* eslint-disable @typescript-eslint/no-explicit-any */
declare global {
  interface Window {
    YT?: any;
    onYouTubeIframeAPIReady?: () => void;
  }
}

/** Loads the YouTube IFrame API once and resolves with window.YT. */
function loadYT(): Promise<any> {
  return new Promise((resolve) => {
    if (window.YT?.Player) return resolve(window.YT);
    if (!document.getElementById("gf-yt-api")) {
      const tag = document.createElement("script");
      tag.id = "gf-yt-api";
      tag.src = "https://www.youtube.com/iframe_api";
      document.body.appendChild(tag);
    }
    const prev = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => {
      prev?.();
      resolve(window.YT);
    };
  });
}

/**
 * Floating music player. Plays the audio of the site's Music Videos (YouTube
 * only) through a hidden player, and shows a spinning vinyl with the track's
 * cover in the centre. Keeps playing while the visitor browses the site.
 */
export default function MusicPlayer() {
  const pathname = usePathname();
  const [tracks, setTracks] = useState<Track[]>([]);
  const [current, setCurrent] = useState<number | null>(null);
  const [playing, setPlaying] = useState(false);
  const [open, setOpen] = useState(false);

  const playerRef = useRef<any>(null);
  const tracksRef = useRef<Track[]>([]);
  const currentRef = useRef<number | null>(null);
  tracksRef.current = tracks;
  currentRef.current = current;

  // Build the track list from Music Videos (YouTube sources only).
  useEffect(() => {
    let alive = true;
    (async () => {
      let vids: Video[] = [];
      if (hasSupabase) {
        const { data } = await getBrowserClient()
          .from("videos")
          .select("*")
          .eq("type", "mv")
          .order("date", { ascending: false });
        vids = (data as Video[]) ?? [];
      } else {
        vids = seedVideos.filter((v) => v.type === "mv");
      }
      if (!alive) return;
      const built = vids
        .map((v) => ({ v, ytId: youtubeId(v.url) }))
        .filter((x): x is { v: Video; ytId: string } => Boolean(x.ytId))
        .map(({ v, ytId }) => ({
          id: v.id,
          title: v.title,
          ytId,
          cover: v.poster_url || autoThumbnail(v),
          year: v.date ? v.date.slice(0, 4) : null,
        }));
      setTracks(built);
    })();
    return () => {
      alive = false;
    };
  }, []);

  const playAt = useCallback((i: number) => {
    const t = tracksRef.current;
    if (!t[i] || !playerRef.current?.loadVideoById) return;
    setCurrent(i);
    setOpen(true);
    playerRef.current.loadVideoById(t[i].ytId);
  }, []);

  // Create the hidden YouTube player once the API is ready.
  useEffect(() => {
    let alive = true;
    loadYT().then((YT) => {
      if (!alive) return;
      playerRef.current = new YT.Player("gf-yt-audio", {
        height: "1",
        width: "1",
        playerVars: { playsinline: 1 },
        events: {
          onStateChange: (e: any) => {
            if (e.data === YT.PlayerState.PLAYING) setPlaying(true);
            else if (e.data === YT.PlayerState.PAUSED) setPlaying(false);
            else if (e.data === YT.PlayerState.ENDED) {
              const t = tracksRef.current;
              const c = currentRef.current;
              if (c != null && t.length > 0) playAt((c + 1) % t.length);
            }
          },
        },
      });
    });
    return () => {
      alive = false;
    };
  }, [playAt]);

  const toggle = useCallback(() => {
    const p = playerRef.current;
    if (!p?.getPlayerState) return;
    try {
      if (p.getPlayerState() === 1) p.pauseVideo();
      else p.playVideo();
    } catch {
      /* player not ready */
    }
  }, []);

  const step = useCallback(
    (delta: number) => {
      const t = tracksRef.current;
      const c = currentRef.current;
      if (t.length === 0) return;
      const base = c ?? 0;
      playAt((base + delta + t.length) % t.length);
    },
    [playAt],
  );

  const track = current != null ? tracks[current] : null;

  // The hidden player must stay mounted everywhere; only the UI hides on /admin.
  const showUI = !pathname.startsWith("/admin") && tracks.length > 0;

  return (
    <>
      {/* Hidden audio player — kept off-screen but present so audio persists. */}
      <div aria-hidden className="pointer-events-none fixed bottom-0 left-0 h-px w-px overflow-hidden opacity-0">
        <div id="gf-yt-audio" />
      </div>

      {showUI && (
        <>
          <button
            onClick={() => setOpen((o) => !o)}
            aria-label={open ? "Close music" : "Open music"}
            className="fixed bottom-20 left-4 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-accent text-black shadow-[0_0_28px_-4px_var(--accent)] transition-transform hover:scale-105 md:bottom-6 md:left-6"
          >
            {track ? (
              <Vinyl cover={track.cover} playing={playing} size={56} />
            ) : (
              <svg width="26" height="26" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                <path d="M9 17.5a2.5 2.5 0 1 1-2.5-2.5c.4 0 .77.09 1.1.24V6l9-2v9.5a2.5 2.5 0 1 1-2.5-2.5c.4 0 .77.09 1.1.24V6.3L9 7.7v9.8Z" />
              </svg>
            )}
          </button>

          {open && (
            <div className="fixed bottom-36 left-4 z-50 flex max-h-[70vh] w-[calc(100vw-2rem)] flex-col overflow-hidden rounded-xl border border-line bg-surface shadow-2xl sm:left-6 sm:w-80 md:bottom-24">
              <header className="flex items-center gap-3 border-b border-line px-4 py-3">
                <span className="flex h-8 w-8 items-center justify-center">
                  <Vinyl cover={track?.cover ?? null} playing={playing} size={32} />
                </span>
                <div className="min-w-0">
                  <p className="font-display text-lg leading-none chrome-text">Gaga Radio</p>
                  <p className="text-[11px] text-muted">music videos, audio only</p>
                </div>
                <button
                  onClick={() => setOpen(false)}
                  aria-label="Close"
                  className="ml-auto text-muted transition-colors hover:text-text"
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                    <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                  </svg>
                </button>
              </header>

              {track && (
                <div className="flex items-center gap-3 border-b border-line px-4 py-3">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{track.title}</p>
                    <p className="text-xs text-muted">{track.year ?? "Music video"}</p>
                  </div>
                  <button onClick={() => step(-1)} aria-label="Previous" className="text-muted transition-colors hover:text-text">
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                      <path d="M7 6h2v12H7zM20 6v12l-9-6z" />
                    </svg>
                  </button>
                  <button
                    onClick={toggle}
                    aria-label={playing ? "Pause" : "Play"}
                    className="flex h-10 w-10 items-center justify-center rounded-full bg-accent text-black transition-transform hover:scale-105"
                  >
                    {playing ? (
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                        <path d="M7 5h4v14H7zM13 5h4v14h-4z" />
                      </svg>
                    ) : (
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                        <path d="M8 5v14l11-7L8 5Z" />
                      </svg>
                    )}
                  </button>
                  <button onClick={() => step(1)} aria-label="Next" className="text-muted transition-colors hover:text-text">
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                      <path d="M15 6h2v12h-2zM4 6v12l9-6z" />
                    </svg>
                  </button>
                </div>
              )}

              <ul className="flex-1 overflow-y-auto py-1">
                {tracks.map((t, i) => (
                  <li key={t.id}>
                    <button
                      onClick={() => playAt(i)}
                      className={`flex w-full items-center gap-3 px-4 py-2 text-left transition-colors hover:bg-surface-2 ${
                        i === current ? "bg-surface-2" : ""
                      }`}
                    >
                      <span className="h-9 w-9 shrink-0 overflow-hidden rounded bg-surface-2">
                        {t.cover && (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={t.cover} alt="" loading="lazy" className="h-full w-full object-cover" />
                        )}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className={`block truncate text-sm ${i === current ? "text-accent" : ""}`}>
                          {t.title}
                        </span>
                        {t.year && <span className="block text-xs text-muted">{t.year}</span>}
                      </span>
                      {i === current && playing && <Bars />}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </>
      )}
    </>
  );
}

/** The spinning record: grooves + centre cover + a fixed sheen. */
function Vinyl({ cover, playing, size }: { cover: string | null; playing: boolean; size: number }) {
  return (
    <span
      className="relative block overflow-hidden rounded-full ring-1 ring-black/40"
      style={{ height: size, width: size }}
    >
      <span
        className="vinyl-face vinyl-spin absolute inset-0 rounded-full"
        style={{ animationPlayState: playing ? "running" : "paused" }}
      >
        {cover && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={cover}
            alt=""
            className="absolute left-1/2 top-1/2 h-1/2 w-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full object-cover"
          />
        )}
        {/* Centre spindle hole */}
        <span className="absolute left-1/2 top-1/2 h-1 w-1 -translate-x-1/2 -translate-y-1/2 rounded-full bg-bg ring-1 ring-black/50" />
      </span>
      <span className="vinyl-sheen pointer-events-none absolute inset-0 rounded-full" />
    </span>
  );
}

/** Little animated equaliser bars on the now-playing row. */
function Bars() {
  return (
    <span className="flex items-end gap-[2px]" aria-hidden>
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className="w-[3px] rounded-full bg-accent"
          style={{
            height: 12,
            animation: "hero-scroll-bounce 0.9s ease-in-out infinite",
            animationDelay: `${i * 0.15}s`,
          }}
        />
      ))}
    </span>
  );
}
