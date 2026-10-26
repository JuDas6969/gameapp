import { S, svgEl, h, REGION, base, txt, msgBar } from "./_shared.js";
import * as zip from "../engine/zip.js";
import { edgeKey } from "../engine/core.js";

export function Zip(p, { onSolved, tools, haptic }) {
  const n = p.n, b = base(n, { bg: "rgba(127,127,127,.06)" }); let path = [];
  const line = svgEl("polyline", { fill: "none", stroke: "var(--accent)", "stroke-width": S * 0.42, "stroke-linecap": "round", "stroke-linejoin": "round", opacity: .9 });
  const head = svgEl("circle", { r: S * 0.16, fill: "#fff", visibility: "hidden" });
  b.layers.mid.append(line, head);
  const walls = new Set(p.walls);
  for (const w of p.walls) {
    const [a, c2] = w.split("-").map(Number), ar = Math.floor(a / 64), ac = a % 64, br = Math.floor(c2 / 64), bc = c2 % 64;
    const attrs = ar === br ? { x1: bc * S, y1: ar * S, x2: bc * S, y2: (ar + 1) * S } : { x1: ac * S, y1: br * S, x2: (ac + 1) * S, y2: br * S };
    b.layers.top.append(svgEl("line", { ...attrs, stroke: "var(--ink)", "stroke-width": 9, "stroke-linecap": "round" }));
  }
  const nums = new Map();
  for (const [k, num] of Object.entries(p.waypoints)) {
    const r = Math.floor(k / n), c = k % n, cx = c * S + S / 2, cy = r * S + S / 2;
    const circ = svgEl("circle", { cx, cy, r: S * 0.33, fill: "var(--card)", stroke: "var(--line-strong)", "stroke-width": 4 });
    const t = txt(cx, cy, String(num), 36); b.layers.top.append(circ, t); nums.set(Number(k), [circ, t]);
  }
  const setMsg = msgBar(tools, "Von 1 aus über jedes Feld ziehen");
  const undo = h("button", { onclick: () => { path.pop(); draw(); } }, "↶ Zurück");
  const clear = h("button", { onclick: () => { path = []; draw(); } }, "Löschen");
  tools.append(undo, clear);
  const draw = () => {
    line.setAttribute("points", path.map(([r, c]) => `${c * S + S / 2},${r * S + S / 2}`).join(" "));
    if (path.length) { const [r, c] = path[path.length - 1]; head.setAttribute("cx", c * S + S / 2); head.setAttribute("cy", r * S + S / 2); head.setAttribute("visibility", "visible"); } else head.setAttribute("visibility", "hidden");
    const visited = new Set(path.map(([r, c]) => r * n + c));
    for (const [k, [circ, t]] of nums) { const v = visited.has(k); circ.setAttribute("fill", v ? "var(--accent)" : "var(--card)"); t.setAttribute("fill", v ? "#fff" : "var(--ink)"); }
    undo.disabled = clear.disabled = !path.length;
  };
  const extend = ([r, c]) => {
    const L = path.length;
    if (L && path[L - 1][0] === r && path[L - 1][1] === c) return;
    if (L >= 2 && path[L - 2][0] === r && path[L - 2][1] === c) { path.pop(); draw(); return; }
    const idx = path.findIndex(([a, bb]) => a === r && bb === c);
    if (idx >= 0) { path.length = idx + 1; draw(); return; }
    if (L) { const [lr, lc] = path[L - 1]; if (Math.abs(lr - r) + Math.abs(lc - c) !== 1) return; }
    const err = zip.stepError(p, path, r, c);
    if (err) { setMsg(err, true); haptic(20); return; }
    path.push([r, c]); setMsg(""); if (p.waypoints[r * n + c]) haptic(); draw();
  };
  b.drag({ onStart: extend, onMove: extend, onEnd: () => { if (zip.isSolved(p, path)) onSolved(); } });
  draw(); return b;
}
