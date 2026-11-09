import { useCallback, useState } from 'react';
import * as Lucide from 'lucide-react';
import { grcSettingsApi } from '../../lib/api/pms';
import type { GrcPrintDetails } from '../../lib/api/pms';
import { useApiResource } from '../../lib/api/useApiResource';
import { displayApiError } from '../../lib/api/client';
import { toast } from '../../utils/toast';
import { Button, TextField } from '../../components/primitives';
import { Field } from '../../components/controls';
import { CardSkeleton } from '../../components/Skeleton';
import { Badge, Card, CardTitle } from '../../components/ui';
import { AmenityChecklist } from './AmenityChecklist';
import { ReadOnlyNotice, SettingsHeader } from './SettingsKit';

/** The fields a guest registration card can carry, each one shown or hidden. */
function CardFields({ propertyId, canEdit }: { propertyId: string; canEdit: boolean }) {
  const load = useCallback(() => grcSettingsApi.fields(propertyId), [propertyId]);
  const resource = useApiResource(load);
  // Saved changes sit on top of what was loaded, so the long list never reloads.
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

  const items = resource.data
    ? resource.data.map((f) => ({ code: f.code, name: f.name, active: flags[f.code] ?? f.isEnabled }))
    : null;
  const shown = items?.filter((i) => i.active).length ?? 0;

  return (
    <Card>
      <CardTitle
        icon={Lucide.ListChecks}
        title="Card Fields"
        subtitle="Choose the fields printed on the guest registration card"
        badge={items ? <Badge tone="info" size="sm">{shown} shown</Badge> : undefined}
      />
      <AmenityChecklist
        items={items}
        loading={resource.loading}
        error={resource.error}
        disabled={!canEdit || busy}
        noun="fields"
        onLabel="Shown"
        offLabel="Hidden"
        onToggle={(code, next) => void change(code, next)}
      />
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

/** The parts joined the way a number is read: prefix, in-prefix, then the zero-padded running number. */
function previewNumber(form: TrackerForm): string {
  const digits = Number(form.postfixDigits);
  const number = Number(form.postfixNo);
  if (!Number.isInteger(digits) || digits < 1 || digits > 12 || !Number.isInteger(number) || number < 0) return '—';
  return `${form.prefix.trim()}${form.inPrefixNo.trim()}${String(number).padStart(digits, '0')}`;
}

/** The print header and the tracker number, shown once the print details arrive. */
function PrintDetails({ propertyId, print, canEdit }: { propertyId: string; print: GrcPrintDetails; canEdit: boolean }) {
  const [saved, setSaved] = useState(print);
  // The tracker is read-only until Edit; `tracker` holds the form while it is open.
  const [tracker, setTracker] = useState<TrackerForm | null>(null);
  const [header, setHeader] = useState(print.printHeader);
  const [saving, setSaving] = useState<'tracker' | 'header' | null>(null);

  const save = async (which: 'tracker' | 'header', body: Parameters<typeof grcSettingsApi.updatePrint>[1]) => {
    setSaving(which);
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
      setSaving(null);
    }
  };

  const trackerErrors = (t: TrackerForm): { postfixDigits?: string; postfixNo?: string } => {
    const digits = Number(t.postfixDigits);
    const number = Number(t.postfixNo);
    return {
      postfixDigits: !Number.isInteger(digits) || digits < 1 || digits > 12 ? 'Use a whole number from 1 to 12.' : undefined,
      postfixNo: t.postfixNo.trim() === '' || !Number.isInteger(number) || number < 0 ? 'Use a whole number, 0 or more.' : undefined,
    };
  };

  const saveTracker = async () => {
    if (!tracker) return;
    const errors = trackerErrors(tracker);
    if (errors.postfixDigits || errors.postfixNo) return;
    const ok = await save('tracker', {
      prefix: tracker.prefix.trim() || null,
      inPrefixNo: tracker.inPrefixNo.trim() || null,
      postfixDigits: Number(tracker.postfixDigits),
      postfixNo: Number(tracker.postfixNo),
    });
    if (ok) setTracker(null);
  };

  const headerDirty = header.trim() !== saved.printHeader;
  const headerEmpty = header.trim() === '';
  const adminOnly = 'Only administrators can change the GRC print details';
  const view = tracker ?? toTrackerForm(saved);
  const errors: { postfixDigits?: string; postfixNo?: string } = tracker ? trackerErrors(tracker) : {};

  return (
    <div className="flex flex-col gap-5">
      <Card>
        <CardTitle
          icon={Lucide.Printer}
          title="Print Header"
          subtitle="The title printed at the top of the card"
          action={
            headerDirty ? (
              <>
                <Button variant="secondary" onClick={() => setHeader(saved.printHeader)} disabled={saving !== null}>
                  Reset
                </Button>
                <Button
                  variant="primary"
                  onClick={() => void save('header', { printHeader: header.trim() })}
                  disabled={!canEdit || saving !== null || headerEmpty}
                  icon={saving === 'header' ? <Lucide.Loader2 size={14} className="animate-spin" /> : <Lucide.Save size={14} />}
                >
                  {saving === 'header' ? 'Saving…' : 'Save'}
                </Button>
              </>
            ) : null
          }
        />
        <Field
          label="Card title"
          error={headerEmpty ? 'The print header cannot be empty.' : undefined}
          hint={`${header.length} / 100 characters`}
        >
          <TextField value={header} maxLength={100} disabled={!canEdit} title={canEdit ? undefined : adminOnly} onChange={(e) => setHeader(e.target.value)} />
        </Field>
        <div className="mt-4 rounded-xl border border-dashed border-border bg-muted-surface/50 px-4 py-5 text-center" aria-label="Preview of the printed header">
          <p className="text-micro font-bold uppercase tracking-[0.14em] text-ink-muted">Preview</p>
          <p className="mt-1 break-words text-title font-bold text-ink">{header.trim() || 'Guest Registration Card'}</p>
        </div>
      </Card>

      <Card>
        <CardTitle
          icon={Lucide.Hash}
          title="Tracker Number"
          subtitle="How guest registration card numbers are built"
          action={
            tracker ? (
              <>
                <Button variant="secondary" onClick={() => setTracker(null)} disabled={saving !== null}>
                  Cancel
                </Button>
                <Button
                  variant="primary"
                  onClick={() => void saveTracker()}
                  disabled={saving !== null || Boolean(errors.postfixDigits || errors.postfixNo)}
                  icon={saving === 'tracker' ? <Lucide.Loader2 size={14} className="animate-spin" /> : <Lucide.Save size={14} />}
                >
                  {saving === 'tracker' ? 'Saving…' : 'Save'}
                </Button>
              </>
            ) : (
              <Button
                variant="secondary"
                onClick={() => setTracker(toTrackerForm(saved))}
                disabled={!canEdit}
                title={canEdit ? undefined : adminOnly}
                icon={<Lucide.Pencil size={14} />}
              >
                Edit
              </Button>
            )
          }
        />

        <div className="mb-4 flex flex-col gap-1 rounded-xl bg-muted-surface px-4 py-3" aria-live="polite">
          <span className="text-micro font-bold uppercase tracking-[0.14em] text-ink-muted">Number format preview</span>
          <span className="break-all font-mono text-title font-bold text-ink">{previewNumber(view)}</span>
        </div>

        {tracker ? (
          <div className="grid grid-cols-1 gap-x-4 gap-y-3.5 sm:grid-cols-2">
            <Field label="Prefix">
              <TextField value={tracker.prefix} maxLength={20} onChange={(e) => setTracker({ ...tracker, prefix: e.target.value })} />
            </Field>
            <Field label="In-prefix">
              <TextField value={tracker.inPrefixNo} maxLength={20} onChange={(e) => setTracker({ ...tracker, inPrefixNo: e.target.value })} />
            </Field>
            <Field label="Postfix digits" required error={errors.postfixDigits} hint="Zero-padded to this length, 1 to 12">
              <TextField
                type="number"
                inputMode="numeric"
                min={1}
                max={12}
                value={tracker.postfixDigits}
                onChange={(e) => setTracker({ ...tracker, postfixDigits: e.target.value })}
              />
            </Field>
            <Field label="Postfix number" required error={errors.postfixNo} hint="The running number">
              <TextField
                type="number"
                inputMode="numeric"
                min={0}
                value={tracker.postfixNo}
                onChange={(e) => setTracker({ ...tracker, postfixNo: e.target.value })}
              />
            </Field>
          </div>
        ) : (
          <dl className="grid grid-cols-2 gap-x-4 gap-y-3">
            {(
              [
                ['Prefix', view.prefix],
                ['In-prefix', view.inPrefixNo],
                ['Postfix digits', view.postfixDigits],
                ['Postfix number', view.postfixNo],
              ] as const
            ).map(([label, value]) => (
              <div key={label} className="min-w-0">
                <dt className="pms-label">{label}</dt>
                <dd className="mt-0.5 break-words text-body font-semibold text-ink">{value || '—'}</dd>
              </div>
            ))}
          </dl>
        )}
      </Card>
    </div>
  );
}

function GrcPrint({ propertyId, canEdit }: { propertyId: string; canEdit: boolean }) {
  const load = useCallback(() => grcSettingsApi.print(propertyId), [propertyId]);
  const resource = useApiResource(load);
  if (!resource.data) {
    return resource.loading && !resource.error ? (
      <CardSkeleton lines={4} label="Loading print details" />
    ) : (
      <p role="alert" className="pms-card p-8 text-center text-label text-danger-text">
        {resource.error ?? 'No print details to show.'}
      </p>
    );
  }
  return <PrintDetails propertyId={propertyId} print={resource.data} canEdit={canEdit} />;
}

export function GrcSettingsTab({ propertyId, canEdit }: { propertyId: string; canEdit: boolean }) {
  return (
    <div className="flex flex-col gap-5">
      <SettingsHeader title="GRC Settings" description="What the guest registration card shows and how it is numbered" />
      {!canEdit ? <ReadOnlyNotice what="the GRC settings" /> : null}

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)] xl:items-start">
        <CardFields propertyId={propertyId} canEdit={canEdit} />
        <GrcPrint propertyId={propertyId} canEdit={canEdit} />
      </div>
    </div>
  );
}
