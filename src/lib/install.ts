"use client";

/**
 * Shared "Add to Home Screen" state.
 *
 * Chrome/Android fire a one-off `beforeinstallprompt` event we must capture the
 * moment it arrives (it never fires twice), so this module attaches its listener
 * at import time and keeps the deferred event in a tiny singleton that any
 * component can read/subscribe to. iOS Safari has no such event — there we can
 * only show the manual Share → "Add to Home Screen" instructions.
 */

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type BeforeInstallPromptEvent = any;

type Listener = () => void;

let deferred: BeforeInstallPromptEvent | null = null;
let installed = false;
const listeners = new Set<Listener>();

function emit() {
  listeners.forEach((fn) => fn());
}

if (typeof window !== "undefined") {
  window.addEventListener("beforeinstallprompt", (e: Event) => {
    e.preventDefault(); // stop Chrome's default mini-infobar; we drive our own UI
    deferred = e as BeforeInstallPromptEvent;
    emit();
  });
  window.addEventListener("appinstalled", () => {
    installed = true;
    deferred = null;
    emit();
  });
}

export function subscribe(fn: Listener): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

/** True on iOS/iPadOS Safari, where installs are manual (Share sheet). */
export function isIOS(): boolean {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent;
  const iOSDevice = /iphone|ipad|ipod/i.test(ua);
  // iPadOS 13+ reports as "Mac"; detect it by touch support.
  const iPadOS = /macintosh/i.test(ua) && typeof document !== "undefined" && "ontouchend" in document;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (iOSDevice || iPadOS) && !(window as any).MSStream;
}

/** True when the site is already running as an installed standalone app. */
export function isStandalone(): boolean {
  if (typeof window === "undefined") return false;
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (window.navigator as any).standalone === true
  );
}

export function isInstalled(): boolean {
  return installed || isStandalone();
}

/** Chrome/Android only: a native install prompt is ready to be shown. */
export function canPromptInstall(): boolean {
  return deferred != null;
}

/** Fire the native Android install prompt. Returns true if the user accepted. */
export async function promptInstall(): Promise<boolean> {
  if (!deferred) return false;
  try {
    deferred.prompt();
    const choice = await deferred.userChoice;
    deferred = null;
    if (choice?.outcome === "accepted") installed = true;
    emit();
    return choice?.outcome === "accepted";
  } catch {
    deferred = null;
    emit();
    return false;
  }
}

/** Register the service worker (idempotent). Call once from the client. */
export function registerServiceWorker(): void {
  if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) return;
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("/sw.js").catch(() => {
      /* install just won't be available — no hard failure */
    });
  });
}
