/* eslint-disable @typescript-eslint/no-explicit-any */
declare global {
  interface Window {
    YT?: any;
    onYouTubeIframeAPIReady?: () => void;
  }
}

/**
 * Loads the YouTube IFrame Player API once (idempotent) and resolves with
 * window.YT. Multiple callers chain the ready callback safely.
 */
export function loadYouTubeAPI(): Promise<any> {
  return new Promise((resolve) => {
    if (typeof window === "undefined") return;
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
