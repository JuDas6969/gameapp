import { S, svgEl, h, base, txt, msgBar } from "./_shared.js";
import * as sl from "../engine/slitherlink.js";

const PAD = S * 0.3; // room for the outer dots/lines

export function Slitherlink(p, { onSolved, tools, haptic }) {
  const n = p.n, g = sl.geo(n);
  const b = base(n, { ox: PAD, oy: PAD, bg: "rgba(127,127,127,.05)" });
  const W = PAD * 2 + n * S, H = PAD * 2 + n * S;
  b.svg.setAttribute("viewBox", `0 0 ${W} ${H}`); b.aspect = [W, H];
  b.layers.lines.replaceChildren(); // no cell grid – faint guide lines + dots instead

  const edges = new Set(), crosses = new Set();
  const X = (c) => PAD + c * S, Y = (r) => PAD + r * S;

  // faint guide lines
  for (let i = 0; i <= n; i++) {
    b.layers.lines.append(svgEl("line", { x1: X(0), y1: Y(i), x2: X(n), y2: Y(i), stroke: "var(--line)", "stroke-width": 1, opacity: .5 }));
    b.layers.lines.append(svgEl("line", { x1: X(i), y1: Y(0), x2: X(i), y2: Y(n), stroke: "var(--line)", "stroke-width": 1, opacity: .5 }));
  }
  // edge lines + crosses (mid layer, below dots/numbers)
  const edgeEl = new Array(g.E), crossEl = new Array(g.E);
  const fx = svgEl("g");
  for (let e = 0; e < g.E; e++) {
    const [[r1, c1], [r2, c2]] = g.edgeEnds(e);
    edgeEl[e] = svgEl("line", { x1: X(c1), y1: Y(r1), x2: X(c2), y2: Y(r2), stroke: "var(--accent)", "stroke-width": S * 0.13, "stroke-linecap": "round", visibility: "hidden" });
    const mx = (X(c1) + X(c2)) / 2, my = (Y(r1) + Y(r2)) / 2, d = S * 0.07;
    crossEl[e] = svgEl("path", { d: `M${mx - d},${my - d}L${mx + d},${my + d}M${mx + d},${my - d}L${mx - d},${my + d}`, stroke: "var(--muted)", "stroke-width": 4, "stroke-linecap": "round", opacity: .8, visibility: "hidden" });
    b.layers.mid.append(edgeEl[e], crossEl[e]);
  }
  b.layers.mid.append(fx);
  // dots
  const dotEl = new Array(g.N);
  for (let i = 0; i < g.N; i++) { const [r, c] = g.nodeRC(i); dotEl[i] = svgEl("circle", { cx: X(c), cy: Y(r), r: S * 0.075, fill: "var(--ink)" }); b.layers.top.append(dotEl[i]); }
  // numbers
  const numEl = [];
  for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) {
    const v = p.clues[r][c]; if (v < 0) continue;
    const t = txt(X(c) + S / 2, Y(r) + S / 2, String(v), n >= 10 ? 44 : 48); b.layers.top.append(t); numEl.push([r, c, t]);
  }

  const setMsg = msgBar(tools, "Tippen: Kante → × → leer. Ziehen zeichnet.");
  const clearBtn = h("button", { onclick: () => clear() }, "Löschen");
  tools.append(clearBtn);

  // ---- Undo (ein Eintrag je Geste) + Metrik „Korrekturen“ (vom Spieler entfernte Kanten) ----
  const undoStack = []; let corrections = 0;
  const snapshot = () => [new Set(edges), new Set(crosses)];
  const sameState = ([e, c]) => e.size === edges.size && c.size === crosses.size && [...e].every((k) => edges.has(k)) && [...c].every((k) => crosses.has(k));
  const pushUndo = () => { undoStack.push(snapshot()); if (undoStack.length > 200) undoStack.shift(); };
  const restore = ([e, c]) => { edges.clear(); crosses.clear(); for (const k of e) edges.add(k); for (const k of c) crosses.add(k); };
  const undo = () => { if (!undoStack.length) return false; restore(undoStack.pop()); setMsg(""); draw(); return true; };
  const canUndo = () => undoStack.length > 0;
  const clear = () => { if (edges.size || crosses.size) pushUndo(); edges.clear(); crosses.clear(); draw(); };
  const metrics = () => ({ line: `${corrections} Korrekturen` });

  const draw = () => {
    for (let e = 0; e < g.E; e++) {
      edgeEl[e].setAttribute("visibility", edges.has(g.keys[e]) ? "visible" : "hidden");
      crossEl[e].setAttribute("visibility", crosses.has(g.keys[e]) ? "visible" : "hidden");
    }
    const cnt = sl.cellCounts(p, edges), conf = sl.conflicts(p, edges);
    for (const [r, c, t] of numEl) {
      const v = p.clues[r][c], k = cnt[r][c];
      t.setAttribute("fill", k > v ? "var(--bad)" : k === v ? "var(--muted)" : "var(--ink)");
      t.setAttribute("opacity", k === v ? .55 : 1);
    }
    for (let i = 0; i < g.N; i++) { const [r, c] = g.nodeRC(i); dotEl[i].setAttribute("fill", conf.nodes.has(r * 64 + c) ? "var(--bad)" : "var(--ink)"); }
    clearBtn.disabled = !edges.size && !crosses.size;
  };

  // pointer → viewBox coords
  const pos = (ev) => { const rc = b.svg.getBoundingClientRect(); return [((ev.clientX - rc.left) / rc.width) * W - PAD, ((ev.clientY - rc.top) / rc.height) * H - PAD]; };
  const clampi = (v, hi) => Math.max(0, Math.min(hi, v));
  /** nearest edge within the hit zone (width ≈ 0.45·S), or -1 */
  const edgeAt = (x, y) => {
    const tol = S * 0.225; let best = -1, bd = tol;
    const r = Math.round(y / S), c = Math.floor(x / S);
    if (r >= 0 && r <= n && c >= 0 && c < n) { const d = Math.abs(y - r * S); if (d < bd) { bd = d; best = g.h(r, c); } }
    const r2 = Math.floor(y / S), c2 = Math.round(x / S);
    if (r2 >= 0 && r2 < n && c2 >= 0 && c2 <= n) { const d = Math.abs(x - c2 * S); if (d < bd) { bd = d; best = g.v(r2, c2); } }
    return best;
  };
  const nodeAt = (x, y) => [clampi(Math.round(y / S), n), clampi(Math.round(x / S), n)];
  const edgeBetween = (a, bb) => {
    const [r1, c1] = a, [r2, c2] = bb;
    if (r1 === r2 && Math.abs(c1 - c2) === 1) return g.h(r1, Math.min(c1, c2));
    if (c1 === c2 && Math.abs(r1 - r2) === 1) return g.v(Math.min(r1, r2), c1);
    return -1;
  };
  const addEdge = (e) => { const k = g.keys[e]; if (!edges.has(k)) { edges.add(k); crosses.delete(k); haptic?.(8); } };

  let active = false, startEdge = -1, lastNode = null, drawn = false;
  b.svg.addEventListener("pointerdown", (ev) => {
    ev.preventDefault(); const [x, y] = pos(ev);
    if (x < -PAD || y < -PAD || x > n * S + PAD || y > n * S + PAD) return;
    active = true; drawn = false; startEdge = edgeAt(x, y); lastNode = nodeAt(x, y);
    pushUndo(); // Snapshot je Geste; wird am Ende wieder entfernt, falls nichts passiert ist
    b.svg.setPointerCapture?.(ev.pointerId);
  });
  b.svg.addEventListener("pointermove", (ev) => {
    if (!active) return;
    const [x, y] = pos(ev), nd = nodeAt(x, y);
    if (nd[0] === lastNode[0] && nd[1] === lastNode[1]) return;
    // only snap when the pointer is reasonably close to the new node (avoids jitter in cell centres)
    if (Math.hypot(x - nd[1] * S, y - nd[0] * S) > S * 0.42) return;
    // step node-by-node along a straight line (interpolates skipped nodes); diagonal jumps just re-anchor
    let [r, c] = lastNode;
    if (r === nd[0] || c === nd[1]) {
      while (r !== nd[0] || c !== nd[1]) {
        const nr = r + Math.sign(nd[0] - r), nc = c + Math.sign(nd[1] - c);
        const e = edgeBetween([r, c], [nr, nc]); if (e >= 0) { addEdge(e); drawn = true; }
        r = nr; c = nc;
      }
    }
    lastNode = nd; if (drawn) draw();
  });
  const end = () => {
    if (!active) return; active = false;
    if (!drawn && startEdge >= 0) {
      const k = g.keys[startEdge];
      if (edges.has(k)) { edges.delete(k); crosses.add(k); corrections++; } else if (crosses.has(k)) crosses.delete(k); else { edges.add(k); haptic?.(8); }
      draw();
    }
    if (undoStack.length && sameState(undoStack[undoStack.length - 1])) undoStack.pop();
    setMsg("");
    if (sl.isSolved(p, edges)) onSolved();
  };
  b.svg.addEventListener("pointerup", end); b.svg.addEventListener("pointercancel", end);

  const flash = (e, color, ms = 1000) => {
    const [[r1, c1], [r2, c2]] = g.edgeEnds(e);
    const l = svgEl("line", { x1: X(c1), y1: Y(r1), x2: X(c2), y2: Y(r2), stroke: color, "stroke-width": S * 0.3, "stroke-linecap": "round", opacity: .6 });
    fx.append(l); setTimeout(() => l.remove(), ms); return l;
  };
  // ---- Tipp (LinkedIn-Stil): Begründung + Spotlight; „Anzeigen“ führt aus (undo-fähig) ----
  const hint = () => {
    const hnt = sl.explainHint(p, edges, crosses); if (!hnt) return null;
    const apply = () => {
      pushUndo();
      for (const { edge: k, to } of hnt.ops) {
        if (edges.has(k) && to !== "edge") corrections++;
        edges.delete(k); crosses.delete(k);
        if (to === "edge") edges.add(k); else if (to === "cross") crosses.add(k);
      }
      for (const { edge: k, to } of hnt.ops) if (to === "edge") flash(g.idx(k), "var(--ok)", 900);
      draw(); setMsg(""); haptic?.(hnt.kind === "wrong" ? 20 : 8);
      if (sl.isSolved(p, edges)) onSolved();
      const k = hnt.ops.length, to = hnt.ops[0].to;
      return to === "none" ? (hnt.kind === "wrongcross" ? (k === 1 ? "× entfernt." : `${k} × entfernt.`) : (k === 1 ? "Linie entfernt." : `${k} Linien entfernt.`))
        : to === "cross" ? (k === 1 ? "Kante mit × markiert." : `${k} Kanten mit × markiert.`) : (k === 1 ? "Kante gezeichnet." : `${k} Kanten gezeichnet.`);
    };
    return { text: hnt.text, focus: hnt.cells, target: [], strike: [], nodes: hnt.nodes, focusEdges: hnt.focusEdges, targetEdges: hnt.targetEdges, strikeEdges: hnt.strikeEdges, apply };
  };
  // Spotlight lokal (kantenbasiert): Begründungs-Zellen, Punkte und Kanten hell, Rest abgedunkelt.
  let spot = null; const uid = Math.random().toString(36).slice(2, 8);
  const clearSpotlight = () => { spot?.remove(); spot = null; };
  const spotlight = (spec = {}) => {
    clearSpotlight();
    const cellsF = spec.focus || [], nodes = spec.nodes || [], fe = spec.focusEdges || [], te = spec.targetEdges || [], se = spec.strikeEdges || [];
    if (!cellsF.length && !nodes.length && !fe.length && !te.length && !se.length) return;
    const T = S * 0.34, hole = (k) => {
      const [[r1, c1], [r2, c2]] = g.edgeEnds(g.idx(k));
      return r1 === r2 ? { x: X(c1) - T / 2, y: Y(r1) - T / 2, width: S + T, height: T, rx: T / 2 } : { x: X(c1) - T / 2, y: Y(r1) - T / 2, width: T, height: S + T, rx: T / 2 };
    };
    const gg = svgEl("g", { "pointer-events": "none" }), defs = svgEl("defs"), mask = svgEl("mask", { id: `sm${uid}` });
    mask.append(svgEl("rect", { x: 0, y: 0, width: W, height: H, fill: "#fff" }));
    for (const [r, c] of cellsF) mask.append(svgEl("rect", { x: X(c), y: Y(r), width: S, height: S, fill: "#000" }));
    for (const k of [...fe, ...te, ...se]) mask.append(svgEl("rect", { ...hole(k), fill: "#000" }));
    for (const [r, c] of nodes) mask.append(svgEl("circle", { cx: X(c), cy: Y(r), r: S * 0.24, fill: "#000" }));
    const pat = svgEl("pattern", { id: `sp${uid}`, width: 22, height: 22, patternUnits: "userSpaceOnUse", patternTransform: "rotate(45)" });
    pat.append(svgEl("rect", { x: 0, y: 0, width: 9, height: 22, fill: "rgba(255,255,255,.55)" }));
    defs.append(mask, pat); gg.append(defs);
    gg.append(svgEl("rect", { x: 0, y: 0, width: W, height: H, fill: "rgba(0,0,0,.58)", mask: `url(#sm${uid})`, class: "spot-dim" }));
    for (const k of se) gg.append(svgEl("rect", { ...hole(k), fill: `url(#sp${uid})` }));
    for (const k of te) { const hh = hole(k); gg.append(svgEl("rect", { ...hh, fill: "none", stroke: "#1f7aff", "stroke-width": 6 })); }
    for (const [r, c] of nodes) gg.append(svgEl("circle", { cx: X(c), cy: Y(r), r: S * 0.2, fill: "none", stroke: "#1f7aff", "stroke-width": 6 }));
    b.svg.append(gg); spot = gg;
  };

  draw(); return Object.assign(b, { hint, spotlight, clearSpotlight, undo, canUndo, clear, metrics });
}
