import fs from "node:fs";
import path from "node:path";
import { seedEras, seedSetlist, seedTimeline, seedTours, seedVideos } from "./seed";
import { getServerClient, hasSupabase } from "./supabase";
import type { Era, Movie, TimelineMoment, Tour, TourSong, Video } from "./types";

const IMAGE_EXTS = ["png", "jpg", "jpeg", "webp"];

/** Procura um ficheiro local em public/ (ex.: eras/mayhem → /eras/mayhem.png). */
function localAsset(rel: string): string | null {
  for (const ext of IMAGE_EXTS) {
    if (fs.existsSync(path.join(process.cwd(), "public", `${rel}.${ext}`))) {
      return `/${rel}.${ext}`;
    }
  }
  return null;
}

/**
 * Arte automática por convenção de nomes: se a era não tiver imagens definidas
 * no admin, usa public/eras/<slug>.png (círculo) e public/eras/logos/<slug>.png (logo).
 */
function withLocalArt(eras: Era[]): Era[] {
  return eras.map((e) => ({
    ...e,
    image_url: e.image_url ?? localAsset(`eras/${e.slug}`),
    logo_url: e.logo_url ?? localAsset(`eras/logos/${e.slug}`),
  }));
}

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
  if (!hasSupabase) return withLocalArt(seedEras);
  const eras = await fromSupabase(async () => {
    const { data, error } = await getServerClient()
      .from("eras")
      .select("*")
      .order("sort", { ascending: true });
    if (error) throw error;
    return (data as Era[]) ?? [];
  }, seedEras);
  return withLocalArt(eras);
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
    // Hide videos the link checker flagged as gone (pending review in /admin/alerts).
    return ((data as Video[]) ?? []).filter((v) => !v.unavailable_since);
  }, seedVideos);
}

export async function getVideo(id: string): Promise<Video | null> {
  const videos = await getVideos();
  return videos.find((v) => v.id === id) ?? null;
}

/**
 * O destaque do hero: o vídeo escolhido explicitamente (is_hero); se nenhum
 * estiver escolhido, cai no featured mais recente e, por fim, no mais novo.
 */
export async function getFeatured(): Promise<Video | null> {
  const videos = await getVideos();
  if (videos.length === 0) return null;
  return videos.find((v) => v.is_hero) ?? videos.find((v) => v.featured) ?? videos[0];
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

/**
 * Nav pages the owner has hidden (returns their keys, e.g. ["tours","news"]).
 * Stored under the "nav" key of site_settings; defaults to none hidden.
 */
export async function getHiddenPages(): Promise<string[]> {
  if (!hasSupabase) return [];
  return fromSupabase(async () => {
    const { data, error } = await getServerClient()
      .from("site_settings")
      .select("value")
      .eq("key", "nav")
      .maybeSingle();
    if (error) throw error;
    const hidden = (data?.value as { hidden?: string[] } | null)?.hidden;
    return Array.isArray(hidden) ? hidden : [];
  }, []);
}

export async function getTours(): Promise<Tour[]> {
  if (!hasSupabase) return seedTours;
  return fromSupabase(async () => {
    const { data, error } = await getServerClient()
      .from("tours")
      .select("*")
      .order("sort", { ascending: true });
    if (error) throw error;
    return ((data as Tour[]) ?? []).map((t) => ({ ...t, stats: t.stats ?? [] }));
  }, seedTours);
}

export async function getTour(slug: string): Promise<Tour | null> {
  const tours = await getTours();
  return tours.find((t) => t.slug === slug) ?? null;
}

/** A tour's setlist, ordered by position. */
export async function getSetlist(tourSlug: string): Promise<TourSong[]> {
  if (!hasSupabase) {
    return seedSetlist.filter((s) => s.tour_slug === tourSlug);
  }
  return fromSupabase(async () => {
    const { data, error } = await getServerClient()
      .from("tour_setlist")
      .select("*")
      .eq("tour_slug", tourSlug)
      .order("position", { ascending: true });
    if (error) throw error;
    return (data as TourSong[]) ?? [];
  }, seedSetlist.filter((s) => s.tour_slug === tourSlug));
}

/** Movie poster cards linking out to streaming services (empty until you add some in /admin). */
export async function getMovies(): Promise<Movie[]> {
  if (!hasSupabase) return [];
  return fromSupabase(async () => {
    const { data, error } = await getServerClient()
      .from("movies")
      .select("*")
      .order("sort", { ascending: true })
      .order("created_at", { ascending: false });
    if (error) throw error;
    return (data as Movie[]) ?? [];
  }, []);
}
