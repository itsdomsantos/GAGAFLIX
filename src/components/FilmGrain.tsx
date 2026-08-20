/**
 * A subtle, breathing film-grain overlay. Drop it inside a `relative`,
 * `overflow-hidden` hero section — it sits above the backdrop and below the
 * text (by DOM order), and is purely decorative. Freezes with reduced-motion.
 */
export default function FilmGrain() {
  return <div className="film-grain" aria-hidden="true" />;
}
