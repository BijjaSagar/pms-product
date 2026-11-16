import * as Lucide from 'lucide-react';
import { BrandField, BrandStepper } from '../../../components/brand/BrandControls';
import { BUTTON_SOFT, CARD, FIELD, FIELD_INVALID, HEADING, LABEL } from '../../../components/brand/brandStyles';
import { categoryTone } from '../categoryTones';
import { MAX_ROOMS, allocatedRooms, categoryIssues, newCategory } from './draft';
import type { CategoryDraft } from './draft';

const QUICK_ADD = ['Standard', 'Deluxe', 'Super Deluxe', 'Suite', 'Family', 'Executive'];

interface CategoriesStepProps {
  categories: CategoryDraft[];
  totalRooms: number;
  onChange: (next: CategoryDraft[]) => void;
  /** Only true once the user has tried to continue, so untouched rows do not show errors. */
  showErrors: boolean;
}

/** Step 2: split the property's rooms into categories such as Standard or Suite. */
export function CategoriesStep({ categories, totalRooms, onChange, showErrors }: CategoriesStepProps) {
  const issues = categoryIssues(categories, totalRooms);
  const left = totalRooms - issues.allocated;
  const update = (id: string, patch: Partial<CategoryDraft>) => onChange(categories.map((c) => (c.id === id ? { ...c, ...patch } : c)));
  const add = (name = '') => onChange([...categories, newCategory({ name, count: Math.max(left, 0) > 0 ? 1 : 0 })]);

  return (
    <div className="flex flex-col gap-4">
      <section className={`${CARD} p-5`} aria-label="Rooms allocated">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className={LABEL}>Rooms allocated</p>
            <p className={`tnum mt-1 text-[28px] font-semibold leading-none text-ink ${HEADING}`}>
              {issues.allocated}
              <span className="text-ink-muted"> / {totalRooms}</span>
            </p>
          </div>
          <span
            role="status"
            className={`rounded-full px-3 py-1 text-[12px] font-semibold ${
              left === 0 ? 'bg-success-bg text-success-text' : left < 0 ? 'bg-danger-bg text-danger-text' : 'bg-muted-surface text-ink-secondary'
            }`}
          >
            {left === 0 ? 'All rooms allocated' : left < 0 ? `${-left} too many` : `${left} left to allocate`}
          </span>
        </div>
        <div className="mt-4 h-2 overflow-hidden rounded-full bg-muted-surface" aria-hidden="true">
          <div className="h-full rounded-full bg-primary transition-[width]" style={{ width: `${Math.min(100, (issues.allocated / totalRooms) * 100)}%` }} />
        </div>
      </section>

      <ul className="flex flex-col gap-3">
        {categories.map((c, i) => {
          const error = showErrors ? issues.rows[i] : '';
          const room = Math.max(totalRooms - (allocatedRooms(categories) - c.count), 0);
          return (
            <li key={c.id} className={`${CARD} flex items-start gap-3 p-4`}>
              <span className={`mt-[34px] h-2.5 w-2.5 flex-none rounded-full ${categoryTone(i).dot}`} aria-hidden="true" />
              <div className="grid min-w-0 flex-1 grid-cols-1 gap-3 sm:grid-cols-[minmax(0,1fr)_180px]">
                <BrandField label={`Category ${i + 1}`} error={error}>
                  <input
                    className={error ? FIELD_INVALID : FIELD}
                    value={c.name}
                    maxLength={100}
                    placeholder="e.g. Deluxe"
                    onChange={(e) => update(c.id, { name: e.target.value })}
                  />
                </BrandField>
                <BrandField label="No. of rooms">
                  <BrandStepper label={`Rooms in ${c.name || `category ${i + 1}`}`} value={c.count} min={0} max={Math.min(room, MAX_ROOMS)} onChange={(count) => update(c.id, { count })} />
                </BrandField>
              </div>
              <button
                type="button"
                title="Remove category"
                aria-label={`Remove ${c.name || `category ${i + 1}`}`}
                disabled={categories.length === 1}
                onClick={() => onChange(categories.filter((o) => o.id !== c.id))}
                className="mt-[30px] flex h-10 w-10 flex-none cursor-pointer items-center justify-center rounded-xl text-ink-muted transition-colors hover:bg-danger-bg hover:text-danger-text disabled:cursor-not-allowed disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-ink-muted"
              >
                <Lucide.Trash2 size={16} />
              </button>
            </li>
          );
        })}
      </ul>

      <div className="flex flex-wrap items-center justify-between gap-3 rounded-[20px] border border-dashed border-border bg-muted-surface/40 p-4">
        <div className="flex flex-wrap items-center gap-2">
          <span className="flex items-center gap-1.5 text-[12px] font-medium text-ink-secondary">
            <Lucide.Sparkles size={14} className="text-primary" aria-hidden="true" /> Quick add
          </span>
          {QUICK_ADD.map((name) => {
            const used = categories.some((c) => c.name.trim().toLowerCase() === name.toLowerCase());
            return (
              <button
                key={name}
                type="button"
                disabled={used}
                onClick={() => {
                  // Fill the first empty row instead of stacking a blank one above the new category.
                  const blank = categories.find((c) => !c.name.trim());
                  if (blank) update(blank.id, { name });
                  else add(name);
                }}
                className="cursor-pointer rounded-full border border-border bg-white px-3 py-1 text-[12px] font-medium text-ink transition-colors hover:border-primary/40 hover:text-primary disabled:cursor-not-allowed disabled:opacity-45 disabled:hover:border-border disabled:hover:text-ink"
              >
                {name}
              </button>
            );
          })}
        </div>
        <button type="button" className={BUTTON_SOFT} onClick={() => add()}>
          <Lucide.Plus size={14} aria-hidden="true" /> Add category
        </button>
      </div>
    </div>
  );
}
