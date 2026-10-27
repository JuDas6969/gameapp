import { S, svgEl, h, base, txt, msgBar } from "./_shared.js";
import * as hashi from "../engine/hashi.js";

const mid = (r, c) => [c * S + S / 2, r * S + S / 2];
const pk = (a, b) => (a < b ? `${a}-${b}` : `${b}-${a}`);

export function Hashi(p, { onSolved, tools, haptic }) {
  const n = p.n, b = base(n, { bg: "rgba(127,127,127,.06)" });
  b.layers.lines.replaceChildren(); // keine Gitterlinien, nur Hintergrund
  const { edges, byPair, cross, at } = hashi.buildEdges(p);
  const cellEdge = new Map(); edges.forEach((e, i) => { for (const k of e.cells) { if (!cellEdge.has(k)) cellEdge.set(k, []); cellEdge.get(k).push(i); } });
  const val = new Array(edges.length).fill(0); // Brückenzahl je Kante

  // Brücken (cells-Layer, unten), Inseln darüber (mid-Layer), Vorschau + Effekte (top-Layer)
  const bridgeG = svgEl("g"); b.layers.cells.append(bridgeG);
  const preview = svgEl("line", { stroke: "var(--accent)", "stroke-width": S * 0.08, "stroke-dasharray": `${S * 0.12} ${S * 0.1}`, "stroke-linecap": "round", opacity: .6, visibility: "hidden" });
  const fx = svgEl("g"); b.layers.top.append(preview, fx);
  const nodes = p.islands.map((is) => {
    const [cx, cy] = mid(is.r, is.c);
    const circ = svgEl("circle", { cx, cy, r: S * 0.36, fill: "var(--card)", stroke: "var(--line-strong)", "stroke-width": 5 });
    const t = txt(cx, cy, String(is.num), 40, "cell-txt", { fill: "var(--ink)" });
    b.layers.mid.append(circ, t); return { circ, t };
  });

  const setMsg = msgBar(tools, "Von Insel zu Insel ziehen");
  const clearBtn = h("button", { onclick: () => clear() }, "Löschen");
  tools.append(clearBtn);

  // ---- Undo (ein Eintrag je Geste) + Metrik „Umbauten“ (entfernte/reduzierte Brücken) ----
  const undoStack = []; let rebuilds = 0;
  const pushUndo = () => { undoStack.push(val.slice()); if (undoStack.length > 200) undoStack.shift(); };
  const undo = () => { if (!undoStack.length) return false; const s = undoStack.pop(); for (let i = 0; i < val.length; i++) val[i] = s[i]; setMsg(""); draw(); return true; };
  const canUndo = () => undoStack.length > 0;
  const clear = () => { if (val.some(Boolean)) pushUndo(); val.fill(0); setMsg("Von Insel zu Insel ziehen"); draw(); };
  const metrics = () => ({ line: `${rebuilds} Umbauten` });

  const bridges = () => edges.map((e, i) => ({ a: e.a, b: e.b, count: val[i] })).filter((x) => x.count);
  const draw = () => {
    bridgeG.replaceChildren();
    edges.forEach((e, i) => {
      if (!val[i]) return;
      const [x1, y1] = mid(p.islands[e.a].r, p.islands[e.a].c), [x2, y2] = mid(p.islands[e.b].r, p.islands[e.b].c);
      const horiz = y1 === y2, off = val[i] === 2 ? S * 0.11 : 0;
      for (const o of val[i] === 2 ? [-off, off] : [0]) {
        bridgeG.append(svgEl("line", { x1: x1 + (horiz ? 0 : o), y1: y1 + (horiz ? o : 0), x2: x2 + (horiz ? 0 : o), y2: y2 + (horiz ? o : 0), stroke: "var(--accent)", "stroke-width": S * 0.08, "stroke-linecap": "round" }));
      }
    });
    const st = hashi.status(p, bridges());
    nodes.forEach(({ circ }, i) => {
      const num = p.islands[i].num, c = st.counts[i];
      const state = c > num ? "over" : c === num ? "ok" : "open";
      circ.setAttribute("stroke", state === "over" ? "var(--bad)" : state === "ok" ? "var(--ok)" : "var(--line-strong)");
      circ.setAttribute("fill", state === "over" ? "var(--bad)" : state === "ok" ? "var(--ok)" : "var(--card)");
      circ.setAttribute("fill-opacity", state === "open" ? 1 : state === "ok" ? .22 : .35);
    });
    clearBtn.disabled = !val.some(Boolean);
  };

  /** Setzt Kante i auf cnt; lehnt Kreuzungen ab. Gibt true bei Erfolg. */
  const setEdge = (i, cnt) => {
    if (cnt > 0 && cross[i].some((f) => val[f] > 0)) { setMsg("Brücken dürfen sich nicht kreuzen", true); haptic(20); return false; }
    if (val[i] === cnt) return true;
    pushUndo(); if (cnt < val[i]) rebuilds++;
    val[i] = cnt; setMsg(""); haptic(); draw();
    if (hashi.isSolved(p, bridges())) onSolved();
    return true;
  };
  const cycle = (i) => setEdge(i, (val[i] + 1) % 3);

  // Ziel-Insel in Richtung des Fingers von Start-Insel aus (nächste sichtbare Insel)
  const targetFrom = (from, cell) => {
    const is = p.islands[from], dr = cell[0] - is.r, dc = cell[1] - is.c;
    if (!dr && !dc) return null;
    const [sr, sc] = Math.abs(dr) >= Math.abs(dc) ? [Math.sign(dr), 0] : [0, Math.sign(dc)];
    let r = is.r + sr, c = is.c + sc;
    while (r >= 0 && c >= 0 && r < n && c < n) { if (at[r][c] >= 0) return at[r][c]; r += sr; c += sc; }
    return null;
  };

  let from = null, target = null;
  b.drag({
    onStart: (cell) => { from = at[cell[0]][cell[1]] >= 0 ? at[cell[0]][cell[1]] : null; target = null; },
    onMove: (cell) => {
      if (from == null) return;
      target = targetFrom(from, cell);
      const [x1, y1] = mid(p.islands[from].r, p.islands[from].c);
      const [x2, y2] = target != null ? mid(p.islands[target].r, p.islands[target].c) : mid(cell[0], cell[1]);
      preview.setAttribute("x1", x1); preview.setAttribute("y1", y1); preview.setAttribute("x2", x2); preview.setAttribute("y2", y2);
      preview.setAttribute("visibility", "visible");
    },
    onEnd: (moved, cell) => {
      preview.setAttribute("visibility", "hidden");
      if (moved) {
        if (from != null && target != null && target !== from) { const i = byPair.get(pk(from, target)); if (i != null) cycle(i); }
      } else if (cell && at[cell[0]][cell[1]] < 0) {
        // Tippen: bestehende Brücke weiterschalten, sonst eindeutige Kandidatenkante anlegen
        const cand = cellEdge.get(cell[0] * 64 + cell[1]) || [];
        const active = cand.filter((i) => val[i] > 0);
        if (active.length) cycle(active[0]); else if (cand.length === 1) cycle(cand[0]);
      }
      from = null; target = null;
    },
  });

  const flash = (node, ms) => { fx.append(node); setTimeout(() => node.remove(), ms); return node; };
  // ---- Tipp (LinkedIn-Stil): Begründung + Spotlight; „Anzeigen“ führt aus (undo-fähig) ----
  const hint = () => {
    const hnt = hashi.explainHint(p, bridges()); if (!hnt) return null;
    const cellOf = (i) => [p.islands[i].r, p.islands[i].c];
    const apply = () => {
      pushUndo();
      for (const s of hnt.set) { const i = byPair.get(pk(s.a, s.b)); if (i == null) continue; if (s.count < val[i]) rebuilds++; val[i] = s.count; }
      setMsg(""); draw(); haptic(hnt.remove ? 20 : undefined);
      if (!hnt.remove) for (const s of hnt.set) { const [x1, y1] = mid(...cellOf(s.a)), [x2, y2] = mid(...cellOf(s.b)); flash(svgEl("line", { x1, y1, x2, y2, stroke: "var(--ok)", "stroke-width": S * 0.45, "stroke-linecap": "round", opacity: .45 }), 900); }
      if (hashi.isSolved(p, bridges())) onSolved();
      const k = hnt.set.length;
      return hnt.remove ? (k === 1 ? "Brücke entfernt." : `${k} Brücken entfernt.`) : (k === 1 ? "Brücke gesetzt." : `${k} Verbindungen gesetzt.`);
    };
    const pairs = hnt.set.map((s) => ({ a: s.a, b: s.b, count: s.count }));
    return { text: hnt.text, focus: hnt.focus.map(cellOf), target: hnt.target.map(cellOf), strike: [],
      bridges: hnt.remove ? [] : pairs, strikeBridges: hnt.remove ? pairs : [], apply };
  };
  // Spotlight lokal (Inseln statt Zellen): Inseln + betroffene Brückenkorridore hell, Rest abgedunkelt.
  let spot = null; const uid = Math.random().toString(36).slice(2, 8);
  const clearSpotlight = () => { spot?.remove(); spot = null; };
  const spotlight = (spec = {}) => {
    clearSpotlight();
    const focus = spec.focus || [], target = spec.target || [], add = spec.bridges || [], rem = spec.strikeBridges || [];
    if (!focus.length && !target.length && !add.length && !rem.length) return;
    const W = b.W, H = b.H, R = S * 0.44, T = S * 0.42;
    const gg = svgEl("g", { "pointer-events": "none" }), defs = svgEl("defs"), mask = svgEl("mask", { id: `hm${uid}` });
    mask.append(svgEl("rect", { x: 0, y: 0, width: W, height: H, fill: "#fff" }));
    const corridor = ({ a, b: bb }) => {
      const [x1, y1] = mid(p.islands[a].r, p.islands[a].c), [x2, y2] = mid(p.islands[bb].r, p.islands[bb].c);
      return { x: Math.min(x1, x2) - (x1 === x2 ? T / 2 : 0), y: Math.min(y1, y2) - (y1 === y2 ? T / 2 : 0), width: x1 === x2 ? T : Math.abs(x2 - x1), height: y1 === y2 ? T : Math.abs(y2 - y1) };
    };
    for (const br of [...add, ...rem]) mask.append(svgEl("rect", { ...corridor(br), fill: "#000" }));
    for (const [r, c] of [...focus, ...target]) { const [cx, cy] = mid(r, c); mask.append(svgEl("circle", { cx, cy, r: R, fill: "#000" })); }
    for (const br of [...add, ...rem]) for (const i of [br.a, br.b]) { const [cx, cy] = mid(p.islands[i].r, p.islands[i].c); mask.append(svgEl("circle", { cx, cy, r: R, fill: "#000" })); }
    const pat = svgEl("pattern", { id: `hp${uid}`, width: 22, height: 22, patternUnits: "userSpaceOnUse", patternTransform: "rotate(45)" });
    pat.append(svgEl("rect", { x: 0, y: 0, width: 9, height: 22, fill: "rgba(255,255,255,.55)" }));
    defs.append(mask, pat); gg.append(defs);
    gg.append(svgEl("rect", { x: 0, y: 0, width: W, height: H, fill: "rgba(0,0,0,.58)", mask: `url(#hm${uid})`, class: "spot-dim" }));
    for (const br of rem) gg.append(svgEl("rect", { ...corridor(br), fill: `url(#hp${uid})` }));
    // geplante Brücken: blau gestrichelt (Vorschau der Endanzahl)
    for (const br of add) {
      const [x1, y1] = mid(p.islands[br.a].r, p.islands[br.a].c), [x2, y2] = mid(p.islands[br.b].r, p.islands[br.b].c);
      const horiz = y1 === y2, sx = Math.sign(x2 - x1) * R, sy = Math.sign(y2 - y1) * R;
      for (const o of br.count === 2 ? [-S * 0.11, S * 0.11] : [0])
        gg.append(svgEl("line", { x1: x1 + sx + (horiz ? 0 : o), y1: y1 + sy + (horiz ? o : 0), x2: x2 - sx + (horiz ? 0 : o), y2: y2 - sy + (horiz ? o : 0), stroke: "#1f7aff", "stroke-width": S * 0.07, "stroke-dasharray": `${S * 0.12} ${S * 0.08}`, "stroke-linecap": "round" }));
    }
    for (const [r, c] of target) { const [cx, cy] = mid(r, c); gg.append(svgEl("circle", { cx, cy, r: S * 0.42, fill: "none", stroke: "#1f7aff", "stroke-width": 8 })); }
    b.svg.append(gg); spot = gg;
  };

  draw(); return Object.assign(b, { hint, spotlight, clearSpotlight, undo, canUndo, clear, metrics });
}
