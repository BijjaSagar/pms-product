import * as Lucide from 'lucide-react';
import { BrandField } from '../../../components/brand/BrandControls';
import { Button } from '../../../components/primitives';
import { CARD, FIELD, FIELD_INVALID } from '../../../components/brand/brandStyles';
import { categoryTone } from '../categoryTones';
import { categoryIssues, newCategory } from './draft';
import type { CategoryDraft } from './draft';

const QUICK_ADD = ['Standard', 'Deluxe', 'Super Deluxe', 'Suite', 'Family', 'Executive'];

interface CategoriesStepProps {
  categories: CategoryDraft[];
  onChange: (next: CategoryDraft[]) => void;
  /** Only true once the user has tried to continue, so untouched rows do not show errors. */
  showErrors: boolean;
}

/** Step 2: name the room categories (Standard, Suite…). How many rooms each has is set on the floors in step 3. */
export function CategoriesStep({ categories, onChange, showErrors }: CategoriesStepProps) {
  const issues = categoryIssues(categories);
  const update = (id: string, patch: Partial<CategoryDraft>) => onChange(categories.map((c) => (c.id === id ? { ...c, ...patch } : c)));
  const add = (name = '') => onChange([...categories, newCategory({ name })]);

  return (
    <div className="flex flex-col gap-3">
      <p className="px-1 text-[13px] text-ink-secondary">
        Name the kinds of rooms you offer. You will choose how many rooms each category has when you lay out the floors.
      </p>

      <ul className="flex flex-col gap-2.5">
        {categories.map((c, i) => {
          const error = showErrors ? issues.rows[i] : '';
          return (
            <li key={c.id} className={`${CARD} relative flex items-start gap-3 p-3`}>
              <span className={`mt-[3px] h-2.5 w-2.5 flex-none rounded-full sm:mt-[34px] ${categoryTone(i).dot}`} aria-hidden="true" />
              <div className="min-w-0 flex-1">
                <BrandField label={`Category ${i + 1}`} error={error}>
                  <input
                    className={error ? FIELD_INVALID : FIELD}
                    value={c.name}
                    maxLength={100}
                    placeholder="e.g. Deluxe"
                    onChange={(e) => update(c.id, { name: e.target.value })}
                  />
                </BrandField>
              </div>
              <button
                type="button"
                title="Remove category"
                aria-label={`Remove ${c.name || `category ${i + 1}`}`}
                disabled={categories.length === 1}
                onClick={() => onChange(categories.filter((o) => o.id !== c.id))}
                className="absolute right-2 top-1.5 flex h-8 w-8 cursor-pointer sm:static sm:mt-[30px] sm:h-10 sm:w-10 sm:flex-none items-center justify-center rounded-xl text-ink-muted transition-colors hover:bg-danger-bg hover:text-danger-text disabled:cursor-not-allowed disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-ink-muted"
              >
                <Lucide.Trash2 size={16} />
              </button>
            </li>
          );
        })}
      </ul>

      <div className="flex flex-wrap items-center justify-between gap-3 rounded-[20px] border border-dashed border-border bg-muted-surface/40 p-3">
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
        <Button variant="secondary" className="max-sm:w-full max-sm:justify-center" icon={<Lucide.Plus size={14} />} onClick={() => add()}>
          Add category
        </Button>
      </div>
    </div>
  );
}
