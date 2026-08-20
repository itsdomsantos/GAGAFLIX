/**
 * The nav pages the owner can hide from the menus in /admin/pages.
 * `key` is what gets stored in site_settings → { hidden: [key, …] }.
 * Home and Search are always available and are not listed here.
 */
export interface TogglePage {
  key: string;
  label: string;
  href: string;
}

export const TOGGLE_PAGES: TogglePage[] = [
  { key: "eras", label: "Eras", href: "/eras" },
  { key: "tours", label: "Tours", href: "/tours" },
  { key: "timeline", label: "Timeline", href: "/timeline" },
  { key: "news", label: "News", href: "/news" },
];
