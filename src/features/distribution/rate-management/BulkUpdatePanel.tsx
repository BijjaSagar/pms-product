import { useState } from 'react';
import * as Lucide from 'lucide-react';
import { inputClass } from '../../../utils/styling';
import type { BulkUpdatePayload } from './types';

interface Props {
  startDate: string;
  endDate: string;
  onApply: (payload: BulkUpdatePayload) => void;
}

export function BulkUpdatePanel({ startDate, endDate, onApply }: Props) {
  const [rangeStart, setRangeStart] = useState(startDate);
  const [rangeEnd, setRangeEnd] = useState(endDate);
  const [adjustment, setAdjustment] = useState('10');
  const [minStay, setMinStay] = useState('');
  const [weekendsOnly, setWeekendsOnly] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!rangeStart || !rangeEnd || rangeStart > rangeEnd) {
      setError('Choose a valid date range.');
      return;
    }
    const parsedAdjustment = Number(adjustment);
    if (!Number.isFinite(parsedAdjustment) || parsedAdjustment < -100 || parsedAdjustment > 500) {
      setError('Enter a rate adjustment between -100% and 500%.');
      return;
    }
    setError('');
    onApply({ startDate: rangeStart, endDate: rangeEnd, adjustmentPct: parsedAdjustment, minStay: minStay ? Number(minStay) : null, weekendsOnly });
  };

  return (
    <section className="pms-card overflow-hidden" aria-labelledby="bulk-update-title">
      <div className="flex items-center gap-2.5 border-b px-4 py-4 sm:px-5" style={{ borderColor: 'var(--color-border)' }}>
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-tr from-primary to-dark-accent text-white shadow-xs shadow-primary/20">
          <Lucide.Edit3 size={18} strokeWidth={2.4} />
        </div>
        <div>
          <h2 id="bulk-update-title" className="text-sm font-bold text-ink tracking-tight">Bulk Rate Update</h2>
          <p className="text-[11px] text-ink-muted mt-0.5">Apply an adjustment to the current rate calendar without editing dates one by one</p>
        </div>
      </div>
      <form onSubmit={handleSubmit} className="grid gap-5 p-4 sm:p-5 lg:grid-cols-[minmax(0,1fr)_300px]">
        <div className="grid content-start gap-4 sm:grid-cols-2">
          <label className="flex flex-col gap-1.5 text-xs font-semibold text-ink-secondary">
            From date<input type="date" value={rangeStart} onChange={(event) => setRangeStart(event.target.value)} className={inputClass('text-xs')} required />
          </label>
          <label className="flex flex-col gap-1.5 text-xs font-semibold text-ink-secondary">
            To date<input type="date" value={rangeEnd} onChange={(event) => setRangeEnd(event.target.value)} className={inputClass('text-xs')} required />
          </label>
          <label className="flex flex-col gap-1.5 text-xs font-semibold text-ink-secondary">
            Rate adjustment (%)<span className="relative"><input type="number" min={-100} max={500} step={1} value={adjustment} onChange={(event) => setAdjustment(event.target.value)} className={`${inputClass('pr-9')} text-xs`} /><span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-ink-muted">%</span></span>
          </label>
          <label className="flex flex-col gap-1.5 text-xs font-semibold text-ink-secondary">
            Minimum stay override <span className="relative"><input type="number" min={1} max={30} value={minStay} onChange={(event) => setMinStay(event.target.value)} placeholder="No change" className={`${inputClass('pr-14')} text-xs`} /><span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-ink-muted">nights</span></span>
          </label>
          <label className="flex items-center gap-2.5 rounded-control border p-3 text-xs font-medium text-ink sm:col-span-2" style={{ borderColor: 'var(--color-border)' }}>
            <input type="checkbox" checked={weekendsOnly} onChange={(event) => setWeekendsOnly(event.target.checked)} className="h-4 w-4 accent-primary" />
            Apply to weekends only
          </label>
          {error && <p className="text-xs font-medium text-danger-text sm:col-span-2" role="alert">{error}</p>}
        </div>
        <aside className="flex flex-col justify-between gap-4 rounded-card border p-4" style={{ borderColor: 'var(--color-border)', background: 'var(--color-muted-surface)' }}>
          <div>
            <span className="flex h-10 w-10 items-center justify-center rounded-control bg-primary/10 text-primary"><Lucide.Zap size={18} /></span>
            <h3 className="mt-3 text-sm font-semibold text-ink">Preview before applying</h3>
            <p className="mt-1 text-xs leading-relaxed text-ink-secondary">The percentage is applied to rates in the selected period. Weekend-only mode skips weekdays.</p>
          </div>
          <button type="submit" className="pms-btn-primary min-h-[42px] w-full px-4 py-2 text-xs">
            <Lucide.Check size={15} /> Apply update
          </button>
        </aside>
      </form>
      <div className="flex items-start gap-2 border-t px-4 py-3 text-[11px] text-ink-muted sm:px-5" style={{ borderColor: 'var(--color-divider)' }}>
        <Lucide.Info size={14} className="mt-0.5 flex-none text-info-text" />
        <p>Updates change the in-memory demo calendar only. Nothing is sent to a live channel service.</p>
      </div>
    </section>
  );
}
