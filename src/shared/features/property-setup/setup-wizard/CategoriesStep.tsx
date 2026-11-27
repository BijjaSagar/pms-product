import * as Lucide from 'lucide-react';
import { CARD, FIELD, FIELD_INVALID, HEADING } from '../../../components/brand/brandStyles';
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
  const named = categories.filter((c) => c.name.trim()).length;

  return (
    <div className="flex flex-col gap-4">
      <section className={CARD}>
        <header className="flex items-center gap-3 border-b border-border/70 px-5 py-4">
          <span className="flex h-9 w-9 flex-none items-center justify-center rounded-xl bg-primary/10 text-primary">
            <Lucide.BedDouble size={17} aria-hidden="true" />
          </span>
          <div className="min-w-0 flex-1">
            <h3 className={`text-[15px] font-semibold leading-tight tracking-[-0.02em] text-ink ${HEADING}`}>Your room categories</h3>
            <p className="text-[12px] text-ink-secondary">Add each room type you offer — you'll assign rooms to them next</p>
          </div>
          <span className="flex-none rounded-full bg-primary/10 px-2.5 py-0.5 text-[12px] font-semibold text-primary">{named} added</span>
        </header>

        <div className="flex flex-col gap-2.5 p-5">
          <ul className="flex flex-col gap-2.5">
            {categories.map((c, i) => {
              const error = showErrors ? issues.rows[i] : '';
              return (
                <li key={c.id}>
                  <div className="flex items-center gap-2.5">
                    <span className={`flex h-7 w-7 flex-none items-center justify-center rounded-lg text-[12px] font-bold ${HEADING} ${categoryTone(i).tile}`}>{i + 1}</span>
                    <input
                      className={`min-w-0 flex-1 ${error ? FIELD_INVALID : FIELD}`}
                      value={c.name}
                      maxLength={100}
                      aria-label={`Category ${i + 1} name`}
                      placeholder="Category name, e.g. Deluxe"
                      onChange={(e) => update(c.id, { name: e.target.value })}
                    />
                    <button
                      type="button"
                      title="Remove category"
                      aria-label={`Remove ${c.name || `category ${i + 1}`}`}
                      disabled={categories.length === 1}
                      onClick={() => onChange(categories.filter((o) => o.id !== c.id))}
                      className="flex h-9 w-9 flex-none cursor-pointer items-center justify-center rounded-xl text-ink-muted transition-colors hover:bg-danger-bg hover:text-danger-text disabled:cursor-not-allowed disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-ink-muted"
                    >
                      <Lucide.Trash2 size={16} />
                    </button>
                  </div>
                  {error && (
                    <p className="mt-1 pl-[38px] text-[12px] font-medium text-danger-text" role="alert">
                      {error}
                    </p>
                  )}
                </li>
              );
            })}
          </ul>

          <button
            type="button"
            onClick={() => add()}
            className="flex cursor-pointer items-center justify-center gap-1.5 rounded-xl border border-dashed border-border py-2.5 text-[13px] font-semibold text-primary transition-colors hover:border-primary/50 hover:bg-primary/10"
          >
            <Lucide.Plus size={15} aria-hidden="true" /> Add category
          </button>
        </div>
      </section>

      <section className={`${CARD} p-5`}>
        <h3 className={`text-[14px] font-semibold text-ink ${HEADING}`}>Quick add</h3>
        <p className="text-[12px] text-ink-secondary">Common room types — tap to add</p>
        <div className="mt-3 flex flex-wrap gap-2">
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
                className="flex cursor-pointer items-center gap-1 rounded-full border border-border bg-white px-3 py-1.5 text-[12px] font-medium text-ink transition-colors hover:border-primary/40 hover:text-primary disabled:cursor-not-allowed disabled:opacity-45 disabled:hover:border-border disabled:hover:text-ink"
              >
                <Lucide.Plus size={12} aria-hidden="true" /> {name}
              </button>
            );
          })}
        </div>
      </section>
    </div>
  );
}
