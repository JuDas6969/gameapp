// Shared SVG board helpers. A board factory returns { el, aspect:[w,h], lock(), hint() }.

export const NS = "http://www.w3.org/2000/svg";
export const S = 100; // cell size in viewBox units
export const svgEl = (tag, attrs = {}, text) => {
  const el = document.createElementNS(NS, tag);
  for (const [k, v] of Object.entries(attrs)) if (v != null) el.setAttribute(k, v);
  if (text != null) el.textContent = text;
  return el;
};
export const h = (tag, attrs = {}, ...kids) => {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) { if (k === "class") el.className = v; else if (k.startsWith("on")) el.addEventListener(k.slice(2), v); else el.setAttribute(k, v); }
  el.append(...kids.flat().filter((x) => x != null));
  return el;
};
export const REGION = (i) => `var(--r${(i % 12) + 1})`;

/** Base: svg with viewBox, grid lines, pointer → cell mapping. ox/oy = offset of the n×n grid inside viewBox (for clues). */
export function base(n, { ox = 0, oy = 0, strong = null, bg = null } = {}) {
  const W = ox + n * S, H = oy + n * S;
  const svg = svgEl("svg", { viewBox: `0 0 ${W} ${H}` });
  const el = h("div", { class: "board" }, svg);
  const layers = {}; for (const name of ["bg", "cells", "mid", "lines", "top"]) { layers[name] = svgEl("g"); svg.append(layers[name]); }
  if (bg) layers.bg.append(svgEl("rect", { x: ox, y: oy, width: n * S, height: n * S, fill: bg, rx: 6 }));
  for (let i = 0; i <= n; i++) {
    const edge = i === 0 || i === n;
    const sr = edge || (strong && i % strong[0] === 0), sc = edge || (strong && i % strong[1] === 0);
    layers.lines.append(svgEl("line", { x1: ox, y1: oy + i * S, x2: W, y2: oy + i * S, stroke: sr ? "var(--line-strong)" : "var(--line)", "stroke-width": sr ? 4 : 1.5 }));
    layers.lines.append(svgEl("line", { x1: ox + i * S, y1: oy, x2: ox + i * S, y2: H, stroke: sc ? "var(--line-strong)" : "var(--line)", "stroke-width": sc ? 4 : 1.5 }));
  }
  layers.lines.style.pointerEvents = "none"; layers.top.style.pointerEvents = "none"; layers.mid.style.pointerEvents = "none";
  const cellAt = (ev) => {
    const r = svg.getBoundingClientRect(); const x = ((ev.clientX - r.left) / r.width) * W - ox, y = ((ev.clientY - r.top) / r.height) * H - oy;
    const c = Math.floor(x / S), rr = Math.floor(y / S);
    return rr >= 0 && c >= 0 && rr < n && c < n ? [rr, c] : null;
  };
  /** drag helper: onStart(cell), onMove(cell), onEnd(moved:boolean, cell) */
  const drag = ({ onStart, onMove, onEnd }) => {
    let active = false, start = null, last = null, moved = false;
    svg.addEventListener("pointerdown", (e) => { e.preventDefault(); const c = cellAt(e); if (!c) return; active = true; moved = false; start = last = c; svg.setPointerCapture?.(e.pointerId); onStart?.(c, e); });
    svg.addEventListener("pointermove", (e) => { if (!active) return; const c = cellAt(e); if (!c || (last && c[0] === last[0] && c[1] === last[1])) return; moved = true; last = c; onMove?.(c, start, e); });
    const end = (e) => { if (!active) return; active = false; onEnd?.(moved, last, start, e); };
    svg.addEventListener("pointerup", end); svg.addEventListener("pointercancel", end);
  };
  // ---- LinkedIn-style hint spotlight: dim everything except focus cells, outline targets, stripe cells to clear ----
  let spot = null;
  const uid = Math.random().toString(36).slice(2, 8);
  const clearSpotlight = () => { spot?.remove(); spot = null; };
  /** spec: { focus: [[r,c]…], target: [[r,c]…], strike: [[r,c]…] } – focus/target/strike stay bright, the rest is dimmed. */
  const spotlight = (spec = {}) => {
    clearSpotlight();
    const focus = spec.focus || [], target = spec.target || [], strike = spec.strike || [];
    if (!focus.length && !target.length && !strike.length) return;
    const g = svgEl("g", { "pointer-events": "none" });
    const defs = svgEl("defs");
    const mask = svgEl("mask", { id: `m${uid}` });
    mask.append(svgEl("rect", { x: 0, y: 0, width: W, height: H, fill: "#fff" }));
    for (const [r, c] of [...focus, ...target, ...strike]) mask.append(svgEl("rect", { x: ox + c * S, y: oy + r * S, width: S, height: S, fill: "#000" }));
    const pat = svgEl("pattern", { id: `p${uid}`, width: 22, height: 22, patternUnits: "userSpaceOnUse", patternTransform: "rotate(45)" });
    pat.append(svgEl("rect", { x: 0, y: 0, width: 9, height: 22, fill: "rgba(255,255,255,.55)" }));
    defs.append(mask, pat); g.append(defs);
    g.append(svgEl("rect", { x: 0, y: 0, width: W, height: H, fill: "rgba(0,0,0,.58)", mask: `url(#m${uid})`, class: "spot-dim" }));
    for (const [r, c] of strike) g.append(svgEl("rect", { x: ox + c * S, y: oy + r * S, width: S, height: S, fill: `url(#p${uid})` }));
    for (const [r, c] of target) g.append(svgEl("rect", { x: ox + c * S + 4, y: oy + r * S + 4, width: S - 8, height: S - 8, fill: "none", stroke: "#1f7aff", "stroke-width": 8, rx: 4 }));
    svg.append(g); spot = g;
  };
  return { el, svg, layers, W, H, ox, oy, cellAt, drag, aspect: [W, H], lock: () => el.classList.add("locked"), spotlight, clearSpotlight };
}
export const txt = (x, y, s, size, cls = "cell-txt", extra = {}) => svgEl("text", { x, y, class: cls, "font-size": size, ...extra }, s);
export const msgBar = (tools, text) => { const m = h("span", { class: "msg" }, text); tools.append(m); return (t, err) => { m.textContent = t; m.classList.toggle("err", !!err); }; };

