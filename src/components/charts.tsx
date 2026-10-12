/** Minimal SVG charts using theme tokens. No charting dependency. */

export function BarChart({
  data,
  height = 168,
  label,
}: {
  data: { label: string; value: number; highlight?: boolean }[];
  height?: number;
  label: string;
}) {
  const max = Math.max(...data.map((d) => d.value), 1);
  return (
    <div role="img" aria-label={label} className="w-full overflow-x-auto pb-1">
      <div className="flex min-w-[320px] items-end gap-1.5 sm:gap-2.5" style={{ height: `${height + 38}px` }}>
        {data.map((d) => (
          <div key={d.label} className="group flex h-full min-w-0 flex-1 flex-col items-center justify-end gap-1.5">
            <span
              className="tnum rounded-full px-1.5 py-0.5 text-[11px] font-bold transition-all"
              style={{
                color: d.highlight ? 'var(--color-primary-foreground)' : 'var(--color-ink-secondary)',
                background: d.highlight ? 'var(--color-primary)' : 'transparent',
                boxShadow: d.highlight ? 'var(--shadow-primary)' : 'none',
              }}
            >
              {d.value}
            </span>
            <div
              className="w-full max-w-[52px] rounded-t-[9px] rounded-b-[3px] transition-all duration-300 group-hover:brightness-105"
              title={`${d.label}: ${d.value}`}
              style={{
                height: `${Math.max(8, (d.value / max) * height)}px`,
                background: d.highlight
                  ? 'linear-gradient(180deg, var(--color-primary-hover), var(--color-primary) 60%, var(--color-primary-active))'
                  : 'linear-gradient(180deg, color-mix(in srgb, var(--color-soft) 88%, white), var(--color-soft))',
                boxShadow: d.highlight
                  ? 'var(--shadow-primary), inset 0 1px 0 rgb(255 255 255 / 0.35)'
                  : 'var(--shadow-xs), inset 0 1px 0 rgb(255 255 255 / 0.6)',
                border: '1px solid color-mix(in srgb, var(--color-primary) 12%, transparent)',
                borderBottom: 'none',
              }}
            />
            <span className="w-full truncate text-center text-[11px] font-semibold" style={{ color: 'var(--color-ink-muted)' }}>
              {d.label}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

export function DonutChart({
  slices,
  size = 148,
  label,
}: {
  slices: { label: string; value: number; color: string }[];
  size?: number;
  label: string;
}) {
  const total = slices.reduce((s, x) => s + x.value, 0) || 1;
  const R = 54;
  const C = 2 * Math.PI * R;
  const offsets: number[] = [];
  slices.reduce((acc, s) => {
    offsets.push(acc);
    return acc + s.value;
  }, 0);
  return (
    <div className="flex flex-col items-center gap-5 sm:flex-row sm:flex-wrap">
      <div className="relative flex-none" style={{ filter: 'drop-shadow(0 8px 18px rgb(40 30 20 / 0.16))' }}>
        <svg width={size} height={size} viewBox="0 0 140 140" role="img" aria-label={label} className="h-auto w-full max-w-[180px] sm:max-w-none">
          <circle cx="70" cy="70" r={R} fill="none" stroke="var(--color-divider)" strokeWidth="18" />
          {slices.map((s, idx) => {
            const frac = s.value / total;
            const dash = `${Math.max(0, frac * C - 2.5)} ${C}`;
            const rot = -90 + (offsets[idx] / total) * 360;
            return (
              <circle
                key={s.label}
                cx="70"
                cy="70"
                r={R}
                fill="none"
                stroke={s.color}
                strokeWidth="18"
                strokeDasharray={dash}
                transform={`rotate(${rot} 70 70)`}
                strokeLinecap="round"
              />
            );
          })}
          <text x="70" y="67" textAnchor="middle" fontSize="20" fontWeight="800" fill="var(--color-ink)">
            {total}
          </text>
          <text x="70" y="84" textAnchor="middle" fontSize="10" fontWeight="600" letterSpacing="1.5" fill="var(--color-ink-secondary)">
            TOTAL
          </text>
        </svg>
      </div>
      <ul className="grid w-full min-w-0 flex-1 grid-cols-1 gap-1.5 xs:grid-cols-2 sm:grid-cols-1 lg:grid-cols-2 xl:grid-cols-1">
        {slices.map((s) => (
          <li
            key={s.label}
            className="flex items-center justify-between gap-2 rounded-[10px] border px-2.5 py-2 text-[12.5px]"
            style={{ borderColor: 'var(--color-divider)', background: 'color-mix(in srgb, var(--color-muted-surface) 42%, transparent)', boxShadow: 'var(--shadow-xs)' }}
          >
            <span className="flex min-w-0 items-center gap-2" style={{ color: 'var(--color-ink-secondary)' }}>
              <span className="h-2.5 w-2.5 flex-none rounded-full" style={{ background: s.color, boxShadow: `0 0 0 3px color-mix(in srgb, ${s.color} 20%, transparent)` }} aria-hidden="true" />
              <span className="truncate font-medium">{s.label}</span>
            </span>
            <span className="tnum flex-none font-bold" style={{ color: 'var(--color-ink)' }}>
              {s.value}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
