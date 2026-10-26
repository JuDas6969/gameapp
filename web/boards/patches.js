import { S, svgEl, h, REGION, base, txt, msgBar } from "./_shared.js";
import * as patches from "../engine/patches.js";

export function Patches(p, { onSolved, tools, haptic }) {
  const n = p.n, b = base(n, { bg: "rgba(127,127,127,.06)" }); let rects = [], preview = null;
  const rectLayer = svgEl("g"); b.layers.cells.append(rectLayer); rectLayer.style.pointerEvents = "none";
  const prevEl = svgEl("rect", { rx: 8, visibility: "hidden", "stroke-width": 4 }); b.layers.mid.append(prevEl);
  const clueEls = new Map();
  for (const [k, area] of Object.entries(p.clues)) {
    const r = Math.floor(k / 64), c = k % 64; const t = txt(c * S + S / 2, r * S + S / 2, String(area), 44); b.layers.top.append(t); clueEls.set(Number(k), t);
  }
  msgBar(tools, "Ziehen: Rechteck aufspannen · Tippen: entfernen");
  const clear = h("button", { onclick: () => { rects = []; draw(); } }, "Löschen"); tools.append(clear);
  const rectAttrs = (rc) => ({ x: rc.c * S + 3, y: rc.r * S + 3, width: rc.w * S - 6, height: rc.h * S - 6 });
  const draw = () => {
    rectLayer.replaceChildren(...rects.map((rc, i) => svgEl("rect", { ...rectAttrs(rc), rx: 8, fill: REGION(i), stroke: "var(--line-strong)", "stroke-width": 4 })));
    const covered = new Set(); rects.forEach((rc) => { for (let r = rc.r; r < rc.r + rc.h; r++) for (let c = rc.c; c < rc.c + rc.w; c++) covered.add(r * 64 + c); });
    for (const [k, t] of clueEls) t.setAttribute("opacity", covered.has(k) ? .55 : 1);
    if (preview) { const ok = patches.isValid(p, preview); Object.entries(rectAttrs(preview)).forEach(([k, v]) => prevEl.setAttribute(k, v)); prevEl.setAttribute("fill", ok ? "var(--accent-soft)" : "rgba(200,39,28,.25)"); prevEl.setAttribute("stroke", ok ? "var(--accent)" : "var(--bad)"); prevEl.setAttribute("visibility", "visible"); }
    else prevEl.setAttribute("visibility", "hidden");
    clear.disabled = !rects.length;
  };
  const mk = (a, c2) => ({ r: Math.min(a[0], c2[0]), c: Math.min(a[1], c2[1]), w: Math.abs(a[1] - c2[1]) + 1, h: Math.abs(a[0] - c2[0]) + 1 });
  b.drag({
    onStart: (cell) => { preview = mk(cell, cell); draw(); },
    onMove: (cell, start) => { preview = mk(start, cell); draw(); },
    onEnd: (moved, last, start) => {
      const rc = preview; preview = null;
      if (!moved || (rc.w === 1 && rc.h === 1)) { const i = rects.findIndex((x) => patches.contains(x, start[0], start[1])); if (i >= 0) { rects.splice(i, 1); haptic(); } draw(); return; }
      if (patches.isValid(p, rc)) { rects = rects.filter((x) => !patches.overlaps(x, rc)); rects.push(rc); haptic(); draw(); if (patches.isSolved(p, rects)) onSolved(); }
      else { haptic(20); draw(); }
    },
  });
  draw(); return b;
}
