// Wörtle – deutscher Wordle-Klon. Reine Logik, kein DOM.
// generate(diff, seed) → { kind:"woertle", diff, length, solution, maxGuesses: 6 }
import { Rng, resolveDiff } from "./core.js";
import { WORDS, isWord } from "../data/words.js";

export const LENGTH = { leicht: 4, mittel: 5, schwer: 6, experte: 7 };
export const MAX_GUESSES = 6;
const VOWELS = new Set(["a", "e", "i", "o", "u", "ä", "ö", "ü"]);

const POOL_SIZE = 280; // nur die häufigsten Kandidaten – die Liste ist nach Häufigkeit sortiert, hinten wird es exotisch
// Stoppliste: Vornamen, Orte, Anglizismen und Vulgäres aus dem Untertitel-Korpus, die in `nouns` landen, aber keine Lösungswörter sein sollen.
const NAMES = new Set("cora dawn chen mack duck lance marco ronnie jeep omar lena jens jedi liga borg hong wong egon nasa ling kung chad there homer south megan bates mario alison turner elliot hunter curtis richie donald stevie avenue phillip eleanor venedig harriet kong lars fish snow rico wall craig hanna master palmer single bennett griffin fran want reed fitz elsa bert drew look cass lori hugh when burt vera take rich ohio chan alec theo kuba news bruno beach ethan marsh ellie blake lemon anton chris diane grand river jonas klink archer kanada justin tucker marcel warren scotch steele moskau castle monroe dinner ticket abraham edwards detroit gilbert weichei mumm merk sorg roll john jack mike alex paul nick mark bill anna jane dean lord luke kate mami jake emma pete lisa adam lois eric fred star king phil alan code song doug hure dave hank carl jeff rock crew ross anne nehm sean sara rick cole west tess jess earl todd josh jean lane nate tina karl hans brad beth nina stan girl pool safe what colt kurt kent kirk rita kids blue sing wade greg tara ruth road erin dana babe jill otto owen hill jude ford liam walt chip monk noah neil know lana shaw duke mona finn juan nora iris gene come east shit gina lake joan hope evan seth dale erik bell trip hood kane mick kara lola buck hall leon gwen miss show deal date club fick fuck sieh hilf guck wart dreh fass pack kilo funk jobs camp mars peter david james paris sarah jesus maria clark eddie jason steve laura chuck roger louis kevin scott robin alice simon chief brian grace madam susan julia marie ellen elena julie smith annie jesse helen angel linda chloe jones karen china vince house tests april truck klaus white lucas texas bruce donna damon diego holst miami jamie miles vegas carol piper felix paula davis jacob brown blair japan paige derek aaron grant oscar katie shane lewis hogan chase logan quinn stone mason green coach teams queen clara spock group diana ralph penis stell steig drink stopp video pizza george madame martin thomas robert daniel claire rachel amanda carter walter arthur mister street oliver victor german berlin morgan europa carrie maggie phoebe mexiko howard albert stefan wilson carlos harold willie gordon russen marcus shield edward martha andrew mulder little sophie joseph afrika angela miller jackie bonnie doctor holmes walker nelson cooper norman spring hitler nathan jordan olivia boston parker hannah serena monica watson pierre island connor travis august ladies gloria julian herman alfred school drinks walton dennis michel morris harris steven louise dexter nicole tschüs nigger fresse schaff london captain charlie michael colonel sheriff charles amerika richard college wichser england officer william jackson vincent chicago patrick jessica frankie johnson angeles leonard francis italien barbara meeting spanien rebecca lincoln florida schultz matthew sheldon malcolm stephen spencer bernard vanessa russell collins service shuttle heather allison vietnam douglas orleans houston natalie darling cameron gabriel melissa jacques tickets central samurai schweiz seattle zombies winston freddie antoine schmidt simpson harvard maurice brandon camille melanie randall wallace antonio stevens madison hammond bastard".split(" "));

const pools = {};
/** Lösungskandidaten: die häufigsten Wörter, die auch als Substantiv geführt sind, ohne Namen und ohne 3+ gleiche Buchstaben. */
function pool(L) {
  if (pools[L]) return pools[L];
  const nouns = new Set(WORDS[L].nouns);
  const ok = (w) => {
    if (w.length !== L || !nouns.has(w) || NAMES.has(w) || w.includes("y")) return false; // y: fast nur Eigennamen/Anglizismen
    const cnt = {};
    for (const ch of w) if (++cnt[ch] >= 3) return false;
    return true;
  };
  let list = WORDS[L].common.filter(ok).slice(0, POOL_SIZE);
  if (list.length < 50) list = WORDS[L].common.filter((w) => w.length === L);
  return (pools[L] = list);
}

export function generate(diff, seed) {
  const rng = new Rng(seed);
  diff = resolveDiff(diff, rng);
  const length = LENGTH[diff];
  const solution = rng.pick(pool(length));
  return { kind: "woertle", diff, length, solution, maxGuesses: MAX_GUESSES };
}

/** Wordle-Bewertung mit korrekter Doppelbuchstaben-Logik. guess/solution gleich lang, Groß/Klein egal. */
export function score(guess, solution) {
  const g = guess.toLowerCase(), s = solution.toLowerCase();
  const res = Array(s.length).fill("miss");
  const left = {};
  for (let i = 0; i < s.length; i++) {
    if (g[i] === s[i]) res[i] = "ok";
    else left[s[i]] = (left[s[i]] || 0) + 1;
  }
  for (let i = 0; i < s.length; i++) {
    if (res[i] === "ok") continue;
    if (left[g[i]] > 0) { res[i] = "near"; left[g[i]]--; }
  }
  return res;
}

export function isValidGuess(word) { return isWord(String(word).toLowerCase()); }

/** Ein noch nicht (an richtiger Stelle) erratener Buchstabe: { pos, letter } oder null. */
export function findHint(p, guesses = []) {
  const s = p.solution.toLowerCase();
  const known = Array(s.length).fill(false);
  for (const g of guesses) { const r = score(g, s); r.forEach((v, i) => { if (v === "ok") known[i] = true; }); }
  const open = [];
  for (let i = 0; i < s.length; i++) if (!known[i]) open.push(i);
  if (!open.length) return null;
  // Erst Vokale (leichter zu merken), sonst der erste offene Buchstabe
  const pos = open.find((i) => VOWELS.has(s[i])) ?? open[0];
  return { pos, letter: s[pos] };
}

export const isVowel = (ch) => VOWELS.has(ch.toLowerCase());
