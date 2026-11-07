import { useState } from 'react';
import type { ReactNode } from 'react';
import * as Lucide from 'lucide-react';
import { roomListingApi } from '../../lib/api/pms';
import type { MealPlanKey, RoomDetails, RoomInput } from '../../lib/api/pms';
import { displayApiError } from '../../lib/api/client';
import { toast } from '../../utils/toast';
import { Button, Checkbox, TextArea, TextField } from '../../components/primitives';
import { Field } from '../../components/controls';

const MEAL_PLANS: { key: MealPlanKey; description: string }[] = [
  { key: 'EP', description: 'Room only' },
  { key: 'CP', description: 'Room with breakfast' },
  { key: 'MAP', description: 'Breakfast and one main meal' },
  { key: 'AP', description: 'All meals' },
  { key: 'MAPAI', description: 'MAP, all inclusive' },
  { key: 'APAI', description: 'AP, all inclusive' },
];

/**
 * A section starts read-only. While `draft` is non-null it is being edited;
 * saving or cancelling puts it back to read-only.
 */
function useSection<T>(save: (draft: T) => Promise<boolean>) {
  const [draft, setDraft] = useState<T | null>(null);
  const [saving, setSaving] = useState(false);
  const commit = async () => {
    if (draft === null) return;
    setSaving(true);
    try {
      if (await save(draft)) setDraft(null);
    } finally {
      setSaving(false);
    }
  };
  return { draft, setDraft, saving, commit, cancel: () => setDraft(null) };
}

function Section({
  title,
  editing,
  saving,
  canEdit,
  onEdit,
  onCancel,
  onSave,
  children,
}: {
  title: string;
  editing: boolean;
  saving: boolean;
  canEdit: boolean;
  onEdit: () => void;
  onCancel: () => void;
  onSave: () => void;
  children: ReactNode;
}) {
  return (
    <section className="rounded-xl border p-4 sm:p-5" style={{ borderColor: 'var(--color-border)', background: 'var(--color-surface)' }}>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2 border-b border-divider pb-3">
        <h3 className="text-body font-bold text-ink">{title}</h3>
        {editing ? (
          <div className="flex gap-2">
            <Button variant="secondary" type="button" onClick={onCancel} disabled={saving}>
              Cancel
            </Button>
            <Button
              variant="primary"
              type="button"
              onClick={onSave}
              disabled={saving}
              icon={saving ? <Lucide.Loader2 size={14} className="animate-spin" /> : <Lucide.Save size={14} />}
            >
              {saving ? 'Saving…' : 'Save'}
            </Button>
          </div>
        ) : (
          <Button
            variant="secondary"
            type="button"
            onClick={onEdit}
            disabled={!canEdit}
            title={canEdit ? undefined : 'Only administrators can change room details'}
            icon={<Lucide.Pencil size={14} />}
          >
            Edit
          </Button>
        )}
      </div>
      {/* A disabled fieldset disables every input inside it while the section is read-only. */}
      <fieldset disabled={!editing} className="m-0 min-w-0 border-0 p-0">
        {children}
      </fieldset>
    </section>
  );
}

/** Blank -> null; otherwise the trimmed text. */
const optionalText = (value: string) => (value.trim() === '' ? null : value.trim());

/** Blank -> null; otherwise the number (NaN when it is not one). */
const optionalInt = (value: string) => (value.trim() === '' ? null : Number(value));

interface DetailsForm {
  name: string;
  description: string;
  abbreviation: string;
  integrationCode: string;
}

interface OccupancyForm {
  baseOccupancy: string;
  idealOccupancy: string;
  maxAdults: string;
  maxChildren: string;
  defaultChildren: string;
  maxOccupancy: string;
  syncCategoryOnOta: boolean;
  excludeFromRevenue: boolean;
  excludeFromOccupancy: boolean;
  excludeFromUpgrade: boolean;
}

export function RoomCategoryDetails({
  propertyId,
  room,
  canEdit,
  onSaved,
}: {
  propertyId: string;
  room: RoomDetails;
  canEdit: boolean;
  /** Called after any section saves so the lists behind the dialog refresh. */
  onSaved: () => void;
}) {
  /** Sends one section's fields; true when they were saved. */
  const patch = async (body: Partial<RoomInput>) => {
    try {
      await roomListingApi.update(propertyId, room.id, body);
      onSaved();
      toast('Room details saved', { tone: 'success' });
      return true;
    } catch (err) {
      toast('Could not save room details', { detail: displayApiError(err), tone: 'danger' });
      return false;
    }
  };

  const warn = (title: string, detail?: string) => {
    toast(title, { detail, tone: 'warning' });
    return false;
  };

  const details = useSection<DetailsForm>((d) => {
    if (d.name.trim().length < 2) return Promise.resolve(warn('Name needs at least 2 characters'));
    return patch({
      name: d.name.trim(),
      description: optionalText(d.description),
      abbreviation: optionalText(d.abbreviation),
      integrationCode: optionalText(d.integrationCode),
    });
  });
  const detailsForm: DetailsForm = details.draft ?? {
    name: room.name,
    description: room.description ?? '',
    abbreviation: room.abbreviation ?? '',
    integrationCode: room.integrationCode ?? '',
  };

  const inclusions = useSection<string>((text) => patch({ inclusions: optionalText(text) }));
  const inclusionsText = inclusions.draft ?? room.inclusions ?? '';

  const occupancy = useSection<OccupancyForm>((o) => {
    const base = optionalInt(o.baseOccupancy);
    const ideal = optionalInt(o.idealOccupancy);
    const adults = Number(o.maxAdults);
    const children = Number(o.maxChildren);
    const defaultChildren = Number(o.defaultChildren);
    const guests = Number(o.maxOccupancy);
    const whole = (n: number | null, min: number) => n === null || (Number.isInteger(n) && n >= min);
    if (!whole(adults, 1) || !whole(guests, 1) || !whole(children, 0) || !whole(defaultChildren, 0)) {
      return Promise.resolve(warn('Check the guest numbers', 'Use whole numbers; adults and total guests need at least 1.'));
    }
    if (!whole(base, 1) || !whole(ideal, 1)) {
      return Promise.resolve(warn('Check the occupancy numbers', 'Use whole numbers of at least 1, or leave blank.'));
    }
    if (guests > adults + children) {
      return Promise.resolve(warn('Total guests is too high', 'It cannot exceed max adults plus max children.'));
    }
    if (base !== null && base > guests) {
      return Promise.resolve(warn('Base occupancy is too high', 'It cannot exceed the total number of guests.'));
    }
    if (defaultChildren > children) {
      return Promise.resolve(warn('Default children is too high', 'It cannot exceed max children.'));
    }
    return patch({
      baseOccupancy: base,
      idealOccupancy: ideal,
      maxAdults: adults,
      maxChildren: children,
      defaultChildren,
      maxOccupancy: guests,
      syncCategoryOnOta: o.syncCategoryOnOta,
      excludeFromRevenue: o.excludeFromRevenue,
      excludeFromOccupancy: o.excludeFromOccupancy,
      excludeFromUpgrade: o.excludeFromUpgrade,
    });
  });
  const occupancyForm: OccupancyForm = occupancy.draft ?? {
    baseOccupancy: room.baseOccupancy?.toString() ?? '',
    idealOccupancy: room.idealOccupancy?.toString() ?? '',
    maxAdults: String(room.maxAdults),
    maxChildren: String(room.maxChildren),
    defaultChildren: String(room.defaultChildren),
    maxOccupancy: String(room.maxOccupancy),
    syncCategoryOnOta: room.syncCategoryOnOta,
    excludeFromRevenue: room.excludeFromRevenue,
    excludeFromOccupancy: room.excludeFromOccupancy,
    excludeFromUpgrade: room.excludeFromUpgrade,
  };

  const meals = useSection<MealPlanKey[]>((plans) => patch({ mealPlans: plans }));
  const mealPlans = meals.draft ?? room.mealPlans;

  const number = (key: keyof OccupancyForm, label: string) => (
    <Field label={label}>
      <TextField
        type="number"
        min={0}
        value={occupancyForm[key] as string}
        onChange={(e) => occupancy.setDraft({ ...occupancyForm, [key]: e.target.value })}
      />
    </Field>
  );

  const flag = (key: 'syncCategoryOnOta' | 'excludeFromRevenue' | 'excludeFromOccupancy' | 'excludeFromUpgrade', label: string) => (
    <label className="flex cursor-pointer items-center gap-2.5 text-label font-medium text-ink">
      <Checkbox
        type="checkbox"
        checked={occupancyForm[key]}
        onChange={(e) => occupancy.setDraft({ ...occupancyForm, [key]: e.target.checked })}
      />
      <span>{label}</span>
    </label>
  );

  return (
    <div className="flex flex-col gap-4">
      <Section
        title="Category Details"
        editing={details.draft !== null}
        saving={details.saving}
        canEdit={canEdit}
        onEdit={() => details.setDraft(detailsForm)}
        onCancel={details.cancel}
        onSave={() => void details.commit()}
      >
        <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
          <Field label="Name">
            <TextField value={detailsForm.name} onChange={(e) => details.setDraft({ ...detailsForm, name: e.target.value })} />
          </Field>
          <Field label="Abbreviation">
            <TextField
              value={detailsForm.abbreviation}
              maxLength={20}
              onChange={(e) => details.setDraft({ ...detailsForm, abbreviation: e.target.value })}
            />
          </Field>
          <Field label="Integration Code">
            <TextField
              value={detailsForm.integrationCode}
              maxLength={50}
              onChange={(e) => details.setDraft({ ...detailsForm, integrationCode: e.target.value })}
            />
          </Field>
          <div className="sm:col-span-2">
            <Field label="Description">
              <TextArea
                rows={3}
                value={detailsForm.description}
                onChange={(e) => details.setDraft({ ...detailsForm, description: e.target.value })}
              />
            </Field>
          </div>
        </div>
      </Section>

      <Section
        title="Inclusions"
        editing={inclusions.draft !== null}
        saving={inclusions.saving}
        canEdit={canEdit}
        onEdit={() => inclusions.setDraft(inclusionsText)}
        onCancel={inclusions.cancel}
        onSave={() => void inclusions.commit()}
      >
        <TextArea
          rows={5}
          value={inclusionsText}
          placeholder={inclusions.draft === null ? 'No inclusions defined.' : undefined}
          maxLength={5000}
          onChange={(e) => inclusions.setDraft(e.target.value)}
        />
      </Section>

      <Section
        title="Occupancy Details"
        editing={occupancy.draft !== null}
        saving={occupancy.saving}
        canEdit={canEdit}
        onEdit={() => occupancy.setDraft(occupancyForm)}
        onCancel={occupancy.cancel}
        onSave={() => void occupancy.commit()}
      >
        <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2 lg:grid-cols-3">
          {number('baseOccupancy', 'Base Occupancy (Minimum occupancy at which room sells):')}
          {number('idealOccupancy', 'Ideal Occupancy (Generally total number of beds in room):')}
          {number('maxAdults', 'Max Adults')}
          {number('maxChildren', 'Max Children')}
          {number('defaultChildren', 'Default Number of Children')}
          {number('maxOccupancy', 'Total Number of Guests')}
        </div>
        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
          {flag('syncCategoryOnOta', 'Sync Category on OTA')}
          {flag('excludeFromRevenue', 'Exclude From Revenue')}
          {flag('excludeFromOccupancy', 'Exclude From Occupancy')}
          {flag('excludeFromUpgrade', 'Exclude From Upgrade')}
        </div>
      </Section>

      <Section
        title="Meal Plan(s)"
        editing={meals.draft !== null}
        saving={meals.saving}
        canEdit={canEdit}
        onEdit={() => meals.setDraft(mealPlans)}
        onCancel={meals.cancel}
        onSave={() => void meals.commit()}
      >
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {MEAL_PLANS.map(({ key, description }) => (
            <label key={key} className="flex cursor-pointer items-center gap-2.5 text-label font-medium text-ink">
              <Checkbox
                type="checkbox"
                checked={mealPlans.includes(key)}
                onChange={(e) =>
                  meals.setDraft(e.target.checked ? [...mealPlans, key] : mealPlans.filter((plan) => plan !== key))
                }
              />
              <span>
                <span className="font-bold">{key}</span> <span className="font-normal text-ink-secondary">- {description}</span>
              </span>
            </label>
          ))}
        </div>
      </Section>
    </div>
  );
}
