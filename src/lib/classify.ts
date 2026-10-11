import type { TimelineMoment, VideoType } from "./types";

/**
 * Suggestions for the video inbox: a type from title keywords and an era
 * from the title (era names) or, failing that, the date. Pure functions with
 * type-only imports, so the GitHub Action scripts (plain Node) can import this
 * file directly too. These are only suggestions — you confirm them in
 * /admin/inbox before anything goes public.
 */

const TYPE_RULES: [VideoType, RegExp][] = [
  // Order matters: the first match wins.
  ["mv", /official (music )?video|\(official|music video|lyric video|visualizer|\bmv\b/i],
  ["doc", /behind the scenes|documentary|making of|\bbts\b|trailer|teaser|featurette|five foot two|gaga chromatica ball|rehearsal/i],
  ["fashion", /vogue|met gala|red carpet|fashion|beauty|make-?up|\bgrwm\b|\blooks?\b|\boutfit|haus labs|runway/i],
  ["interview", /interview|\btalks?\b|reveals|explains|discuss|q ?& ?a|questions|podcast|conversation|in studio|reacts|press conference|\bon (her|the|why|how|being)\b/i],
  ["live", /\blive\b|performs?|performance|concert|tour|halftime|festival|coachella|\bsnl\b|saturday night live|grammys?|oscars?|vmas?|awards|acoustic|tiny desk|session|medley/i],
];

/** Best-guess video type from a title (null when nothing matches). */
export function suggestType(title: string): VideoType | null {
  for (const [type, re] of TYPE_RULES) if (re.test(title)) return type;
  return null;
}

export interface EraLike {
  slug: string;
  name: string;
}

const norm = (s: string) =>
  s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();

/**
 * Suggested era:
 *  1. an era whose name appears in the title ("Chromatica Ball…" → chromatica),
 *     longest name first so "The Fame Monster" beats "The Fame";
 *  2. otherwise the era of the latest timeline moment on or before the date.
 */
export function suggestEra(
  title: string,
  date: string | null,
  eras: EraLike[],
  moments: Pick<TimelineMoment, "date" | "era_slug">[],
): string | null {
  const t = ` ${norm(title)} `;
  const byLength = [...eras].sort((a, b) => b.name.length - a.name.length);
  for (const era of byLength) {
    // "Joker: Folie à Deux" → also match plain "Joker"
    const names = [era.name, era.name.split(":")[0]].map(norm).filter((n) => n.length >= 4);
    if (names.some((n) => t.includes(` ${n} `))) return era.slug;
  }
  if (!date) return null;
  const day = date.slice(0, 10);
  const before = moments
    .filter((m) => m.era_slug && m.date <= day)
    .sort((a, b) => b.date.localeCompare(a.date));
  return before[0]?.era_slug ?? null;
}

/** True when a title is about Lady Gaga. */
export function mentionsGaga(title: string): boolean {
  return /\bgaga\b/i.test(title);
}
