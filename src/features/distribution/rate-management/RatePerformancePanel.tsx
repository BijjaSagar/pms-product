import * as Lucide from 'lucide-react';

const trend = [
  { day: 'Oct 14', adr: 7800, occupancy: 62 },
  { day: 'Oct 16', adr: 8200, occupancy: 68 },
  { day: 'Oct 18', adr: 9200, occupancy: 81 },
  { day: 'Oct 20', adr: 8500, occupancy: 70 },
  { day: 'Oct 22', adr: 9800, occupancy: 86 },
  { day: 'Oct 24', adr: 10400, occupancy: 92 },
  { day: 'Oct 26', adr: 9000, occupancy: 76 },
];

const toPoint = (value: number, min: number, max: number, index: number) => ({
  x: 12 + (index / (trend.length - 1)) * 476,
  y: 112 - ((value - min) / (max - min)) * 82,
});

export function RatePerformancePanel() {
  const adrPoints = trend.map((item, index) => toPoint(item.adr, 7000, 11000, index));
  const occupancyPoints = trend.map((item, index) => toPoint(item.occupancy, 50, 100, index));
  const linePath = (points: Array<{ x: number; y: number }>) => points.map((point, index) => `${index ? 'L' : 'M'} ${point.x} ${point.y}`).join(' ');

  return (
    <section className="pms-card p-4 sm:p-5" aria-labelledby="rate-performance-title">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-tr from-success-text to-success-border text-white shadow-xs shadow-success-text/20">
            <Lucide.LineChart size={18} strokeWidth={2.4} />
          </div>
          <div>
            <h2 id="rate-performance-title" className="text-sm font-bold text-ink tracking-tight">Rate Performance</h2>
            <p className="text-[11px] text-ink-muted mt-0.5">Rate and occupancy outlook · next 14 days</p>
          </div>
        </div>
        <div className="grid grid-cols-3 gap-4 text-right">
          <div><p className="text-[10px] font-semibold uppercase tracking-wider text-ink-muted">ADR</p><p className="mt-1 text-sm font-bold text-ink tnum">₹8,450</p><p className="text-[10px] font-semibold text-success-text">+12%</p></div>
          <div><p className="text-[10px] font-semibold uppercase tracking-wider text-ink-muted">Occupancy</p><p className="mt-1 text-sm font-bold text-ink tnum">78%</p><p className="text-[10px] font-semibold text-success-text">+6%</p></div>
          <div><p className="text-[10px] font-semibold uppercase tracking-wider text-ink-muted">Revenue</p><p className="mt-1 text-sm font-bold text-ink tnum">₹4.2L</p><p className="text-[10px] font-semibold text-success-text">+18%</p></div>
        </div>
      </div>
      <div className="mt-4 overflow-hidden rounded-control border p-2 sm:p-3" style={{ borderColor: 'var(--color-divider)', background: 'var(--color-muted-surface)' }}>
        <svg viewBox="0 0 500 145" role="img" aria-label="Average daily rate and occupancy trend over the next 14 days" className="h-[170px] w-full overflow-visible">
          <defs>
            <linearGradient id="rate-performance-fill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--color-primary)" stopOpacity="0.2" />
              <stop offset="100%" stopColor="var(--color-primary)" stopOpacity="0" />
            </linearGradient>
          </defs>
          {[30, 70, 110].map((y) => <line key={y} x1="10" y1={y} x2="490" y2={y} stroke="var(--color-border)" strokeDasharray="3 4" />)}
          <path d={`${linePath(adrPoints)} L 488 130 L 12 130 Z`} fill="url(#rate-performance-fill)" />
          <path d={linePath(adrPoints)} fill="none" stroke="var(--color-primary)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
          <path d={linePath(occupancyPoints)} fill="none" stroke="var(--color-warning-text)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" strokeDasharray="5 4" />
          {adrPoints.map((point, index) => <circle key={`adr-${index}`} cx={point.x} cy={point.y} r="3" fill="var(--color-primary)" />)}
          {occupancyPoints.map((point, index) => <circle key={`occ-${index}`} cx={point.x} cy={point.y} r="2.5" fill="var(--color-warning-text)" />)}
        </svg>
      </div>
      <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-4 text-[11px] text-ink-secondary">
          <span className="inline-flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-primary" />ADR</span>
          <span className="inline-flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-warning-text" />Occupancy</span>
        </div>
        <p className="inline-flex items-center gap-1 text-[11px] text-ink-muted"><Lucide.TrendingUp size={13} />Demand peaks Oct 24</p>
      </div>
      <div className="mt-3 flex justify-between border-t pt-2 text-[10px] text-ink-muted" style={{ borderColor: 'var(--color-divider)' }}>
        {trend.filter((_, index) => index % 2 === 0).map((item) => <span key={item.day}>{item.day}</span>)}
      </div>
    </section>
  );
}
