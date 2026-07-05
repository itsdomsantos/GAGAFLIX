import { seedEras, seedTimeline, seedVideos } from "./seed";
import { getServerClient, hasSupabase } from "./supabase";
import type { Era, TimelineMoment, Video } from "./types";

/**
 * Camada de dados do site público: lê do Supabase quando está configurado,
 * caso contrário usa o conteúdo de arranque (seed) para o site funcionar já.
 */

async function fromSupabase<T>(fn: () => Promise<T>, fallback: T): Promise<T> {
  try {
    return await fn();
  } catch (err) {
    console.error("[gagaflix] Supabase indisponível, a usar seed:", err);
    return fallback;
  }
}

export async function getEras(): Promise<Era[]> {
  if (!hasSupabase) return seedEras;
  return fromSupabase(async () => {
    const { data, error } = await getServerClient()
      .from("eras")
      .select("*")
      .order("sort", { ascending: true });
    if (error) throw error;
    return (data as Era[]) ?? [];
  }, seedEras);
}

export async function getEra(slug: string): Promise<Era | null> {
  const eras = await getEras();
  return eras.find((e) => e.slug === slug) ?? null;
}

export async function getVideos(): Promise<Video[]> {
  if (!hasSupabase) return seedVideos;
  return fromSupabase(async () => {
    const { data, error } = await getServerClient()
      .from("videos")
      .select("*")
      .order("date", { ascending: false });
    if (error) throw error;
    return (data as Video[]) ?? [];
  }, seedVideos);
}

export async function getVideo(id: string): Promise<Video | null> {
  const videos = await getVideos();
  return videos.find((v) => v.id === id) ?? null;
}

/** O destaque do hero: o vídeo marcado como featured mais recente, ou o mais novo. */
export async function getFeatured(): Promise<Video | null> {
  const videos = await getVideos();
  if (videos.length === 0) return null;
  return videos.find((v) => v.featured) ?? videos[0];
}

export async function getRecent(limit = 12): Promise<Video[]> {
  const videos = await getVideos();
  return [...videos]
    .sort((a, b) => (b.created_at ?? "").localeCompare(a.created_at ?? ""))
    .slice(0, limit);
}

export async function getTimeline(): Promise<TimelineMoment[]> {
  if (!hasSupabase) return sortMoments(seedTimeline);
  return fromSupabase(async () => {
    const { data, error } = await getServerClient()
      .from("timeline_moments")
      .select("*")
      .order("date", { ascending: true });
    if (error) throw error;
    return (data as TimelineMoment[]) ?? [];
  }, sortMoments(seedTimeline));
}

function sortMoments(moments: TimelineMoment[]): TimelineMoment[] {
  return [...moments].sort((a, b) => a.date.localeCompare(b.date));
}
