import * as Lucide from 'lucide-react';
import type { CalendarDate } from './types';

interface Props {
  dates: CalendarDate[];
  minStays: number[];
  maxStays: number[];
  closedToArrival: boolean[];
  closedToDeparture: boolean[];
  stopSell: boolean[];
  onOpenCalendar: () => void;
}

export function RestrictionsPanel({ dates, minStays, maxStays, closedToArrival, closedToDeparture, stopSell, onOpenCalendar }: Props) {
  const restrictions = dates.flatMap((date, index) => {
    const items = [];
    if (stopSell[index]) items.push({ id: `${date.iso}-stop`, label: 'Stop sell', detail: 'Room sales closed', tone: 'danger' as const, icon: Lucide.Ban });
    if (closedToArrival[index]) items.push({ id: `${date.iso}-cta`, label: 'Closed to arrival', detail: 'New arrivals blocked', tone: 'warning' as const, icon: Lucide.LogIn });
    if (closedToDeparture[index]) items.push({ id: `${date.iso}-ctd`, label: 'Closed to departure', detail: 'Departures blocked', tone: 'warning' as const, icon: Lucide.LogOut });
    if (minStays[index] > 1 || maxStays[index] < 14) items.push({ id: `${date.iso}-stay`, label: 'Stay length', detail: `${minStays[index]}–${maxStays[index]} nights`, tone: 'info' as const, icon: Lucide.Moon });
    return items.map((item) => ({ ...item, date }));
  });

  const counts = [
    { label: 'Stop sell', count: stopSell.filter(Boolean).length, icon: Lucide.Ban, tone: 'danger' },
    { label: 'Closed to arrival', count: closedToArrival.filter(Boolean).length, icon: Lucide.LogIn, tone: 'warning' },
    { label: 'Closed to departure', count: closedToDeparture.filter(Boolean).length, icon: Lucide.LogOut, tone: 'info' },
  ];

  return (
    <section className="pms-card overflow-hidden" aria-labelledby="restrictions-title">
      <div className="flex flex-col gap-3 border-b px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-5" style={{ borderColor: 'var(--color-border)' }}>
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-tr from-rose-500 to-red-600 text-white shadow-xs shadow-rose-500/20">
            <Lucide.ShieldAlert size={18} strokeWidth={2.4} />
          </div>
          <div>
            <h2 id="restrictions-title" className="text-sm font-bold text-slate-900 tracking-tight">Restrictions & Availability</h2>
            <p className="text-[11px] text-slate-400 mt-0.5">Review arrival, departure, stop-sell and stay-length rules in the selected date window</p>
          </div>
        </div>
        <button type="button" onClick={onOpenCalendar} className="pms-btn-ghost min-h-[38px] px-3.5 py-1.5 text-xs">
          <Lucide.CalendarDays size={14} /> Edit calendar
        </button>
      </div>

      <div className="grid gap-3 p-4 sm:grid-cols-3 sm:p-5">
        {counts.map(({ label, count, icon: Icon, tone }) => (
          <div key={label} className="flex items-center gap-3 rounded-card border p-3.5" style={{ borderColor: 'var(--color-border)', background: 'var(--color-muted-surface)' }}>
            <span className="flex h-9 w-9 items-center justify-center rounded-control" style={{ color: `var(--color-${tone}-text)`, background: `var(--color-${tone}-bg)` }}><Icon size={16} /></span>
            <div><div className="tnum text-xl font-bold text-ink">{count}</div><div className="text-[11px] text-ink-secondary">{label} dates</div></div>
          </div>
        ))}
      </div>

      <div className="border-t" style={{ borderColor: 'var(--color-divider)' }}>
        <div className="flex items-center justify-between px-4 py-3 sm:px-5">
          <h3 className="text-sm font-semibold text-ink">Active rules in this window</h3>
          <span className="text-[11px] text-ink-muted">{restrictions.length} rules</span>
        </div>
        {restrictions.length ? (
          <ul className="divide-y" style={{ borderColor: 'var(--color-divider)' }}>
            {restrictions.map(({ id, date, label, detail, tone, icon: Icon }) => (
              <li key={id} className="flex items-center justify-between gap-3 px-4 py-3 sm:px-5">
                <div className="flex min-w-0 items-center gap-3">
                  <span className="flex h-8 w-8 flex-none items-center justify-center rounded-control" style={{ color: `var(--color-${tone}-text)`, background: `var(--color-${tone}-bg)` }}><Icon size={15} /></span>
                  <div className="min-w-0"><p className="truncate text-xs font-semibold text-ink">{label}</p><p className="mt-0.5 truncate text-[11px] text-ink-muted">{detail}</p></div>
                </div>
                <time dateTime={date.iso} className="flex-none text-xs font-medium text-ink-secondary">{date.weekday}, {date.month} {date.day}</time>
              </li>
            ))}
          </ul>
        ) : (
          <div className="flex flex-col items-center px-4 py-10 text-center">
            <span className="flex h-11 w-11 items-center justify-center rounded-full bg-success-bg text-success-text"><Lucide.Check size={20} /></span>
            <p className="mt-3 text-sm font-semibold text-ink">No restrictions scheduled</p>
            <p className="mt-1 text-xs text-ink-muted">All dates in the current window are open for standard stays.</p>
          </div>
        )}
      </div>
    </section>
  );
}
