import { S, svgEl, h, REGION, base, txt, msgBar } from "./_shared.js";
import * as patches from "../engine/patches.js";

// Flicken (Shikaku). Interaction modelled on LinkedIn "Patches":
//  - a drag always starts at a clue; the rect spans from the clue to the finger and always contains the clue
//  - dragging inside an existing rect picks it up and re-spans it from its clue (correction)
//  - tap (<1 cell, <250 ms) on a rect removes it; tap on an open clue shows its possible placements
export function Patches(p, { onSolved, tools, haptic }) {
  const n = p.n, b = base(n, { bg: "rgba(127,127,127,.06)" }); let rects = [];
  const clueKeys = Object.keys(p.clues).map(Number).sort((a, c2) => a - c2), total = clueKeys.length;
  const colorOf = (rc) => REGION(clueKeys.indexOf(clueIn(rc)));
  const rectLayer = svgEl("g", { class: "patches-rects" }); b.layers.cells.append(rectLayer); rectLayer.style.pointerEvents = "none";
  // strong outer frame (grid lines from base() stay subtle)
  b.layers.top.append(svgEl("rect", { x: 0, y: 0, width: n * S, height: n * S, fill: "none", stroke: "var(--line-strong)", "stroke-width": 7, rx: 4 }));

  // preview while dragging + "area / target" pill
  const prevEl = svgEl("rect", { rx: 8, visibility: "hidden", "stroke-width": 5, "stroke-linejoin": "round" }); b.layers.mid.append(prevEl);
  const lblG = svgEl("g", { visibility: "hidden" });
  const lblBg = svgEl("rect", { rx: 20, height: 44, fill: "var(--ink)", opacity: .92 });
  const lblTx = svgEl("text", { "font-size": 30, "text-anchor": "middle", "dominant-baseline": "central", "font-weight": 800, "font-family": "-apple-system, system-ui, sans-serif", fill: "var(--bg)" });
  lblG.append(lblBg, lblTx); b.layers.top.append(lblG);
  const fx = svgEl("g"); b.layers.top.append(fx); // transient placement outlines / hint flashes

  // clues: open clues sit on a --card disc, covered clues stay bold --ink on the colored rect
  const clueEls = new Map();
  for (const k of clueKeys) {
    const r = Math.floor(k / 64), c = k % 64, cx = c * S + S / 2, cy = r * S + S / 2;
    const g = svgEl("g");
    const disc = svgEl("circle", { cx, cy, r: S * 0.36, fill: "var(--card)", stroke: "var(--line)", "stroke-width": 3 });
    const t = txt(cx, cy, String(p.clues[k]), 50, "cell-txt", { "font-weight": 800 });
    g.append(disc, t); b.layers.top.append(g); clueEls.set(k, { g, disc, t });
  }

  const setMsg = msgBar(tools, "");
  const clear = h("button", { onclick: () => { rects = []; draw(); } }, "Löschen"); tools.append(clear);

  const rectAttrs = (rc, inset = 3) => ({ x: rc.c * S + inset, y: rc.r * S + inset, width: rc.w * S - 2 * inset, height: rc.h * S - 2 * inset });
  const clueIn = (rc) => clueKeys.find((k) => patches.contains(rc, Math.floor(k / 64), k % 64));
  const rectAt = (r, c) => rects.findIndex((x) => patches.contains(x, r, c));
  const clueAt = (r, c) => (p.clues[r * 64 + c] != null ? r * 64 + c : null);
  const fits = (rc) => patches.fits(p, rects, rc);

  // drag state; preview = {rect|null, snapped, raw} from the engine (rect = what would be placed on release)
  let anchor = null, anchorKey = null, picked = null, preview = null, t0 = 0;
  const span = (cell) => patches.snapDrag(p, rects, anchorKey, cell);

  const draw = () => {
    rectLayer.replaceChildren(...rects.map((rc) => svgEl("rect", { ...rectAttrs(rc), rx: 8, fill: colorOf(rc), stroke: "var(--line-strong)", "stroke-width": 5 })));
    const covered = new Set(); rects.forEach((rc) => { for (let r = rc.r; r < rc.r + rc.h; r++) for (let c = rc.c; c < rc.c + rc.w; c++) covered.add(r * 64 + c); });
    for (const [k, { disc }] of clueEls) disc.setAttribute("visibility", covered.has(k) || (preview && k === anchorKey) ? "hidden" : "visible");
    if (preview) {
      const ok = !!preview.rect, shown = preview.rect || preview.raw, target = p.clues[anchorKey];
      Object.entries(rectAttrs(shown)).forEach(([k, v]) => prevEl.setAttribute(k, v));
      prevEl.setAttribute("fill", ok ? "rgba(52,168,83,.3)" : "var(--accent-soft)"); prevEl.setAttribute("stroke", ok ? "var(--ok)" : "var(--accent)");
      prevEl.setAttribute("stroke-dasharray", ok ? "" : "14 10"); prevEl.setAttribute("visibility", "visible");
      lblTx.textContent = `${shown.w * shown.h} / ${target}`;
      const w = 44 + 18 * lblTx.textContent.length; lblBg.setAttribute("width", w); lblBg.setAttribute("x", -w / 2); lblBg.setAttribute("y", -22);
      const cx = Math.min(Math.max((shown.c + shown.w / 2) * S, w / 2 + 4), n * S - w / 2 - 4);
      const cy = shown.r > 0 ? shown.r * S - 34 : (shown.r + shown.h) * S + 34;
      lblG.setAttribute("transform", `translate(${cx},${cy})`); lblG.setAttribute("visibility", "visible");
    } else { prevEl.setAttribute("visibility", "hidden"); lblG.setAttribute("visibility", "hidden"); }
    clear.disabled = !rects.length;
    setMsg(rects.length ? `${rects.length} von ${total} Flicken` : `Von einer Zahl aus ein Rechteck ziehen · 0 von ${total} Flicken`);
  };

  // --- transient effects ---
  const shakeClue = (k) => {
    const { g, t } = clueEls.get(k); if (!g?.animate) return;
    g.animate([{ transform: "translateX(0)" }, { transform: "translateX(-9px)" }, { transform: "translateX(9px)" }, { transform: "translateX(-6px)" }, { transform: "translateX(6px)" }, { transform: "translateX(0)" }], { duration: 320, easing: "ease-in-out" });
    t.animate([{ fill: "var(--bad)" }, { fill: "var(--bad)", offset: .6 }, { fill: "var(--ink)" }], { duration: 650 });
  };
  const flashRect = (rc, color) => {
    const f = svgEl("rect", { ...rectAttrs(rc), rx: 8, fill: color, opacity: .7 }); fx.append(f);
    f.style.transition = "opacity .7s ease"; requestAnimationFrame(() => requestAnimationFrame(() => { f.style.opacity = 0; }));
    setTimeout(() => f.remove(), 800);
  };
  let outlines = [];
  const showPlacements = (k) => {
    outlines.forEach((o) => o.remove()); outlines = [];
    const opts = patches.placementsFor(p, k).filter((o) => !rects.some((rc) => patches.overlaps(rc, o)));
    for (const [i, o] of opts.entries()) {
      const inset = 7 + (i % 3) * 5; // stagger nested outlines so they stay distinguishable
      const el = svgEl("rect", { ...rectAttrs(o, inset), rx: 8, fill: "none", stroke: "var(--accent)", "stroke-width": 3, "stroke-dasharray": "10 8", opacity: .9 });
      fx.append(el); outlines.push(el);
    }
    const mine = outlines;
    setTimeout(() => { mine.forEach((o) => { o.style.transition = "opacity .3s"; o.style.opacity = 0; }); setTimeout(() => mine.forEach((o) => o.remove()), 320); }, 1500);
    return opts.length;
  };

  // --- interaction ---
  b.drag({
    onStart: (cell) => {
      anchor = null; anchorKey = null; picked = null; preview = null; t0 = performance.now();
      const [r, c] = cell, k = clueAt(r, c), ri = rectAt(r, c);
      if (ri >= 0) { picked = rects.splice(ri, 1)[0]; anchorKey = clueIn(picked); }
      else if (k != null) anchorKey = k;
      if (anchorKey == null) { draw(); return; }
      anchor = [Math.floor(anchorKey / 64), anchorKey % 64];
      preview = span(cell); draw();
    },
    onMove: (cell) => { if (!anchor) return; preview = span(cell); draw(); },
    onEnd: (moved) => {
      if (!anchor) return;
      const rc = preview?.rect, key = anchorKey, old = picked, dt = performance.now() - t0;
      preview = null; anchor = null; picked = null; anchorKey = null;
      const tap = !moved && dt < 250;
      if (tap) {
        if (old) { haptic(); draw(); return; } // tap on a finished rect → removed
        if (p.clues[key] === 1 && rc) { rects.push(rc); haptic(); draw(); if (patches.isSolved(p, rects)) onSolved(); return; }
        draw(); const cnt = showPlacements(key);
        setMsg(cnt === 1 ? "Die passt nur so hinein" : `${cnt} Möglichkeiten für die ${p.clues[key]}`);
        return;
      }
      if (rc && fits(rc)) { rects.push(rc); haptic(); draw(); if (patches.isSolved(p, rects)) onSolved(); return; }
      // invalid: put a picked-up rect back, shake the clue
      if (old) rects.push(old);
      draw(); shakeClue(key); haptic(20);
    },
  });

  // --- hints ---
  const same = (a, c2) => a.r === c2.r && a.c === c2.c && a.w === c2.w && a.h === c2.h;
  b.hint = () => {
    // (a) a placed rect that is not part of the solution → remove it
    const wrong = rects.findIndex((rc) => !p.solution.some((s) => same(s, rc)));
    if (wrong >= 0) { const rc = rects[wrong]; rects.splice(wrong, 1); draw(); flashRect(rc, "var(--bad)"); return "Dieses Rechteck ist falsch"; }
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
    rects.push({ ...pick }); draw(); flashRect(pick, "var(--ok)");
    if (patches.isSolved(p, rects)) onSolved();
    return forced ? `Die ${area} passt nur so hinein` : "Ein Rechteck ergänzt";
  };

  draw(); return b;
}
