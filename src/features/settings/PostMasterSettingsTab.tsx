import { useCallback, useState } from 'react';
import * as Lucide from 'lucide-react';
import { postMasterSettingsApi } from '../../lib/api/pms';
import type { PostMasterSettingsDetails } from '../../lib/api/pms';
import { useApiResource } from '../../lib/api/useApiResource';
import { displayApiError } from '../../lib/api/client';
import { toast } from '../../utils/toast';
import { TextField } from '../../components/primitives';
import { Field } from '../../components/controls';
import { PanelLoadState } from '../../components/Skeleton';
import { FormSection, ReadOnlyNotice, SettingsHeader, UnsavedBar } from './SettingsKit';

type LimitKey = keyof PostMasterSettingsDetails;
type LimitForm = Record<LimitKey, string>;

interface LimitField {
  key: LimitKey;
  label: string;
  max: number;
}

const PROPERTY_LEVEL: LimitField[] = [
  { key: 'maxOpenPmReservations', label: 'Max number of open PM reservations', max: 100_000 },
  { key: 'pmOpenTotalGrossAmount', label: 'PM open total gross amount', max: 2_000_000_000 },
];

const RESERVATION_LEVEL: LimitField[] = [
  { key: 'maxRooms', label: 'Max number of rooms', max: 10_000 },
  { key: 'maxNights', label: 'Max number of nights', max: 3_650 },
  { key: 'maxRoomNights', label: 'Max number of room nights', max: 1_000_000 },
  { key: 'maxReservationGrossAmount', label: 'Max reservation gross amount', max: 2_000_000_000 },
];

const toForm = (s: PostMasterSettingsDetails): LimitForm => ({
  maxOpenPmReservations: String(s.maxOpenPmReservations),
  pmOpenTotalGrossAmount: String(s.pmOpenTotalGrossAmount),
  maxRooms: String(s.maxRooms),
  maxNights: String(s.maxNights),
  maxRoomNights: String(s.maxRoomNights),
  maxReservationGrossAmount: String(s.maxReservationGrossAmount),
});

function PostMasterForm({
  propertyId,
  settings,
  canEdit,
}: {
  propertyId: string;
  settings: PostMasterSettingsDetails;
  canEdit: boolean;
}) {
  const [form, setForm] = useState<LimitForm>(() => toForm(settings));
  // What the server holds; the form is dirty while it differs from this.
  const [baseline, setBaseline] = useState<LimitForm>(() => toForm(settings));
  const [saving, setSaving] = useState(false);
  const dirty = JSON.stringify(form) !== JSON.stringify(baseline);

  const handleSave = async () => {
    const body: Partial<PostMasterSettingsDetails> = {};
    for (const { key, label, max } of [...PROPERTY_LEVEL, ...RESERVATION_LEVEL]) {
      const n = Number(form[key]);
      if (form[key].trim() === '' || !Number.isInteger(n) || n < 1 || n > max) {
        toast(`Check ${label.toLowerCase()}`, { detail: `Use a whole number from 1 to ${max.toLocaleString('en-US')}.`, tone: 'warning' });
        return;
      }
      body[key] = n;
    }
    setSaving(true);
    try {
      const saved = await postMasterSettingsApi.update(propertyId, body);
      const next = toForm(saved);
      setForm(next);
      setBaseline(next);
      toast('Post master settings saved', { tone: 'success' });
    } catch (err) {
      toast('Could not save the post master settings', { detail: displayApiError(err), tone: 'danger' });
    } finally {
      setSaving(false);
    }
  };

  const fields = (list: LimitField[]) =>
    list.map(({ key, label, max }) => (
      <Field key={key} label={label} hint={`1 to ${max.toLocaleString('en-US')}`}>
        <TextField
          type="number"
          inputMode="numeric"
          min={1}
          max={max}
          value={form[key]}
          onChange={(e) => setForm({ ...form, [key]: e.target.value })}
        />
      </Field>
    ));

  return (
    <fieldset disabled={!canEdit} className="m-0 min-w-0 border-0 p-0">
      <div className="flex flex-col gap-5">
        <SettingsHeader title="Post Master Settings" description="Limits on open post master reservations and on a single reservation" />
        {!canEdit ? <ReadOnlyNotice what="post master settings" /> : null}

        <div className="grid grid-cols-1 gap-5 xl:grid-cols-2 xl:items-start">
          <FormSection icon={Lucide.Building2} title="Property Level" subtitle="Limits across the whole property">
            {fields(PROPERTY_LEVEL)}
          </FormSection>
          <FormSection icon={Lucide.CalendarRange} title="Per Reservation" subtitle="Limits on a single reservation">
            {fields(RESERVATION_LEVEL)}
          </FormSection>
        </div>

        {canEdit ? (
          <UnsavedBar dirty={dirty} saving={saving} onSave={() => void handleSave()} onDiscard={() => setForm(baseline)} />
        ) : null}
      </div>
    </fieldset>
  );
}

export function PostMasterSettingsTab({ propertyId, canEdit }: { propertyId: string; canEdit: boolean }) {
  const load = useCallback(() => postMasterSettingsApi.get(propertyId), [propertyId]);
  const resource = useApiResource(load);

  if (!resource.data) {
    return <PanelLoadState error={resource.error} label="Loading post master settings" />;
  }

  return <PostMasterForm key={propertyId} propertyId={propertyId} settings={resource.data} canEdit={canEdit} />;
}
