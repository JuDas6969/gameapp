import * as sudoku from "./sudoku.js";
import * as queens from "./queens.js";
import * as tango from "./tango.js";
import * as zip from "./zip.js";
import * as patches from "./patches.js";
import * as nonogram from "./nonogram.js";
import * as hashi from "./hashi.js";
import * as slitherlink from "./slitherlink.js";
import * as nurikabe from "./nurikabe.js";
import * as kakuro from "./kakuro.js";
import * as woertle from "./woertle.js";
import * as wortpfad from "./wortpfad.js";
import * as treffpunkt from "./treffpunkt.js";
import * as wortleiter from "./wortleiter.js";
import * as kreuzwort from "./kreuzwort.js";
export * from "./core.js";

export const ENGINES = { sudoku, queens, tango, zip, patches, nonogram, hashi, slitherlink, nurikabe, kakuro, woertle, wortpfad, treffpunkt, wortleiter, kreuzwort };

export function generate(kind, diff, seed, opts) {
  return ENGINES[kind].generate(diff, seed, opts || {});
}
export function randomSeed() {
  const a = new Uint32Array(2); (globalThis.crypto || require("crypto").webcrypto).getRandomValues(a);
  return ((BigInt(a[0]) << 32n) | BigInt(a[1])).toString();
}
