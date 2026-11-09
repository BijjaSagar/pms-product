import { useCallback, useState } from 'react';
import * as Lucide from 'lucide-react';
import { cancellationRuleApi } from '../../lib/api/pms';
import type { CancellationRuleDetails } from '../../lib/api/pms';
import { useApiResource } from '../../lib/api/useApiResource';
import { displayApiError } from '../../lib/api/client';
import { toast } from '../../utils/toast';
import type { BadgeTone } from '../../utils/status';
import { Button, IconButton, TextField } from '../../components/primitives';
import { Field } from '../../components/controls';
import { Modal } from '../../components/overlays';
import { CardSkeleton } from '../../components/Skeleton';
import { Badge, Card, CardTitle, TableContainer } from '../../components/ui';
import { ReadOnlyNotice, SettingsHeader } from './SettingsKit';

/** What the dialog works on. `id` is null while a new rule is being added. */
interface RuleForm {
  id: string | null;
  startDate: string;
  endDate: string;
  daysFromCheckin: string;
  penaltyPercent: string;
}

const EMPTY_FORM: RuleForm = { id: null, startDate: '', endDate: '', daysFromCheckin: '', penaltyPercent: '' };

/** The backend sends dates as midnight-UTC date-times; the date inputs want "YYYY-MM-DD". */
const dayOf = (value: string) => value.slice(0, 10);

const formFromRule = (rule: CancellationRuleDetails): RuleForm => ({
  id: rule.id,
  startDate: dayOf(rule.startDate),
  endDate: dayOf(rule.endDate),
  daysFromCheckin: String(rule.daysFromCheckin),
  penaltyPercent: String(Number(rule.penaltyPercent)),
});

const formatDay = (value: string) =>
  new Date(`${dayOf(value)}T00:00:00Z`).toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  });

const dayWord = (n: number) => `${n} day${n === 1 ? '' : 's'}`;

/** Free, partial or full charge, so the size of the penalty reads at a glance. */
const penaltyTone = (percent: number): BadgeTone => (percent >= 100 ? 'danger' : percent > 0 ? 'warning' : 'success');

const penaltyLabel = (percent: number) => (percent === 0 ? 'Free' : `${percent}%`);

interface RuleErrors {
  startDate?: string;
  endDate?: string;
  daysFromCheckin?: string;
  penaltyPercent?: string;
}

function validate(form: RuleForm): RuleErrors {
  const errors: RuleErrors = {};
  const days = Number(form.daysFromCheckin);
  const penalty = Number(form.penaltyPercent);
  if (!form.startDate) errors.startDate = 'Choose a start date.';
  if (!form.endDate) errors.endDate = 'Choose an end date.';
  else if (form.startDate && form.endDate < form.startDate) errors.endDate = 'The end date cannot be before the start date.';
  if (form.daysFromCheckin.trim() === '' || !Number.isInteger(days) || days < 0 || days > 365) {
    errors.daysFromCheckin = 'Use a whole number from 0 to 365.';
  }
  if (form.penaltyPercent.trim() === '' || !(penalty >= 0 && penalty <= 100)) {
    errors.penaltyPercent = 'Use a percentage from 0 to 100.';
  }
  return errors;
}

/** The rule in plain words, so it can be checked before it is saved. */
function Preview({ form, errors }: { form: RuleForm; errors: RuleErrors }) {
  if (errors.startDate || errors.endDate || errors.daysFromCheckin || errors.penaltyPercent) return null;
  const days = Number(form.daysFromCheckin);
  const penalty = Number(form.penaltyPercent);
  return (
    <p className="flex items-start gap-2 rounded-xl bg-muted-surface px-3 py-2.5 text-label text-ink-secondary sm:col-span-2" aria-live="polite">
      <Lucide.Info size={14} className="mt-px flex-none text-ink-muted" aria-hidden="true" />
      <span>
        For stays checking in {formatDay(form.startDate)} to {formatDay(form.endDate)}, cancelling {dayWord(days)} or fewer before
        check-in {penalty === 0 ? 'is free.' : `charges ${penalty}% of the booking.`}
      </span>
    </p>
  );
}

function RuleDialog({
  editing,
  saving,
  onChange,
  onClose,
  onSave,
}: {
  editing: RuleForm | null;
  saving: boolean;
  onChange: (next: RuleForm) => void;
  onClose: () => void;
  onSave: () => void;
}) {
  // Errors only appear after the first save attempt, so an empty new rule does not open in red.
  const [attempted, setAttempted] = useState(false);
  const errors = editing ? validate(editing) : {};
  const shown = attempted ? errors : {};

  const submit = () => {
    setAttempted(true);
    if (Object.keys(errors).length === 0) onSave();
  };

  return (
    <Modal
      open={editing !== null}
      onClose={onClose}
      title={editing?.id === null ? 'Add Cancellation Rule' : 'Edit Cancellation Rule'}
      subtitle="The penalty applies to stays checking in between the start and end dates"
      footer={
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button
            variant="primary"
            onClick={submit}
            disabled={saving}
            icon={saving ? <Lucide.Loader2 size={14} className="animate-spin" /> : <Lucide.Save size={14} />}
          >
            {saving ? 'Saving…' : 'Save Rule'}
          </Button>
        </div>
      }
    >
      {editing && (
        <div className="grid grid-cols-1 gap-x-4 gap-y-3.5 py-2 sm:grid-cols-2">
          <p className="text-micro font-bold uppercase tracking-[0.14em] text-ink-muted sm:col-span-2">Check-in window</p>
          <Field label="Start date" required error={shown.startDate}>
            <TextField
              type="date"
              value={editing.startDate}
              onChange={(e) => onChange({ ...editing, startDate: e.target.value })}
              autoFocus
            />
          </Field>
          <Field label="End date" required error={shown.endDate}>
            <TextField
              type="date"
              value={editing.endDate}
              min={editing.startDate || undefined}
              onChange={(e) => onChange({ ...editing, endDate: e.target.value })}
            />
          </Field>

          <p className="mt-1 text-micro font-bold uppercase tracking-[0.14em] text-ink-muted sm:col-span-2">Penalty</p>
          <Field
            label="Days before check-in"
            required
            error={shown.daysFromCheckin}
            hint="Applies when cancelled this many days or fewer before check-in"
          >
            <TextField
              type="number"
              inputMode="numeric"
              min={0}
              max={365}
              value={editing.daysFromCheckin}
              onChange={(e) => onChange({ ...editing, daysFromCheckin: e.target.value })}
            />
          </Field>
          <Field label="Penalty (%)" required error={shown.penaltyPercent} hint="Share of the booking charged, 0 to 100">
            <TextField
              type="number"
              inputMode="decimal"
              min={0}
              max={100}
              step="0.01"
              value={editing.penaltyPercent}
              onChange={(e) => onChange({ ...editing, penaltyPercent: e.target.value })}
            />
          </Field>

          <Preview form={editing} errors={errors} />
        </div>
      )}
    </Modal>
  );
}

export function CancellationTab({ propertyId, canEdit }: { propertyId: string; canEdit: boolean }) {
  const load = useCallback(() => cancellationRuleApi.list(propertyId), [propertyId]);
  const resource = useApiResource(load);
  const rules = resource.data ?? [];

  const [editing, setEditing] = useState<RuleForm | null>(null);
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!editing) return;
    const body = {
      startDate: editing.startDate,
      endDate: editing.endDate,
      daysFromCheckin: Number(editing.daysFromCheckin),
      penaltyPercent: Number(editing.penaltyPercent),
    };

    setSaving(true);
    try {
      if (editing.id === null) await cancellationRuleApi.create(propertyId, body);
      else await cancellationRuleApi.update(propertyId, editing.id, body);
      resource.refresh();
      setEditing(null);
      toast(editing.id === null ? 'Cancellation rule added' : 'Cancellation rule updated', { tone: 'success' });
    } catch (err) {
      toast('Could not save the cancellation rule', { detail: displayApiError(err), tone: 'danger' });
    } finally {
      setSaving(false);
    }
  };

  const addRule = () => setEditing(EMPTY_FORM);
  const adminOnly = 'Only administrators can change cancellation rules';

  return (
    <div className="flex flex-col gap-5">
      <SettingsHeader
        title="Cancellation"
        description="Penalty charged when a guest cancels close to check-in"
        action={
          <Button variant="primary" onClick={addRule} disabled={!canEdit} title={canEdit ? undefined : adminOnly} icon={<Lucide.Plus size={14} />}>
            Add Rule
          </Button>
        }
      />
      {!canEdit ? <ReadOnlyNotice what="cancellation rules" /> : null}

      <Card>
        <CardTitle
          icon={Lucide.CalendarX}
          title="Rules"
          subtitle="Each rule covers a window of check-in dates"
          badge={rules.length > 0 ? <Badge tone="neutral" size="sm">{rules.length}</Badge> : undefined}
        />

        {rules.length === 0 ? (
          resource.loading && !resource.error ? (
            <CardSkeleton lines={3} label="Loading cancellation rules" />
          ) : resource.error ? (
            <p role="alert" className="py-8 text-center text-label text-danger-text">
              {resource.error}
            </p>
          ) : (
            <div className="flex flex-col items-center gap-3 py-10 text-center">
              <Lucide.CalendarX size={28} className="text-ink-muted" aria-hidden="true" />
              <div>
                <p className="text-body font-semibold text-ink">No cancellation rules yet</p>
                <p className="mt-0.5 text-label text-ink-secondary">Without a rule, guests can cancel at any time without a charge.</p>
              </div>
              {canEdit ? (
                <Button variant="primary" onClick={addRule} icon={<Lucide.Plus size={14} />}>
                  Add the first rule
                </Button>
              ) : null}
            </div>
          )
        ) : (
          <>
            {/* Phones and small tablets: one card per rule. */}
            <ul className="flex flex-col gap-2.5 md:hidden">
              {rules.map((rule, index) => (
                <li key={rule.id} className="rounded-xl border border-border bg-surface p-3.5">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-micro font-bold uppercase tracking-[0.14em] text-ink-muted">Rule {index + 1}</p>
                      <p className="mt-0.5 text-body font-semibold text-ink">
                        {formatDay(rule.startDate)} – {formatDay(rule.endDate)}
                      </p>
                    </div>
                    <IconButton
                      title="Edit cancellation rule"
                      aria-label={`Edit rule ${index + 1}`}
                      onClick={() => setEditing(formFromRule(rule))}
                      disabled={!canEdit}
                    >
                      <Lucide.Pencil size={14} />
                    </IconButton>
                  </div>
                  <div className="mt-2.5 flex flex-wrap items-center gap-x-3 gap-y-1.5">
                    <Badge tone={penaltyTone(Number(rule.penaltyPercent))}>{penaltyLabel(Number(rule.penaltyPercent))}</Badge>
                    <span className="text-label text-ink-secondary">if cancelled {dayWord(rule.daysFromCheckin)} or fewer before check-in</span>
                  </div>
                </li>
              ))}
            </ul>

            {/* Tablet and up: the same rules as a table. */}
            <div className="hidden md:block">
              <TableContainer>
                <table className="pms-table w-full text-left">
                  <thead>
                    <tr>
                      <th className="w-16">RULE</th>
                      <th>CHECK-IN WINDOW</th>
                      <th>CANCELLED WITHIN</th>
                      <th>PENALTY</th>
                      <th className="text-right">ACTION</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rules.map((rule, index) => (
                      <tr key={rule.id} className="border-b border-divider transition-colors last:border-b-0 hover:bg-hover-surface/60">
                        <td className="py-3 text-label font-bold text-ink">{index + 1}</td>
                        <td className="py-3 text-label font-medium text-ink">
                          {formatDay(rule.startDate)} – {formatDay(rule.endDate)}
                        </td>
                        <td className="py-3 text-label text-ink-secondary">{dayWord(rule.daysFromCheckin)} or fewer before check-in</td>
                        <td className="py-3">
                          <Badge tone={penaltyTone(Number(rule.penaltyPercent))}>{penaltyLabel(Number(rule.penaltyPercent))}</Badge>
                        </td>
                        <td className="py-3 text-right">
                          <IconButton
                            title="Edit cancellation rule"
                            aria-label={`Edit rule ${index + 1}`}
                            onClick={() => setEditing(formFromRule(rule))}
                            disabled={!canEdit}
                          >
                            <Lucide.Pencil size={14} />
                          </IconButton>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </TableContainer>
            </div>
          </>
        )}
      </Card>

      <RuleDialog
        key={editing?.id ?? (editing ? 'new' : 'closed')}
        editing={editing}
        saving={saving}
        onChange={setEditing}
        onClose={() => setEditing(null)}
        onSave={() => void handleSave()}
      />
    </div>
  );
}
