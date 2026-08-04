import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const API = "https://www.googleapis.com/youtube/v3";
const MAX_ITEMS = 300;

/**
 * Puxa todos os vídeos de uma playlist (ou dos uploads de um canal) do YouTube.
 * Precisa da variável de ambiente YOUTUBE_API_KEY (grátis, ver README).
 * Alimenta o /admin/import.
 */
export async function GET(request: Request) {
  const key = process.env.YOUTUBE_API_KEY;
  if (!key) {
    return NextResponse.json(
      {
        ok: false,
        error:
          "YouTube API key not configured. Add YOUTUBE_API_KEY on the server to import playlists.",
      },
      { status: 400 },
    );
  }

  const url = new URL(request.url).searchParams.get("url")?.trim() ?? "";
  const playlistId = await resolvePlaylistId(url, key);
  if (!playlistId) {
    return NextResponse.json(
      { ok: false, error: "Not a recognizable playlist or channel URL." },
      { status: 400 },
    );
  }

  try {
    const items: {
      url: string;
      title: string;
      thumbnail: string | null;
      date: string | null;
    }[] = [];
    let pageToken = "";

    while (items.length < MAX_ITEMS) {
      const res = await fetch(
        `${API}/playlistItems?part=snippet&maxResults=50&playlistId=${playlistId}` +
          `&pageToken=${pageToken}&key=${key}`,
      );
      if (!res.ok) {
        const body = await res.text();
        throw new Error(`playlistItems ${res.status}: ${body.slice(0, 200)}`);
      }
      const data = await res.json();
      for (const it of data.items ?? []) {
        const s = it.snippet;
        const videoId = s?.resourceId?.videoId;
        if (!videoId || s?.title === "Private video" || s?.title === "Deleted video") continue;
        items.push({
          url: `https://www.youtube.com/watch?v=${videoId}`,
          title: s.title,
          thumbnail:
            s.thumbnails?.medium?.url ?? s.thumbnails?.default?.url ?? null,
          date: s.publishedAt ? s.publishedAt.slice(0, 10) : null,
        });
      }
      pageToken = data.nextPageToken ?? "";
      if (!pageToken) break;
    }

    return NextResponse.json({ ok: true, count: items.length, items });
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : "unknown error" },
      { status: 500 },
    );
  }
}

/** Aceita URL de playlist (list=), channel id (UC…), ou @handle. */
async function resolvePlaylistId(url: string, key: string): Promise<string | null> {
  const list = url.match(/[?&]list=([\w-]+)/);
  if (list) return list[1];

  // Canal por ID → playlist de uploads (UC… → UU…)
  const channel = url.match(/youtube\.com\/channel\/(UC[\w-]+)/);
  if (channel) return "UU" + channel[1].slice(2);

  // Canal por handle (@nome) ou nome legado → resolver via API
  const handle = url.match(/youtube\.com\/@([\w.-]+)/);
  const legacy = url.match(/youtube\.com\/(?:c\/|user\/)([\w.-]+)/);
  const q = handle?.[1] ?? legacy?.[1];
  if (q) {
    try {
      const res = await fetch(
        `${API}/channels?part=contentDetails&forHandle=${encodeURIComponent(q)}&key=${key}`,
      );
      const data = await res.json();
      const uploads = data.items?.[0]?.contentDetails?.relatedPlaylists?.uploads;
      if (uploads) return uploads;
    } catch {
      /* cai no null */
    }
  }
  return null;
}
