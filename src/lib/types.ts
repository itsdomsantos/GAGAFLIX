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

export const VIDEO_TYPES: VideoType[] = ["live", "mv", "interview", "fashion", "doc"];

export const VIDEO_TYPE_LABELS: Record<VideoType, string> = {
  live: "Live Performances",
  mv: "Music Videos",
  interview: "Interviews",
  fashion: "Fashion",
  doc: "Docs & Extras",
};
