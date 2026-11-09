import { useCallback, useState } from 'react';
import { PanelLoadState } from '../../components/Skeleton';
import * as Lucide from 'lucide-react';
import { grcSettingsApi } from '../../lib/api/pms';
import type { GrcPrintDetails } from '../../lib/api/pms';
import { useApiResource } from '../../lib/api/useApiResource';
import { displayApiError } from '../../lib/api/client';
import { toast } from '../../utils/toast';
import { Button, Checkbox, TextField } from '../../components/primitives';
import { Field } from '../../components/controls';
import { SegmentedControl } from '../../components/SegmentedControl';
import type { SegmentOption } from '../../components/SegmentedControl';
import { Card, CardTitle, TableContainer } from '../../components/ui';
import { TableStateRows } from '../../components/Skeleton';

type GrcTab = 'settings' | 'print';

const TABS: SegmentOption<GrcTab>[] = [
  { id: 'settings', label: 'GRC Settings', Icon: Lucide.ClipboardList },
  { id: 'print', label: 'GRC Print Details', Icon: Lucide.Printer },
];

/** The fields a guest registration card can carry, each with an Enable checkbox. */
function GrcFields({ propertyId, canEdit }: { propertyId: string; canEdit: boolean }) {
  const load = useCallback(() => grcSettingsApi.fields(propertyId), [propertyId]);
  const resource = useApiResource(load);
  // Saved changes sit on top of what was loaded, so the long table never reloads.
  const [flags, setFlags] = useState<Record<string, boolean>>({});
  const [busy, setBusy] = useState(false);

  const change = async (code: string, checked: boolean) => {
    setBusy(true);
    try {
      await grcSettingsApi.setField(propertyId, code, checked);
      setFlags((prev) => ({ ...prev, [code]: checked }));
    } catch (err) {
      toast('Could not save the change', { detail: displayApiError(err), tone: 'danger' });
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card className="w-full max-w-xl">
      <CardTitle icon={Lucide.ClipboardList} title="GRC Settings" subtitle="Choose the fields printed on the guest registration card" />
      <div className="max-h-[65vh] overflow-y-auto">
        <TableContainer>
          <table className="pms-table w-full text-left">
            <thead>
              <tr>
                <th>NAME</th>
                <th className="w-24">ENABLE</th>
              </tr>
            </thead>
            <tbody>
              {resource.data ? (
                resource.data.map((field) => (
                  <tr key={field.code} className="border-b border-divider last:border-b-0">
                    <td className="py-1.5 text-label font-medium text-ink">{field.name}</td>
                    <td className="py-1.5">
                      <Checkbox
                        type="checkbox"
                        checked={flags[field.code] ?? field.isEnabled}
                        disabled={!canEdit || busy}
                        aria-label={field.name}
                        onChange={(e) => void change(field.code, e.target.checked)}
                      />
                    </td>
                  </tr>
                ))
              ) : (
                <TableStateRows cols={2} loading={resource.loading} error={resource.error} empty="No records yet." />
              )}
            </tbody>
          </table>
        </TableContainer>
      </div>
    </Card>
  );
}

interface TrackerForm {
  prefix: string;
  inPrefixNo: string;
  postfixDigits: string;
  postfixNo: string;
}

const toTrackerForm = (p: GrcPrintDetails): TrackerForm => ({
  prefix: p.prefix ?? '',
  inPrefixNo: p.inPrefixNo ?? '',
  postfixDigits: String(p.postfixDigits),
  postfixNo: String(p.postfixNo),
});

/** The tracker number card and print header, loaded once the print details arrive. */
function PrintDetails({ propertyId, print, canEdit }: { propertyId: string; print: GrcPrintDetails; canEdit: boolean }) {
  const [saved, setSaved] = useState(print);
  // The tracker is read-only until Edit; `tracker` holds the form while it is open.
  const [tracker, setTracker] = useState<TrackerForm | null>(null);
  const [header, setHeader] = useState(print.printHeader);
  const [saving, setSaving] = useState(false);

  const save = async (body: Parameters<typeof grcSettingsApi.updatePrint>[1]) => {
    setSaving(true);
    try {
      const next = await grcSettingsApi.updatePrint(propertyId, body);
      setSaved(next);
      setHeader(next.printHeader);
      toast('GRC print details saved', { tone: 'success' });
      return true;
    } catch (err) {
      toast('Could not save the print details', { detail: displayApiError(err), tone: 'danger' });
      return false;
    } finally {
      setSaving(false);
    }
  };

  const saveTracker = async () => {
    if (!tracker) return;
    const digits = Number(tracker.postfixDigits);
    const number = Number(tracker.postfixNo);
    if (!Number.isInteger(digits) || digits < 1 || digits > 12) {
      toast('Check the post fix digits', { detail: 'Use a whole number from 1 to 12.', tone: 'warning' });
      return;
    }
    if (tracker.postfixNo.trim() === '' || !Number.isInteger(number) || number < 0) {
      toast('Check the post-fix number', { detail: 'Use a whole number, 0 or more.', tone: 'warning' });
      return;
    }
    const ok = await save({
      prefix: tracker.prefix.trim() || null,
      inPrefixNo: tracker.inPrefixNo.trim() || null,
      postfixDigits: digits,
      postfixNo: number,
    });
    if (ok) setTracker(null);
  };

  const saveHeader = () => {
    if (header.trim() === '') {
      toast('The print header cannot be empty', { tone: 'warning' });
      return;
    }
    void save({ printHeader: header.trim() });
  };

  const view = tracker ?? toTrackerForm(saved);
  const row = (label: string, key: keyof TrackerForm, type: 'text' | 'number' = 'text') => (
    <div className="grid grid-cols-[12rem_1fr] items-center gap-3 py-1.5 text-body text-ink">
      <span>{label}</span>
      {tracker ? (
        <TextField
          type={type}
          min={type === 'number' ? 0 : undefined}
          value={tracker[key]}
          onChange={(e) => setTracker({ ...tracker, [key]: e.target.value })}
          className="max-w-xs"
        />
      ) : (
        <span>{view[key]}</span>
      )}
    </div>
  );

  return (
    <div className="flex w-full max-w-3xl flex-col gap-5">
      <Card>
        <div className="mb-3 flex items-center justify-between gap-3">
          <h2 className="text-title font-bold text-ink">GRC Tracker Number</h2>
          {tracker ? (
            <div className="flex gap-2">
              <Button variant="secondary" type="button" onClick={() => setTracker(null)} disabled={saving}>
                Cancel
              </Button>
              <Button variant="primary" type="button" onClick={() => void saveTracker()} disabled={saving} icon={<Lucide.Save size={14} />}>
                Save
              </Button>
            </div>
          ) : (
            <Button
              variant="link"
              type="button"
              onClick={() => setTracker(toTrackerForm(saved))}
              disabled={!canEdit}
              title={canEdit ? undefined : 'Only administrators can change the GRC print details'}
              icon={<Lucide.Pencil size={14} />}
            >
              Edit
            </Button>
          )}
        </div>
        <div className="pl-2">
          {row('Pre-fix No.', 'prefix')}
          {row('In Prefix No.', 'inPrefixNo')}
          {row('Post Fix with Digits', 'postfixDigits', 'number')}
          {row('Post-fix No.', 'postfixNo', 'number')}
        </div>
      </Card>

      <Card>
        <div className="mb-3 flex items-center justify-between gap-3">
          <h2 className="text-title font-bold text-ink">Print Header</h2>
          <Button
            variant="primary"
            type="button"
            onClick={saveHeader}
            disabled={!canEdit || saving || header.trim() === saved.printHeader}
            title={canEdit ? undefined : 'Only administrators can change the GRC print details'}
            icon={<Lucide.Save size={14} />}
          >
            Save
          </Button>
        </div>
        <div className="grid grid-cols-1 items-center gap-3 sm:grid-cols-2">
          <Field label="Guest Reservation Card">
            <TextField value={header} maxLength={100} disabled={!canEdit} onChange={(e) => setHeader(e.target.value)} />
          </Field>
        </div>
      </Card>
    </div>
  );
}

function GrcPrint({ propertyId, canEdit }: { propertyId: string; canEdit: boolean }) {
  const load = useCallback(() => grcSettingsApi.print(propertyId), [propertyId]);
  const resource = useApiResource(load);
  if (!resource.data) {
    return <PanelLoadState error={resource.error} label="Loading print details" lines={3} />;
  }
  return <PrintDetails propertyId={propertyId} print={resource.data} canEdit={canEdit} />;
}

export function GrcSettingsTab({ propertyId, canEdit }: { propertyId: string; canEdit: boolean }) {
  const [tab, setTab] = useState<GrcTab>('settings');
  return (
    <div className="flex flex-col gap-5">
      <SegmentedControl label="GRC sections" options={TABS} value={tab} onChange={setTab} />
      {tab === 'settings' ? <GrcFields propertyId={propertyId} canEdit={canEdit} /> : <GrcPrint propertyId={propertyId} canEdit={canEdit} />}
    </div>
  );
}
