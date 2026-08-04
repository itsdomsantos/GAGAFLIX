import type { Video } from "./types";

export type SourceKind =
  | "youtube"
  | "vimeo"
  | "dailymotion"
  | "twitter"
  | "gdrive"
  | "streamable"
  | "archive"
  | "facebook"
  | "file"
  | "embed";

export interface ParsedSource {
  kind: SourceKind;
  id: string | null;
  url: string;
}

export function youtubeId(url: string): string | null {
  const patterns = [
    /youtu\.be\/([\w-]{6,})/,
    /youtube\.com\/(?:watch\?(?:.*&)?v=|embed\/|shorts\/|live\/)([\w-]{6,})/,
  ];
  for (const p of patterns) {
    const m = url.match(p);
    if (m) return m[1];
  }
  return null;
}

export function parseSource(url: string): ParsedSource {
  const u = url.trim();

  const yt = youtubeId(u);
  if (yt) return { kind: "youtube", id: yt, url: u };

  const vimeo = u.match(/vimeo\.com\/(?:video\/)?(\d+)/);
  if (vimeo) return { kind: "vimeo", id: vimeo[1], url: u };

  const dm = u.match(/dailymotion\.com\/(?:video|embed\/video)\/([\w]+)/);
  if (dm) return { kind: "dailymotion", id: dm[1], url: u };

  const dmShort = u.match(/dai\.ly\/([\w]+)/);
  if (dmShort) return { kind: "dailymotion", id: dmShort[1], url: u };

  const tw = u.match(/(?:twitter\.com|x\.com)\/\w+\/status\/(\d+)/);
  if (tw) return { kind: "twitter", id: tw[1], url: u };

  // Google Drive — ótimo para conteúdo raro alojado por fãs
  const gd =
    u.match(/drive\.google\.com\/file\/d\/([\w-]+)/) ||
    u.match(/drive\.google\.com\/open\?id=([\w-]+)/) ||
    u.match(/drive\.google\.com\/uc\?(?:.*&)?id=([\w-]+)/);
  if (gd) return { kind: "gdrive", id: gd[1], url: u };

  const st = u.match(/streamable\.com\/(?:e\/)?([\w]+)/);
  if (st) return { kind: "streamable", id: st[1], url: u };

  const ar = u.match(/archive\.org\/(?:details|embed)\/([^/?#]+)/);
  if (ar) return { kind: "archive", id: ar[1], url: u };

  if (/facebook\.com\/.+\/videos\/|fb\.watch\//.test(u)) {
    return { kind: "facebook", id: null, url: u };
  }

  if (/\.(mp4|webm|ogv|m3u8|mov|mkv)(\?.*)?$/i.test(u)) {
    return { kind: "file", id: null, url: u };
  }

  return { kind: "embed", id: null, url: u };
}

/** Best-effort thumbnail when the admin didn't set one. */
export function autoThumbnail(video: Pick<Video, "url" | "thumbnail_url">): string | null {
  if (video.thumbnail_url) return video.thumbnail_url;
  const yt = youtubeId(video.url);
  if (yt) return `https://i.ytimg.com/vi/${yt}/hqdefault.jpg`;
  return null;
}

/** Higher-res variant for the homepage hero. */
export function heroThumbnail(video: Pick<Video, "url" | "thumbnail_url">): string | null {
  if (video.thumbnail_url) return video.thumbnail_url;
  const yt = youtubeId(video.url);
  if (yt) return `https://i.ytimg.com/vi/${yt}/maxresdefault.jpg`;
  return null;
}
