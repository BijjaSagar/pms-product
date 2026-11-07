import { useCallback, useState } from 'react';
import type { ReactNode } from 'react';
import { postMasterSettingsApi } from '../../lib/api/pms';
import type { PostMasterSettingsDetails } from '../../lib/api/pms';
import { useApiResource } from '../../lib/api/useApiResource';
import { displayApiError } from '../../lib/api/client';
import { toast } from '../../utils/toast';
import { Button, TextField } from '../../components/primitives';

type LimitKey = keyof PostMasterSettingsDetails;

interface LimitField {
  key: LimitKey;
  label: string;
  max: number;
}

const PROPERTY_LEVEL: LimitField[] = [
  { key: 'maxOpenPmReservations', label: 'Max Number of Open PM Reservations :', max: 100_000 },
  { key: 'pmOpenTotalGrossAmount', label: 'PM Open Total Gross Amount :', max: 2_000_000_000 },
];

const RESERVATION_LEVEL: LimitField[] = [
  { key: 'maxRooms', label: 'Max Number of Rooms :', max: 10_000 },
  { key: 'maxNights', label: 'Max Number of Nights :', max: 3_650 },
  { key: 'maxRoomNights', label: 'Max Number of Room Nights :', max: 1_000_000 },
  { key: 'maxReservationGrossAmount', label: 'Max Reservation Gross Amount :', max: 2_000_000_000 },
];

function Heading({ children }: { children: ReactNode }) {
  return (
    <h2 className="border-b pb-2 text-disp3 font-medium text-ink" style={{ borderColor: 'var(--color-border-subtle)' }}>
      {children}
    </h2>
  );
}

function PostMasterForm({
  propertyId,
  settings,
  canEdit,
}: {
  propertyId: string;
  settings: PostMasterSettingsDetails;
  canEdit: boolean;
}) {
  const [form, setForm] = useState<Record<LimitKey, string>>(() => ({
    maxOpenPmReservations: String(settings.maxOpenPmReservations),
    pmOpenTotalGrossAmount: String(settings.pmOpenTotalGrossAmount),
    maxRooms: String(settings.maxRooms),
    maxNights: String(settings.maxNights),
    maxRoomNights: String(settings.maxRoomNights),
    maxReservationGrossAmount: String(settings.maxReservationGrossAmount),
  }));
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    const body: Partial<PostMasterSettingsDetails> = {};
    for (const { key, label, max } of [...PROPERTY_LEVEL, ...RESERVATION_LEVEL]) {
      const n = Number(form[key]);
      if (form[key].trim() === '' || !Number.isInteger(n) || n < 1 || n > max) {
        toast(`Check ${label.replace(' :', '')}`, { detail: `Use a whole number from 1 to ${max.toLocaleString('en-US')}.`, tone: 'warning' });
        return;
      }
      body[key] = n;
    }
    setSaving(true);
    try {
      const saved = await postMasterSettingsApi.update(propertyId, body);
      setForm(Object.fromEntries(Object.entries(saved).map(([k, v]) => [k, String(v)])) as Record<LimitKey, string>);
      toast('Post master settings saved', { tone: 'success' });
    } catch (err) {
      toast('Could not save the post master settings', { detail: displayApiError(err), tone: 'danger' });
    } finally {
      setSaving(false);
    }
  };

  const rows = (fields: LimitField[]) =>
    fields.map(({ key, label }) => (
      <div key={key} className="grid grid-cols-1 items-center gap-2 px-3 py-2.5 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] sm:gap-6">
        <label htmlFor={`pm-${key}`} className="text-body text-ink-secondary">
          {label}
        </label>
        <TextField
          id={`pm-${key}`}
          type="number"
          min={1}
          value={form[key]}
          onChange={(e) => setForm({ ...form, [key]: e.target.value })}
        />
      </div>
    ));

  const adminOnly = 'Only administrators can change post master settings';

  return (
    <fieldset disabled={!canEdit} title={canEdit ? undefined : adminOnly} className="m-0 min-w-0 border-0 p-0">
      <div className="flex w-full max-w-3xl flex-col gap-3">
        <Heading>Property Level Settings:</Heading>
        {rows(PROPERTY_LEVEL)}

        <div className="mt-3">
          <Heading>Per Reservation Level Settings:</Heading>
        </div>
        {rows(RESERVATION_LEVEL)}

        <div className="px-3 pt-2">
          <Button
            variant="primary"
            type="button"
            onClick={() => void handleSave()}
            disabled={saving || !canEdit}
            title={canEdit ? undefined : adminOnly}
            className="disabled:opacity-50"
          >
            Save
          </Button>
        </div>
      </div>
    </fieldset>
  );
}

export function PostMasterSettingsTab({ propertyId, canEdit }: { propertyId: string; canEdit: boolean }) {
  const load = useCallback(() => postMasterSettingsApi.get(propertyId), [propertyId]);
  const resource = useApiResource(load);

  if (!resource.data) {
    return (
      <div
        className="rounded-2xl border p-8 text-center text-body text-ink-secondary shadow-sm"
        style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}
      >
        {resource.error ?? 'Loading post master settings…'}
      </div>
    );
  }

  return <PostMasterForm key={propertyId} propertyId={propertyId} settings={resource.data} canEdit={canEdit} />;
}
