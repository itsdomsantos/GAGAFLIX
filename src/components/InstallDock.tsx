"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import {
  canPromptInstall,
  isIOS,
  isInstalled,
  promptInstall,
  registerServiceWorker,
  subscribe,
} from "@/lib/install";

/** Remembers we've already shown the one-time "shout" so we never nag again. */
const SEEN_KEY = "gf-a2hs-seen";
/** How long the expanded "Get the app" pill stays out before it docks small. */
const SHOUT_MS = 5000;

function DownloadIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M12 3v11m0 0 4-4m-4 4-4-4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M4 17v2a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

/**
 * A discreet "Add to Home Screen" dock that lives just left of the music
 * button. On the first eligible visit it shouts once — an expanded "Get the
 * app" pill for 5s — then shrinks into a small, permanent icon so it stays
 * findable without ever nagging. Android taps open the native install prompt;
 * iOS taps open the manual Share → "Add to Home Screen" instructions.
 */
export default function InstallDock() {
  const pathname = usePathname();
  const [, force] = useState(0);
  const [phase, setPhase] = useState<"expanded" | "collapsed" | null>(null);
  const [sheet, setSheet] = useState(false);
  const started = useRef(false);

  useEffect(() => subscribe(() => force((n) => n + 1)), []);
  useEffect(() => registerServiceWorker(), []);

  const eligible =
    typeof window !== "undefined" && !isInstalled() && (canPromptInstall() || isIOS());

  useEffect(() => {
    if (!eligible || started.current) return;
    started.current = true;
    let seen = false;
    try {
      seen = localStorage.getItem(SEEN_KEY) === "1";
    } catch {
      /* private mode — just treat as unseen */
    }
    if (seen) {
      setPhase("collapsed");
      return;
    }
    setPhase("expanded");
    const t = setTimeout(() => {
      setPhase("collapsed");
      try {
        localStorage.setItem(SEEN_KEY, "1");
      } catch {
        /* ignore */
      }
    }, SHOUT_MS);
    return () => clearTimeout(t);
  }, [eligible]);

  if (pathname.startsWith("/admin")) return null;
  if (!eligible || !phase) return null;

  async function handleInstall() {
    if (canPromptInstall()) {
      await promptInstall();
    } else if (isIOS()) {
      setSheet(true);
    }
  }

  function collapse() {
    setPhase("collapsed");
    try {
      localStorage.setItem(SEEN_KEY, "1");
    } catch {
      /* ignore */
    }
  }

  return (
    <>
      <div className="fixed bottom-[5.375rem] right-[9.5rem] z-50 md:bottom-[1.875rem] md:right-[10rem]">
        {phase === "expanded" ? (
          <div className="a2hs-in flex h-11 items-center gap-1 rounded-full border border-line bg-surface/95 pl-3 pr-1 shadow-[0_6px_24px_-8px_rgba(0,0,0,0.7)] backdrop-blur">
            <button
              onClick={handleInstall}
              className="flex items-center gap-2 whitespace-nowrap text-sm font-semibold text-text"
            >
              <span className="text-accent">
                <DownloadIcon />
              </span>
              Get the app
            </button>
            <button
              onClick={collapse}
              aria-label="Dismiss"
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-muted transition-colors hover:bg-surface-2 hover:text-text"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <path d="M6 6l12 12M18 6 6 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              </svg>
            </button>
          </div>
        ) : (
          <button
            onClick={handleInstall}
            aria-label="Get the app — add GAGAFLIX to your home screen"
            title="Get the app"
            className="flex h-11 w-11 items-center justify-center rounded-full border border-line bg-surface/95 text-text shadow-[0_6px_24px_-8px_rgba(0,0,0,0.7)] backdrop-blur transition-colors hover:border-accent hover:text-accent"
          >
            <DownloadIcon />
          </button>
        )}
      </div>

      {sheet && (
        <div
          className="fixed inset-0 z-[60] flex items-end justify-center bg-black/60 p-4 backdrop-blur-sm"
          onClick={() => setSheet(false)}
        >
          <div
            className="a2hs-in w-full max-w-sm rounded-2xl border border-line bg-surface p-5 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-4 flex items-center gap-3">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/icon-192.png" alt="" className="h-12 w-12 rounded-xl" />
              <div>
                <p className="font-display text-xl chrome-text leading-none">Get GAGAFLIX</p>
                <p className="mt-1 text-xs text-muted">Add it to your Home Screen — opens full-screen, like an app.</p>
              </div>
            </div>
            <ol className="space-y-3 text-sm">
              <li className="flex items-center gap-3">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-accent/20 text-xs font-bold text-accent">1</span>
                <span className="flex items-center gap-1">
                  Tap the Share button
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true" className="text-accent">
                    <path d="M12 4v11" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                    <path d="m8.5 7.5 3.5-3.5 3.5 3.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    <path d="M6 12v6a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2v-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                  </svg>
                  in Safari
                </span>
              </li>
              <li className="flex items-center gap-3">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-accent/20 text-xs font-bold text-accent">2</span>
                <span>Choose <strong>“Add to Home Screen”</strong></span>
              </li>
              <li className="flex items-center gap-3">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-accent/20 text-xs font-bold text-accent">3</span>
                <span>Tap <strong>“Add”</strong> — done. 🐾</span>
              </li>
            </ol>
            <button
              onClick={() => setSheet(false)}
              className="mt-5 w-full rounded-md bg-accent py-2.5 text-sm font-semibold text-black transition-transform hover:scale-[1.02]"
            >
              Got it
            </button>
          </div>
        </div>
      )}
    </>
  );
}
