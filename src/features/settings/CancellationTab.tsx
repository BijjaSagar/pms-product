import { useCallback, useState } from 'react';
import * as Lucide from 'lucide-react';
import { cancellationRuleApi } from '../../lib/api/pms';
import type { CancellationRuleDetails } from '../../lib/api/pms';
import { useApiResource } from '../../lib/api/useApiResource';
import { displayApiError } from '../../lib/api/client';
import { toast } from '../../utils/toast';
import { Button, IconButton, TextField } from '../../components/primitives';
import { Field } from '../../components/controls';
import { Modal } from '../../components/overlays';
import { Card, CardTitle, TableContainer } from '../../components/ui';
import { TableStateRows } from '../../components/Skeleton';

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

export function CancellationTab({ propertyId, canEdit }: { propertyId: string; canEdit: boolean }) {
  const load = useCallback(() => cancellationRuleApi.list(propertyId), [propertyId]);
  const resource = useApiResource(load);
  const rules = resource.data ?? [];

  const [editing, setEditing] = useState<RuleForm | null>(null);
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!editing) return;
    const days = Number(editing.daysFromCheckin);
    const penalty = Number(editing.penaltyPercent);
    if (!editing.startDate || !editing.endDate) {
      toast('Choose a start date and an end date', { tone: 'warning' });
      return;
    }
    if (editing.endDate < editing.startDate) {
      toast('The end date cannot be before the start date', { tone: 'warning' });
      return;
    }
    if (editing.daysFromCheckin.trim() === '' || !Number.isInteger(days) || days < 0 || days > 365) {
      toast('Check the days from check-in', { detail: 'Use a whole number from 0 to 365.', tone: 'warning' });
      return;
    }
    if (editing.penaltyPercent.trim() === '' || !(penalty >= 0 && penalty <= 100)) {
      toast('Check the penalty', { detail: 'Use a percentage from 0 to 100.', tone: 'warning' });
      return;
    }
    const body = { startDate: editing.startDate, endDate: editing.endDate, daysFromCheckin: days, penaltyPercent: penalty };

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

  return (
    <div className="flex flex-col gap-4">
      <Card>
        <CardTitle
          icon={Lucide.CalendarX}
          title="Cancellation"
          subtitle="Penalty charged when a guest cancels close to check-in"
          action={
            <Button
              variant="primary"
              type="button"
              onClick={() => setEditing(EMPTY_FORM)}
              disabled={!canEdit}
              title={canEdit ? undefined : 'Only administrators can change cancellation rules'}
              icon={<Lucide.Plus size={14} />}
            >
              Add Rule
            </Button>
          }
        />

        <TableContainer>
          <table className="pms-table w-full min-w-[640px] text-left">
            <thead>
              <tr>
                <th>CANCELLATION RULE</th>
                <th>START TIMESTAMP</th>
                <th>END TIMESTAMP</th>
                <th className="text-right">ACTION</th>
              </tr>
            </thead>
            <tbody>
              {rules.map((rule, index) => (
                <tr key={rule.id} className="border-b border-divider transition-colors last:border-b-0 hover:bg-hover-surface/60">
                  <td className="py-3 text-label font-bold text-ink">{index + 1}</td>
                  <td className="py-3 text-label font-medium text-ink-secondary">{formatDay(rule.startDate)}</td>
                  <td className="py-3 text-label font-medium text-ink-secondary">{formatDay(rule.endDate)}</td>
                  <td className="py-3 text-right">
                    <IconButton
                      title="Edit cancellation rule"
                      onClick={() => setEditing(formFromRule(rule))}
                      disabled={!canEdit}
                    >
                      <Lucide.Pencil size={14} />
                    </IconButton>
                  </td>
                </tr>
              ))}
              {rules.length === 0 && (
                <TableStateRows cols={4} loading={resource.loading} error={resource.error} empty="No cancellation rules yet." />
              )}
            </tbody>
          </table>
        </TableContainer>
      </Card>

      <Modal
        open={editing !== null}
        onClose={() => setEditing(null)}
        title={editing?.id === null ? 'Add Cancellation Rule' : 'Edit Cancellation Rule'}
        subtitle="The penalty applies to stays checking in between the start and end dates"
      >
        {editing && (
          <div className="grid grid-cols-1 gap-3.5 py-2 sm:grid-cols-2">
            <Field label="Start Date">
              <TextField
                type="date"
                value={editing.startDate}
                onChange={(e) => setEditing({ ...editing, startDate: e.target.value })}
                autoFocus
              />
            </Field>
            <Field label="End Date">
              <TextField
                type="date"
                value={editing.endDate}
                min={editing.startDate || undefined}
                onChange={(e) => setEditing({ ...editing, endDate: e.target.value })}
              />
            </Field>
            <Field label="Day from Check-in" hint="Applies when cancelled this many days or fewer before check-in">
              <TextField
                type="number"
                min={0}
                max={365}
                value={editing.daysFromCheckin}
                onChange={(e) => setEditing({ ...editing, daysFromCheckin: e.target.value })}
              />
            </Field>
            <Field label="Penalty %" hint="Share of the booking charged, 0 to 100">
              <TextField
                type="number"
                min={0}
                max={100}
                step="0.01"
                value={editing.penaltyPercent}
                onChange={(e) => setEditing({ ...editing, penaltyPercent: e.target.value })}
              />
            </Field>

            <div className="flex justify-end gap-2 border-t border-divider pt-3 sm:col-span-2">
              <Button variant="secondary" onClick={() => setEditing(null)} disabled={saving}>
                Cancel
              </Button>
              <Button
                variant="primary"
                onClick={() => void handleSave()}
                disabled={saving}
                icon={saving ? <Lucide.Loader2 size={14} className="animate-spin" /> : <Lucide.Save size={14} />}
              >
                {saving ? 'Saving…' : 'Save Rule'}
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
