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
  // Zweistufiger Tipp: 1. Aufruf hebt die Kante hervor + erklärt, 2. Aufruf (innerhalb 20 s, gleicher Tipp) führt aus.
  let pending = null; const HINT_MS = 20000;
  const hintLine = (hnt, removing, width, ms) => {
    const [x1, y1] = mid(p.islands[hnt.a].r, p.islands[hnt.a].c), [x2, y2] = mid(p.islands[hnt.b].r, p.islands[hnt.b].c);
    return flash(svgEl("line", { x1, y1, x2, y2, stroke: removing ? "var(--bad)" : "var(--ok)", "stroke-width": width, "stroke-linecap": "round", opacity: .5 }), ms);
  };
  b.hint = () => {
    const hnt = hashi.findHint(p, bridges());
    if (!hnt) { pending = null; return null; }
    const i = byPair.get(pk(hnt.a, hnt.b)); if (i == null) return null;
    const removing = hnt.count < val[i], key = `${i}:${hnt.count}`, now = performance.now();
    if (pending && pending.key === key && now - pending.t < HINT_MS) {
      pending.node.remove(); pending = null;
      pushUndo(); if (removing) rebuilds++;
      val[i] = hnt.count; setMsg(hnt.reason, removing); draw();
      hintLine(hnt, removing, S * 0.45, 1000);
      haptic(removing ? 20 : undefined);
      if (hashi.isSolved(p, bridges())) onSolved();
      return removing ? (hnt.count ? "Brücke reduziert" : "Brücke entfernt") : "Brücke gesetzt";
    }
    if (pending) pending.node.remove();
    pending = { key, t: now, node: hintLine(hnt, removing, S * 0.45, HINT_MS) };
    setMsg(hnt.reason, removing);
    return hnt.reason + " – nochmal tippen zum Ausführen";
  };

  draw(); return Object.assign(b, { undo, canUndo, clear, metrics });
}
