export type VideoType = "live" | "mv" | "interview" | "fashion" | "doc";

export interface Era {
  slug: string;
  name: string;
  years: string;
  description: string;
  accent: string;
  image_url: string | null;
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

export const VIDEO_TYPES: VideoType[] = ["live", "mv", "interview", "fashion", "doc"];

export const VIDEO_TYPE_LABELS: Record<VideoType, string> = {
  live: "Live Performances",
  mv: "Music Videos",
  interview: "Interviews",
  fashion: "Fashion",
  doc: "Docs & Extras",
};
