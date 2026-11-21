import * as Lucide from 'lucide-react';
import { HEADING } from '../../../components/brand/brandStyles';
import type { Plan } from './setupPlans';

interface PlanStepProps {
  /** The plans a super admin currently offers; null while they load. */
  plans: Plan[] | null;
  error?: string | null;
  onRetry?: () => void;
  value: string | null;
  onChange: (id: string) => void;
}

/** Step 4: the plans a super admin has set up, which differ by how many OTAs they allow. Nothing is charged here. */
export function PlanStep({ plans, error, onRetry, value, onChange }: PlanStepProps) {
  if (!plans) {
    return error ? (
      <div role="alert" className="flex items-center justify-between gap-3 rounded-2xl border border-danger-border bg-danger-bg px-4 py-3 text-[13px] font-medium text-danger-text">
        <span>Could not load the plans: {error}</span>
        {onRetry && (
          <button type="button" onClick={onRetry} className="cursor-pointer rounded-lg border border-danger-border px-3 py-1 font-semibold hover:bg-white/60">
            Try again
          </button>
        )}
      </div>
    ) : (
      <p className="pt-3 text-[13px] text-ink-secondary" role="status">
        Loading plans…
      </p>
    );
  }
  if (plans.length === 0) {
    return <p className="pt-3 text-[13px] text-ink-secondary">No plans are available right now. Please contact support.</p>;
  }
  return (
    <div role="radiogroup" aria-label="Subscription plan" className="grid grid-cols-1 gap-4 pt-3 md:grid-cols-2 xl:grid-cols-3">
      {plans.map((plan) => {
        const selected = plan.id === value;
        return (
          <button
            key={plan.id}
            type="button"
            role="radio"
            aria-checked={selected}
            onClick={() => onChange(plan.id)}
            className={`relative flex cursor-pointer flex-col rounded-[20px] border bg-white p-5 text-left transition-colors ${
              selected ? 'border-primary bg-primary/5 shadow-sm' : 'border-border hover:border-primary/40'
            }`}
          >
            {plan.popular && (
              <span className="absolute -top-2.5 left-1/2 -translate-x-1/2 rounded-full bg-primary px-2.5 py-0.5 text-[11px] font-semibold text-primary-foreground">Most popular</span>
            )}
            <span className="flex items-start justify-between gap-2">
              <span>
                <span className={`block text-[16px] font-semibold text-ink ${HEADING}`}>{plan.name}</span>
                <span className="block text-[12px] text-ink-secondary">{plan.tagline}</span>
              </span>
              <span
                aria-hidden="true"
                className={`flex h-5 w-5 flex-none items-center justify-center rounded-full border ${selected ? 'border-primary bg-primary text-primary-foreground' : 'border-border bg-white'}`}
              >
                {selected && <Lucide.Check size={12} />}
              </span>
            </span>

            <span className="mt-4 flex items-baseline gap-1 border-b border-border/70 pb-4">
              <span className={`tnum text-[20px] font-bold text-ink ${HEADING}`}>{plan.price}</span>
              <span className="text-[12px] text-ink-muted">/ month</span>
            </span>

            <span className={`mt-4 flex items-center gap-2 rounded-xl px-3 py-2 text-[13px] font-semibold ${selected ? 'bg-primary text-primary-foreground' : 'bg-primary/10 text-primary'}`}>
              <Lucide.Share2 size={14} aria-hidden="true" /> {plan.otaLimit} OTA access
            </span>

            <ul className="mt-4 flex flex-col gap-2">
              {plan.features.map((feature) => (
                <li key={feature} className="flex items-start gap-2 text-[13px] text-ink">
                  <Lucide.Check size={14} className="mt-0.5 flex-none text-success-text" aria-hidden="true" />
                  {feature}
                </li>
              ))}
            </ul>
          </button>
        );
      })}
    </div>
  );
}
