import { useCallback, useState } from 'react';
import * as Lucide from 'lucide-react';
import { housekeepingStatusApi } from '../../lib/api/pms';
import type { HousekeepingPermissionKey, HousekeepingStatusDetails, HousekeepingStatusInput } from '../../lib/api/pms';
import { useApiResource } from '../../lib/api/useApiResource';
import { displayApiError } from '../../lib/api/client';
import { toast } from '../../utils/toast';
import { Button, Checkbox, IconButton, SelectField, TextArea, TextField } from '../../components/primitives';
import { Field } from '../../components/controls';
import { ConfirmDialog, Modal } from '../../components/overlays';
import { SegmentedControl } from '../../components/SegmentedControl';
import type { SegmentOption } from '../../components/SegmentedControl';
import { Card, CardTitle, TableContainer } from '../../components/ui';

type HkTab = 'configuration' | 'room-assignment';

const TABS: SegmentOption<HkTab>[] = [
  { id: 'configuration', label: 'Configuration', Icon: Lucide.SlidersHorizontal },
  { id: 'room-assignment', label: 'Room Assignment', Icon: Lucide.UserCheck },
];

const PERMISSIONS: { key: HousekeepingPermissionKey; label: string }[] = [
  { key: 'NONE', label: 'No Permission Required' },
  { key: 'CLEAN', label: 'All users who can mark room as Clean' },
  { key: 'DIRTY', label: 'All users who can mark room as Dirty' },
  { key: 'TO_BE_INSPECTED', label: 'All users who can mark room as to be inspected' },
  { key: 'INSPECTED', label: 'All users who can mark room as inspected' },
  { key: 'UNDER_MAINTENANCE', label: 'All users who can mark room as Under Maintenance' },
];

type FlagKey = 'checkinDefault' | 'checkoutDefault' | 'roomChangeDefault' | 'availableForParkingLot' | 'allowCheckin' | 'checkinHardStop';

const DEFAULT_FLAGS: { key: FlagKey; label: string }[] = [
  { key: 'checkinDefault', label: 'Check in' },
  { key: 'checkoutDefault', label: 'Check out' },
  { key: 'roomChangeDefault', label: 'Room change' },
];

const DETAIL_FLAGS: { key: FlagKey; label: string }[] = [
  { key: 'availableForParkingLot', label: 'Available for parking lot' },
  { key: 'allowCheckin', label: 'Allow check in' },
  { key: 'checkinHardStop', label: 'Hard stop' },
];

// palette-allow: the colour a new housekeeping status starts with
const NEW_STATUS_COLOR = '#2e9e5b';

/** What the dialog works on. `id` is null while a new status is being added. */
interface StatusForm extends Record<FlagKey, boolean> {
  id: string | null;
  name: string;
  color: string;
  abbreviation: string;
  description: string;
  permissionRequired: HousekeepingPermissionKey;
}

const EMPTY_FORM: StatusForm = {
  id: null,
  name: '',
  color: NEW_STATUS_COLOR,
  abbreviation: '',
  description: '',
  permissionRequired: 'NONE',
  checkinDefault: false,
  checkoutDefault: false,
  roomChangeDefault: false,
  availableForParkingLot: false,
  allowCheckin: false,
  checkinHardStop: false,
};

const toForm = (s: HousekeepingStatusDetails): StatusForm => ({
  id: s.id,
  name: s.name,
  color: s.color,
  abbreviation: s.abbreviation,
  description: s.description ?? '',
  permissionRequired: s.permissionRequired,
  checkinDefault: s.checkinDefault,
  checkoutDefault: s.checkoutDefault,
  roomChangeDefault: s.roomChangeDefault,
  availableForParkingLot: s.availableForParkingLot,
  allowCheckin: s.allowCheckin,
  checkinHardStop: s.checkinHardStop,
});

function Mark({ on }: { on: boolean }) {
  return on ? <Lucide.Check size={15} className="text-success-text" aria-label="Yes" /> : <span className="text-ink-disabled" aria-label="No">—</span>;
}

function Configuration({ propertyId, canEdit }: { propertyId: string; canEdit: boolean }) {
  const load = useCallback(() => housekeepingStatusApi.list(propertyId), [propertyId]);
  const resource = useApiResource(load);
  const statuses = resource.data ?? [];

  const [editing, setEditing] = useState<StatusForm | null>(null);
  const [deleting, setDeleting] = useState<HousekeepingStatusDetails | null>(null);
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!editing) return;
    if (editing.name.trim() === '' || editing.abbreviation.trim() === '') {
      toast('Name and abbreviation are required', { tone: 'warning' });
      return;
    }
    const body: HousekeepingStatusInput = {
      name: editing.name.trim(),
      color: editing.color,
      abbreviation: editing.abbreviation.trim(),
      description: editing.description.trim() || null,
      permissionRequired: editing.permissionRequired,
      checkinDefault: editing.checkinDefault,
      checkoutDefault: editing.checkoutDefault,
      roomChangeDefault: editing.roomChangeDefault,
      availableForParkingLot: editing.availableForParkingLot,
      allowCheckin: editing.allowCheckin,
      checkinHardStop: editing.checkinHardStop,
    };
    setSaving(true);
    try {
      if (editing.id === null) await housekeepingStatusApi.create(propertyId, body);
      else await housekeepingStatusApi.update(propertyId, editing.id, body);
      resource.refresh();
      setEditing(null);
      toast(editing.id === null ? 'Housekeeping status added' : 'Housekeeping status updated', { tone: 'success' });
    } catch (err) {
      toast('Could not save the housekeeping status', { detail: displayApiError(err), tone: 'danger' });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (status: HousekeepingStatusDetails) => {
    try {
      await housekeepingStatusApi.remove(propertyId, status.id);
      resource.refresh();
      toast(`Deleted ${status.name}`, { tone: 'success' });
    } catch (err) {
      toast('Could not delete the housekeeping status', { detail: displayApiError(err), tone: 'danger' });
    }
  };

  const adminOnly = 'Only administrators can change housekeeping statuses';
  const flagBox = ({ key, label }: { key: FlagKey; label: string }) =>
    editing && (
      <label key={key} className="flex cursor-pointer items-center gap-2.5 text-label font-medium text-ink">
        <Checkbox type="checkbox" checked={editing[key]} onChange={(e) => setEditing({ ...editing, [key]: e.target.checked })} />
        <span>{label}</span>
      </label>
    );

  return (
    <>
      <Card>
        <CardTitle
          icon={Lucide.SprayCan}
          title="Housekeeping Statuses"
          subtitle="The statuses a room can have and what each one allows"
          action={
            <Button
              variant="primary"
              type="button"
              onClick={() => setEditing(EMPTY_FORM)}
              disabled={!canEdit}
              title={canEdit ? undefined : adminOnly}
              icon={<Lucide.Plus size={14} />}
            >
              Add Status
            </Button>
          }
        />
        <TableContainer>
          <table className="pms-table w-full min-w-[1000px] text-left">
            <thead>
              <tr>
                <th>COLOR</th>
                <th>DISPLAY ORDER</th>
                <th>NAME</th>
                <th>ABBREVIATION</th>
                <th className="text-center">CHECK-IN DEFAULT</th>
                <th className="text-center">CHECK-OUT DEFAULT</th>
                <th className="text-center">ROOM CHANGE DEFAULT</th>
                <th className="text-center">ALLOW CHECK-IN</th>
                <th className="text-center">CHECK-IN HARD STOP</th>
                <th className="text-center">AVAILABLE FOR PARKING LOT</th>
                <th className="text-right">ACTIONS</th>
              </tr>
            </thead>
            <tbody>
              {statuses.map((status) => (
                <tr key={status.id} className="border-b border-divider last:border-b-0">
                  <td className="py-2.5">
                    <span
                      className="block h-5 w-8 rounded border"
                      style={{ background: status.color, borderColor: 'var(--color-border)' }}
                      aria-label={`Color ${status.color}`}
                    />
                  </td>
                  <td className="py-2.5 text-label text-ink-secondary">{status.displayOrder}</td>
                  <td className="py-2.5 text-label font-bold text-ink">{status.name}</td>
                  <td className="py-2.5 text-label text-ink-secondary">{status.abbreviation}</td>
                  <td className="py-2.5 text-center"><Mark on={status.checkinDefault} /></td>
                  <td className="py-2.5 text-center"><Mark on={status.checkoutDefault} /></td>
                  <td className="py-2.5 text-center"><Mark on={status.roomChangeDefault} /></td>
                  <td className="py-2.5 text-center"><Mark on={status.allowCheckin} /></td>
                  <td className="py-2.5 text-center"><Mark on={status.checkinHardStop} /></td>
                  <td className="py-2.5 text-center"><Mark on={status.availableForParkingLot} /></td>
                  <td className="py-2.5 text-right">
                    <div className="inline-flex items-center gap-1.5">
                      <IconButton title={`Edit ${status.name}`} onClick={() => setEditing(toForm(status))} disabled={!canEdit}>
                        <Lucide.Pencil size={14} />
                      </IconButton>
                      <IconButton
                        title={`Delete ${status.name}`}
                        onClick={() => setDeleting(status)}
                        disabled={!canEdit}
                        className="hover:text-danger-text"
                      >
                        <Lucide.Trash2 size={14} />
                      </IconButton>
                    </div>
                  </td>
                </tr>
              ))}
              {statuses.length === 0 && (
                <tr>
                  <td colSpan={11} className="py-8 text-center text-label text-ink-muted">
                    {resource.error ?? (resource.loading ? 'Loading housekeeping statuses…' : 'No housekeeping statuses yet.')}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </TableContainer>
      </Card>

      <Modal
        open={editing !== null}
        onClose={() => setEditing(null)}
        title={editing?.id === null ? 'Add Housekeeping Status' : `Edit ${editing?.name}`}
        subtitle="Name, color and what this status allows"
        wide
      >
        {editing && (
          <div className="flex flex-col gap-4 py-2">
            <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
              <Field label="Name">
                <TextField value={editing.name} maxLength={60} autoFocus onChange={(e) => setEditing({ ...editing, name: e.target.value })} />
              </Field>
              <Field label="Color">
                <div className="flex items-center gap-3">
                  <input
                    type="color"
                    value={editing.color}
                    aria-label="Color"
                    onChange={(e) => setEditing({ ...editing, color: e.target.value })}
                    className="h-9 w-14 cursor-pointer rounded border bg-transparent p-0.5"
                    style={{ borderColor: 'var(--color-border)' }}
                  />
                  <span className="text-label text-ink-muted">{editing.color}</span>
                </div>
              </Field>
              <Field label="Abbreviation">
                <TextField value={editing.abbreviation} maxLength={10} onChange={(e) => setEditing({ ...editing, abbreviation: e.target.value })} />
              </Field>
              <div className="sm:col-span-2">
                <Field label="Description">
                  <TextArea rows={2} value={editing.description} maxLength={500} onChange={(e) => setEditing({ ...editing, description: e.target.value })} />
                </Field>
              </div>
              <div className="sm:col-span-2">
                <Field label="Permissions Required By Users To Update Status Of This HK Status">
                  <SelectField
                    value={editing.permissionRequired}
                    onChange={(e) => setEditing({ ...editing, permissionRequired: e.target.value as HousekeepingPermissionKey })}
                  >
                    {PERMISSIONS.map((p) => (
                      <option key={p.key} value={p.key}>
                        {p.label}
                      </option>
                    ))}
                  </SelectField>
                </Field>
              </div>
            </div>

            <div>
              <p className="pms-label mb-2">Mark as Default on following actions</p>
              <div className="flex flex-wrap gap-x-6 gap-y-2">{DEFAULT_FLAGS.map(flagBox)}</div>
            </div>

            <div>
              <p className="pms-label mb-2">Additional Details</p>
              <div className="flex flex-wrap gap-x-6 gap-y-2">{DETAIL_FLAGS.map(flagBox)}</div>
            </div>

            <div className="flex justify-end gap-2 border-t border-divider pt-3">
              <Button variant="secondary" onClick={() => setEditing(null)} disabled={saving}>
                Cancel
              </Button>
              <Button
                variant="primary"
                onClick={() => void handleSave()}
                disabled={saving}
                icon={saving ? <Lucide.Loader2 size={14} className="animate-spin" /> : <Lucide.Save size={14} />}
              >
                {saving ? 'Saving…' : 'Save'}
              </Button>
            </div>
          </div>
        )}
      </Modal>

      <ConfirmDialog
        open={deleting !== null}
        onClose={() => setDeleting(null)}
        onConfirm={() => (deleting ? handleDelete(deleting) : undefined)}
        title="Delete housekeeping status"
        body={`Delete ${deleting?.name}? This cannot be undone.`}
        confirmLabel="Delete"
        danger
      />
    </>
  );
}

export function HouseKeepingTab({ propertyId, canEdit }: { propertyId: string; canEdit: boolean }) {
  const [tab, setTab] = useState<HkTab>('configuration');
  return (
    <div className="flex flex-col gap-5">
      <SegmentedControl label="House keeping sections" options={TABS} value={tab} onChange={setTab} />
      {tab === 'configuration' ? (
        <Configuration propertyId={propertyId} canEdit={canEdit} />
      ) : (
        <Card>
          <CardTitle icon={Lucide.UserCheck} title="Room Assignment" subtitle="Assign rooms to housekeepers" />
          <p className="py-8 text-center text-label text-ink-muted">This section is coming soon.</p>
        </Card>
      )}
    </div>
  );
}
