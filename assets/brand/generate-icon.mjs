import { writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const SIZE = 1024;
const BG = "#000000";
const FG = "#FFFFFF";
const ACCENT = "#7C6FFF";

function squirclePath(size, n = 5, samples = 128) {
  const a = size / 2;
  const b = size / 2;
  const cx = size / 2;
  const cy = size / 2;
  const pts = [];
  for (let i = 0; i <= samples; i++) {
    const t = (i / samples) * Math.PI * 2;
    const c = Math.cos(t);
    const s = Math.sin(t);
    const x = cx + a * Math.sign(c) * Math.abs(c) ** (2 / n);
    const y = cy + b * Math.sign(s) * Math.abs(s) ** (2 / n);
    pts.push([x, y]);
  }
  let d = `M ${pts[0][0].toFixed(2)} ${pts[0][1].toFixed(2)}`;
  for (let i = 1; i < pts.length; i++) {
    d += ` L ${pts[i][0].toFixed(2)} ${pts[i][1].toFixed(2)}`;
  }
  return `${d} Z`;
}

function starPath(cx, cy, outer, inner) {
  const pts = [];
  for (let i = 0; i < 8; i++) {
    const r = i % 2 === 0 ? outer : inner;
    const a = -Math.PI / 2 + (i * Math.PI) / 4;
    pts.push([cx + r * Math.cos(a), cy + r * Math.sin(a)]);
  }
  let d = `M ${pts[0][0].toFixed(2)} ${pts[0][1].toFixed(2)}`;
  for (let i = 1; i < pts.length; i++) {
    d += ` L ${pts[i][0].toFixed(2)} ${pts[i][1].toFixed(2)}`;
  }
  return `${d} Z`;
}

const maskPath = squirclePath(SIZE, 5);
const cx = SIZE / 2;
const cy = SIZE / 2;
const main = starPath(cx, cy, SIZE * 0.28, SIZE * 0.11);
const north = starPath(cx + SIZE * 0.22, cy - SIZE * 0.2, SIZE * 0.055, SIZE * 0.022);
const south = starPath(cx - SIZE * 0.2, cy + SIZE * 0.18, SIZE * 0.04, SIZE * 0.016);

const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${SIZE}" height="${SIZE}" viewBox="0 0 ${SIZE} ${SIZE}" fill="none">
  <defs>
    <clipPath id="plate">
      <path d="${maskPath}"/>
    </clipPath>
  </defs>
  <g clip-path="url(#plate)">
    <rect width="${SIZE}" height="${SIZE}" fill="${BG}"/>
    <path d="${main}" fill="${FG}"/>
    <path d="${north}" fill="${ACCENT}"/>
    <path d="${south}" fill="${FG}" fill-opacity="0.7"/>
  </g>
</svg>
`;

const dir = dirname(fileURLToPath(import.meta.url));
const out = join(dir, "asterism-icon.svg");
writeFileSync(out, svg);
console.log(`wrote ${out}`);
