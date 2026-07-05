import type { Era, TimelineMoment, Video } from "./types";

/**
 * Conteúdo de arranque — usado quando o Supabase ainda não está configurado,
 * para o site funcionar desde o primeiro dia. O conteúdo real é gerido no /admin.
 */

export const seedEras: Era[] = [
  {
    slug: "the-fame",
    name: "The Fame",
    years: "2008 – 2010",
    description:
      "O nascimento do fenómeno: The Fame e The Fame Monster transformam Stefani Germanotta em Lady Gaga e o pop nunca mais foi o mesmo.",
    accent: "#d4af37",
    image_url: null,
    sort: 1,
  },
  {
    slug: "born-this-way",
    name: "Born This Way",
    years: "2011 – 2012",
    description:
      "Couro, metal e um hino de liberdade. A era que fundou a nação Little Monster e levou o Monster Ball ao mundo inteiro.",
    accent: "#9fb4c7",
    image_url: null,
    sort: 2,
  },
  {
    slug: "artpop",
    name: "ARTPOP",
    years: "2013 – 2015",
    description:
      "Pop como arte, arte como pop. A era mais experimental e incompreendida — e por isso mesmo adorada pelos fãs.",
    accent: "#a6e22e",
    image_url: null,
    sort: 3,
  },
  {
    slug: "joanne",
    name: "Joanne",
    years: "2016 – 2017",
    description:
      "O chapéu rosa, a alma a descoberto e o Super Bowl LI. A era mais íntima de Gaga, dedicada à tia Joanne.",
    accent: "#e8a798",
    image_url: null,
    sort: 4,
  },
  {
    slug: "a-star-is-born",
    name: "A Star Is Born",
    years: "2018 – 2019",
    description:
      "Ally, Bradley Cooper e um Óscar para 'Shallow'. Gaga conquista Hollywood e prova que não há palco que não domine.",
    accent: "#c98a4b",
    image_url: null,
    sort: 5,
  },
  {
    slug: "chromatica",
    name: "Chromatica",
    years: "2020 – 2022",
    description:
      "Rosa choque, cromados e dance-pop curativo. Do lançamento em plena pandemia à Chromatica Ball pelos estádios do mundo.",
    accent: "#ff3e9a",
    image_url: null,
    sort: 6,
  },
  {
    slug: "harlequin",
    name: "Harlequin",
    years: "2024",
    description:
      "Lee Quinzel canta os clássicos. O álbum-companheiro de Joker: Folie à Deux mostra a Gaga jazz no seu registo mais teatral.",
    accent: "#c8102e",
    image_url: null,
    sort: 7,
  },
  {
    slug: "mayhem",
    name: "MAYHEM",
    years: "2025 – hoje",
    description:
      "O regresso ao pop escuro e cru. Abracadabra, Disease, o headline histórico de Coachella e a era chrome-gothic que dá a cara a este site.",
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
  t("fame-release", "2008-08-19", "The Fame", "O álbum de estreia apresenta Lady Gaga ao mundo. Just Dance e Poker Face conquistam o nº 1 em dezenas de países.", "the-fame"),
  t("fame-monster", "2009-11-18", "The Fame Monster", "Bad Romance chega com o vídeo mais icónico da década e o Monster Ball arranca.", "the-fame"),
  t("meat-dress", "2010-09-12", "O vestido de carne", "Nos VMAs, Gaga recebe o prémio de Video of the Year vestida de… carne. A cultura pop nunca recuperou.", "the-fame"),
  t("btw-release", "2011-05-23", "Born This Way", "Um hino de aceitação vendido em milhões: a era que deu nome aos Little Monsters e à Born This Way Foundation.", "born-this-way"),
  t("artpop-release", "2013-11-06", "ARTPOP", "Gaga funde música, tecnologia e arte performativa — com direito a voo em vestido drone no artRAVE.", "artpop"),
  t("oscars-som", "2015-02-22", "Tributo a Sound of Music", "Nos Óscares, Gaga silencia os céticos com um tributo a Julie Andrews que relança a sua carreira vocal.", "artpop"),
  t("joanne-release", "2016-10-21", "Joanne", "O registo mais pessoal, dedicado à tia Joanne. Million Reasons torna-se um clássico instantâneo.", "joanne"),
  t("super-bowl", "2017-02-05", "Super Bowl LI Halftime", "Do telhado do estádio para a história: um dos halftime shows mais aclamados de sempre.", "joanne"),
  t("asib-premiere", "2018-10-05", "A Star Is Born", "Ally nasce. O filme com Bradley Cooper é um fenómeno global de bilheteira e crítica.", "a-star-is-born"),
  t("oscar-shallow", "2019-02-24", "Óscar por Shallow", "Melhor Canção Original — e aquele dueto ao piano com Bradley Cooper que parou o mundo.", "a-star-is-born"),
  t("chromatica-release", "2020-05-29", "Chromatica", "Dance-pop como cura em plena pandemia. Rain On Me dá a Gaga mais um nº 1 global.", "chromatica"),
  t("chromatica-ball", "2022-07-17", "The Chromatica Ball", "A digressão de estádios finalmente acontece — brutalista, teatral e inesquecível.", "chromatica"),
  t("harlequin-release", "2024-09-27", "Harlequin", "O álbum-companheiro de Joker: Folie à Deux revisita clássicos pela lente de Lee Quinzel.", "harlequin"),
  t("mayhem-release", "2025-03-07", "MAYHEM", "O regresso ao pop escuro. Abracadabra e Disease dominam as tabelas e a estética chrome-gothic define a era.", "mayhem"),
  t("coachella-2025", "2025-04-11", "Coachella: The Art of Personal Chaos", "Um headline histórico de duas horas que os fãs (e a crítica) colocam entre os melhores de sempre do festival.", "mayhem"),
];
