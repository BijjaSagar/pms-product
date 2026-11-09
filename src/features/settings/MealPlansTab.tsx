import { useCallback, useState } from 'react';
import * as Lucide from 'lucide-react';
import { mealPlanApi } from '../../lib/api/pms';
import type { MealPlanDetails } from '../../lib/api/pms';
import { useApiResource } from '../../lib/api/useApiResource';
import { displayApiError } from '../../lib/api/client';
import { toast } from '../../utils/toast';
import { TextField } from '../../components/primitives';
import { Card, CardTitle, TableContainer } from '../../components/ui';
import { TableStateRows } from '../../components/Skeleton';

type NameField = 'displayName' | 'shortDisplayName';

const MAX_LENGTH: Record<NameField, number> = { displayName: 60, shortDisplayName: 10 };

/** Text that turns into an input on double-click (or Enter), and saves on Enter or blur. */
function EditableText({
  value,
  label,
  maxLength,
  canEdit,
  onSave,
}: {
  value: string;
  label: string;
  maxLength: number;
  canEdit: boolean;
  onSave: (next: string) => Promise<void>;
}) {
  const [draft, setDraft] = useState<string | null>(null);

  const finish = (save: boolean) => {
    const next = draft?.trim();
    setDraft(null);
    if (save && next && next !== value) void onSave(next);
  };

  if (draft !== null) {
    return (
      <TextField
        autoFocus
        value={draft}
        maxLength={maxLength}
        aria-label={label}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={() => finish(true)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') finish(true);
          if (e.key === 'Escape') finish(false);
        }}
      />
    );
  }

  return (
    <span
      role={canEdit ? 'button' : undefined}
      tabIndex={canEdit ? 0 : undefined}
      title={canEdit ? 'Double-click to edit' : undefined}
      onDoubleClick={canEdit ? () => setDraft(value) : undefined}
      onKeyDown={canEdit ? (e) => e.key === 'Enter' && setDraft(value) : undefined}
      className={canEdit ? 'block cursor-text rounded px-1 py-0.5 hover:bg-muted-surface' : 'block px-1 py-0.5'}
    >
      {value}
    </span>
  );
}

export function MealPlansTab({ propertyId, canEdit }: { propertyId: string; canEdit: boolean }) {
  const load = useCallback(() => mealPlanApi.list(propertyId), [propertyId]);
  const resource = useApiResource(load);
  // Saved renames sit on top of what was loaded, so the table never reloads.
  const [saved, setSaved] = useState<Record<string, MealPlanDetails>>({});

  const rename = async (code: string, field: NameField, value: string) => {
    try {
      const updated = await mealPlanApi.update(propertyId, code, { [field]: value });
      setSaved((prev) => ({ ...prev, [code]: updated }));
    } catch (err) {
      toast('Could not save the name', { detail: displayApiError(err), tone: 'danger' });
    }
  };

  return (
    <Card className="w-full max-w-3xl">
      <CardTitle icon={Lucide.Utensils} title="Meal Plans" subtitle="How each meal plan is named" />
      <TableContainer>
        <table className="pms-table w-full text-left">
          <thead>
            <tr>
              <th className="w-32">DISPLAY ORDER</th>
              <th>CONSTANT NAME</th>
              <th>DISPLAY NAME</th>
              <th>SHORT DISPLAY NAME</th>
            </tr>
          </thead>
          <tbody>
            {resource.data ? (
              resource.data.map((loaded) => {
                const plan = saved[loaded.code] ?? loaded;
                return (
                  <tr key={plan.code} className="border-b border-divider last:border-b-0">
                    <td className="py-2 text-label text-ink-secondary">{plan.displayOrder}</td>
                    <td className="py-2 text-label text-ink-secondary">{plan.code}</td>
                    <td className="py-2 text-label font-medium text-ink">
                      <EditableText
                        value={plan.displayName}
                        label={`Display name of ${plan.code}`}
                        maxLength={MAX_LENGTH.displayName}
                        canEdit={canEdit}
                        onSave={(next) => rename(plan.code, 'displayName', next)}
                      />
                    </td>
                    <td className="py-2 text-label font-medium text-ink">
                      <EditableText
                        value={plan.shortDisplayName}
                        label={`Short display name of ${plan.code}`}
                        maxLength={MAX_LENGTH.shortDisplayName}
                        canEdit={canEdit}
                        onSave={(next) => rename(plan.code, 'shortDisplayName', next)}
                      />
                    </td>
                  </tr>
                );
              })
            ) : (
              <TableStateRows cols={4} loading={resource.loading} error={resource.error} empty="No records yet." />
            )}
          </tbody>
        </table>
      </TableContainer>
      <p className="mt-4 text-label font-bold text-ink">
        *You may change Meal plan Short Name and Display Name by double clicking on the corresponding text.
      </p>
    </Card>
  );
}
