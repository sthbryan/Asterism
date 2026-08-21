import { fmtCompact } from "../lib/format";

const COLORS = ["#7c6fff", "#4fd1c5", "#f0b429", "#f472b6", "#60a5fa", "#c084fc"];

export function BarChart({
  items,
}: {
  items: { label: string; value: number }[];
}) {
  const max = Math.max(...items.map((item) => item.value), 1);
  return (
    <div className="flex h-40 items-end gap-2.5">
      {items.map((item, i) => {
        const pct = Math.max(10, (item.value / max) * 100);
        const name = item.label.split("/")[1] ?? item.label;
        return (
          <div key={item.label} className="flex min-w-0 flex-1 flex-col items-center gap-2">
            <div className="flex h-32 w-full items-end justify-center">
              <div
                className="w-4 rounded-full"
                style={{
                  height: `${pct}%`,
                  background: `linear-gradient(180deg, ${COLORS[i % COLORS.length]} 0%, ${COLORS[i % COLORS.length]}66 100%)`,
                }}
                title={`${item.label}: ${fmtCompact(item.value)}`}
              />
            </div>
            <span className="w-full truncate text-center text-[10px] text-mist">{name}</span>
          </div>
        );
      })}
    </div>
  );
}

export function Donut({
  items,
}: {
  items: { label: string; value: number }[];
}) {
  const total = items.reduce((sum, item) => sum + item.value, 0);
  const r = 38;
  const c = 2 * Math.PI * r;
  let offset = 0;
  const slices = items.map((item, i) => {
    const frac = total === 0 ? 0 : item.value / total;
    const slice = { ...item, frac, color: COLORS[i % COLORS.length], dash: frac * c, offset };
    offset += frac * c;
    return slice;
  });

  return (
    <div className="flex items-center gap-6">
      <svg viewBox="0 0 100 100" className="h-36 w-36 shrink-0">
        <circle cx="50" cy="50" r={r} fill="none" stroke="#2c3148" strokeWidth="10" />
        {slices.map((slice) => (
          <circle
            key={slice.label}
            cx="50"
            cy="50"
            r={r}
            fill="none"
            stroke={slice.color}
            strokeWidth="10"
            strokeDasharray={`${slice.dash} ${c - slice.dash}`}
            strokeDashoffset={-slice.offset}
            strokeLinecap="round"
            transform="rotate(-90 50 50)"
          />
        ))}
        <text
          x="50"
          y="48"
          textAnchor="middle"
          fill="#eef0fa"
          fontSize="16"
          fontWeight="600"
          fontFamily="Geist Mono Variable, ui-monospace, monospace"
        >
          {fmtCompact(total)}
        </text>
        <text x="50" y="62" textAnchor="middle" fill="#9aa3c4" fontSize="8">
          downloads
        </text>
      </svg>
      <ul className="min-w-0 flex-1 space-y-2">
        {slices.slice(0, 6).map((slice) => (
          <li key={slice.label} className="flex items-center gap-2 text-[12px]">
            <span
              className="h-2 w-2 shrink-0 rounded-full"
              style={{ background: slice.color }}
            />
            <span className="min-w-0 flex-1 truncate text-mist">
              {slice.label.split("/")[1] ?? slice.label}
            </span>
            <span className="font-mono text-paper tabular">{fmtCompact(slice.value)}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
