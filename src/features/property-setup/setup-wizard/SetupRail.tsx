import * as Lucide from 'lucide-react';
import { CARD, EYEBROW, HEADING, LABEL } from '../../../components/brand/brandStyles';
import { categoryTone } from '../categoryTones';
import type { CategoryDraft, PropertyDraft } from './draft';

const STEPS = [
  { title: 'Property', hint: 'Name, location & size', icon: Lucide.Building2 },
  { title: 'Room categories', hint: 'Types and room counts', icon: Lucide.BedDouble },
  { title: 'Floors & rooms', hint: 'Place every room', icon: Lucide.LayoutGrid },
] as const;

interface SetupRailProps {
  step: number;
  property: PropertyDraft;
  categories: CategoryDraft[];
  placed: number;
}

/** The left column: the three steps and a live summary of what has been entered so far. */
export function SetupRail({ step, property, categories, placed }: SetupRailProps) {
  const named = categories.filter((c) => c.name.trim() && c.count > 0);
  const location = [property.city.trim(), property.state.trim(), property.country].filter(Boolean).join(', ');

  return (
    <aside className="flex flex-col gap-6 lg:sticky lg:top-6 lg:self-start">
      <div>
        <p className={EYEBROW}>Property setup</p>
        <h1 className={`mt-3 text-[30px] font-bold leading-tight tracking-[-0.045em] text-ink ${HEADING}`}>Set up your property</h1>
        <p className="mt-2 text-[14px] leading-6 text-ink-secondary">Three short steps and your rooms are ready to sell.</p>
      </div>

      <ol className="flex flex-col gap-2.5" aria-label="Setup steps">
        {STEPS.map((s, i) => {
          const state = i < step ? 'done' : i === step ? 'current' : 'todo';
          const Icon = s.icon;
          return (
            <li
              key={s.title}
              aria-current={state === 'current' ? 'step' : undefined}
              className={`flex items-center gap-3 rounded-2xl border p-3 transition-colors ${
                state === 'current' ? 'border-border bg-white shadow-md' : 'border-transparent'
              }`}
            >
              <span
                className={`flex h-10 w-10 flex-none items-center justify-center rounded-xl ${
                  state === 'current'
                    ? 'bg-primary text-primary-foreground shadow-md shadow-primary/30'
                    : state === 'done'
                      ? 'bg-success-bg text-success-text'
                      : 'bg-muted-surface/60 text-ink-muted'
                }`}
              >
                {state === 'done' ? <Lucide.Check size={17} aria-hidden="true" /> : <Icon size={17} aria-hidden="true" />}
              </span>
              <span className={`min-w-0 ${state === 'todo' ? 'opacity-60' : ''}`}>
                <span className="block text-[10px] font-semibold uppercase tracking-[0.16em] text-ink-muted">Step {i + 1}</span>
                <span className={`block truncate text-[14px] font-semibold leading-tight text-ink ${HEADING}`}>{s.title}</span>
                <span className="block truncate text-[12px] text-ink-secondary">{s.hint}</span>
              </span>
            </li>
          );
        })}
      </ol>

      <section className={`${CARD} p-4`} aria-label="Summary">
        <p className={LABEL}>Summary</p>
        <p className={`mt-2 flex items-baseline gap-2 text-[16px] font-semibold text-ink ${HEADING}`}>
          <span className="truncate">{property.name.trim() || 'Your property'}</span>
          {property.code && <span className="text-[12px] font-bold tracking-wide text-primary">{property.code}</span>}
        </p>
        <p className="mt-0.5 truncate text-[12px] text-ink-secondary">{location || 'Location not set'}</p>

        <dl className="mt-3 grid grid-cols-3 gap-2">
          {[
            ['Floors', property.floors],
            ['Rooms', property.rooms],
            ['Placed', placed],
          ].map(([label, value]) => (
            <div key={label} className="rounded-xl bg-muted-surface/50 px-2.5 py-2">
              <dt className="text-[10px] font-semibold uppercase tracking-[0.14em] text-ink-muted">{label}</dt>
              <dd className={`tnum mt-0.5 text-[18px] font-semibold text-ink ${HEADING}`}>{value}</dd>
            </div>
          ))}
        </dl>

        {named.length > 0 && (
          <ul className="mt-3 flex flex-wrap gap-1.5">
            {named.map((c) => (
              <li
                key={c.id}
                className={`rounded-full border px-2.5 py-0.5 text-[11px] font-semibold ${categoryTone(categories.indexOf(c)).tile}`}
              >
                {c.name.trim()} · {c.count}
              </li>
            ))}
          </ul>
        )}
      </section>
    </aside>
  );
}
