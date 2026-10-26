import { S, svgEl, h, base, txt, msgBar } from "./_shared.js";
import * as zip from "../engine/zip.js";

const mid = (r, c) => [c * S + S / 2, r * S + S / 2];

export function Zip(p, { onSolved, tools, haptic }) {
  const n = p.n, b = base(n, { bg: "rgba(127,127,127,.06)" }); let path = [];

  // visited-cell tint (cells layer, below lines)
  const tint = [];
  for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) {
    const rc = svgEl("rect", { x: c * S + 3, y: r * S + 3, width: S - 6, height: S - 6, rx: 10, fill: "var(--accent-soft)", visibility: "hidden" });
    b.layers.cells.append(rc); tint[r * n + c] = rc;
  }

  // path line + head with direction marker
  const line = svgEl("polyline", { fill: "none", stroke: "var(--accent)", "stroke-width": S * 0.42, "stroke-linecap": "round", "stroke-linejoin": "round", opacity: .9 });
  const headG = svgEl("g", { visibility: "hidden" });
  const head = svgEl("circle", { r: S * 0.13, fill: "#fff", opacity: .95 });
  const arrow = svgEl("polygon", { points: `${S * 0.08},0 ${-S * 0.06},${-S * 0.09} ${-S * 0.06},${S * 0.09}`, fill: "#fff", opacity: .95, visibility: "hidden" });
  headG.append(head, arrow);
  const fx = svgEl("g", { "pointer-events": "none" }); // transient hint highlights
  b.layers.mid.append(line, headG, fx);

  // walls: thick, rounded, clearly distinct from grid
  for (const w of p.walls) {
    const [a, c2] = w.split("-").map(Number), ar = Math.floor(a / 64), ac = a % 64, br = Math.floor(c2 / 64), bc = c2 % 64;
    const attrs = ar === br ? { x1: bc * S, y1: ar * S, x2: bc * S, y2: (ar + 1) * S } : { x1: ac * S, y1: br * S, x2: (ac + 1) * S, y2: br * S };
    b.layers.top.append(svgEl("line", { ...attrs, stroke: "var(--bg)", "stroke-width": 20, "stroke-linecap": "round", opacity: .9 }));
    b.layers.top.append(svgEl("line", { ...attrs, stroke: "var(--ink)", "stroke-width": 13, "stroke-linecap": "round" }));
  }

  // numbered waypoints
  const nums = new Map();
  for (const [k, num] of Object.entries(p.waypoints)) {
    const r = Math.floor(k / n), c = k % n, [cx, cy] = mid(r, c);
    const circ = svgEl("circle", { cx, cy, r: S * 0.33, fill: "var(--card)", stroke: "var(--line-strong)", "stroke-width": 4 });
    const t = txt(cx, cy, String(num), 36, "cell-txt", { fill: "var(--ink)" }); b.layers.top.append(circ, t); nums.set(Number(k), [circ, t]);
  }

  const setMsg = msgBar(tools, "Von 1 aus über jedes Feld ziehen");
  const undo = h("button", { onclick: () => { path.pop(); draw(); } }, "↶ Zurück");
  const clear = h("button", { onclick: () => { path = []; draw(); } }, "Löschen");
  tools.append(undo, clear);

  const draw = () => {
    line.setAttribute("points", path.map(([r, c]) => mid(r, c).join(",")).join(" "));
    const L = path.length;
    if (L) {
      const [x, y] = mid(...path[L - 1]);
      let rot = null;
      if (L >= 2) { const [pr, pc] = path[L - 2], [r, c] = path[L - 1]; rot = Math.atan2(r - pr, c - pc) * 180 / Math.PI; }
      headG.setAttribute("transform", `translate(${x},${y})${rot == null ? "" : ` rotate(${rot})`}`);
      headG.setAttribute("visibility", "visible");
      arrow.setAttribute("visibility", rot == null || L === n * n ? "hidden" : "visible");
      head.setAttribute("r", rot == null ? S * 0.16 : S * 0.11);
    } else headG.setAttribute("visibility", "hidden");
    const visited = new Set(path.map(([r, c]) => r * n + c));
    tint.forEach((rc, k) => rc.setAttribute("visibility", visited.has(k) ? "visible" : "hidden"));
    for (const [k, [circ, t]] of nums) {
      const v = visited.has(k);
      circ.setAttribute("fill", v ? "var(--accent)" : "var(--card)"); circ.setAttribute("stroke", v ? "var(--accent)" : "var(--line-strong)");
      t.style.fill = v ? "#fff" : "var(--ink)";
    }
    undo.disabled = clear.disabled = !path.length;
  };

  const extend = (cell) => {
    if (!cell) return; // dragged outside the board
    const [r, c] = cell, L = path.length;
    if (L && path[L - 1][0] === r && path[L - 1][1] === c) return;
    if (L >= 2 && path[L - 2][0] === r && path[L - 2][1] === c) { path.pop(); draw(); return; }
    const idx = path.findIndex(([a, bb]) => a === r && bb === c);
    if (idx >= 0) { path.length = idx + 1; draw(); return; }
    // skipped cells during a fast drag: ignore silently (no "Nicht benachbart" message)
    if (L) { const [lr, lc] = path[L - 1]; if (Math.abs(lr - r) + Math.abs(lc - c) !== 1) return; }
    const err = zip.stepError(p, path, r, c);
    if (err) { setMsg(err, true); haptic(20); return; }
    path.push([r, c]); setMsg(""); if (p.waypoints[r * n + c]) haptic(); draw();
  };
  b.drag({ onStart: extend, onMove: extend, onEnd: () => { if (zip.isSolved(p, path)) onSolved(); } });

  // transient highlight helpers for hints
  const flash = (nodes, ms) => { fx.append(...nodes); setTimeout(() => nodes.forEach((x) => x.remove()), ms); };
  const cellMark = (r, c, fill) => svgEl("rect", { x: c * S + 6, y: r * S + 6, width: S - 12, height: S - 12, rx: 12, fill, opacity: .45 });
  const segMark = (a, bcell, stroke) => { const [x1, y1] = mid(...a), [x2, y2] = mid(...bcell); return svgEl("line", { x1, y1, x2, y2, stroke, "stroke-width": S * 0.5, "stroke-linecap": "round", opacity: .55 }); };

  b.hint = () => {
    const step = zip.hintStep(p, path, 6);
    if (!step) return null;
    if (step.type === "cut") {
      const cut = path[step.keep], prev = step.keep ? path[step.keep - 1] : null;
      path.length = step.keep; draw();
      const marks = [cellMark(cut[0], cut[1], "var(--bad)")]; if (prev) marks.push(segMark(prev, cut, "var(--bad)"));
      flash(marks, 900); haptic(20);
      setMsg("Ab hier war's falsch", true);
      return "Ab hier war's falsch – zurückgesetzt";
    }
    const marks = [];
    for (const cell of step.cells) {
      const prev = path.length ? path[path.length - 1] : null;
      if (prev) marks.push(segMark(prev, cell, "var(--ok)"));
      marks.push(cellMark(cell[0], cell[1], "var(--ok)"));
      path.push(cell);
    }
    draw(); flash(marks, 1100); setMsg("");
    const msg = step.target != null ? `Weiter bis zur ${step.target}` : step.cells.length === 1 ? "Ein Schritt weiter" : `${step.cells.length} Schritte weiter`;
    if (zip.isSolved(p, path)) onSolved();
    return msg;
  };

  draw(); return b;
}
