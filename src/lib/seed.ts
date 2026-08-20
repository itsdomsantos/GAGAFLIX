import type { Era, TimelineMoment, Tour, TourSong, Video } from "./types";

/**
 * Starter content — used while Supabase isn't configured yet,
 * so the site works from day one. Real content is managed in /admin.
 */

export const seedEras: Era[] = [
  {
    slug: "the-fame",
    name: "The Fame",
    years: "2008 – 2009",
    description:
      "The debut that started it all: Just Dance, Poker Face and the birth of a pop phenomenon.",
    accent: "#d4af37",
    image_url: null,
    logo_url: null,
    sort: 1,
  },
  {
    slug: "the-fame-monster",
    name: "The Fame Monster",
    years: "2009 – 2010",
    description:
      "The dark twin of The Fame: Bad Romance, Telephone, Alejandro and the Monster Ball that created the Haus.",
    accent: "#b9bcc8",
    image_url: null,
    logo_url: null,
    sort: 2,
  },
  {
    slug: "born-this-way",
    name: "Born This Way",
    years: "2011 – 2012",
    description:
      "Leather, metal and an anthem of freedom. The era that founded the Little Monster nation.",
    accent: "#9fb4c7",
    image_url: null,
    logo_url: null,
    sort: 3,
  },
  {
    slug: "artpop",
    name: "ARTPOP",
    years: "2013 – 2014",
    description:
      "Pop as art, art as pop. The most experimental and misunderstood era — and beloved by the fans for it.",
    accent: "#a6e22e",
    image_url: null,
    logo_url: null,
    sort: 4,
  },
  {
    slug: "cheek-to-cheek",
    name: "Cheek to Cheek",
    years: "2014 – 2015",
    description:
      "Gaga meets Tony Bennett. A jazz standards album that proved the range behind the pop provocateur.",
    accent: "#e63946",
    image_url: null,
    logo_url: null,
    sort: 5,
  },
  {
    slug: "joanne",
    name: "Joanne",
    years: "2016 – 2017",
    description:
      "The pink hat, a soul laid bare, and Super Bowl LI. Gaga's most intimate era, dedicated to her aunt Joanne.",
    accent: "#e8a798",
    image_url: null,
    logo_url: null,
    sort: 6,
  },
  {
    slug: "a-star-is-born",
    name: "A Star Is Born",
    years: "2018 – 2019",
    description:
      "Ally, Bradley Cooper and an Oscar for 'Shallow'. Gaga conquers Hollywood.",
    accent: "#c98a4b",
    image_url: null,
    logo_url: null,
    sort: 7,
  },
  {
    slug: "chromatica",
    name: "Chromatica",
    years: "2020 – 2021",
    description:
      "Hot pink, chrome and healing dance-pop, from a mid-pandemic release to Rain On Me.",
    accent: "#ff3e9a",
    image_url: null,
    logo_url: null,
    sort: 8,
  },
  {
    slug: "love-for-sale",
    name: "Love For Sale",
    years: "2021 – 2022",
    description:
      "The second jazz record with Tony Bennett — a Cole Porter songbook and the farewell to a legendary friendship.",
    accent: "#6fc3df",
    image_url: null,
    logo_url: null,
    sort: 9,
  },
  {
    slug: "house-of-gucci",
    name: "House of Gucci",
    years: "2021",
    description:
      "Patrizia Reggiani. Father, Son and House of Gucci. Gaga's acclaimed leading role in Ridley Scott's crime saga.",
    accent: "#8f1d1d",
    image_url: null,
    logo_url: null,
    sort: 10,
  },
  {
    slug: "harlequin",
    name: "Harlequin",
    years: "2024",
    description:
      "Lee Quinzel sings the classics. The companion album to Joker: Folie à Deux, jazz Gaga at her most theatrical.",
    accent: "#c8102e",
    image_url: null,
    logo_url: null,
    sort: 11,
  },
  {
    slug: "joker",
    name: "Joker: Folie à Deux",
    years: "2024",
    description:
      "Gaga as Lee Quinzel opposite Joaquin Phoenix — madness staged as a musical.",
    accent: "#4e9d50",
    image_url: null,
    logo_url: null,
    sort: 12,
  },
  {
    slug: "mayhem",
    name: "MAYHEM",
    years: "2025 – now",
    description:
      "The return to dark, raw pop. Abracadabra, Disease, the historic Coachella headline and the chrome-gothic era this site is dressed in.",
    accent: "#e04e20",
    image_url: null,
    logo_url: null,
    sort: 13,
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
  is_hero = false,
): Video => ({
  id,
  title,
  url,
  type,
  era_slug,
  event,
  date,
  thumbnail_url: null,
  poster_url: null,
  tour_slug: null,
  featured,
  is_hero,
  unavailable_since: null,
  unavailable_reason: null,
  last_checked: null,
  created_at: date,
});

export const seedVideos: Video[] = [
  v("abracadabra", "Abracadabra", "https://www.youtube.com/watch?v=vBynw9Isr28", "mv", "mayhem", "Official Music Video", "2025-02-03", true, true),
  v("abracadabra-snl", "Abracadabra — Saturday Night Live", "https://www.youtube.com/watch?v=NLviy39Q1A8", "live", "mayhem", "SNL 50", "2025-03-09"),
  v("disease", "Disease", "https://www.youtube.com/watch?v=fmC6b6_ovZY", "mv", "mayhem", "Official Music Video", "2024-11-01"),
  v("rain-on-me", "Rain On Me (with Ariana Grande)", "https://www.youtube.com/watch?v=AoAm4om0wTs", "mv", "chromatica", "Official Music Video", "2020-05-22"),
  v("stupid-love", "Stupid Love", "https://www.youtube.com/watch?v=5L6xyaeiV58", "mv", "chromatica", "Official Music Video", "2020-02-28"),
  v("shallow", "Shallow (with Bradley Cooper)", "https://www.youtube.com/watch?v=bo_efYhYU2A", "mv", "a-star-is-born", "A Star Is Born", "2018-09-27"),
  v("applause", "Applause", "https://www.youtube.com/watch?v=pco91kroVgQ", "mv", "artpop", "Official Music Video", "2013-08-19"),
  v("born-this-way-mv", "Born This Way", "https://www.youtube.com/watch?v=wV1FrqwZyKw", "mv", "born-this-way", "Official Music Video", "2011-02-27"),
  v("judas", "Judas", "https://www.youtube.com/watch?v=wagn8Wrmzuc", "mv", "born-this-way", "Official Music Video", "2011-05-03"),
  v("bad-romance", "Bad Romance", "https://www.youtube.com/watch?v=qrO4YZeyl0I", "mv", "the-fame-monster", "Official Music Video", "2009-11-23"),
  v("telephone", "Telephone (feat. Beyoncé)", "https://www.youtube.com/watch?v=EVBsypHzF3U", "mv", "the-fame-monster", "Official Music Video", "2010-03-15"),
  v("poker-face", "Poker Face", "https://www.youtube.com/watch?v=bESGLojNYSo", "mv", "the-fame", "Official Music Video", "2008-10-24"),
  v("just-dance", "Just Dance (feat. Colby O'Donis)", "https://www.youtube.com/watch?v=2Abk1jAONjw", "mv", "the-fame", "Official Music Video", "2008-06-17"),
  v("paparazzi", "Paparazzi", "https://www.youtube.com/watch?v=d2smz_1L2_0", "mv", "the-fame", "Official Music Video", "2009-06-08"),
  v("alejandro", "Alejandro", "https://www.youtube.com/watch?v=niqrrmev4mA", "mv", "the-fame-monster", "Official Music Video", "2010-06-08"),
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
  t("fame-monster", "2009-11-18", "The Fame Monster", "Bad Romance arrives with the most iconic video of the decade, and the Monster Ball begins.", "the-fame-monster"),
  t("meat-dress", "2010-09-12", "The meat dress", "At the VMAs, Gaga accepts Video of the Year dressed in… meat. Pop culture never recovered.", "the-fame-monster"),
  t("btw-release", "2011-05-23", "Born This Way", "An anthem of acceptance selling millions: the era that named the Little Monsters and the Born This Way Foundation.", "born-this-way"),
  t("artpop-release", "2013-11-06", "ARTPOP", "Gaga fuses music, technology and performance art — flying drone dress at the artRAVE included.", "artpop"),
  t("oscars-som", "2015-02-22", "The Sound of Music tribute", "At the Oscars, Gaga silences the skeptics with a Julie Andrews tribute that relaunches her vocal career.", "artpop"),
  t("cheek-to-cheek-release", "2014-09-19", "Cheek to Cheek", "Gaga and Tony Bennett top the charts with a jazz standards album and win the Grammy for it.", "cheek-to-cheek"),
  t("joanne-release", "2016-10-21", "Joanne", "Her most personal record, dedicated to her aunt Joanne. Million Reasons becomes an instant classic.", "joanne"),
  t("super-bowl", "2017-02-05", "Super Bowl LI Halftime", "From the stadium roof into history: one of the most acclaimed halftime shows of all time.", "joanne"),
  t("asib-premiere", "2018-10-05", "A Star Is Born", "Ally is born. The film with Bradley Cooper becomes a global box-office and critical phenomenon.", "a-star-is-born"),
  t("oscar-shallow", "2019-02-24", "Oscar for Shallow", "Best Original Song — and that piano duet with Bradley Cooper that stopped the world.", "a-star-is-born"),
  t("chromatica-release", "2020-05-29", "Chromatica", "Dance-pop as healing in the middle of a pandemic. Rain On Me hands Gaga another global #1.", "chromatica"),
  t("chromatica-ball", "2022-07-17", "The Chromatica Ball", "The stadium tour finally happens — brutalist, theatrical and unforgettable.", "chromatica"),
  t("love-for-sale-release", "2021-10-01", "Love For Sale", "The final duet album with Tony Bennett — a Cole Porter songbook and a moving goodbye.", "love-for-sale"),
  t("gucci-premiere", "2021-11-24", "House of Gucci", "Gaga disappears into Patrizia Reggiani and earns worldwide acclaim in Ridley Scott's saga.", "house-of-gucci"),
  t("harlequin-release", "2024-09-27", "Harlequin", "The companion album to Joker: Folie à Deux revisits the classics through the lens of Lee Quinzel.", "harlequin"),
  t("joker-premiere", "2024-10-04", "Joker: Folie à Deux", "Lee Quinzel arrives: Gaga stars opposite Joaquin Phoenix in the musical descent into madness.", "joker"),
  t("mayhem-release", "2025-03-07", "MAYHEM", "The return to dark pop. Abracadabra and Disease dominate the charts, and the chrome-gothic aesthetic defines the era.", "mayhem"),
  t("coachella-2025", "2025-04-11", "Coachella: The Art of Personal Chaos", "A historic two-hour headline set that fans (and critics) rank among the festival's greatest ever.", "mayhem"),
];

// ------------------------------------------------------------
// Tours — a página organizada pela CRONOLOGIA do espetáculo.
// Metadados semeados para todas as digressões; a setlist-piloto
// totalmente montada é a atual Mayhem Ball (edita tudo em /admin).
// ------------------------------------------------------------

export const seedTours: Tour[] = [
  {
    slug: "the-fame-ball",
    name: "The Fame Ball Tour",
    years: "2009",
    tagline: "The pop art rave that started the road.",
    description:
      "Gaga's first headlining tour — a travelling piece of performance art through clubs and theatres, framed as an exhibition in four acts.",
    accent: "#d4af37",
    poster_url: null,
    backdrop_url: null,
    logo_url: null,
    era_slug: "the-fame",
    stats: [
      { label: "Shows", value: "69" },
      { label: "Legs", value: "3" },
      { label: "Continents", value: "3" },
    ],
    sort: 1,
  },
  {
    slug: "the-monster-ball",
    name: "The Monster Ball Tour",
    years: "2009 – 2011",
    tagline: "The night the Little Monsters were born.",
    description:
      "The tour that built the Haus. Reworked after a few months into an arena spectacular — the highest-grossing tour ever by a debut headliner at the time.",
    accent: "#b9bcc8",
    poster_url: null,
    backdrop_url: null,
    logo_url: null,
    era_slug: "the-fame-monster",
    stats: [
      { label: "Shows", value: "200+" },
      { label: "Gross", value: "$227.4M" },
      { label: "Legs", value: "3" },
    ],
    sort: 2,
  },
  {
    slug: "born-this-way-ball",
    name: "Born This Way Ball",
    years: "2012 – 2013",
    tagline: "Welcome to the Government Gaga castle.",
    description:
      "A gothic-electro fortress on stage. A worldwide stadium and arena run cut short by a hip injury — mythologised by fans ever since.",
    accent: "#9fb4c7",
    poster_url: null,
    backdrop_url: null,
    logo_url: null,
    era_slug: "born-this-way",
    stats: [
      { label: "Shows", value: "~65" },
      { label: "Continents", value: "5" },
    ],
    sort: 3,
  },
  {
    slug: "artrave-artpop-ball",
    name: "artRave: The ARTPOP Ball",
    years: "2014",
    tagline: "Pop culture, in the flesh.",
    description:
      "The album's artRAVE launch grown into a full tour — inflatable sets, aquatic worlds and the most joyful, colourful stage of the catalogue.",
    accent: "#a6e22e",
    poster_url: null,
    backdrop_url: null,
    logo_url: null,
    era_slug: "artpop",
    stats: [
      { label: "Shows", value: "45" },
      { label: "Gross", value: "$83M" },
    ],
    sort: 4,
  },
  {
    slug: "cheek-to-cheek-tour",
    name: "Cheek to Cheek Tour",
    years: "2014 – 2015",
    tagline: "Gaga & Tony Bennett, live in jazz.",
    description:
      "The jazz record taken on the road with Tony Bennett — big band, standards and the vocal range behind the pop provocateur.",
    accent: "#e63946",
    poster_url: null,
    backdrop_url: null,
    logo_url: null,
    era_slug: "cheek-to-cheek",
    stats: [
      { label: "Shows", value: "36" },
      { label: "With", value: "Tony Bennett" },
    ],
    sort: 5,
  },
  {
    slug: "joanne-world-tour",
    name: "Joanne World Tour",
    years: "2017 – 2018",
    tagline: "A soul laid bare, arena by arena.",
    description:
      "Following the Super Bowl LI halftime, an arena tour balancing the intimacy of Joanne with the anthems that made her.",
    accent: "#e8a798",
    poster_url: null,
    backdrop_url: null,
    logo_url: null,
    era_slug: "joanne",
    stats: [
      { label: "Shows", value: "84" },
      { label: "Gross", value: "$95M" },
    ],
    sort: 6,
  },
  {
    slug: "enigma-jazz-piano",
    name: "Enigma + Jazz & Piano",
    years: "2018 – 2024",
    tagline: "The Las Vegas residency.",
    description:
      "Two shows in one residency at the Park MGM: Enigma, a futuristic pop odyssey, and Jazz & Piano, the standards stripped back to voice and keys.",
    accent: "#ff3e9a",
    poster_url: null,
    backdrop_url: null,
    logo_url: null,
    era_slug: "chromatica",
    stats: [
      { label: "Residency", value: "Las Vegas" },
      { label: "Two shows", value: "Enigma · Jazz" },
    ],
    sort: 7,
  },
  {
    slug: "the-chromatica-ball",
    name: "The Chromatica Ball",
    years: "2022",
    tagline: "Six chapters of a brutalist dream.",
    description:
      "The stadium tour Chromatica always deserved — a monolithic, sci-fi cathedral staged across six acts, and one of 2022's biggest tours.",
    accent: "#ff3e9a",
    poster_url: null,
    backdrop_url: null,
    logo_url: null,
    era_slug: "chromatica",
    stats: [
      { label: "Shows", value: "20" },
      { label: "Gross", value: "$112.4M" },
      { label: "Attendance", value: "845k" },
    ],
    sort: 8,
  },
  {
    slug: "the-mayhem-ball",
    name: "The Mayhem Ball",
    years: "2025 – now",
    tagline: "Of velvet, vice and a gothic dream.",
    description:
      "The chrome-gothic era live: a theatrical arena show in four acts and an encore, threading MAYHEM through the whole Gaga canon.",
    accent: "#e04e20",
    poster_url: null,
    backdrop_url: null,
    logo_url: null,
    era_slug: "mayhem",
    stats: [
      { label: "Premiere", value: "2025" },
      { label: "Acts", value: "4 + encore" },
      { label: "Status", value: "On tour" },
    ],
    sort: 9,
  },
];

/**
 * Setlist-piloto: The Mayhem Ball (2025). A ordem e os atos são um ponto de
 * partida — confirma e liga os vídeos certos em /admin. `video_id` aponta para
 * um clip de seedVideos (ou uma linha da tabela videos) quando existe.
 */
const s = (
  position: number,
  song: string,
  note: string | null = null,
  video_id: string | null = null,
): TourSong => ({
  id: `mayhem-${position}`,
  tour_slug: "the-mayhem-ball",
  position,
  song,
  note,
  video_id,
});

export const seedSetlist: TourSong[] = [
  s(1, "Bloody Mary", "Act I — Of Velvet and Vice"),
  s(2, "Abracadabra", "Act I — Of Velvet and Vice", "abracadabra-snl"),
  s(3, "Judas", "Act I — Of Velvet and Vice", "judas"),
  s(4, "Scheiße", "Act I — Of Velvet and Vice"),
  s(5, "Garden of Eden", "Act I — Of Velvet and Vice"),
  s(6, "Poker Face", "Act II — And She Fell Into a Gothic Dream", "poker-face"),
  s(7, "Perfect Celebrity", "Act II — And She Fell Into a Gothic Dream"),
  s(8, "Disease", "Act II — And She Fell Into a Gothic Dream", "disease"),
  s(9, "Paparazzi", "Act II — And She Fell Into a Gothic Dream", "paparazzi"),
  s(10, "Alejandro", "Act III — The Beautiful Nightmare", "alejandro"),
  s(11, "The Edge of Glory", "Act III — The Beautiful Nightmare"),
  s(12, "Shadow of a Man", "Act III — The Beautiful Nightmare"),
  s(13, "Die With a Smile", "Act III — The Beautiful Nightmare"),
  s(14, "How Bad Do U Want Me", "Act IV — Every Chessboard Has Two Queens"),
  s(15, "Vanish Into You", "Act IV — Every Chessboard Has Two Queens"),
  s(16, "Killah", "Act IV — Every Chessboard Has Two Queens"),
  s(17, "Zombieboy", "Act IV — Every Chessboard Has Two Queens"),
  s(18, "Bad Romance", "Encore", "bad-romance"),
];
