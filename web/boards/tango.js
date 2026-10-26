import { S, svgEl, h, REGION, base, txt, msgBar } from "./_shared.js";
import * as tango from "../engine/tango.js";

export function Tango(p, { onSolved, tools, haptic }) {
  const n = 6, g = p.givens.map((r) => r.slice()); const b = base(n); const glyphs = [];
  for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) {
    if (p.givens[r][c] !== -1) b.layers.bg.append(svgEl("rect", { x: c * S, y: r * S, width: S, height: S, fill: "rgba(127,127,127,.1)" }));
    const t = txt(c * S + S / 2, r * S + S / 2, "", 54); b.layers.top.append(t); glyphs.push(t);
  }
  for (const k of p.constraints) {
    const x = ((k.a[1] + k.b[1]) / 2 + 0.5) * S, y = ((k.a[0] + k.b[0]) / 2 + 0.5) * S;
    b.layers.top.append(svgEl("circle", { cx: x, cy: y, r: 17, fill: "var(--card)", stroke: "var(--line-strong)", "stroke-width": 2 }));
    b.layers.top.append(txt(x, y + 1, k.eq ? "=" : "×", 28, "cell-txt", { "font-weight": 900 }));
  }
  msgBar(tools, "Tippen: leer → ☀ → ☾");
  const draw = () => {
    const bad = tango.conflicts(p, g);
    for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) {
      const t = glyphs[r * n + c], v = g[r][c];
      t.textContent = v === 0 ? "☀" : v === 1 ? "☾" : "";
      t.setAttribute("fill", bad.has(r * 64 + c) ? "var(--bad)" : v === 0 ? "var(--sun)" : "var(--moon)");
      t.setAttribute("class", "cell-txt");
    }
  };
  b.drag({ onEnd: (moved, last, [r, c]) => {
    if (moved || p.givens[r][c] !== -1) return;
    g[r][c] = g[r][c] === 1 ? -1 : g[r][c] + 1; haptic(); draw();
    if (JSON.stringify(g) === JSON.stringify(p.solution)) onSolved();
  } });
  draw(); return b;
}
