import { S, svgEl, h, base, txt, msgBar } from "./_shared.js";
import * as queens from "../engine/queens.js";

const AUTOX_KEY = "raetsel.queens.autox";
const loadAutoX = () => { try { return localStorage.getItem(AUTOX_KEY) !== "0"; } catch { return true; } };
const saveAutoX = (on) => { try { localStorage.setItem(AUTOX_KEY, on ? "1" : "0"); } catch {} };
// Crown glyph, drawn in a 100×100 cell (centred). Pure path so the colour follows --ink / --bad in both themes.
const CROWN = "M20 64 L15 30 L35 46 L50 22 L65 46 L85 30 L80 64 Z M20 70 H80 V80 H20 Z";
// LinkedIn-like strong pastels – identical in light and dark mode (glyphs stay dark on top).
const PAL = ["#b9a0e6", "#ffc58f", "#93bbf5", "#b3dc9b", "#d9d9d9", "#ff8a73", "#e8ec84", "#9fd4d6", "#e7a6c8", "#c8b89a", "#a7c7a0", "#f2b8a8"];
const EMOJI = ["🟪", "🟧", "🟦", "🟩", "⬜", "🟥", "🟨", "🟦", "🟪", "🟫", "🟩", "🟥"];
const INK = "#1b1b1b", BORDER = "#111";

export function Queens(p, { onSolved, tools, haptic }) {
  const n = p.n, marks = Array.from({ length: n }, () => Array(n).fill(0)); // 0 empty, 1 ×, 2 queen
  let autoBy = new Map(); // cellKey -> Set(queenKey) that auto-placed the × there
  let autoX = loadAutoX();
  const key = (r, c) => r * 64 + c, rc = (k) => [Math.floor(k / 64), k % 64];
  const b = base(n); const xs = [], crowns = [], shades = [];
  for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) {
    b.layers.bg.append(svgEl("rect", { x: c * S, y: r * S, width: S, height: S, fill: PAL[p.regions[r][c] % PAL.length] }));
    const sh = svgEl("rect", { x: c * S, y: r * S, width: S, height: S, fill: "#000", "fill-opacity": 0, style: "pointer-events:none" }); b.layers.cells.append(sh); shades.push(sh);
    const t = txt(c * S + S / 2, r * S + S / 2, "", 44); b.layers.top.append(t); xs.push(t);
    const q = svgEl("path", { d: CROWN, transform: `translate(${c * S} ${r * S}) scale(.72) translate(19 19)`, class: "cell-txt", "stroke-linejoin": "round", "stroke-width": 4, style: `fill:${INK};stroke:${INK}`, display: "none" });
    b.layers.top.append(q); crowns.push(q);
    if (c + 1 < n && p.regions[r][c] !== p.regions[r][c + 1]) b.layers.mid.append(svgEl("line", { x1: (c + 1) * S, y1: r * S, x2: (c + 1) * S, y2: (r + 1) * S, stroke: BORDER, "stroke-width": 6, "stroke-linecap": "square" }));
    if (r + 1 < n && p.regions[r][c] !== p.regions[r + 1][c]) b.layers.mid.append(svgEl("line", { x1: c * S, y1: (r + 1) * S, x2: (c + 1) * S, y2: (r + 1) * S, stroke: BORDER, "stroke-width": 6, "stroke-linecap": "square" }));
  }
  // grid lines from base(): thin dark lines on the pastels, thick black frame (same in both themes)
  for (const ln of b.layers.lines.children) {
    const thick = ln.getAttribute("stroke-width") === "4";
    ln.setAttribute("stroke", thick ? BORDER : "rgba(0,0,0,.28)"); ln.setAttribute("stroke-width", thick ? 8 : 1.5);
  }
  const setMsg = msgBar(tools, "Tippen: leer → × → ♛ · Ziehen malt ×");
  const autoBtn = h("button", { onclick: () => { autoX = !autoX; saveAutoX(autoX); autoBtn.textContent = `Auto-×: ${autoX ? "an" : "aus"}`; haptic(); } }, `Auto-×: ${autoX ? "an" : "aus"}`);
  tools.append(autoBtn);

  // ---- undo stack (snapshot of marks + autoBy per player action) ----
  const stack = [];
  const sig = () => marks.map((row) => row.join("")).join("|");
  const snapshot = () => ({ marks: marks.map((row) => row.slice()), autoBy: new Map([...autoBy].map(([k, s]) => [k, new Set(s)])) });
  const restore = (s) => { for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) marks[r][c] = s.marks[r][c]; autoBy = s.autoBy; };
  const push = () => { stack.push(snapshot()); if (stack.length > 500) stack.shift(); };

  // ---- metrics: regions of the first three correctly placed queens, in order of placement ----
  const firstGood = [], goodSeen = new Set();
  const noteGood = (r, c) => {
    if (p.solution[r] !== c || goodSeen.has(key(r, c))) return;
    goodSeen.add(key(r, c)); if (firstGood.length < 3) firstGood.push(p.regions[r][c]);
  };

  // ---- marks management ----
  const setManual = (r, c, v) => { marks[r][c] = v; autoBy.delete(key(r, c)); };
  const placeQueen = (r, c, forceX = false) => {
    marks[r][c] = 2; autoBy.delete(key(r, c)); noteGood(r, c);
    if (!autoX && !forceX) return;
    const qk = key(r, c);
    for (const k of queens.autoCells(p, r, c)) {
      const [rr, cc] = rc(k);
      if (marks[rr][cc] === 0) { marks[rr][cc] = 1; autoBy.set(k, new Set([qk])); }
      else if (marks[rr][cc] === 1 && autoBy.has(k)) autoBy.get(k).add(qk);
    }
  };
  const removeQueen = (r, c) => {
    marks[r][c] = 0; const qk = key(r, c);
    for (const k of queens.autoCells(p, r, c)) {
      const s = autoBy.get(k); if (!s || !s.delete(qk) || s.size) continue;
      autoBy.delete(k); const [rr, cc] = rc(k); if (marks[rr][cc] === 1) marks[rr][cc] = 0;
    }
  };

  // ---- rendering ----
  let solvedFired = false;
  const draw = () => {
    const qs = new Set(); for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) if (marks[r][c] === 2) qs.add(key(r, c));
    const bad = queens.conflicts(p, qs);
    const rowQ = Array(n).fill(false), colQ = Array(n).fill(false);
    for (const k of qs) { rowQ[Math.floor(k / 64)] = true; colQ[k % 64] = true; }
    for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) {
      const i = r * n + c, m = marks[r][c], isBad = bad.has(key(r, c));
      xs[i].textContent = m === 1 ? "×" : "";
      xs[i].setAttribute("style", "fill:rgba(0,0,0,.62)");
      if (m !== 2) crowns[i].setAttribute("display", "none"); else crowns[i].removeAttribute("display");
      crowns[i].setAttribute("style", isBad ? "fill:#d0221a;stroke:#d0221a" : `fill:${INK};stroke:${INK}`);
      shades[i].setAttribute("fill-opacity", m !== 2 && (rowQ[r] || colQ[c]) ? 0.1 : 0);
    }
    const left = n - qs.size;
    if (bad.size) setMsg("Konflikt: Königinnen bedrohen sich", true);
    else setMsg(left === 0 ? "Alle Königinnen gesetzt" : `Noch ${left} Königin${left === 1 ? "" : "nen"} · Ziehen malt ×`);
    if (!solvedFired && queens.isSolved(p, qs)) { solvedFired = true; onSolved(); }
  };


  // ---- input ----
  let paintVal = null, before = null;
  b.drag({
    onStart: ([r, c]) => { push(); before = sig(); paintVal = marks[r][c] === 0 ? 1 : 0; },
    onMove: ([r, c], start) => {
      if (marks[start[0]][start[1]] !== 2) setManual(start[0], start[1], paintVal);
      if (marks[r][c] !== 2) setManual(r, c, paintVal); draw();
    },
    onEnd: (moved, last, [r, c]) => {
      if (!moved) { const m = marks[r][c]; if (m === 0) setManual(r, c, 1); else if (m === 1) placeQueen(r, c); else removeQueen(r, c); haptic(); }
      if (sig() === before) stack.pop(); // nothing changed → no undo entry
      draw();
    },
  });

  // ---- hint (LinkedIn-style: reason + action, spotlight via base()) ----
  const AREA = { region: ["Der hervorgehobene Bereich muss", "Die hervorgehobenen Bereiche müssen je", "diesen Bereich", "diese Bereiche"],
    row: ["Die hervorgehobene Zeile muss", "Die hervorgehobenen Zeilen müssen je", "diese Zeile", "diese Zeilen"],
    col: ["Die hervorgehobene Spalte muss", "Die hervorgehobenen Spalten müssen je", "diese Spalte", "diese Spalten"] };
  const IN_AREA = { region: "in diesem Bereich", row: "in dieser Zeile", col: "in dieser Spalte" };
  const act = (fn) => () => { push(); fn(); draw(); };
  const hint = () => {
    const st = queens.nextHint(p, marks); if (!st) return null;
    const { kind } = st;
    if (kind === "wrongQueen") {
      const why = { row: "Sie steht in derselben Zeile wie eine andere 👑.", col: "Sie steht in derselben Spalte wie eine andere 👑.",
        region: "Sie steht im selben Bereich wie eine andere 👑.", touch: "Sie berührt eine andere 👑.",
        blocks: `Mit ihr bliebe ${IN_AREA[st.type]} kein Platz mehr für eine 👑.`,
        dead: "Mit ihr lässt sich das Rätsel nicht widerspruchsfrei zu Ende lösen." }[st.why];
      return { text: `Diese 👑 widerspricht der Lösung: ${why}\nEntfernen Sie sie.`, focus: st.focus, strike: [st.cell], apply: act(() => removeQueen(...st.cell)) };
    }
    if (kind === "wrongX") return { text: "Dieses × schließt eine Zelle aus, die für die Lösung gebraucht wird.\nEntfernen Sie es.", strike: [st.cell], apply: act(() => setManual(...st.cell, 0)) };
    const cross = (cells) => act(() => { for (const [r, c] of cells) if (marks[r][c] === 0) setManual(r, c, 1); });
    if (kind === "confine") {
      const [one, many] = AREA[st.from], blk = AREA[st.to][st.k > 1 ? 3 : 2];
      const head = st.k > 1 ? `${many} eine 👑 enthalten.` : `${one} eine 👑 enthalten.`;
      const cellsTxt = st.strike.length > 1 ? "den gestreiften Zellen" : "der gestreiften Zelle";
      return { text: `${head} Eine 👑 in ${cellsTxt} blockiert ${blk}.\nEntfernen Sie ${st.strike.length > 1 ? "die gestreiften Zellen" : "die gestreifte Zelle"}.`,
        focus: st.focus, strike: st.strike, apply: cross(st.strike) };
    }
    if (kind === "blocks") return { text: `${AREA[st.type][0]} eine 👑 enthalten. Eine 👑 in der gestreiften Zelle blockiert ${AREA[st.type][2]}.\nEntfernen Sie die gestreifte Zelle.`,
      focus: st.focus, strike: [st.cell], apply: cross([st.cell]) };
    const placeIt = act(() => placeQueen(...st.cell, true));
    if (kind === "single") return { text: `Alle anderen Zellen ${IN_AREA[st.type]} sind ausgeschlossen.\nSetzen Sie eine 👑 in die hervorgehobene Zelle.`,
      focus: st.focus, target: [st.cell], strike: st.strike, apply: placeIt };
    // fallback
    return { text: "Jede andere freie Zelle dieses Bereichs führt zum Widerspruch: Danach bliebe für einen Bereich, eine Zeile oder Spalte kein Platz mehr.\nSetzen Sie eine 👑 in die hervorgehobene Zelle.",
      focus: st.focus, target: [st.cell], strike: st.strike, apply: placeIt };
  };

  // ---- public actions ----
  const canUndo = () => stack.length > 0;
  const undo = () => {
    if (!stack.length) return false;
    restore(stack.pop()); draw(); return true;
  };
  const clear = () => {
    if (sig() === marks.map((row) => "0".repeat(n)).join("|")) return false;
    push(); for (let r = 0; r < n; r++) marks[r].fill(0); autoBy = new Map(); draw(); return true;
  };
  const metrics = () => ({ line: `Erste 👑: ${firstGood.map((g) => EMOJI[g % 12]).join(" ")}`.trim() });

  draw();
  return { ...b, hint, undo, canUndo, clear, metrics };
}
