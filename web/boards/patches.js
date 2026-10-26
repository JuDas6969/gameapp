import { S, svgEl, h, REGION, base, txt, msgBar } from "./_shared.js";
import * as patches from "../engine/patches.js";

export function Patches(p, { onSolved, tools, haptic }) {
  const n = p.n, b = base(n, { bg: "rgba(127,127,127,.06)" }); let rects = [], preview = null;
  const rectLayer = svgEl("g"); b.layers.cells.append(rectLayer); rectLayer.style.pointerEvents = "none";
  const prevEl = svgEl("rect", { rx: 8, visibility: "hidden", "stroke-width": 4 }); b.layers.mid.append(prevEl);
  // live area label while dragging: "w×h = area" in the top-left corner of the preview
  // no .cell-txt class here: its CSS (text-anchor/baseline) would override the attributes below
  const prevLbl = svgEl("text", { "font-size": 30, visibility: "hidden", "text-anchor": "end", "dominant-baseline": "auto", "font-weight": 800, "font-family": "-apple-system, system-ui, sans-serif", "paint-order": "stroke", stroke: "var(--card)", "stroke-width": 7, "stroke-linejoin": "round" });
  b.layers.mid.append(prevLbl);
  const clueEls = new Map();
  // clue size relative to S: 48/100 → ≈17 px per cell at 11×11 on an iPhone, still legible; bold via .cell-txt
  for (const [k, area] of Object.entries(p.clues)) {
    const r = Math.floor(k / 64), c = k % 64; const t = txt(c * S + S / 2, r * S + S / 2, String(area), 48, "cell-txt", { "font-weight": 800 }); b.layers.top.append(t); clueEls.set(Number(k), t);
  }
  msgBar(tools, "Ziehen: Rechteck aufspannen · Tippen: entfernen");
  const clear = h("button", { onclick: () => { rects = []; draw(); } }, "Löschen"); tools.append(clear);
  const rectAttrs = (rc) => ({ x: rc.c * S + 3, y: rc.r * S + 3, width: rc.w * S - 6, height: rc.h * S - 6 });
  const draw = () => {
    rectLayer.replaceChildren(...rects.map((rc, i) => svgEl("rect", { ...rectAttrs(rc), rx: 8, fill: REGION(i), stroke: "var(--line-strong)", "stroke-width": 4 })));
    const covered = new Set(); rects.forEach((rc) => { for (let r = rc.r; r < rc.r + rc.h; r++) for (let c = rc.c; c < rc.c + rc.w; c++) covered.add(r * 64 + c); });
    for (const [k, t] of clueEls) t.setAttribute("opacity", covered.has(k) ? .55 : 1);
    if (preview) {
      const ok = patches.isValid(p, preview);
      Object.entries(rectAttrs(preview)).forEach(([k, v]) => prevEl.setAttribute(k, v));
      prevEl.setAttribute("fill", ok ? "rgba(52,168,83,.28)" : "rgba(200,39,28,.25)"); prevEl.setAttribute("stroke", ok ? "var(--ok)" : "var(--bad)"); prevEl.setAttribute("visibility", "visible");
      prevLbl.textContent = `${preview.w}×${preview.h} = ${preview.w * preview.h}`;
      prevLbl.setAttribute("x", (preview.c + preview.w) * S - 10); prevLbl.setAttribute("y", (preview.r + preview.h) * S - 10);
      prevLbl.setAttribute("fill", ok ? "var(--ok)" : "var(--bad)"); prevLbl.setAttribute("visibility", "visible");
    } else { prevEl.setAttribute("visibility", "hidden"); prevLbl.setAttribute("visibility", "hidden"); }
    clear.disabled = !rects.length;
  };
  const mk = (a, c2) => ({ r: Math.min(a[0], c2[0]), c: Math.min(a[1], c2[1]), w: Math.abs(a[1] - c2[1]) + 1, h: Math.abs(a[0] - c2[0]) + 1 });
  b.drag({
    onStart: (cell) => { preview = mk(cell, cell); draw(); },
    onMove: (cell, start) => { preview = mk(start, cell); draw(); },
    onEnd: (moved, last, start) => {
      const rc = preview; preview = null;
      if (!rc) { draw(); return; }
      // short tap (no movement, or drag returned to its start cell) → remove the rect under the finger
      if (!moved || (rc.w === 1 && rc.h === 1)) { const i = rects.findIndex((x) => patches.contains(x, start[0], start[1])); if (i >= 0) { rects.splice(i, 1); haptic(); } draw(); return; }
      // valid drag: any rect it overlaps (incl. the one the drag started in) is replaced
      if (patches.isValid(p, rc)) { rects = rects.filter((x) => !patches.overlaps(x, rc)); rects.push(rc); haptic(); draw(); if (patches.isSolved(p, rects)) onSolved(); }
      else { haptic(20); draw(); }
    },
  });

  // --- hints ---
  const same = (a, c2) => a.r === c2.r && a.c === c2.c && a.w === c2.w && a.h === c2.h;
  const flash = (rc, color) => {
    const f = svgEl("rect", { ...rectAttrs(rc), rx: 8, fill: color, opacity: .7 }); b.layers.top.append(f);
    f.style.transition = "opacity .7s ease"; requestAnimationFrame(() => requestAnimationFrame(() => { f.style.opacity = 0; }));
    setTimeout(() => f.remove(), 800);
  };
  const clueIn = (rc) => Object.keys(p.clues).map(Number).find((k) => patches.contains(rc, Math.floor(k / 64), k % 64));
  b.hint = () => {
    // (a) a placed rect that is not part of the solution → remove it
    const wrong = rects.findIndex((rc) => !p.solution.some((s) => same(s, rc)));
    if (wrong >= 0) { const rc = rects[wrong]; rects.splice(wrong, 1); draw(); flash(rc, "var(--bad)"); return "Dieses Rechteck ist falsch"; }
    // (b) a missing solution rect – prefer one whose clue has exactly one placement that fits the current board
    const missing = p.solution.filter((s) => !rects.some((rc) => same(rc, s)));
    if (!missing.length) return null;
    let pick = null, forced = false;
    for (const s of missing) {
      const k = clueIn(s); if (k == null) continue;
      const opts = patches.placementsFor(p, k).filter((o) => !rects.some((rc) => patches.overlaps(rc, o)));
      if (opts.length === 1) { pick = s; forced = true; break; }
    }
    if (!pick) pick = missing[0];
    const area = pick.w * pick.h;
    rects.push({ ...pick }); draw(); flash(pick, "var(--ok)");
    if (patches.isSolved(p, rects)) onSolved();
    return forced ? `Die ${area} passt nur so hinein` : "Ein Rechteck ergänzt";
  };

  draw(); return b;
}
