import { Button, Checkbox, IconButton, TextField } from '../../../components/primitives';
import * as Lucide from 'lucide-react';
import type { CalendarDate, EditableRateRow, RatePlan } from './types';

interface Props {
  roomType: string;
  plan: RatePlan;
  dates: CalendarDate[];
  businessDate: string;
  startLabel: string;
  rates: number[];
  minStays: number[];
  maxStays: number[];
  closedToArrival: boolean[];
  closedToDeparture: boolean[];
  stopSell: boolean[];
  availability: number[];
  demand: Array<'Medium' | 'High'>;
  onPrevious: () => void;
  onNext: () => void;
  onToday: () => void;
  onRateChange: (index: number, value: number) => void;
  onMinStayChange: (index: number, value: number) => void;
  onMaxStayChange: (index: number, value: number) => void;
  onRestrictionChange: (row: 'cta' | 'ctd' | 'stopSell', index: number, value: boolean) => void;
  onCopyRow: (row: EditableRateRow) => void;
}

function CopyRowButton({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <IconButton variant="ghost"
      type="button"
      aria-label={`Copy first ${label.toLowerCase()} value to every date`}
      title={`Copy ${label} across all dates`}
      onClick={onClick}
      className="inline-flex items-center justify-center transition-colors"
    >
      <Lucide.Copy size={14} aria-hidden="true" />
    </IconButton>
  );
}

function ToggleCell({
  checked,
  label,
  onChange,
}: {
  checked: boolean;
  label: string;
  onChange: (checked: boolean) => void;
}) {
  return (
    <Checkbox
      type="checkbox"
      checked={checked}
      aria-label={label}
      onChange={(event) => onChange(event.target.checked)}
    />
  );
}

export function RateCalendarPanel({
  roomType,
  plan,
  dates,
  businessDate,
  startLabel,
  rates,
  minStays,
  maxStays,
  closedToArrival,
  closedToDeparture,
  stopSell,
  availability,
  demand,
  onPrevious,
  onNext,
  onToday,
  onRateChange,
  onMinStayChange,
  onMaxStayChange,
  onRestrictionChange,
  onCopyRow,
}: Props) {
  const adjustment = plan.adjustmentPct;

  return (
    <section className="pms-card overflow-hidden" aria-labelledby="rate-calendar-title">
      <div className="flex flex-col gap-4 border-b px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-5" style={{ borderColor: 'var(--color-border)' }}>
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-tr from-primary to-dark-accent text-white shadow-xs shadow-primary/20">
            <Lucide.Calendar size={18} strokeWidth={2.4} />
          </div>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h2 id="rate-calendar-title" className="text-body font-bold tracking-tight text-ink">Rate Calendar</h2>
              <span className="flex items-center gap-1.5 rounded-full bg-success-bg px-2.5 py-0.5 text-micro font-bold text-success-text border border-success-border/60">
                <span className="relative flex h-1.5 w-1.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-success-text opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-success-text"></span>
                </span>
                Synced to {plan.channels.length} channels
              </span>
            </div>
            <p className="text-label text-ink-muted mt-0.5">
              {roomType} · {plan.name}{adjustment ? ` · ${adjustment > 0 ? '+' : ''}${adjustment}% plan adjustment` : ' · base pricing'}
            </p>
          </div>
        </div>

        <div className="flex items-center justify-between gap-2 sm:justify-end">
          <div className="flex items-center gap-1 rounded-control border p-1" style={{ borderColor: 'var(--color-border)', background: 'var(--color-muted-surface)' }}>
            <IconButton variant="ghost" type="button" onClick={onPrevious} aria-label="Previous 15 dates" className="flex items-center justify-center">
              <Lucide.ChevronLeft size={16} />
            </IconButton>
            <span className="min-w-[150px] text-center text-label font-semibold text-ink" aria-live="polite">{startLabel}</span>
            <IconButton variant="ghost" type="button" onClick={onNext} aria-label="Next 15 dates" className="flex items-center justify-center">
              <Lucide.ChevronRight size={16} />
            </IconButton>
          </div>
          <Button variant="secondary" type="button" onClick={onToday} >Today</Button>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 sm:px-5">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-label text-ink-secondary" aria-label="Rate calendar legend">
          <span className="inline-flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-primary" />Rate</span>
          <span className="inline-flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-warning-text" />High demand</span>
          <span className="inline-flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-danger-text" />Restriction</span>
        </div>
        <span className="text-label text-ink-muted">Select a cell to update a date</span>
      </div>

      <div className="pms-table-scroll hidden overflow-x-auto border-t sm:block" style={{ borderColor: 'var(--color-divider)' }}>
        <table className="pms-matrix-table min-w-[1120px] w-full border-collapse text-label">
          <thead>
            <tr>
              <th className="sticky left-0 z-20 min-w-[160px] border-r px-4 py-3 text-left text-micro font-bold uppercase tracking-wider text-ink-muted" style={{ background: 'var(--color-surface)', borderColor: 'var(--color-divider)' }}>
                Rate / restriction
              </th>
              {dates.map((date) => (
                <th key={date.iso} className={`min-w-[58px] border-r px-1.5 py-2 text-center ${date.isWeekend ? 'bg-danger-bg/50' : ''}`} style={{ borderColor: 'var(--color-divider)' }}>
                  <span className="block text-micro font-medium text-ink-muted">{date.weekday}</span>
                  <span className={`mt-0.5 block text-body font-bold ${date.iso === businessDate ? 'text-primary' : 'text-ink'}`}>{date.day}</span>
                  <span className="block text-micro font-medium text-ink-muted">{date.month}</span>
                </th>
              ))}
              <th className="w-12 px-1 py-2 text-center text-micro font-semibold text-ink-muted">Copy</th>
            </tr>
          </thead>
          <tbody>
            <tr className="border-t" style={{ borderColor: 'var(--color-divider)' }}>
              <th scope="row" className="sticky left-0 z-10 border-r px-4 py-2.5 text-left font-semibold text-ink" style={{ background: 'var(--color-surface)', borderColor: 'var(--color-divider)' }}>
                <span className="flex items-center gap-2"><Lucide.CircleDollarSign size={14} className="text-primary" /> Nightly rate</span>
              </th>
              {rates.map((rate, index) => (
                <td key={dates[index].iso} className={`border-r p-1 ${dates[index].isWeekend ? 'bg-danger-bg/30' : ''}`} style={{ borderColor: 'var(--color-divider)' }}>
                  <label className="sr-only" htmlFor={`rate-${dates[index].iso}`}>Nightly rate for {dates[index].weekday}, {dates[index].month} {dates[index].day}</label>
                  <div className="relative">
                    <span className="pointer-events-none absolute left-1.5 top-1/2 -translate-y-1/2 text-micro text-ink-muted">₹</span>
                    <TextField id={`rate-${dates[index].iso}`} type="number" min={0} step={100} value={rate} onChange={(event) => onRateChange(index, Number(event.target.value))} className="w-full text-center pl-4" />
                  </div>
                </td>
              ))}
              <td className="px-1 text-center"><CopyRowButton label="Rate" onClick={() => onCopyRow('rate')} /></td>
            </tr>
            <tr className="border-t" style={{ borderColor: 'var(--color-divider)' }}>
              <th scope="row" className="sticky left-0 z-10 border-r px-4 py-2.5 text-left font-medium text-ink-secondary" style={{ background: 'var(--color-surface)', borderColor: 'var(--color-divider)' }}>Minimum stay</th>
              {minStays.map((value, index) => (
                <td key={dates[index].iso} className={`border-r p-1 text-center ${dates[index].isWeekend ? 'bg-danger-bg/30' : ''}`} style={{ borderColor: 'var(--color-divider)' }}>
                  <label className="sr-only" htmlFor={`min-stay-${dates[index].iso}`}>Minimum stay for {dates[index].month} {dates[index].day}</label>
                  <TextField id={`min-stay-${dates[index].iso}`} type="number" min={1} max={30} value={value} onChange={(event) => onMinStayChange(index, Number(event.target.value))} className="w-full text-center" />
                </td>
              ))}
              <td className="px-1 text-center"><CopyRowButton label="Minimum stay" onClick={() => onCopyRow('minStay')} /></td>
            </tr>
            <tr className="border-t" style={{ borderColor: 'var(--color-divider)' }}>
              <th scope="row" className="sticky left-0 z-10 border-r px-4 py-2.5 text-left font-medium text-ink-secondary" style={{ background: 'var(--color-surface)', borderColor: 'var(--color-divider)' }}>Maximum stay</th>
              {maxStays.map((value, index) => (
                <td key={dates[index].iso} className={`border-r p-1 text-center ${dates[index].isWeekend ? 'bg-danger-bg/30' : ''}`} style={{ borderColor: 'var(--color-divider)' }}>
                  <label className="sr-only" htmlFor={`max-stay-${dates[index].iso}`}>Maximum stay for {dates[index].month} {dates[index].day}</label>
                  <TextField id={`max-stay-${dates[index].iso}`} type="number" min={1} max={90} value={value} onChange={(event) => onMaxStayChange(index, Number(event.target.value))} className="w-full text-center" />
                </td>
              ))}
              <td className="px-1 text-center"><CopyRowButton label="Maximum stay" onClick={() => onCopyRow('maxStay')} /></td>
            </tr>
            {([
              { key: 'cta', label: 'Closed to arrival', values: closedToArrival },
              { key: 'ctd', label: 'Closed to departure', values: closedToDeparture },
              { key: 'stopSell', label: 'Stop sell', values: stopSell },
            ] as const).map((row) => (
              <tr key={row.key} className="border-t" style={{ borderColor: 'var(--color-divider)' }}>
                <th scope="row" className="sticky left-0 z-10 border-r px-4 py-2.5 text-left font-medium text-ink-secondary" style={{ background: 'var(--color-surface)', borderColor: 'var(--color-divider)' }}>
                  <span className="flex items-center gap-2"><Lucide.LockKeyhole size={13} className={row.key === 'stopSell' ? 'text-danger-text' : 'text-ink-muted'} />{row.label}</span>
                </th>
                {row.values.map((checked, index) => (
                  <td key={dates[index].iso} className={`border-r p-1 text-center ${dates[index].isWeekend ? 'bg-danger-bg/30' : ''}`} style={{ borderColor: 'var(--color-divider)' }}>
                    <ToggleCell checked={checked} label={`${row.label} on ${dates[index].month} ${dates[index].day}`} onChange={(value) => onRestrictionChange(row.key, index, value)} />
                  </td>
                ))}
                <td className="px-1 text-center"><CopyRowButton label={row.label} onClick={() => onCopyRow(row.key)} /></td>
              </tr>
            ))}
            <tr className="border-t" style={{ borderColor: 'var(--color-divider)' }}>
              <th scope="row" className="sticky left-0 z-10 border-r px-4 py-2.5 text-left font-medium text-ink-secondary" style={{ background: 'var(--color-surface)', borderColor: 'var(--color-divider)' }}>Rooms available</th>
              {availability.map((value, index) => (
                <td key={dates[index].iso} className={`border-r px-1 py-2 text-center font-semibold text-ink-secondary tnum ${dates[index].isWeekend ? 'bg-danger-bg/30' : ''}`} style={{ borderColor: 'var(--color-divider)' }}>{value}</td>
              ))}
              <td />
            </tr>
            <tr className="border-t" style={{ borderColor: 'var(--color-divider)' }}>
              <th scope="row" className="sticky left-0 z-10 border-r px-4 py-2.5 text-left font-medium text-ink-secondary" style={{ background: 'var(--color-surface)', borderColor: 'var(--color-divider)' }}>Demand forecast</th>
              {demand.map((value, index) => (
                <td key={dates[index].iso} className={`border-r px-1 py-2 text-center ${dates[index].isWeekend ? 'bg-danger-bg/30' : ''}`} style={{ borderColor: 'var(--color-divider)' }}>
                  <span className={`inline-flex rounded-full px-2 py-0.5 text-micro font-semibold ${value === 'High' ? 'bg-warning-bg text-warning-text' : 'bg-muted-surface text-ink-secondary'}`}>{value}</span>
                </td>
              ))}
              <td />
            </tr>
          </tbody>
        </table>
      </div>

      <div className="grid gap-2 border-t p-3 sm:hidden" style={{ borderColor: 'var(--color-divider)' }}>
        {dates.map((date, index) => (
          <article key={date.iso} className="rounded-control border p-3" style={{ borderColor: 'var(--color-border)', background: 'var(--color-surface)' }}>
            <div className="mb-3 flex items-center justify-between gap-2">
              <div className="flex items-baseline gap-1.5">
                <span className="text-label font-semibold text-ink">{date.weekday}, {date.month} {date.day}</span>
                {date.iso === businessDate && <span className="rounded-full bg-primary/10 px-1.5 py-0.5 text-micro font-bold text-primary">Today</span>}
              </div>
              <span className={`rounded-full px-2 py-0.5 text-micro font-semibold ${demand[index] === 'High' ? 'bg-warning-bg text-warning-text' : 'bg-muted-surface text-ink-secondary'}`}>
                {demand[index]} demand · {availability[index]} rooms
              </span>
            </div>
            <div className="grid grid-cols-3 gap-2">
              <label className="col-span-3 flex flex-col gap-1 text-micro font-semibold text-ink-muted">Nightly rate
                <span className="relative"><span className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-micro">₹</span><TextField type="number" min={0} step={100} value={rates[index]} onChange={(event) => onRateChange(index, Number(event.target.value))} aria-label={`Nightly rate for ${date.month} ${date.day}`} className="w-full pl-6 pr-2" /></span>
              </label>
              <label className="flex flex-col gap-1 text-micro font-semibold text-ink-muted">Min stay<TextField type="number" min={1} max={30} value={minStays[index]} onChange={(event) => onMinStayChange(index, Number(event.target.value))} aria-label={`Minimum stay for ${date.month} ${date.day}`} className="w-full" /></label>
              <label className="flex flex-col gap-1 text-micro font-semibold text-ink-muted">Max stay<TextField type="number" min={1} max={90} value={maxStays[index]} onChange={(event) => onMaxStayChange(index, Number(event.target.value))} aria-label={`Maximum stay for ${date.month} ${date.day}`} className="w-full" /></label>
              <label className="flex flex-col gap-1 text-micro font-semibold text-ink-muted">Availability<span className="flex min-h-[34px] items-center px-2 text-label font-bold text-ink tnum">{availability[index]} rooms</span></label>
            </div>
            <div className="mt-3 flex flex-wrap gap-x-4 gap-y-2 border-t pt-3" style={{ borderColor: 'var(--color-divider)' }}>
              <label className="inline-flex items-center gap-1.5 text-micro font-medium text-ink-secondary"><ToggleCell checked={closedToArrival[index]} label={`Closed to arrival on ${date.month} ${date.day}`} onChange={(value) => onRestrictionChange('cta', index, value)} />CTA</label>
              <label className="inline-flex items-center gap-1.5 text-micro font-medium text-ink-secondary"><ToggleCell checked={closedToDeparture[index]} label={`Closed to departure on ${date.month} ${date.day}`} onChange={(value) => onRestrictionChange('ctd', index, value)} />CTD</label>
              <label className="inline-flex items-center gap-1.5 text-micro font-medium text-ink-secondary"><ToggleCell checked={stopSell[index]} label={`Stop sell on ${date.month} ${date.day}`} onChange={(value) => onRestrictionChange('stopSell', index, value)} />Stop sell</label>
            </div>
          </article>
        ))}
      </div>

      <div className="flex flex-col gap-2 border-t px-4 py-3 text-label text-ink-muted sm:flex-row sm:items-center sm:justify-between sm:px-5" style={{ borderColor: 'var(--color-divider)' }}>
        <span>Rate changes are saved in this demo session and can be published to connected channels.</span>
        <span className="inline-flex items-center gap-1.5"><Lucide.MousePointer2 size={12} /> Values can be edited inline</span>
      </div>
    </section>
  );
}
