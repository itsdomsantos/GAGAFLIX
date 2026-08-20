export type VideoType = "live" | "mv" | "interview" | "fashion" | "doc";

export interface Era {
  slug: string;
  name: string;
  years: string;
  description: string;
  accent: string;
  image_url: string | null;
  /** Logo/lettering da era (PNG transparente) — substitui o nome em texto quando existe. */
  logo_url: string | null;
  sort: number;
}

export interface Video {
  id: string;
  title: string;
  url: string;
  type: VideoType;
  era_slug: string | null;
  event: string | null;
  date: string | null;
  thumbnail_url: string | null;
  /** A dedicated 4:5 cover for the homepage "Featured" poster row. */
  poster_url: string | null;
  featured: boolean;
  /** The single video shown as the big homepage hero banner. At most one is true. */
  is_hero: boolean;
  /** Optional link to a concert tour (the setlist references videos by id). */
  tour_slug: string | null;
  /** Set when the link checker found the source gone — hidden from the public site, pending review. */
  unavailable_since: string | null;
  unavailable_reason: string | null;
  last_checked: string | null;
  created_at: string;
}

export interface TimelineMoment {
  id: string;
  date: string;
  title: string;
  body: string | null;
  era_slug: string | null;
  image_url: string | null;
}

/**
 * A movie shown as a 4:5 poster card that links out to a subscription
 * player (Netflix, Disney+, Prime…). Not hosted here, not tied to any era.
 */
export interface Movie {
  id: string;
  title: string;
  subtitle: string | null;
  /** The 4:5 cover image (a pasted URL). */
  cover_url: string | null;
  /** Where the poster links to — the film on its streaming service. */
  link: string | null;
  sort: number;
  created_at: string;
}

/** One headline fact shown in a tour's stats grid (e.g. "Shows" → "20"). */
export interface TourStat {
  label: string;
  value: string;
}

/**
 * A Lady Gaga concert tour. Where Eras organise the catalogue by video TYPE,
 * a Tour organises it by the CHRONOLOGY of the show — its setlist. Opening a
 * tour re-themes the whole page in its accent colour.
 */
export interface Tour {
  slug: string;
  name: string;
  years: string;
  /** A short punchy line under the title. */
  tagline: string | null;
  description: string;
  accent: string;
  /** 4:5 poster / symbol used in the grid and selector. */
  poster_url: string | null;
  /** Wide image behind the hero and page background. */
  backdrop_url: string | null;
  /** Transparent PNG lettering that replaces the text title when present. */
  logo_url: string | null;
  /** Optional link to the era this tour belongs to. */
  era_slug: string | null;
  /** Headline facts (shows, continents, costume changes, gross…). */
  stats: TourStat[];
  sort: number;
}

/**
 * One line of a tour's setlist, in the exact order it was performed. When
 * `video_id` points at a video, the row is clickable and opens that
 * performance; otherwise the song shows greyed, awaiting a clip.
 */
export interface TourSong {
  id: string;
  tour_slug: string;
  position: number;
  song: string;
  /** Optional label — an act name, "interlude", "acoustic"… */
  note: string | null;
  video_id: string | null;
}

export const VIDEO_TYPES: VideoType[] = ["live", "mv", "interview", "fashion", "doc"];

export const VIDEO_TYPE_LABELS: Record<VideoType, string> = {
  live: "Live Performances",
  mv: "Music Videos",
  interview: "Interviews",
  fashion: "Fashion",
  doc: "Docs & Extras",
};
