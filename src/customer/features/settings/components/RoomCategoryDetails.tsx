import { useCallback, useState } from 'react';
import type { ReactNode } from 'react';
import * as Lucide from 'lucide-react';
import { roomListingApi, type RoomDetails, type RoomInput } from '../../../../shared/services/roomListingApi';
import { mealPlanApi } from '../../../../shared/services/mealPlanApi';
import { useApiResource } from '../../../../shared/services/useApiResource';
import { displayError } from '../../../../shared/services/errors';
import { toast } from '../../../../shared/utils/toast';
import { Button, TextArea, TextField } from '../../../../shared/components/ui/primitives';
import { Field } from '../../../../shared/components/ui/controls';
import { BedTypePicker } from './BedTypePicker';
import type { BedSelection } from './BedTypePicker';
import { ExtraBedTypePicker } from './ExtraBedTypePicker';
import { ToggleRow } from './SettingsKit';

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
  icon: Icon,
  title,
  editing,
  saving,
  canEdit,
  onEdit,
  onCancel,
  onSave,
  children,
}: {
  icon: Lucide.LucideIcon;
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
    <section className={`rounded-xl border bg-surface p-4 transition-colors sm:p-5 ${editing ? 'border-primary/50' : 'border-border'}`}>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2 border-b border-divider pb-3">
        <div className="flex min-w-0 items-center gap-2.5">
          <span className="flex h-8 w-8 flex-none items-center justify-center rounded-lg bg-primary/10 text-primary">
            <Icon size={16} aria-hidden="true" />
          </span>
          <h3 className="text-title font-bold text-ink">{title}</h3>
        </div>
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
}

interface OccupancyForm {
  baseOccupancy: string;
  idealOccupancy: string;
  maxAdults: string;
  maxChildren: string;
  maxOccupancy: string;
  bedTypes: BedSelection;
  extraBedTypes: string[];
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
      toast('Could not save room details', { detail: displayError(err), tone: 'danger' });
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
    });
  });
  const detailsForm: DetailsForm = details.draft ?? {
    name: room.name,
    description: room.description ?? '',
    abbreviation: room.abbreviation ?? '',
  };

  const inclusions = useSection<string>((text) => patch({ inclusions: optionalText(text) }));
  const inclusionsText = inclusions.draft ?? room.inclusions ?? '';

  const bedCatalog = roomListingApi.bedTypeCatalog();
  const extraBedCatalog = roomListingApi.extraBedTypeCatalog();

  const occupancy = useSection<OccupancyForm>(async (o) => {
    const base = optionalInt(o.baseOccupancy);
    const ideal = optionalInt(o.idealOccupancy);
    const adults = Number(o.maxAdults);
    const children = Number(o.maxChildren);
    const guests = Number(o.maxOccupancy);
    const whole = (n: number | null, min: number) => n === null || (Number.isInteger(n) && n >= min);
    if (!whole(adults, 1) || !whole(guests, 1) || !whole(children, 0)) {
      return warn('Check the guest numbers', 'Use whole numbers; adults and total guests need at least 1.');
    }
    if (!whole(base, 1) || !whole(ideal, 1)) {
      return warn('Check the occupancy numbers', 'Use whole numbers of at least 1, or leave blank.');
    }
    if (guests > adults + children) {
      return warn('Total guests is too high', 'It cannot exceed max adults plus max children.');
    }
    if (base !== null && base > guests) {
      return warn('Base occupancy is too high', 'It cannot exceed the total number of guests.');
    }
    return patch({
      baseOccupancy: base,
      idealOccupancy: ideal,
      maxAdults: adults,
      maxChildren: children,
      maxOccupancy: guests,
      bedTypes: o.bedTypes,
      extraBedTypes: o.extraBedTypes,
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
    maxOccupancy: String(room.maxOccupancy),
    // Codes no longer in a catalog are dropped, so saving does not send them back.
    bedTypes: Object.fromEntries(Object.entries(room.bedTypes).filter(([code]) => bedCatalog.some((b) => b.code === code))),
    extraBedTypes: room.extraBedTypes.filter((code) => extraBedCatalog.some((b) => b.code === code)),
    syncCategoryOnOta: room.syncCategoryOnOta,
    excludeFromRevenue: room.excludeFromRevenue,
    excludeFromOccupancy: room.excludeFromOccupancy,
    excludeFromUpgrade: room.excludeFromUpgrade,
  };

  // Only plans in the property's meal plan catalog can be offered.
  const loadMealPlans = useCallback(() => mealPlanApi.list(propertyId), [propertyId]);
  const mealCatalog = useApiResource(loadMealPlans);
  const meals = useSection<string[]>((plans) => patch({ mealPlans: plans }));
  const mealPlans = meals.draft ?? room.mealPlans;

  const number = (
    key: 'baseOccupancy' | 'idealOccupancy' | 'maxAdults' | 'maxChildren' | 'maxOccupancy',
    label: string,
    hint?: string,
  ) => (
    <Field label={label} hint={hint}>
      <TextField
        type="number"
        min={0}
        value={occupancyForm[key]}
        onChange={(e) => occupancy.setDraft({ ...occupancyForm, [key]: e.target.value })}
      />
    </Field>
  );

  const flag = (
    key: 'syncCategoryOnOta' | 'excludeFromRevenue' | 'excludeFromOccupancy' | 'excludeFromUpgrade',
    label: string,
    description: string,
  ) => (
    <ToggleRow
      label={label}
      description={description}
      checked={occupancyForm[key]}
      onChange={(checked) => occupancy.setDraft({ ...occupancyForm, [key]: checked })}
    />
  );

  return (
    <div className="flex flex-col gap-4">
      <Section
        icon={Lucide.Tag}
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
        icon={Lucide.Gift}
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
        icon={Lucide.Users}
        title="Occupancy"
        editing={occupancy.draft !== null}
        saving={occupancy.saving}
        canEdit={canEdit}
        onEdit={() => occupancy.setDraft(occupancyForm)}
        onCancel={occupancy.cancel}
        onSave={() => void occupancy.commit()}
      >
        <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2 lg:grid-cols-3">
          {number('baseOccupancy', 'Base occupancy', 'Minimum occupancy at which the room sells')}
          {number('idealOccupancy', 'Ideal occupancy', 'Generally the total number of beds in the room')}
          {number('maxAdults', 'Max adults')}
          {number('maxChildren', 'Max children')}
          {number('maxOccupancy', 'Total guests')}
        </div>
        <div className="mt-4">
          <span className="pms-label mb-1.5 block">Bed types</span>
          <BedTypePicker
            catalog={bedCatalog}
            value={occupancyForm.bedTypes}
            onChange={(bedTypes) => occupancy.setDraft({ ...occupancyForm, bedTypes })}
          />
        </div>
        <div className="mt-4">
          <span className="pms-label mb-1.5 block">Extra bed types</span>
          <ExtraBedTypePicker
            catalog={extraBedCatalog}
            value={occupancyForm.extraBedTypes}
            onChange={(extraBedTypes) => occupancy.setDraft({ ...occupancyForm, extraBedTypes })}
          />
        </div>
        <div className="mt-4 grid grid-cols-1 gap-2.5 sm:grid-cols-2">
          {flag('syncCategoryOnOta', 'Sync category on OTA', 'Publish this category to connected channels')}
          {flag('excludeFromRevenue', 'Exclude from revenue', 'Left out of revenue reports')}
          {flag('excludeFromOccupancy', 'Exclude from occupancy', 'Left out of occupancy figures')}
          {flag('excludeFromUpgrade', 'Exclude from upgrade', 'Not offered as an upgrade')}
        </div>
      </Section>

      <Section
        icon={Lucide.Utensils}
        title="Meal Plans"
        editing={meals.draft !== null}
        saving={meals.saving}
        canEdit={canEdit}
        onEdit={() => meals.setDraft(mealPlans.filter((code) => mealCatalog.data?.some((plan) => plan.code === code)))}
        onCancel={meals.cancel}
        onSave={() => void meals.commit()}
      >
        {mealCatalog.data ? (
          <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
            {mealCatalog.data.map(({ code, displayName, shortDisplayName }) => (
              <ToggleRow
                key={code}
                label={displayName}
                description={shortDisplayName || code}
                checked={mealPlans.includes(code)}
                onChange={(checked) =>
                  meals.setDraft(checked ? [...mealPlans, code] : mealPlans.filter((plan) => plan !== code))
                }
              />
            ))}
          </div>
        ) : (
          <p role={mealCatalog.error ? 'alert' : undefined} className={`text-label ${mealCatalog.error ? 'text-danger-text' : 'text-ink-muted'}`}>
            {mealCatalog.error ?? 'Loading meal plans…'}
          </p>
        )}
      </Section>
    </div>
  );
}
