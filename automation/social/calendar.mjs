/**
 * Today's Lady Gaga dates from the calendars in automation/calendar-sources.json
 * (Lady Gaga Now's LGN Calendar): anniversaries, releases, shows.
 * Reads the iCalendar export when the site offers one, otherwise the calendar's
 * page for today and each event's own share data. Every word comes from the
 * calendar entry itself — nothing is invented; an "N years ago" count is shown
 * only when the entry itself carries the original year.
 *
 * Plus automation/anniversaries.json: the LGN calendar's anniversaries with the
 * ORIGINAL year (so "17 years ago today" is right) and duplicates resolved. Live
 * LGN anniversary entries that match one of those are left to the curated list.
 */
import { readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { ROOT, opt } from "../lib.mjs";
import { articleMeta } from "./news.mjs";

const UA = "Mozilla/5.0 (compatible; GAGAFLIX-bot/1.0; +https://gagaflix.com)";

async function fetchText(url, timeout = 10000) {
  const res = await fetch(url, { headers: { "User-Agent": UA }, signal: AbortSignal.timeout(timeout) });
  if (!res.ok) throw new Error(`${res.status}`);
  return res.text();
}

const unescapeIcs = (s) => s.replace(/\\n/gi, " ").replace(/\\([,;\\])/g, "$1").replace(/\s+/g, " ").trim();
const stripHtml = (s) => s.replace(/<[^>]+>/g, " ").replace(/&nbsp;/g, " ").replace(/&amp;/g, "&").replace(/\s+/g, " ").trim();

/** iCalendar text → [{ uid, title, description, location, url, categories, start: "YYYY-MM-DD", yearly }] */
export function parseIcs(ics) {
  const unfolded = ics.replace(/\r?\n[ \t]/g, "");
  return [...unfolded.matchAll(/BEGIN:VEVENT([\s\S]*?)END:VEVENT/g)].map(([, body]) => {
    const field = (name) => body.match(new RegExp(`^${name}(?:;[^:\\n]*)?:(.*)$`, "m"))?.[1]?.trim() ?? null;
    const start = field("DTSTART") ?? "";
    return {
      uid: field("UID"),
      title: unescapeIcs(field("SUMMARY") ?? ""),
      description: stripHtml(unescapeIcs(field("DESCRIPTION") ?? "")),
      location: field("LOCATION") ? unescapeIcs(field("LOCATION")) : null,
      url: field("URL"),
      categories: (field("CATEGORIES") ?? "").split(",").map((c) => unescapeIcs(c)).filter(Boolean),
      start: start ? `${start.slice(0, 4)}-${start.slice(4, 6)}-${start.slice(6, 8)}` : null,
      yearly: /FREQ=YEARLY/i.test(field("RRULE") ?? ""),
    };
  });
}

/** The original year, when the entry says it (its start date or a year written in it). */
function originYear(ev, year) {
  const fromStart = ev.yearly && ev.start ? Number(ev.start.slice(0, 4)) : null;
  if (fromStart && fromStart < year) return fromStart;
  const m = `${ev.title} ${ev.description}`.match(/\b(19[89]\d|20[0-4]\d)\b/);
  return m && Number(m[1]) < year ? Number(m[1]) : null;
}

const isAnniversary = (ev) =>
  ev.yearly || /anniversar/i.test(ev.title) || ev.categories.some((c) => /anniversar/i.test(c));

/** Family/friends' birthdays live in the calendar too — only Gaga's own make a post. */
const relevant = (ev) => ev.title && (!/birthday/i.test(ev.title) || /gaga|stefani/i.test(ev.title));

function normalise(ev, today) {
  const year = Number(today.slice(0, 4));
  const anniversary = isAnniversary(ev);
  const from = anniversary ? originYear(ev, year) : null;
  return {
    key: `cal:${ev.uid || ev.url || ev.title}:${today}`,
    title: ev.title.replace(/\s*[-–—]?\s*\(?anniversar[yi]\)?\s*$/i, "").trim() || ev.title,
    description: ev.description || null,
    location: ev.location || null,
    image: ev.image ?? null,
    anniversary,
    years: from ? year - from : null,
    from,
  };
}

async function fromIcal(source, today) {
  for (const url of source.ical ?? []) {
    try {
      const ics = await fetchText(url);
      if (!ics.includes("BEGIN:VCALENDAR")) continue;
      return parseIcs(ics).filter((ev) => {
        if (!ev.start) return false;
        if (ev.start === today) return true;
        return ev.yearly && ev.start.slice(5) === today.slice(5) && ev.start < today;
      });
    } catch {
      /* next candidate */
    }
  }
  return null;
}

async function fromDayPage(source, today) {
  if (!source.dayPage) return [];
  const [Y, M, D] = today.split("-").map(Number);
  const page = source.dayPage.replace("{Y}", Y).replace("{M}", M).replace("{D}", D);
  const html = await fetchText(page);
  const re = new RegExp(source.eventLinkPattern);
  const links = [...new Set([...html.matchAll(/href=["']([^"'#?]+)["']/gi)].map((m) => new URL(m[1], page).href))].filter((u) => re.test(u)).slice(0, 10);
  const out = [];
  for (const url of links) {
    try {
      const evHtml = (await fetchText(url, 8000)).slice(0, 400_000);
      const m = articleMeta(evHtml);
      if (!m.title) continue;
      out.push({
        uid: url,
        url,
        title: m.title.replace(/\s+[-|–]\s+Lady Gaga Now$/i, ""),
        description: m.description ?? "",
        location: null,
        categories: /anniversar/i.test(evHtml.slice(0, 200_000)) ? ["Anniversary"] : [],
        start: null,
        yearly: false,
        image: m.image,
      });
    } catch {
      /* skip */
    }
  }
  return out;
}

/** Today's relevant calendar entries, not yet posted. --calendar-file <ics> for offline tests. */
/** "Disease - Single Anniversary" and "Disease Single Release - Anniversary" → "disease single". */
export const annKey = (title) =>
  title
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\(with [^)]*\)/g, " ")
    .replace(/[^a-z0-9]+/g, " ")
    .split(" ")
    .filter((w) => w && !["anniversary", "anniverary", "release", "releases", "the", "lady", "gaga", "day", "commences", "begins"].includes(w))
    .join(" ");

/** Curated anniversaries for today (original year before this one). */
function curated(today) {
  const { items = [], corrected = [] } = JSON.parse(readFileSync(join(ROOT, "automation/anniversaries.json"), "utf8"));
  const year = Number(today.slice(0, 4));
  const keys = [...items, ...corrected].map((i) => annKey(i.title).split(" "));
  // "Joanne release" is covered by "Joanne album release": every word of it is in a curated title
  const known = (title) => {
    const words = annKey(title).split(" ").filter(Boolean);
    return words.length > 0 && keys.some((k) => words.every((w) => k.includes(w)));
  };
  const events = items
    .filter((i) => i.date.slice(5) === today.slice(5) && Number(i.date.slice(0, 4)) < year)
    .map((i) => ({
      key: `ann:${annKey(i.title)}:${year}`,
      title: i.title,
      description: null,
      location: null,
      image: null,
      anniversary: true,
      era: i.era ?? null,
      years: year - Number(i.date.slice(0, 4)),
      from: Number(i.date.slice(0, 4)),
    }));
  return { events, known };
}

export async function todaysEvents(state, today) {
  const file = opt("--calendar-file");
  let raw = [];
  if (file) {
    raw = parseIcs(readFileSync(resolve(file), "utf8")).filter(
      (ev) => ev.start === today || (ev.yearly && ev.start?.slice(5) === today.slice(5) && ev.start < today),
    );
  } else {
    const { sources } = JSON.parse(readFileSync(join(ROOT, "automation/calendar-sources.json"), "utf8"));
    for (const source of sources) {
      try {
        raw.push(...((await fromIcal(source, today)) ?? (await fromDayPage(source, today))));
      } catch (err) {
        console.warn(`  calendar: ${source.name} failed (${err.message})`);
      }
    }
  }
  const list = curated(today);
  const live = raw
    .filter(relevant)
    .map((ev) => normalise(ev, today))
    // anniversaries the curated list knows are posted from it, on the verified date
    .filter((ev) => !(ev.anniversary && list.known(ev.title)));
  const events = [...list.events, ...live].filter((ev) => !state.posted?.[ev.key]);
  console.log(`  calendar: ${raw.length} entries for ${today}, ${events.length} usable${events.length ? ` (${events.map((e) => e.title).join(" · ")})` : ""}`);
  return events;
}
