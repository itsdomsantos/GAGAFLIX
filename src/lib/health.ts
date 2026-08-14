import { parseSource } from "./player";

export type VideoHealth = "live" | "removed" | "unplayable" | "unknown";

/**
 * Checks whether a video link is still watchable, using the platform's public
 * oEmbed endpoint (no API key). We only classify sources with a reliable
 * oEmbed — YouTube, Vimeo, Dailymotion; everything else stays "unknown" and is
 * never flagged. Transient/network errors also return "unknown" so a blip
 * never hides good content.
 *
 * - live       → 200, the video plays
 * - removed    → 404, gone/deleted/private-not-found
 * - unplayable → 401/403, exists but embedding disabled or private
 */
export async function classifyVideo(url: string): Promise<VideoHealth> {
  const s = parseSource(url);
  const enc = encodeURIComponent(url);
  const endpoint =
    s.kind === "youtube"
      ? `https://www.youtube.com/oembed?format=json&url=${enc}`
      : s.kind === "vimeo"
        ? `https://vimeo.com/api/oembed.json?url=${enc}`
        : s.kind === "dailymotion"
          ? `https://www.dailymotion.com/services/oembed?format=json&url=${enc}`
          : null;

  if (!endpoint) return "unknown";

  try {
    const res = await fetch(endpoint, { headers: { accept: "application/json" } });
    if (res.ok) return "live";
    if (res.status === 404) return "removed";
    if (res.status === 401 || res.status === 403) return "unplayable";
    return "unknown";
  } catch {
    return "unknown";
  }
}
