// Wortpfad-Board (LinkedIn „Wend“): Buchstabengitter mit Löchern, Pfade waagrecht/senkrecht ziehen; gefundene Wörter
// bleiben als Farbband mit Chevrons stehen. Unter dem Gitter je Lösungswort eine Zeile leerer Kacheln.
import { S, svgEl, h, base, txt, msgBar, REGION } from "./_shared.js";
import * as wp from "../engine/wortpfad.js";
import { isWord } from "../data/words.js";

const mid = (r, c) => [c * S + S / 2, r * S + S / 2];
const pts = (path) => path.map(([r, c]) => mid(r, c).join(",")).join(" ");
const key = (n, [r, c]) => r * n + c;

export function Wortpfad(p, { onSolved, tools, haptic }) {
  const n = p.n, b = base(n, { bg: "rgba(127,127,127,.06)" });
  const W = n * S, G = n * S;

  // Lösungswörter als Zeilen, nach Länge sortiert; jede Zeile hat eine feste Farbe
  const rows = p.words.map((w, wi) => ({ wi, word: w.word, path: w.path, L: w.word.length }))
    .sort((a, b2) => a.L - b2.L || a.wi - b2.wi);
  rows.forEach((row, i) => { row.color = REGION(i); });
  const revealed = rows.map(() => 0); // per Tipp enthüllte Buchstaben je Zeile
  let lastHintRow = -1;

  let found = [];            // [{ path }]
  let cur = [];              // Pfad in Arbeit
  const history = [];        // Snapshots von `found` pro Aktion
  let mistakes = 0;

  // --- Layout der Wortzeilen unter dem Gitter ---
  const cols = rows.length > 4 ? 2 : 1, perCol = Math.ceil(rows.length / cols), colW = W / cols;
  const maxLen = Math.max(...rows.map((r) => r.L));
  const T = Math.min(S * (cols > 1 ? 0.42 : 0.48), (colW - S * 0.2) / (maxLen + 1.3)), TG = T * 0.12, RH = T * 1.22, GAP = S * 0.3;
  const H = G + GAP + perCol * RH;
  b.svg.setAttribute("viewBox", `0 0 ${W} ${H}`);
  b.H = H; b.aspect = [W, H];
  b.compact = H > W * 1.6; // sehr hohe Boards (viele Wortzeilen) begrenzt app.js in der Höhe
  const rowsG = svgEl("g", { "pointer-events": "none" }); b.svg.append(rowsG);
  const rowPos = rows.map((row, i) => {
    const col = Math.floor(i / perCol), k = i % perCol, w = row.L * T + (row.L - 1) * TG;
    return { x: col * colW + (colW - w - T * 0.9) / 2, y: G + GAP + k * RH };
  });

  // --- Ebenen: Tönung + Bänder (cells), aktueller Pfad (mid), Buchstaben/Chevrons/Löcher (top) ---
  const tintG = svgEl("g"), bandG = svgEl("g"), markG = svgEl("g");
  b.layers.cells.append(tintG, bandG, markG);
  const curTint = svgEl("g");
  const curLine = svgEl("polyline", { fill: "none", stroke: "var(--accent)", "stroke-width": S * 0.46, "stroke-linecap": "round", "stroke-linejoin": "round", opacity: .5 });
  const fx = svgEl("g");
  b.layers.mid.append(curTint, curLine, fx);
  const chevG = svgEl("g"), badgeG = svgEl("g"), holeG = svgEl("g");
  for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) if (p.letters[r][c]) {
    const [x, y] = mid(r, c); b.layers.top.append(txt(x, y, p.letters[r][c], S * 0.5));
  }
  for (const { r, c, w, h: hh } of p.holes || []) {
    holeG.append(svgEl("rect", { x: c * S + 2, y: r * S + 2, width: w * S - 4, height: hh * S - 4, fill: "var(--bg)" }));
    holeG.append(svgEl("rect", { x: c * S + 6, y: r * S + 6, width: w * S - 12, height: hh * S - 12, rx: 16, fill: "rgba(127,127,127,.42)" }));
  }
  b.layers.top.prepend(holeG); b.layers.top.append(chevG, badgeG);

  // Werkzeugleiste: aktuelles Wort groß + Löschen
  const setMsg = msgBar(tools, "Wörter durch Ziehen verbinden");
  const msgEl = tools.lastElementChild;
  const clearBtn = h("button", { onclick: () => b.clear() }, "Löschen");
  tools.append(clearBtn);

  const occupied = () => { const m = new Map(); found.forEach((f, i) => f.path.forEach((cell) => m.set(key(n, cell), i))); return m; };
  const rowOfPath = (path) => rows.findIndex((row) => wp.samePath(row.path, path));
  /** gefundene Pfade → Zeilen: erst exakte Lösungswörter, dann andere gültige Wörter gleicher Länge */
  const assign = () => {
    const rowFound = rows.map(() => -1), foundRow = found.map(() => -1);
    found.forEach((f, i) => { const ri = rowOfPath(f.path); if (ri >= 0 && rowFound[ri] < 0) { rowFound[ri] = i; foundRow[i] = ri; } });
    found.forEach((f, i) => {
      if (foundRow[i] >= 0) return;
      const ri = rows.findIndex((row, j) => rowFound[j] < 0 && row.L === f.path.length && !found.some((g) => wp.samePath(g.path, row.path)));
      if (ri >= 0) { rowFound[ri] = i; foundRow[i] = ri; }
    });
    return { rowFound, foundRow };
  };
  const colorOf = (foundRow, i) => foundRow[i] >= 0 ? rows[foundRow[i]].color : REGION(rows.length + i);

  const chevron = (a, c2) => {
    const [x1, y1] = mid(...a), [x2, y2] = mid(...c2), ang = Math.atan2(y2 - y1, x2 - x1) * 180 / Math.PI;
    return svgEl("path", { d: "M -6 -9 L 3 0 L -6 9", fill: "none", stroke: "var(--ink)", "stroke-width": 4.5, "stroke-linecap": "round", "stroke-linejoin": "round", opacity: .55,
      transform: `translate(${(x1 + x2) / 2} ${(y1 + y2) / 2}) rotate(${ang})` });
  };
  const tint = (path, fill, op) => path.map(([r, c]) => svgEl("rect", { x: c * S + 3, y: r * S + 3, width: S - 6, height: S - 6, rx: 10, fill, opacity: op }));

  const drawRows = (rowFound, foundColor) => {
    rowsG.replaceChildren();
    rows.forEach((row, i) => {
      const { x, y } = rowPos[i], fi = rowFound[i], done = fi >= 0;
      const letters = done ? wp.wordOf(p, found[fi].path).toUpperCase() : row.word.toUpperCase();
      const color = done ? foundColor[fi] : row.color;
      for (let j = 0; j < row.L; j++) {
        const tx = x + j * (T + TG), show = done || j < revealed[i];
        rowsG.append(svgEl("rect", { x: tx, y, width: T, height: T, rx: T * 0.2, fill: show ? color : "none", stroke: show ? "none" : "var(--line)", "stroke-width": 3 }));
        if (show) rowsG.append(txt(tx + T / 2, y + T / 2, letters[j], T * 0.56));
      }
      if (done) rowsG.append(txt(x + row.L * (T + TG) + T * 0.35, y + T / 2, "✓", T * 0.6, "cell-txt", { style: "fill:var(--ok)" }));
    });
  };

  const draw = () => {
    const { rowFound, foundRow } = assign();
    const colors = found.map((_, i) => colorOf(foundRow, i));
    tintG.replaceChildren(...found.flatMap((f, i) => tint(f.path, colors[i], .55)));
    bandG.replaceChildren(...found.map((f, i) => svgEl("polyline", { points: pts(f.path), fill: "none", stroke: colors[i], "stroke-width": S * 0.56, "stroke-linecap": "round", "stroke-linejoin": "round" })));
    // per Tipp enthüllte Buchstaben (noch nicht gefundene Wörter): farbige Kreise
    const occ = occupied();
    markG.replaceChildren(...rows.flatMap((row, i) => rowFound[i] >= 0 ? [] : row.path.slice(0, revealed[i]).filter((cell) => !occ.has(key(n, cell)))
      .map(([r, c]) => { const [x, y] = mid(r, c); return svgEl("circle", { cx: x, cy: y, r: S * 0.36, fill: row.color, stroke: "var(--ink)", "stroke-width": 3, "stroke-opacity": .35 }); })));
    const all = [...found.map((f) => f.path), ...(cur.length ? [cur] : [])];
    chevG.replaceChildren(...all.flatMap((path) => path.slice(1).map((cell, i) => chevron(path[i], cell))));
    badgeG.replaceChildren(...found.flatMap((f) => {
      const [r, c] = f.path[0], x = c * S + S * 0.2, y = r * S + S * 0.2;
      return [svgEl("circle", { cx: x, cy: y, r: S * 0.14, fill: "var(--ink)" }), txt(x, y, "✓", S * 0.2, "cell-txt", { style: "fill:var(--card)" })];
    }));
    curTint.replaceChildren(...tint(cur, "var(--accent)", .18));
    curLine.setAttribute("points", pts(cur));
    curLine.setAttribute("visibility", cur.length ? "visible" : "hidden");
    clearBtn.disabled = !found.length && !cur.length;
    drawRows(rowFound, colors);
  };
  const showWord = () => {
    if (!cur.length) { msgEl.style.cssText = ""; setMsg(found.length ? "" : "Wörter durch Ziehen verbinden"); return; }
    msgEl.style.cssText = "font-size:22px;font-weight:800;letter-spacing:.12em;color:var(--ink);text-align:center";
    setMsg(wp.wordOf(p, cur).toUpperCase());
  };

  // --- Gesten ---
  let tapIdx = -1; // Tap auf gefundenen Pfad → entfernen
  const extend = (cell) => {
    if (!cell) return;
    const [r, c] = cell, L = cur.length;
    if (L && cur[L - 1][0] === r && cur[L - 1][1] === c) return;
    if (L >= 2 && cur[L - 2][0] === r && cur[L - 2][1] === c) { cur.pop(); draw(); showWord(); return; }
    if (cur.some(([a, bb]) => a === r && bb === c)) return;
    if (L && !wp.adjacent(cur[L - 1], cell)) return; // nur waagrecht/senkrecht, nichts überspringen
    if (occupied().has(r * n + c)) return;
    cur.push([r, c]); draw(); showWord();
  };
  const shake = () => {
    mistakes++; haptic(25);
    const line = svgEl("polyline", { points: pts(cur), fill: "none", stroke: "var(--bad)", "stroke-width": S * 0.46, "stroke-linecap": "round", "stroke-linejoin": "round", opacity: .8 });
    const g = svgEl("g"); g.append(line); fx.append(g);
    try { g.animate([{ transform: "translateX(0)" }, { transform: "translateX(-10px)" }, { transform: "translateX(10px)" }, { transform: "translateX(-7px)" }, { transform: "translateX(7px)" }, { transform: "translateX(0)" }], { duration: 380, easing: "ease-in-out" }); } catch {}
    setTimeout(() => g.remove(), 400);
  };
  // Beim Ziehen zählt ein Feld erst nahe der Feldmitte (verhindert Mitnehmen beim Eckenschneiden)
  const HIT = S * 0.44;
  const cellNear = (ev, loose) => {
    const rect = b.svg.getBoundingClientRect();
    const x = ((ev.clientX - rect.left) / rect.width) * W, y = ((ev.clientY - rect.top) / rect.height) * H;
    const c = Math.floor(x / S), r = Math.floor(y / S);
    if (!wp.isFree(p, r, c)) return null;
    if (!loose) { const [cx, cy] = mid(r, c); if (Math.hypot(x - cx, y - cy) > HIT) return null; }
    return [r, c];
  };
  let active = false, moved = false;
  b.svg.addEventListener("pointerdown", (e) => {
    e.preventDefault(); const cell = cellNear(e, true); if (!cell) return;
    active = true; moved = false; b.svg.setPointerCapture?.(e.pointerId);
    cur = []; tapIdx = occupied().get(key(n, cell)) ?? -1;
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
      if (!moved) { history.push(found.slice()); found.splice(tapIdx, 1); setMsg("Pfad entfernt"); draw(); }
      tapIdx = -1; return;
    }
    if (!cur.length) return;
    const w = wp.wordOf(p, cur);
    if (cur.length >= 3 && isWord(w)) {
      history.push(found.slice()); found.push({ path: cur }); haptic();
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
    found = history.pop(); cur = []; msgEl.style.cssText = ""; setMsg(""); draw(); return true;
  };
  b.clear = () => {
    if (!found.length && !cur.length) return false;
    if (found.length) history.push(found.slice());
    found = []; cur = []; msgEl.style.cssText = ""; setMsg(""); draw(); return true;
  };
  b.metrics = () => ({ mistakes, line: mistakes === 0 ? "Keine Fehlversuche" : mistakes === 1 ? "1 Fehlversuch" : `${mistakes} Fehlversuche` });
  b.destroy = () => {};

  // Tipp wie LinkedIn: sofort ausgeführt – Startbuchstabe (bzw. nächster Buchstabe) eines fehlenden Worts wird enthüllt
  b.hint = () => {
    cur = [];
    // 1. falscher Pfad hat Vorrang: jedes Feld gehört zu einem Lösungswort, also blockiert er die Lösung
    const wrong = found.findIndex((f) => rowOfPath(f.path) < 0);
    if (wrong >= 0) {
      const path = found[wrong].path;
      return {
        text: "Dieser Pfad blockiert ein Wort der Lösung.\nEntfernen Sie ihn.",
        strike: path.map(([r, c]) => [r, c]),
        apply: () => { const i = found.indexOf(found.find((f) => f.path === path)); if (i < 0) return; history.push(found.slice()); found.splice(i, 1); setMsg(""); draw(); return "Pfad entfernt."; },
      };
    }
    const done = new Set(found.map((f) => rowOfPath(f.path)));
    const open = rows.map((_, i) => i).filter((i) => !done.has(i));
    if (!open.length) return null;
    let ri = open.includes(lastHintRow) && revealed[lastHintRow] < rows[lastHintRow].L ? lastHintRow : -1;
    if (ri < 0) {
      const fresh = open.filter((i) => revealed[i] === 0), cand = fresh.length ? fresh : open.filter((i) => revealed[i] < rows[i].L);
      if (!cand.length) { // alles enthüllt, nur noch nachziehen
        const row = rows[open[0]];
        return { text: `Alle Buchstaben von ${row.word.toUpperCase()} sind enthüllt.\nZiehen Sie den Pfad von Kreis zu Kreis nach.`, focus: row.path };
      }
      const score = (i) => ({ deadend: 0, corner: 1 }[wp.startReason(p, rows[i].path[0])] ?? 2);
      ri = cand.slice().sort((a, b2) => score(a) - score(b2) || a - b2)[0];
    }
    const row = rows[ri], k = ++revealed[ri]; lastHintRow = ri;
    draw();
    let text;
    if (k === 1) {
      const why = wp.startReason(p, row.path[0]);
      text = why === "corner" ? `Dieses Wort hat ${row.L} Buchstaben und beginnt hier – es ist das einzige Wort, das in diese Ecke passt.`
        : why === "deadend" ? `Dieses Wort hat ${row.L} Buchstaben und beginnt hier – das Feld hat nur einen freien Nachbarn, also muss hier ein Wort beginnen oder enden.`
        : "Dieses Wort beginnt hier.";
      text += "\nDer erste Buchstabe ist enthüllt.";
    } else {
      text = `Dieses Wort hat ${row.L} Buchstaben und führt vom markierten Feld direkt weiter.\nDer ${k}. Buchstabe ist enthüllt.`;
    }
    return { text, focus: row.path.slice(0, k).map(([r, c]) => [r, c]) };
  };

  draw(); return b;
}
