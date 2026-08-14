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
  featured: boolean;
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

/** Curated 4:5 poster cards on the homepage. Not tied to any era. */
export type PosterSection = "featured" | "movies";

export interface Poster {
  id: string;
  section: PosterSection;
  title: string;
  subtitle: string | null;
  /** The 4:5 cover image (a pasted URL). */
  cover_url: string | null;
  /** Optional destination — external (Netflix, trailer…) or internal (/watch/…). */
  link: string | null;
  sort: number;
  created_at: string;
}

export const POSTER_SECTIONS: PosterSection[] = ["featured", "movies"];

export const POSTER_SECTION_LABELS: Record<PosterSection, string> = {
  featured: "Featured",
  movies: "Movies",
};

export const VIDEO_TYPES: VideoType[] = ["live", "mv", "interview", "fashion", "doc"];

export const VIDEO_TYPE_LABELS: Record<VideoType, string> = {
  live: "Live Performances",
  mv: "Music Videos",
  interview: "Interviews",
  fashion: "Fashion",
  doc: "Docs & Extras",
};
