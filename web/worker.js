import { generate } from "./engine/index.js";
self.onmessage = (e) => {
  const { id, kind, diff, seed } = e.data;
  try { self.postMessage({ id, puzzle: generate(kind, diff, seed) }); }
  catch (err) { self.postMessage({ id, error: String(err) }); }
};
