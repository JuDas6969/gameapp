// Wortpfad-Board: Buchstabengitter, Pfade in 8 Richtungen ziehen; jeder gültige Pfad bleibt farbig stehen.
import { S, svgEl, h, base, txt, msgBar, REGION } from "./_shared.js";
import * as wp from "../engine/wortpfad.js";
import { isWord } from "../data/words.js";

const mid = (r, c) => [c * S + S / 2, r * S + S / 2];
const HINT_TTL = 20000; // ms – zweiter Tipp innerhalb dieses Fensters zeigt den ganzen Pfad
const pts = (path) => path.map(([r, c]) => mid(r, c).join(",")).join(" ");

export function Wortpfad(p, { onSolved, tools, haptic }) {
  const n = p.n, b = base(n, { bg: "rgba(127,127,127,.06)" });
  let found = [];            // [{ path, color }]
  let cur = [];              // Pfad in Arbeit
  const history = [];        // Snapshots von `found` pro Aktion
  let mistakes = 0, colorSeq = 0;

  // Ebenen: gefundene Pfade (cells), aktueller Pfad (mid), Buchstaben (top)
  const foundG = svgEl("g"); b.layers.cells.append(foundG);
  const curG = svgEl("g");
  const curLine = svgEl("polyline", { fill: "none", stroke: "var(--accent)", "stroke-width": S * 0.5, "stroke-linecap": "round", "stroke-linejoin": "round", opacity: .85 });
  curG.append(curLine);
  const previewLine = svgEl("polyline", { fill: "none", stroke: "var(--ok)", "stroke-width": S * 0.3, "stroke-linecap": "round", "stroke-linejoin": "round", "stroke-dasharray": `${S * 0.22} ${S * 0.22}`, opacity: .85, visibility: "hidden" });
  const fx = svgEl("g");
  b.layers.mid.append(curG, previewLine, fx);
  const letterEls = [];
  for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) {
    const [x, y] = mid(r, c);
    const t = txt(x, y, p.letters[r][c], S * 0.5); b.layers.top.append(t); letterEls[r * n + c] = t;
  }

  // Werkzeugleiste: aktuelles Wort groß, Längenhinweis, Löschen
  const setMsg = msgBar(tools, "Wörter durch Ziehen verbinden");
  const msgEl = tools.lastElementChild;
  const lenRow = h("div", { class: "msg", style: "flex:1 0 100%;text-align:center;font-weight:600" });
  const clearBtn = h("button", { onclick: () => b.clear() }, "Löschen");
  tools.append(lenRow, clearBtn);

  const occupied = () => { const m = new Map(); found.forEach((f, i) => f.path.forEach(([r, c]) => m.set(r * n + c, i))); return m; };
  const cellLen = (L) => L === 1 ? "1 Buchstabe" : `${L} Buchstaben`;

  const drawLengths = () => {
    const counts = {}; for (const f of found) counts[f.path.length] = (counts[f.path.length] || 0) + 1;
    lenRow.replaceChildren(`${p.words.length} Wörter: `);
    p.words.forEach((w, i) => {
      const L = w.word.length, done = counts[L] > 0; if (done) counts[L]--;
      lenRow.append(h("span", { style: done ? "text-decoration:line-through;opacity:.5" : "color:var(--ink)" }, String(L)));
      if (i < p.words.length - 1) lenRow.append(" · ");
    });
  };
  const draw = () => {
    if (pending && pending.key !== stateKey()) clearPreview();
    foundG.replaceChildren(...found.map((f) => svgEl("polyline", { points: pts(f.path), fill: "none", stroke: f.color, "stroke-width": S * 0.62, "stroke-linecap": "round", "stroke-linejoin": "round", opacity: .5 })));
    const occ = occupied();
    letterEls.forEach((t, k) => { t.style.opacity = occ.has(k) ? .9 : 1; });
    curLine.setAttribute("points", pts(cur));
    curG.setAttribute("visibility", cur.length ? "visible" : "hidden");
    clearBtn.disabled = !found.length && !cur.length;
    drawLengths();
  };
  const showWord = () => {
    if (!cur.length) { msgEl.style.cssText = ""; setMsg(found.length ? "" : "Wörter durch Ziehen verbinden"); return; }
    msgEl.style.cssText = "font-size:22px;font-weight:800;letter-spacing:.12em;color:var(--ink);text-align:center";
    setMsg(wp.wordOf(p, cur).toUpperCase());
  };

  // --- Tipp-Vorschau ---
  const stateKey = () => found.map((f) => f.path.map(([r, c]) => r * n + c).join("-")).sort().join("|");
  let pending = null; // { key, hint, at }
  const clearPreview = () => { pending = null; previewLine.setAttribute("visibility", "hidden"); fx.replaceChildren(); };
  const flash = (nodes, ms) => { fx.append(...nodes); setTimeout(() => nodes.forEach((x) => x.remove()), ms); };
  const cellMark = (r, c, fill) => svgEl("rect", { x: c * S + 6, y: r * S + 6, width: S - 12, height: S - 12, rx: 14, fill, opacity: .45 });

  // --- Gesten ---
  let tapIdx = -1; // Tap auf gefundenen Pfad → entfernen
  const commit = (snapshot) => history.push(snapshot);
  const extend = (cell) => {
    if (!cell) return;
    const [r, c] = cell, L = cur.length;
    if (L && cur[L - 1][0] === r && cur[L - 1][1] === c) return;
    if (L >= 2 && cur[L - 2][0] === r && cur[L - 2][1] === c) { cur.pop(); draw(); showWord(); return; }
    if (cur.some(([a, bb]) => a === r && bb === c)) return;
    if (L && !wp.adjacent(cur[L - 1], cell)) return; // Felder übersprungen (schnelles Ziehen)
    if (occupied().has(r * n + c)) return;
    cur.push([r, c]); draw(); showWord();
  };
  const shake = () => {
    mistakes++; haptic(25);
    const line = svgEl("polyline", { points: pts(cur), fill: "none", stroke: "var(--bad)", "stroke-width": S * 0.5, "stroke-linecap": "round", "stroke-linejoin": "round", opacity: .8 });
    const g = svgEl("g"); g.append(line); fx.append(g);
    try { g.animate([{ transform: "translateX(0)" }, { transform: "translateX(-10px)" }, { transform: "translateX(10px)" }, { transform: "translateX(-7px)" }, { transform: "translateX(7px)" }, { transform: "translateX(0)" }], { duration: 380, easing: "ease-in-out" }); } catch {}
    setTimeout(() => g.remove(), 400);
  };
  // Eigene Zeigerlogik statt b.drag: beim Ziehen zählt ein Feld erst, wenn der Finger nahe der Feldmitte ist –
  // sonst streift man bei Diagonalen die orthogonalen Nachbarn mit.
  const HIT = S * 0.38;
  const cellNear = (ev, loose) => {
    const rect = b.svg.getBoundingClientRect();
    const x = ((ev.clientX - rect.left) / rect.width) * b.W, y = ((ev.clientY - rect.top) / rect.height) * b.H;
    const c = Math.floor(x / S), r = Math.floor(y / S);
    if (!(r >= 0 && c >= 0 && r < n && c < n)) return null;
    if (!loose) { const [cx, cy] = mid(r, c); if (Math.hypot(x - cx, y - cy) > HIT) return null; }
    return [r, c];
  };
  let active = false, moved = false;
  b.svg.addEventListener("pointerdown", (e) => {
    e.preventDefault(); const cell = cellNear(e, true); if (!cell) return;
    active = true; moved = false; b.svg.setPointerCapture?.(e.pointerId);
    cur = []; tapIdx = occupied().get(cell[0] * n + cell[1]) ?? -1;
    if (tapIdx < 0) extend(cell);
  });
  b.svg.addEventListener("pointermove", (e) => {
    if (!active) return; const cell = cellNear(e, false); if (!cell) return;
    const L = cur.length; if (L && cur[L - 1][0] === cell[0] && cur[L - 1][1] === cell[1]) return;
    moved = true; if (tapIdx < 0) extend(cell);
  });
  const end = () => {
    if (!active) return; active = false;
    if (tapIdx >= 0) { // Tap auf belegten Pfad → entfernen
      if (!moved) { commit(found.slice()); found.splice(tapIdx, 1); setMsg("Pfad entfernt"); draw(); }
      tapIdx = -1; return;
    }
    if (!cur.length) return;
    const w = wp.wordOf(p, cur);
    if (cur.length >= 3 && isWord(w)) {
      commit(found.slice()); found.push({ path: cur, color: REGION(colorSeq++) }); haptic();
      cur = []; msgEl.style.cssText = ""; setMsg(`${w.toUpperCase()} ✓`); draw();
      if (wp.isSolved(p, found.map((f) => f.path))) onSolved();
    } else {
      if (cur.length >= 2) shake();
      msgEl.style.cssText = ""; setMsg(cur.length < 3 ? "" : `${w.toUpperCase()} – kein Wort`, true); cur = []; draw();
    }
  };
  b.svg.addEventListener("pointerup", end); b.svg.addEventListener("pointercancel", end);

  // --- Board-API ---
  b.canUndo = () => history.length > 0;
  b.undo = () => {
    if (!history.length) return false;
    found = history.pop(); cur = []; msgEl.style.cssText = ""; setMsg(""); clearPreview(); draw(); return true;
  };
  b.clear = () => {
    if (!found.length && !cur.length) return;
    if (found.length) history.push(found.slice());
    found = []; cur = []; msgEl.style.cssText = ""; setMsg(""); clearPreview(); draw();
  };
  b.metrics = () => ({ mistakes, line: mistakes === 0 ? "Keine Fehlversuche" : mistakes === 1 ? "1 Fehlversuch" : `${mistakes} Fehlversuche` });
  b.destroy = () => { clearPreview(); };

  b.hint = () => {
    const key = stateKey();
    // Stufe 2: gleicher Stand, innerhalb 20 s → ganzen Pfad gestrichelt zeigen
    if (pending && pending.key === key && Date.now() - pending.at < HINT_TTL) {
      const hnt = pending.hint;
      previewLine.setAttribute("points", pts(hnt.path)); previewLine.setAttribute("visibility", "visible");
      pending.at = Date.now();
      setMsg(`So verläuft das Wort mit ${cellLen(hnt.path.length)}`);
      return `So verläuft das Wort (${cellLen(hnt.path.length)})`;
    }
    clearPreview();
    const hnt = wp.findHint(p, found.map((f) => f.path), cur);
    if (!hnt) return null;
    if (hnt.blocked) {
      // Gefundene Pfade blockieren alle Lösungswörter → Konflikte rot zeigen
      const occ = occupied(), bad = new Set();
      for (const [r, c] of hnt.path) { const i = occ.get(r * n + c); if (i != null) bad.add(i); }
      flash([...bad].flatMap((i) => found[i].path.map(([r, c]) => cellMark(r, c, "var(--bad)"))), 1200);
      setMsg("Ein markierter Pfad passt nicht – antippen entfernt ihn", true);
      return "Markierter Pfad passt nicht zur Lösung";
    }
    // Stufe 1: Startfeld (bzw. nächsten Buchstaben) hervorheben + Länge nennen
    const [r, c] = hnt.next;
    const mark = cellMark(r, c, "var(--ok)"); mark.setAttribute("opacity", .55); fx.append(mark);
    pending = { key, hint: hnt, at: Date.now() };
    setTimeout(() => { if (pending && Date.now() - pending.at >= HINT_TTL) clearPreview(); }, HINT_TTL + 50);
    const what = hnt.index > 0 ? `Weiter mit ${p.letters[r][c]}` : `Hier beginnt ein Wort mit ${cellLen(hnt.path.length)}`;
    setMsg(`${what} – nochmal tippen zeigt den Pfad`);
    return `${what} – Tipp nochmal tippen zeigt den ganzen Pfad`;
  };

  draw(); return b;
}
