export function DriGauge({ value, size = 180 }: { value: number; size?: number }) {
  const pct = Math.max(0, Math.min(1, value));
  const r = size / 2 - 14;
  const cx = size / 2, cy = size / 2;
  const start = Math.PI * 0.75;
  const end = Math.PI * 2.25;
  const angle = start + (end - start) * pct;
  const arcPath = (from: number, to: number) => {
    const p1 = { x: cx + r * Math.cos(from), y: cy + r * Math.sin(from) };
    const p2 = { x: cx + r * Math.cos(to), y: cy + r * Math.sin(to) };
    const large = to - from > Math.PI ? 1 : 0;
    return `M ${p1.x} ${p1.y} A ${r} ${r} 0 ${large} 1 ${p2.x} ${p2.y}`;
  };
  const color =
    pct >= 0.75 ? "var(--color-severity-crit)" :
    pct >= 0.5 ? "var(--color-severity-high)" :
    pct >= 0.25 ? "var(--color-severity-med)" :
    "var(--color-severity-low)";
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <path d={arcPath(start, end)} stroke="var(--color-muted)" strokeWidth={10} fill="none" strokeLinecap="round" />
      <path d={arcPath(start, angle)} stroke={color} strokeWidth={10} fill="none" strokeLinecap="round" />
      <text x={cx} y={cy + 4} textAnchor="middle" fontSize={size * 0.22} className="mono" fill="var(--color-foreground)">
        {Math.round(pct * 100)}
      </text>
      <text x={cx} y={cy + size * 0.18} textAnchor="middle" fontSize={11} fill="var(--color-muted-foreground)">
        DRI %
      </text>
    </svg>
  );
}
