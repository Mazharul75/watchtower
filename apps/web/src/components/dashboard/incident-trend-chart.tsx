interface DayCount {
  label: string;
  count: number;
}

/**
 * A dependency-free SVG bar chart — no charting library needed for 14 bars.
 * `days` is real per-day incident counts computed server-side from actual
 * `Incident.createdAt` timestamps; an all-zero week renders as a flat,
 * honest baseline rather than being hidden.
 */
export function IncidentTrendChart({ days }: { days: DayCount[] }) {
  const max = Math.max(1, ...days.map((d) => d.count));
  const barWidth = 22;
  const gap = 10;
  const chartHeight = 100;
  const width = days.length * (barWidth + gap);

  return (
    <div className="overflow-x-auto">
      <svg width={Math.max(width, 320)} height={chartHeight + 24} role="img" aria-label="Incidents created per day, last 14 days">
        {days.map((d, i) => {
          const barHeight = d.count === 0 ? 2 : Math.max(4, (d.count / max) * chartHeight);
          const x = i * (barWidth + gap);
          const y = chartHeight - barHeight;
          return (
            <g key={d.label}>
              <rect
                x={x}
                y={y}
                width={barWidth}
                height={barHeight}
                rx="4"
                fill={d.count > 0 ? "url(#wt-bar-grad)" : "#e5e7eb"}
                style={{ animation: "wt-bar-grow 0.5s cubic-bezier(0.16,1,0.3,1) both", animationDelay: `${i * 30}ms`, transformOrigin: `${x + barWidth / 2}px ${chartHeight}px` }}
              />
              {d.count > 0 && (
                <text x={x + barWidth / 2} y={y - 6} textAnchor="middle" fontSize="10" fill="#475569">
                  {d.count}
                </text>
              )}
              <text x={x + barWidth / 2} y={chartHeight + 16} textAnchor="middle" fontSize="9" fill="#64748b">
                {d.label}
              </text>
            </g>
          );
        })}
        <defs>
          <linearGradient id="wt-bar-grad" x1="0" y1="1" x2="0" y2="0">
            <stop offset="0%" stopColor="#6366F1" />
            <stop offset="100%" stopColor="#22D3EE" />
          </linearGradient>
        </defs>
      </svg>
      <style>{`
        @keyframes wt-bar-grow { from { transform: scaleY(0); } to { transform: scaleY(1); } }
        @media (prefers-reduced-motion: reduce) { svg rect { animation: none !important; } }
      `}</style>
    </div>
  );
}
