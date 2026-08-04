import { NextResponse } from "next/server";
import { autoThumbnail, parseSource } from "@/lib/player";

export const dynamic = "force-dynamic";

/**
 * Busca título + thumbnail de um link, no servidor (sem CORS, sem chave).
 * Usa o oEmbed público do YouTube/Vimeo/Dailymotion. Alimenta o /admin/import.
 */
export async function GET(request: Request) {
  const url = new URL(request.url).searchParams.get("url")?.trim();
  if (!url) {
    return NextResponse.json({ ok: false, error: "missing url" }, { status: 400 });
  }

  const source = parseSource(url);
  const endpoint = oembedEndpoint(source.kind, url);
  const fallbackThumb = autoThumbnail({ url, thumbnail_url: null });

  if (!endpoint) {
    // Fonte sem oEmbed: devolve o que der para o utilizador completar à mão.
    return NextResponse.json({
      ok: true,
      kind: source.kind,
      title: null,
      thumbnail: fallbackThumb,
      author: null,
    });
  }

  try {
    const res = await fetch(endpoint, { headers: { accept: "application/json" } });
    if (!res.ok) throw new Error(`oembed ${res.status}`);
    const data = (await res.json()) as {
      title?: string;
      thumbnail_url?: string;
      author_name?: string;
    };
    return NextResponse.json({
      ok: true,
      kind: source.kind,
      title: data.title ?? null,
      thumbnail: fallbackThumb ?? data.thumbnail_url ?? null,
      author: data.author_name ?? null,
    });
  } catch {
    return NextResponse.json({
      ok: true,
      kind: source.kind,
      title: null,
      thumbnail: fallbackThumb,
      author: null,
    });
  }
}

function oembedEndpoint(kind: string, url: string): string | null {
  const enc = encodeURIComponent(url);
  switch (kind) {
    case "youtube":
      return `https://www.youtube.com/oembed?url=${enc}&format=json`;
    case "vimeo":
      return `https://vimeo.com/api/oembed.json?url=${enc}`;
    case "dailymotion":
      return `https://www.dailymotion.com/services/oembed?format=json&url=${enc}`;
    default:
      return null;
  }
}
