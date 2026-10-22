import { useMemo, useState } from 'react';
import * as Lucide from 'lucide-react';
import { inputClass } from '../../../utils/styling';
import type { RatePlan } from './types';

interface Props {
  plans: RatePlan[];
  onCreate: () => void;
  onEdit: (plan: RatePlan) => void;
  onToggleStatus: (plan: RatePlan) => void;
}

function StatusPill({ status }: { status: RatePlan['status'] }) {
  const style = status === 'Active'
    ? { color: 'var(--color-success-text)', background: 'var(--color-success-bg)', borderColor: 'var(--color-success-border)' }
    : status === 'Scheduled'
      ? { color: 'var(--color-info-text)', background: 'var(--color-info-bg)', borderColor: 'var(--color-info-border)' }
      : { color: 'var(--color-ink-secondary)', background: 'var(--color-muted-surface)', borderColor: 'var(--color-border)' };
  return <span className="inline-flex items-center rounded-full border px-2.5 py-1 text-[11px] font-semibold" style={style}>{status}</span>;
}

export function RatePlansPanel({ plans, onCreate, onEdit, onToggleStatus }: Props) {
  const [query, setQuery] = useState('');
  const visiblePlans = useMemo(() => {
    const search = query.trim().toLowerCase();
    return plans.filter((plan) => !search || `${plan.name} ${plan.code} ${plan.roomTypes.join(' ')}`.toLowerCase().includes(search));
  }, [plans, query]);

  return (
    <section className="pms-card overflow-hidden" aria-labelledby="rate-plans-title">
      <div className="flex flex-col gap-3 border-b px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-5" style={{ borderColor: 'var(--color-border)' }}>
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-tr from-indigo-500 to-violet-600 text-white shadow-xs shadow-indigo-500/20">
            <Lucide.Layers size={18} strokeWidth={2.4} />
          </div>
          <div>
            <h2 id="rate-plans-title" className="text-sm font-bold text-slate-900 tracking-tight">Rate Plans</h2>
            <p className="text-[11px] text-slate-400 mt-0.5">Manage pricing rules, eligibility and channel distribution</p>
          </div>
        </div>
        <div className="flex flex-col gap-2 xs:flex-row">
          <label className="relative min-w-0 xs:min-w-[220px]">
            <span className="sr-only">Search rate plans</span>
            <Lucide.Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-muted" aria-hidden="true" />
            <input value={query} onChange={(event) => setQuery(event.target.value)} className={`${inputClass('pl-9')} min-h-[38px] text-xs`} placeholder="Search plans" />
          </label>
          <button type="button" onClick={onCreate} className="pms-btn-primary min-h-[38px] px-3.5 py-1.5 text-xs">
            <Lucide.Plus size={15} /> Create plan
          </button>
        </div>
      </div>

      <div className="pms-table-scroll overflow-x-auto">
        <table className="pms-table min-w-[760px]">
          <thead><tr><th>Plan</th><th>Room types</th><th>Meal / cancellation</th><th>Channels</th><th>Adjustment</th><th>Status</th><th className="text-right">Actions</th></tr></thead>
          <tbody>
            {visiblePlans.map((plan) => (
              <tr key={plan.id}>
                <td className="min-w-[190px]">
                  <span className="block font-semibold text-ink">{plan.name}</span>
                  <span className="mt-0.5 block font-mono text-[11px] text-ink-muted">{plan.code}</span>
                </td>
                <td className="max-w-[180px] text-ink-secondary">{plan.roomTypes.join(', ')}</td>
                <td className="min-w-[190px]">
                  <span className="block font-medium text-ink">{plan.mealPlan}</span>
                  <span className="mt-0.5 block text-[11px] text-ink-muted">{plan.cancellationPolicy}</span>
                </td>
                <td className="tnum text-ink-secondary">{plan.channels.length} channels</td>
                <td className={`tnum font-semibold ${plan.adjustmentPct < 0 ? 'text-success-text' : plan.adjustmentPct > 0 ? 'text-warning-text' : 'text-ink-secondary'}`}>
                  {plan.adjustmentPct > 0 ? '+' : ''}{plan.adjustmentPct}%
                </td>
                <td><StatusPill status={plan.status} /></td>
                <td>
                  <div className="flex justify-end gap-1.5">
                    <button type="button" onClick={() => onEdit(plan)} className="pms-btn-ghost min-h-[34px] px-2.5 py-1 text-xs" aria-label={`Edit ${plan.name}`}>
                      <Lucide.Pencil size={13} /> Edit
                    </button>
                    <button type="button" onClick={() => onToggleStatus(plan)} className="flex h-[34px] w-[34px] items-center justify-center rounded-control text-ink-muted hover:bg-hover-surface hover:text-ink" aria-label={`${plan.status === 'Active' ? 'Pause' : 'Activate'} ${plan.name}`} title={plan.status === 'Active' ? 'Pause plan' : 'Activate plan'}>
                      {plan.status === 'Active' ? <Lucide.Pause size={14} /> : <Lucide.Play size={14} />}
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {visiblePlans.length === 0 && (
              <tr><td colSpan={7} className="py-10 text-center text-sm text-ink-muted">No rate plans match “{query}”.</td></tr>
            )}
          </tbody>
        </table>
      </div>
      <div className="flex items-center justify-between border-t px-4 py-3 text-[11px] text-ink-muted sm:px-5" style={{ borderColor: 'var(--color-divider)' }}>
        <span>{visiblePlans.length} of {plans.length} plans</span>
        <span>Changes are kept in this demo session</span>
      </div>
    </section>
  );
}
