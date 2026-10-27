import { S, svgEl, h, REGION, base, txt, msgBar, NS } from "./_shared.js";
import * as patches from "../engine/patches.js";

// Flicken (LinkedIn "Patches" incl. shape clues). Interaction:
//  - a drag always starts at a clue; the rect spans from the clue to the finger and always contains the clue
//  - dragging inside an existing rect picks it up and re-spans it from its clue (correction)
//  - tap (<1 cell, <250 ms) on a rect removes it; tap on an open clue shows its possible placements
// Clues: number with dashed frame = any shape of that area; coloured shape badge = square / tall / wide (optionally with number).
const ICON = { square: [58, 58], tall: [44, 70], wide: [70, 44] };
const SHAPE_ACC = { square: "das Quadrat", tall: "das hohe Rechteck", wide: "das breite Rechteck" };

export function Patches(p, { onSolved, tools, haptic }) {
  const n = p.n, b = base(n, { bg: "rgba(127,127,127,.06)" }); let rects = [];
  const shapes = p.shapes || {};
  const clueKeys = Object.keys(p.clues).map(Number).sort((a, c2) => a - c2), total = clueKeys.length;
  const colorOf = (rc) => REGION(clueKeys.indexOf(clueIn(rc)));
  const accName = (k) => (p.clues[k] ? `die ${p.clues[k]}` : SHAPE_ACC[shapes[k]]);
  const rectLayer = svgEl("g", { class: "patches-rects" }); b.layers.cells.append(rectLayer); rectLayer.style.pointerEvents = "none";
  // strong outer frame (grid lines from base() stay subtle)
  b.layers.top.append(svgEl("rect", { x: 0, y: 0, width: n * S, height: n * S, fill: "none", stroke: "var(--line-strong)", "stroke-width": 7, rx: 4 }));

  // preview while dragging + small area number in its corner
  const prevEl = svgEl("rect", { rx: 8, visibility: "hidden", "stroke-width": 5, "stroke-linejoin": "round" }); b.layers.mid.append(prevEl);
  const lblG = svgEl("g", { visibility: "hidden" });
  const lblBg = svgEl("rect", { rx: 14, height: 34, y: 0, fill: "var(--ink)", opacity: .9 });
  const lblTx = svgEl("text", { y: 17, "font-size": 24, "text-anchor": "middle", "dominant-baseline": "central", "font-weight": 800, "font-family": "-apple-system, system-ui, sans-serif", fill: "var(--bg)" });
  lblG.append(lblBg, lblTx);
  const fx = svgEl("g"); b.layers.top.append(fx); // transient placement outlines / flashes

  // clues
  const clueEls = new Map();
  clueKeys.forEach((k, i) => {
    const r = Math.floor(k / 64), c = k % 64, cx = c * S + S / 2, cy = r * S + S / 2, a = p.clues[k], s = shapes[k];
    const g = svgEl("g"); let box, t = null;
    if (s) {
      const [w, hh] = ICON[s];
      box = svgEl("rect", { x: cx - w / 2, y: cy - hh / 2, width: w, height: hh, rx: 12, fill: REGION(i), stroke: "var(--ink)", "stroke-width": 3.5 });
      g.append(box);
      if (a) { t = txt(cx, cy, String(a), a > 9 ? 30 : 36, "cell-txt", { "font-weight": 800 }); g.append(t); }
    } else {
      box = svgEl("rect", { x: cx - 34, y: cy - 34, width: 68, height: 68, rx: 12, fill: "var(--card)", stroke: "var(--ink)", "stroke-width": 3.5, "stroke-dasharray": "9 7" });
      t = txt(cx, cy, String(a), 44, "cell-txt", { "font-weight": 800 });
      g.append(box, t);
    }
    b.layers.top.append(g); clueEls.set(k, { g, box, t, dashed: !s });
  });
  b.layers.top.append(lblG);

  const setMsg = msgBar(tools, "");
  const clear = h("button", { onclick: () => b.clear() }, "Löschen"); tools.append(clear); // undo lives in the app (b.undo/b.canUndo)
  // legend: shape badges
  const icon = (w, hh, dashed, label) => {
    const sv = document.createElementNS(NS, "svg"); sv.setAttribute("viewBox", "0 0 24 24"); sv.setAttribute("width", "18"); sv.setAttribute("height", "18");
    sv.append(svgEl("rect", { x: 12 - w / 2, y: 12 - hh / 2, width: w, height: hh, rx: 3, fill: dashed ? "none" : "var(--r2)", stroke: "var(--ink)", "stroke-width": 1.6, "stroke-dasharray": dashed ? "3 2" : null }));
    return h("span", { style: "display:inline-flex;align-items:center;gap:4px;white-space:nowrap" }, sv, label);
  };
  tools.append(h("div", { style: "flex:1 0 100%;display:flex;justify-content:center;gap:12px;flex-wrap:wrap;font-size:12.5px;color:var(--muted)" },
    icon(15, 15, false, "Quadrat"), icon(11, 19, false, "hoch"), icon(19, 11, false, "breit"), icon(16, 16, true, "beliebig"), h("span", { style: "white-space:nowrap" }, "Zahl = Fläche")));

  // undo stack (one snapshot per gesture / hint / clear) + redraw counter (removed or replaced rects)
  const history = []; let redraws = 0;
  const same = (a, c2) => a.r === c2.r && a.c === c2.c && a.w === c2.w && a.h === c2.h;
  const snap = () => rects.map((rc) => ({ ...rc }));
  const stateKey = (rs) => rs.map((rc) => `${rc.r},${rc.c},${rc.w},${rc.h}`).sort().join("|");
  const lost = (before, after) => before.filter((rc) => !after.some((x) => same(x, rc))).length;
  const commit = (before) => { if (stateKey(before) !== stateKey(rects)) { history.push(before); redraws += lost(before, rects); } };

  const rectAttrs = (rc, inset = 3) => ({ x: rc.c * S + inset, y: rc.r * S + inset, width: rc.w * S - 2 * inset, height: rc.h * S - 2 * inset });
  const clueIn = (rc) => clueKeys.find((k) => patches.contains(rc, Math.floor(k / 64), k % 64));
  const rectAt = (r, c) => rects.findIndex((x) => patches.contains(x, r, c));
  const clueAt = (r, c) => (p.clues[r * 64 + c] != null ? r * 64 + c : null);
  const fits = (rc) => patches.fits(p, rects, rc);
  const cellsOf = (rc) => { const out = []; for (let r = rc.r; r < rc.r + rc.h; r++) for (let c = rc.c; c < rc.c + rc.w; c++) out.push([r, c]); return out; };
  const keyCell = (k) => [Math.floor(k / 64), k % 64];

  // drag state; preview = {rect|null, snapped, raw} from the engine (rect = what would be placed on release)
  let anchor = null, anchorKey = null, picked = null, preview = null, t0 = 0;
  const span = (cell) => patches.snapDrag(p, rects, anchorKey, cell);

  const draw = () => {
    rectLayer.replaceChildren(...rects.map((rc) => svgEl("rect", { ...rectAttrs(rc), rx: 10, fill: colorOf(rc), stroke: "var(--line-strong)", "stroke-width": 5 })));
    const covered = new Set(); rects.forEach((rc) => { for (let r = rc.r; r < rc.r + rc.h; r++) for (let c = rc.c; c < rc.c + rc.w; c++) covered.add(r * 64 + c); });
    for (const [k, { box, dashed }] of clueEls) if (dashed) box.setAttribute("fill", covered.has(k) || (preview && k === anchorKey) ? "none" : "var(--card)");
    if (preview) {
      const ok = !!preview.rect, shown = preview.rect || preview.raw;
      Object.entries(rectAttrs(shown)).forEach(([k, v]) => prevEl.setAttribute(k, v));
      prevEl.setAttribute("fill", ok ? "rgba(52,168,83,.3)" : "rgba(31,122,255,.16)"); prevEl.setAttribute("stroke", ok ? "var(--ok)" : "#1f7aff");
      prevEl.setAttribute("stroke-dasharray", ok ? "" : "14 10"); prevEl.setAttribute("visibility", "visible");
      lblTx.textContent = String(shown.w * shown.h);
      const w = 22 + 15 * lblTx.textContent.length; lblBg.setAttribute("width", w); lblTx.setAttribute("x", w / 2);
      lblG.setAttribute("transform", `translate(${shown.c * S + 9},${shown.r * S + 9})`); lblG.setAttribute("visibility", "visible");
    } else { prevEl.setAttribute("visibility", "hidden"); lblG.setAttribute("visibility", "hidden"); }
    clear.disabled = !rects.length;
    setMsg(rects.length ? `${rects.length} von ${total} Flicken` : `Von einem Hinweis aus ein Rechteck ziehen · 0 von ${total}`);
  };

  // --- transient effects ---
  const shakeClue = (k) => {
    const { g, t } = clueEls.get(k); if (!g?.animate) return;
    g.animate([{ transform: "translateX(0)" }, { transform: "translateX(-9px)" }, { transform: "translateX(9px)" }, { transform: "translateX(-6px)" }, { transform: "translateX(6px)" }, { transform: "translateX(0)" }], { duration: 320, easing: "ease-in-out" });
    t?.animate([{ fill: "var(--bad)" }, { fill: "var(--bad)", offset: .6 }, { fill: "var(--ink)" }], { duration: 650 });
  };
  const flashRect = (rc, color) => {
    const f = svgEl("rect", { ...rectAttrs(rc), rx: 10, fill: color, opacity: .7 }); fx.append(f);
    f.style.transition = "opacity .7s ease"; requestAnimationFrame(() => requestAnimationFrame(() => { f.style.opacity = 0; }));
    setTimeout(() => f.remove(), 800);
  };
  let outlines = [];
  const showPlacements = (k) => {
    outlines.forEach((o) => o.remove()); outlines = [];
    const opts = patches.placementsFor(p, k).filter((o) => !rects.some((rc) => patches.overlaps(rc, o)));
    if (opts.length > 8) return opts.length;
    for (const [i, o] of opts.entries()) {
      const inset = 7 + (i % 3) * 5; // stagger nested outlines so they stay distinguishable
      const el = svgEl("rect", { ...rectAttrs(o, inset), rx: 8, fill: "none", stroke: "#1f7aff", "stroke-width": 3, "stroke-dasharray": "10 8", opacity: .9 });
      fx.append(el); outlines.push(el);
    }
    const mine = outlines;
    setTimeout(() => { mine.forEach((o) => { o.style.transition = "opacity .3s"; o.style.opacity = 0; }); setTimeout(() => mine.forEach((o) => o.remove()), 320); }, 1500);
    return opts.length;
  };

  // --- interaction ---
  let before = null; // rects snapshot at pointer-down
  b.drag({
    onStart: (cell) => {
      anchor = null; anchorKey = null; picked = null; preview = null; t0 = performance.now(); before = snap();
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
      const rc = preview?.rect, key = anchorKey, old = picked, dt = performance.now() - t0, b0 = before || snap();
      preview = null; anchor = null; picked = null; anchorKey = null; before = null;
      const tap = !moved && dt < 250;
      const place = (x) => { rects.push(x); commit(b0); haptic(); draw(); if (patches.isSolved(p, rects)) onSolved(); };
      if (tap) {
        if (old) { commit(b0); haptic(); draw(); return; } // tap on a finished rect → removed (= 1 redraw)
        if (rc && patches.placementsFor(p, key).length === 1) { place(rc); return; }
        draw(); const cnt = showPlacements(key);
        setMsg(cnt === 1 ? "Passt nur so hinein" : `${cnt} Möglichkeiten für ${accName(key)}`);
        return;
      }
      if (rc && fits(rc)) { place(rc); return; }
      // invalid: put a picked-up rect back, shake the clue
      if (old) rects.push(old);
      draw(); shakeClue(key); haptic(20);
    },
  });

  // --- board API: undo / clear / metrics ---
  b.canUndo = () => history.length > 0;
  b.undo = () => {
    if (!history.length) return false;
    const prev = history.pop(); redraws += lost(rects, prev); rects = prev.map((rc) => ({ ...rc }));
    draw(); return true;
  };
  b.clear = () => {
    if (!rects.length) return false;
    history.push(snap()); redraws += rects.length; rects = []; draw(); return true;
  };
  b.metrics = () => ({ redraws, line: redraws === 0 ? "Keine Neuzeichnungen" : redraws === 1 ? "1 Neuzeichnung" : `${redraws} Neuzeichnungen` });

  // --- hint (LinkedIn style): reason + spotlight; "Anzeigen" applies it ---
  b.hint = () => {
    const hp = patches.hintPlan(p, rects);
    if (!hp) return null;
    if (hp.type === "wrong") {
      const rc = { ...hp.rect };
      return {
        text: hp.text, strike: cellsOf(rc), focus: [], target: hp.other ? [keyCell(clueIn(hp.other))] : [],
        apply: () => {
          const i = rects.findIndex((x) => same(x, rc)); if (i < 0) return;
          const b0 = snap(); rects.splice(i, 1); commit(b0); draw(); flashRect(rc, "var(--bad)");
          return "Rechteck entfernt.";
        },
      };
    }
    const rc = { ...hp.rect };
    return {
      text: hp.text, focus: cellsOf(rc), target: hp.cell ? [hp.cell, keyCell(hp.key)] : [keyCell(hp.key)],
      apply: () => {
        if (!fits(rc)) return;
        const b0 = snap(); rects.push(rc); commit(b0); draw(); flashRect(rc, "var(--ok)");
        if (patches.isSolved(p, rects)) setTimeout(onSolved, 0);
      },
    };
  };

  draw(); return b;
}
