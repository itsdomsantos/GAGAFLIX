"use client";

import { useEffect, useRef } from "react";
import { parseSource } from "@/lib/player";

/**
 * O Player Camaleão: olha para o link do vídeo e carrega o player certo —
 * YouTube, Vimeo, Dailymotion, X/Twitter, Google Drive, Streamable, Archive.org,
 * Facebook, ficheiro direto (MP4/HLS) ou iframe genérico.
 */
export default function Player({ url, title }: { url: string; title: string }) {
  const source = parseSource(url);

  switch (source.kind) {
    case "youtube":
      return (
        <Frame
        src={`https://www.youtube-nocookie.com/embed/${source.id}?rel=0&color=white&autoplay=1&mute=0&playsinline=1`}
          title={title}
        />
      );
    case "vimeo":
      return <Frame src={`https://player.vimeo.com/video/${source.id}`} title={title} />;
    case "dailymotion":
      return (
        <Frame src={`https://www.dailymotion.com/embed/video/${source.id}`} title={title} />
      );
    case "gdrive":
      return (
        <Frame src={`https://drive.google.com/file/d/${source.id}/preview`} title={title} />
      );
    case "streamable":
      return <Frame src={`https://streamable.com/e/${source.id}`} title={title} />;
    case "archive":
      return <Frame src={`https://archive.org/embed/${source.id}`} title={title} />;
    case "facebook":
      return (
        <Frame
          src={`https://www.facebook.com/plugins/video.php?href=${encodeURIComponent(
            source.url,
          )}&show_text=false`}
          title={title}
        />
      );
    case "twitter":
      return (
        <div className="mx-auto max-w-xl overflow-hidden rounded-lg ring-1 ring-line">
          <iframe
            src={`https://platform.twitter.com/embed/Tweet.html?id=${source.id}&theme=dark`}
            title={title}
            className="h-[560px] w-full"
            allow="autoplay; encrypted-media; picture-in-picture"
          />
        </div>
      );
    case "file":
      return <FilePlayer url={source.url} />;
    default:
      return <Frame src={source.url} title={title} />;
  }
}

function Frame({ src, title }: { src: string; title: string }) {
  return (
    <div className="relative aspect-video w-full overflow-hidden rounded-lg bg-black ring-1 ring-line">
      <iframe
        src={src}
        title={title}
        className="absolute inset-0 h-full w-full"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share; fullscreen"
        allowFullScreen
      />
    </div>
  );
}

/** Player próprio do GAGAFLIX para links diretos — suporta MP4/WebM e HLS (.m3u8). */
function FilePlayer({ url }: { url: string }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const isHls = /\.m3u8(\?.*)?$/i.test(url);

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !isHls) return;

    // Safari toca HLS nativamente; nos restantes browsers usamos hls.js.
    if (video.canPlayType("application/vnd.apple.mpegurl")) {
      video.src = url;
      return;
    }

    let hls: { destroy: () => void } | null = null;
    let cancelled = false;
    import("hls.js").then(({ default: Hls }) => {
      if (cancelled || !Hls.isSupported()) return;
      const instance = new Hls();
      instance.loadSource(url);
      instance.attachMedia(video);
      hls = instance;
    });
    return () => {
      cancelled = true;
      hls?.destroy();
    };
  }, [url, isHls]);

  return (
    <video
      ref={videoRef}
      src={isHls ? undefined : url}
      controls
      playsInline
      className="aspect-video w-full rounded-lg bg-black ring-1 ring-line"
    />
  );
}
