/**
 * Is this headline real Lady Gaga news worth an Instagram post? Each story gets a score;
 * junk is dropped outright. Only stories scoring at least POST_MIN_SCORE are posted.
 *
 *  - junk (never posted): shopping, quizzes, tribute acts / impersonators / lookalikes,
 *    costumes, "Gaga ball", and headlines where she's a passing mention in a list
 *  - hard news (+3): releases, tour, performances, awards, charts, films…
 *  - she's the subject (+2 if the headline starts with her, +1 if she's in its first half)
 *  - confirmed (+2) · rumours / speculation (−3) · fluff, feuds, reactions (−2) · opinion (−2)
 *  - Lady Gaga Now (dedicated fan news site) +2
 * Aggregated headlines (Google News) are only kept from trusted outlets — no tabloids,
 * no unknown local sites.
 */

export const POST_MIN_SCORE = 3;

const JUNK = [
  [/\b(deals?|% off|coupons?|discount(s|ed)?|promo code|shop(ping)?|buy now|giveaway|best (gifts|buys)|on sale)\b/i, "shopping"],
  [/\b(quiz|horoscope|which .{0,30} are you)\b/i, "quiz"],
  [/\b(tribute (act|show|band|night)s?|impersonat\w*|look-?alikes?|drag (queen|race)|cover band|battle of (the )?divas|copycat)\b/i, "tribute act / lookalike"],
  [/\b(costumes?|dress(ed)? up as|halloween look|makeup tutorial)\b/i, "costume"],
  [/\bgaga (ball|pit)\b/i, "not her (gaga ball)"],
  [/\b(like|such as|including|inspired by|the next|channel(l)?ing|à la)\b[^.]{0,80}\bgaga\b/i, "passing mention"],
  [/\b[A-Z][\w'’.]+(?:\s[A-Z][\w'’.]+)?,\s[^,]{2,40},\s[^,]{2,60}\b(and|&)\s+(lady\s)?gaga\b/i, "one of a list"],
  [/\bgaga-(like|inspired|esque)\b/i, "passing mention"],
];

const SIGNALS = [
  [/\b(announce[sd]?|announcement|release[sd]?|drops?|dropped|new (single|song|album|music|video|era|tour|look)|tour dates?|world tour|mayhem ball|stadium|setlist|perform(s|ed|ing|ance)?|premieres?|debut(s|ed)?|nominat\w*|wins?|won|awards?|grammys?|oscars?|emmys?|golden globes?|vmas?|hot 100|no\. ?1|number one|charts?|record-breaking|breaks? (a )?record|sold[- ]out|tickets?|headlin\w*|cast(s|ing)?|film|movie|series|documentary|trailer|collab\w*|duet|feat\.|remix|album|single|music video|concert|residency|views|streams|platinum|certified|milestone)\b/i, 3, "hard news"],
  [/\b(welcomes? (a |her |their )?(baby|daughter|son|child)|gives birth|(gets|got|is) engaged|announces? (her |their )?engagement|(get|gets|got) married|marries|tie the knot|ties the knot|wedding (day|ceremony))\b/i, 2, "life event"],
  [/\b(official(ly)?|confirm(s|ed)?|reveal(s|ed)?|unveil(s|ed)?)\b/i, 2, "confirmed"],
  [/\b(rumou?r(s|ed)?|reportedly|allegedly|(exclusive )?sources? (say|says|claim|reveal)|exclusive source|insiders?|could|might|may be|fans? (think|believe|theori[sz]e)|theor(y|ies)|speculat\w*)\b/i, -3, "rumour"],
  [/\b(how .{0,40} (is|was|has been) feeling|shows? off|steps? out|spotted|low-cut|sheer|plunging|braless|engagement ring|wears?|outfit|reacts?|reactions?|memes?|viral|tiktok|trolls?|slams?|claps? back|shades?|feud|wardrobe malfunction|weight|body)\b/i, -2, "fluff"],
  [/\b(here'?s why|why (i|we|you)|opinion|ranked|ranking|best .{0,20} songs|worst)\b/i, -2, "opinion"],
  [/\b(\d+ years ago|anniversary|throwback)\b/i, -1, "throwback"],
];

/** Outlets we accept when a headline only reaches us through Google News. */
const TRUSTED = [
  "lady gaga now", "billboard", "rolling stone", "variety", "hollywood reporter", "deadline", "pitchfork", "nme",
  "stereogum", "consequence", "vulture", "idolator", "just jared", "people", "entertainment weekly", "associated press",
  "ap news", "reuters", "bbc", "the guardian", "new york times", "los angeles times", "usa today", "cnn", "nbc news",
  "abc news", "cbs news", "e! news", "e! online", "entertainment tonight", "et online", "vogue", "harper's bazaar",
  "harpers bazaar", "w magazine", "elle", "vanity fair", "gq", "the independent", "forbes", "time", "npr", "complex",
  "uproxx", "music week", "official charts", "grammy", "recording academy", "apple music", "spotify", "the atlantic",
  "the new yorker", "paper magazine", "dazed", "i-d", "attitude", "out magazine", "the advocate", "page six",
  "instyle", "parade", "us weekly", "hello!", "cosmopolitan", "glamour", "broadwayworld", "playbill", "iheart", "stylecaster",
  "yahoo", "aol", "the wrap", "thewrap", "indiewire", "screen rant", "collider", "billboard", "teen vogue", "allure",
];
const TABLOIDS = ["daily mail", "the sun", "mirror", "express", "daily star", "ok!", "radar", "in touch", "life & style", "hollywoodlife", "the blast", "marca"];

export function trustedOutlet(outlet = "") {
  const o = outlet.toLowerCase();
  if (TABLOIDS.some((t) => o.includes(t))) return false;
  // whole words only: "time" must not match "Khaleej Times", "elle" not "Bellevue"
  const esc = (t) => t.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return TRUSTED.some((t) => new RegExp(`(^|[^a-z])${esc(t)}([^a-z]|$)`).test(o));
}

/** { score, junk, reasons } for a headline (+ the outlet's excerpt, if any). */
export function relevance(title, excerpt = "", { fanSite = false } = {}) {
  for (const [re, why] of JUNK) if (re.test(title)) return { score: -99, junk: why, reasons: [why] };
  let score = fanSite ? 2 : 0;
  const reasons = fanSite ? ["fan news site"] : [];
  for (const [re, pts, why] of SIGNALS) {
    if (re.test(title)) {
      score += pts;
      reasons.push(`${why} ${pts > 0 ? "+" : ""}${pts}`);
    }
  }
  // is she the subject, or just in the headline?
  const t = title.trim();
  const at = t.search(/\b(lady\s)?gaga\b/i);
  if (/^(lady\s)?gaga\b/i.test(t)) {
    score += 2;
    reasons.push("subject +2");
  } else if (at >= 0 && at < t.length / 2) {
    score += 1;
    reasons.push("early mention +1");
  }
  // a summary that never names her is a sign she's a side note
  if (excerpt && !/\bgaga\b/i.test(excerpt) && !fanSite) {
    score -= 1;
    reasons.push("summary doesn't name her −1");
  }
  return { score, junk: null, reasons };
}
