import type { Era, TimelineMoment, Video } from "./types";

/**
 * Starter content — used while Supabase isn't configured yet,
 * so the site works from day one. Real content is managed in /admin.
 */

export const seedEras: Era[] = [
  {
    slug: "the-fame",
    name: "The Fame",
    years: "2008 – 2010",
    description:
      "The birth of the phenomenon: The Fame and The Fame Monster turn Stefani Germanotta into Lady Gaga, and pop music is never the same again.",
    accent: "#d4af37",
    image_url: null,
    sort: 1,
  },
  {
    slug: "born-this-way",
    name: "Born This Way",
    years: "2011 – 2012",
    description:
      "Leather, metal and an anthem of freedom. The era that founded the Little Monster nation and took the Monster Ball around the world.",
    accent: "#9fb4c7",
    image_url: null,
    sort: 2,
  },
  {
    slug: "artpop",
    name: "ARTPOP",
    years: "2013 – 2015",
    description:
      "Pop as art, art as pop. The most experimental and misunderstood era — and exactly for that reason, beloved by the fans.",
    accent: "#a6e22e",
    image_url: null,
    sort: 3,
  },
  {
    slug: "joanne",
    name: "Joanne",
    years: "2016 – 2017",
    description:
      "The pink hat, a soul laid bare, and Super Bowl LI. Gaga's most intimate era, dedicated to her aunt Joanne.",
    accent: "#e8a798",
    image_url: null,
    sort: 4,
  },
  {
    slug: "a-star-is-born",
    name: "A Star Is Born",
    years: "2018 – 2019",
    description:
      "Ally, Bradley Cooper and an Oscar for 'Shallow'. Gaga conquers Hollywood and proves there is no stage she can't own.",
    accent: "#c98a4b",
    image_url: null,
    sort: 5,
  },
  {
    slug: "chromatica",
    name: "Chromatica",
    years: "2020 – 2022",
    description:
      "Hot pink, chrome and healing dance-pop. From a mid-pandemic release to the Chromatica Ball across the world's stadiums.",
    accent: "#ff3e9a",
    image_url: null,
    sort: 6,
  },
  {
    slug: "harlequin",
    name: "Harlequin",
    years: "2024",
    description:
      "Lee Quinzel sings the classics. The companion album to Joker: Folie à Deux shows jazz Gaga at her most theatrical.",
    accent: "#c8102e",
    image_url: null,
    sort: 7,
  },
  {
    slug: "mayhem",
    name: "MAYHEM",
    years: "2025 – now",
    description:
      "The return to dark, raw pop. Abracadabra, Disease, the historic Coachella headline and the chrome-gothic era this site is dressed in.",
    accent: "#e04e20",
    image_url: null,
    sort: 8,
  },
];

const v = (
  id: string,
  title: string,
  url: string,
  type: Video["type"],
  era_slug: string,
  event: string | null,
  date: string,
  featured = false,
): Video => ({
  id,
  title,
  url,
  type,
  era_slug,
  event,
  date,
  thumbnail_url: null,
  featured,
  created_at: date,
});

export const seedVideos: Video[] = [
  v("abracadabra", "Abracadabra", "https://www.youtube.com/watch?v=vBynw9Isr28", "mv", "mayhem", "Official Music Video", "2025-02-03", true),
  v("abracadabra-snl", "Abracadabra — Saturday Night Live", "https://www.youtube.com/watch?v=NLviy39Q1A8", "live", "mayhem", "SNL 50", "2025-03-09"),
  v("disease", "Disease", "https://www.youtube.com/watch?v=fmC6b6_ovZY", "mv", "mayhem", "Official Music Video", "2024-11-01"),
  v("rain-on-me", "Rain On Me (with Ariana Grande)", "https://www.youtube.com/watch?v=AoAm4om0wTs", "mv", "chromatica", "Official Music Video", "2020-05-22"),
  v("stupid-love", "Stupid Love", "https://www.youtube.com/watch?v=5L6xyaeiV58", "mv", "chromatica", "Official Music Video", "2020-02-28"),
  v("shallow", "Shallow (with Bradley Cooper)", "https://www.youtube.com/watch?v=bo_efYhYU2A", "mv", "a-star-is-born", "A Star Is Born", "2018-09-27"),
  v("applause", "Applause", "https://www.youtube.com/watch?v=pco91kroVgQ", "mv", "artpop", "Official Music Video", "2013-08-19"),
  v("born-this-way-mv", "Born This Way", "https://www.youtube.com/watch?v=wV1FrqwZyKw", "mv", "born-this-way", "Official Music Video", "2011-02-27"),
  v("judas", "Judas", "https://www.youtube.com/watch?v=wagn8Wrmzuc", "mv", "born-this-way", "Official Music Video", "2011-05-03"),
  v("bad-romance", "Bad Romance", "https://www.youtube.com/watch?v=qrO4YZeyl0I", "mv", "the-fame", "Official Music Video", "2009-11-23"),
  v("telephone", "Telephone (feat. Beyoncé)", "https://www.youtube.com/watch?v=EVBsypHzF3U", "mv", "the-fame", "Official Music Video", "2010-03-15"),
  v("poker-face", "Poker Face", "https://www.youtube.com/watch?v=bESGLojNYSo", "mv", "the-fame", "Official Music Video", "2008-10-24"),
  v("just-dance", "Just Dance (feat. Colby O'Donis)", "https://www.youtube.com/watch?v=2Abk1jAONjw", "mv", "the-fame", "Official Music Video", "2008-06-17"),
  v("paparazzi", "Paparazzi", "https://www.youtube.com/watch?v=d2smz_1L2_0", "mv", "the-fame", "Official Music Video", "2009-06-08"),
  v("alejandro", "Alejandro", "https://www.youtube.com/watch?v=niqrrmev4mA", "mv", "the-fame", "Official Music Video", "2010-06-08"),
];

const t = (
  id: string,
  date: string,
  title: string,
  body: string,
  era_slug: string | null,
): TimelineMoment => ({ id, date, title, body, era_slug, image_url: null });

export const seedTimeline: TimelineMoment[] = [
  t("fame-release", "2008-08-19", "The Fame", "The debut album introduces Lady Gaga to the world. Just Dance and Poker Face hit #1 in dozens of countries.", "the-fame"),
  t("fame-monster", "2009-11-18", "The Fame Monster", "Bad Romance arrives with the most iconic video of the decade, and the Monster Ball begins.", "the-fame"),
  t("meat-dress", "2010-09-12", "The meat dress", "At the VMAs, Gaga accepts Video of the Year dressed in… meat. Pop culture never recovered.", "the-fame"),
  t("btw-release", "2011-05-23", "Born This Way", "An anthem of acceptance selling millions: the era that named the Little Monsters and the Born This Way Foundation.", "born-this-way"),
  t("artpop-release", "2013-11-06", "ARTPOP", "Gaga fuses music, technology and performance art — flying drone dress at the artRAVE included.", "artpop"),
  t("oscars-som", "2015-02-22", "The Sound of Music tribute", "At the Oscars, Gaga silences the skeptics with a Julie Andrews tribute that relaunches her vocal career.", "artpop"),
  t("joanne-release", "2016-10-21", "Joanne", "Her most personal record, dedicated to her aunt Joanne. Million Reasons becomes an instant classic.", "joanne"),
  t("super-bowl", "2017-02-05", "Super Bowl LI Halftime", "From the stadium roof into history: one of the most acclaimed halftime shows of all time.", "joanne"),
  t("asib-premiere", "2018-10-05", "A Star Is Born", "Ally is born. The film with Bradley Cooper becomes a global box-office and critical phenomenon.", "a-star-is-born"),
  t("oscar-shallow", "2019-02-24", "Oscar for Shallow", "Best Original Song — and that piano duet with Bradley Cooper that stopped the world.", "a-star-is-born"),
  t("chromatica-release", "2020-05-29", "Chromatica", "Dance-pop as healing in the middle of a pandemic. Rain On Me hands Gaga another global #1.", "chromatica"),
  t("chromatica-ball", "2022-07-17", "The Chromatica Ball", "The stadium tour finally happens — brutalist, theatrical and unforgettable.", "chromatica"),
  t("harlequin-release", "2024-09-27", "Harlequin", "The companion album to Joker: Folie à Deux revisits the classics through the lens of Lee Quinzel.", "harlequin"),
  t("mayhem-release", "2025-03-07", "MAYHEM", "The return to dark pop. Abracadabra and Disease dominate the charts, and the chrome-gothic aesthetic defines the era.", "mayhem"),
  t("coachella-2025", "2025-04-11", "Coachella: The Art of Personal Chaos", "A historic two-hour headline set that fans (and critics) rank among the festival's greatest ever.", "mayhem"),
];
