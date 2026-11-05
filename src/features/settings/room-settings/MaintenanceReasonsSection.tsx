import { useState } from 'react';
import * as Lucide from 'lucide-react';
import { maintenanceReasonApi } from '../../../lib/api/pms';
import type {
  MaintenanceReasonDetails,
  MaintenanceReasonPriority,
  MaintenanceReasonStatus,
  MaintenanceTradeCategory,
} from '../../../lib/api/pms';
import { displayApiError } from '../../../lib/api/client';
import { toast } from '../../../utils/toast';
import { Button, IconButton, SelectField, TextField } from '../../../components/primitives';
import { Field } from '../../../components/controls';
import { Modal } from '../../../components/overlays';
import { Badge, Card, CardTitle, TableContainer } from '../../../components/ui';
import { StatStrip, StatTile } from './RoomSettingsKit';

interface MaintenanceReasonsSectionProps {
  /** The property whose reasons are managed; null until one is chosen. */
  propertyId: string | null;
  reasons: MaintenanceReasonDetails[];
  loading: boolean;
  error: string | null;
  onRefresh: () => void;
}

/** What the edit dialog works on. `id` is null while a new reason is being added. */
interface ReasonForm {
  id: string | null;
  reasonName: string;
  tradeCategory: MaintenanceTradeCategory;
  priority: MaintenanceReasonPriority;
  status: MaintenanceReasonStatus;
}

const EMPTY_FORM: ReasonForm = {
  id: null,
  reasonName: '',
  tradeCategory: 'GENERAL',
  priority: 'MEDIUM',
  status: 'ACTIVE',
};

const formFromReason = (r: MaintenanceReasonDetails): ReasonForm => ({
  id: r.id,
  reasonName: r.reasonName,
  tradeCategory: r.tradeCategory,
  priority: r.priority,
  status: r.status,
});

const CATEGORY_LABELS: Record<MaintenanceTradeCategory, string> = {
  PLUMBING: 'Plumbing & Pipes',
  ELECTRICAL: 'Electrical & Lighting',
  HVAC: 'HVAC & Climate Control',
  RENOVATION: 'Renovation & Painting',
  HOUSEKEEPING: 'Housekeeping & Deep Extraction',
  SECURITY: 'Security & Locks',
  GENERAL: 'General Maintenance',
};

const PRIORITY_LABELS: Record<MaintenanceReasonPriority, string> = {
  URGENT: 'Urgent',
  HIGH: 'High',
  MEDIUM: 'Medium',
  LOW: 'Low',
};

function priorityTone(p: MaintenanceReasonPriority): 'danger' | 'warning' | 'info' | 'neutral' {
  if (p === 'URGENT') return 'danger';
  if (p === 'HIGH') return 'warning';
  if (p === 'MEDIUM') return 'info';
  return 'neutral';
}

export function MaintenanceReasonsSection({
  propertyId,
  reasons,
  loading,
  error,
  onRefresh,
}: MaintenanceReasonsSectionProps) {
  const [search, setSearch] = useState('');
  const [editing, setEditing] = useState<ReasonForm | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const query = search.trim().toLowerCase();
  const filtered = reasons.filter(
    (r) =>
      r.reasonName.toLowerCase().includes(query) ||
      CATEGORY_LABELS[r.tradeCategory].toLowerCase().includes(query),
  );

  const activeCount = reasons.filter((r) => r.status === 'ACTIVE').length;
  const urgentCount = reasons.filter((r) => r.priority === 'URGENT').length;
  const highCount = reasons.filter((r) => r.priority === 'HIGH').length;

  const handleToggle = async (r: MaintenanceReasonDetails) => {
    if (!propertyId) return;
    try {
      await maintenanceReasonApi.update(propertyId, r.id, {
        status: r.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE',
      });
      toast('Maintenance reason status updated', { tone: 'success' });
      onRefresh();
    } catch (err) {
      toast('Could not change status', { detail: displayApiError(err), tone: 'danger' });
    }
  };

  const handleSave = async () => {
    if (!editing || !propertyId) return;
    const reasonName = editing.reasonName.trim();
    if (reasonName.length < 1) {
      return toast('Name required', { detail: 'Please specify the reason name.', tone: 'warning' });
    }

    const body = {
      reasonName,
      tradeCategory: editing.tradeCategory,
      priority: editing.priority,
      status: editing.status,
    };

    setIsSaving(true);
    try {
      if (editing.id === null) {
        await maintenanceReasonApi.create(propertyId, body);
        toast('Maintenance reason created', { detail: `${reasonName} added to catalog.`, tone: 'success' });
      } else {
        await maintenanceReasonApi.update(propertyId, editing.id, body);
        toast('Reason updated', { detail: `${reasonName} updated successfully.`, tone: 'success' });
      }
      onRefresh();
      setEditing(null);
    } catch (err) {
      toast('Could not save reason', { detail: displayApiError(err), tone: 'danger' });
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (r: MaintenanceReasonDetails) => {
    if (!propertyId) return;
    try {
      await maintenanceReasonApi.remove(propertyId, r.id);
      toast('Reason removed', { detail: `${r.reasonName} deleted from catalog.`, tone: 'info' });
      onRefresh();
    } catch (err) {
      toast('Could not remove reason', { detail: displayApiError(err), tone: 'danger' });
    }
  };

  return (
    <div className="flex flex-col gap-5">
      <StatStrip>
        <StatTile
          label="Reasons Catalog"
          icon={Lucide.Wrench}
          tone="info"
          value={reasons.length}
          caption="Standardized reasons"
        />

        <StatTile
          label="Active"
          icon={Lucide.CheckCircle2}
          tone="success"
          value={activeCount}
          caption="Available when blocking a room"
        />

        <StatTile
          label="Disabled"
          icon={Lucide.PauseCircle}
          tone="warning"
          value={reasons.length - activeCount}
          caption="Hidden from selection"
        />

        <StatTile
          label="Urgent / High"
          icon={Lucide.AlertCircle}
          tone="danger"
          value={urgentCount + highCount}
          caption={<>{urgentCount} urgent, {highCount} high priority</>}
        />
      </StatStrip>

      <Card>
        <CardTitle
          title="Out of Order &amp; Maintenance Reasons"
          subtitle="Predefined issue categories for taking rooms out of inventory (HVAC, plumbing, renovations, electrical)"
          icon={Lucide.Wrench}
          action={
            <Button
              variant="primary"
              onClick={() => setEditing({ ...EMPTY_FORM })}
              disabled={!propertyId}
              icon={<Lucide.Plus size={14} />}
            >
              Add Reason
            </Button>
          }
        />

        {error && (
          <div className="mb-4 flex items-center gap-2 rounded-xl border border-danger-border bg-danger-bg p-3 text-label text-danger-text">
            <Lucide.AlertCircle size={16} />
            <span>Could not load maintenance reasons: {error}</span>
          </div>
        )}

        <div className="mb-4 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5">
          <div className="relative flex-1 max-w-sm">
            <Lucide.Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-muted" />
            <TextField
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by trade, issue description..."
              className="pl-8"
            />
          </div>
          <p className="text-label text-ink-secondary self-center">
            Showing <span className="font-semibold text-ink">{filtered.length}</span> of {reasons.length} reasons
          </p>
        </div>

        <TableContainer>
          <table className="pms-table min-w-[760px] w-full text-left">
            <thead>
              <tr>
                <th>REASON NAME</th>
                <th>TRADE CATEGORY</th>
                <th className="text-center">PRIORITY</th>
                <th className="text-center">STATUS</th>
                <th className="text-right">ACTIONS</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((item) => (
                <tr key={item.id} className="transition-colors hover:bg-hover-surface/60 border-b border-divider last:border-b-0">
                  <td className="py-3">
                    <span className="block font-bold text-ink text-label">{item.reasonName}</span>
                  </td>
                  <td className="text-label font-medium text-ink-secondary py-3">
                    {CATEGORY_LABELS[item.tradeCategory]}
                  </td>
                  <td className="text-center py-3">
                    <Badge tone={priorityTone(item.priority)} size="sm">
                      {PRIORITY_LABELS[item.priority]}
                    </Badge>
                  </td>
                  <td className="text-center py-3">
                    <Badge tone={item.status === 'ACTIVE' ? 'success' : 'neutral'} dot size="sm">
                      {item.status === 'ACTIVE' ? 'Active' : 'Disabled'}
                    </Badge>
                  </td>
                  <td className="text-right py-3">
                    <div className="inline-flex items-center gap-1.5">
                      <IconButton
                        title={item.status === 'ACTIVE' ? 'Disable reason' : 'Enable reason'}
                        onClick={() => void handleToggle(item)}
                        className={item.status === 'ACTIVE' ? 'hover:text-warning-text' : 'hover:text-success-text'}
                      >
                        {item.status === 'ACTIVE' ? <Lucide.PauseCircle size={15} /> : <Lucide.PlayCircle size={15} />}
                      </IconButton>
                      <IconButton title={`Edit ${item.reasonName}`} onClick={() => setEditing(formFromReason(item))}>
                        <Lucide.Pencil size={14} />
                      </IconButton>
                      <IconButton
                        title={`Delete ${item.reasonName}`}
                        onClick={() => void handleDelete(item)}
                        className="hover:text-danger-text"
                      >
                        <Lucide.Trash2 size={14} />
                      </IconButton>
                    </div>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-label text-ink-muted">
                    {loading
                      ? 'Loading maintenance reasons…'
                      : search
                        ? `No maintenance reasons found matching "${search}".`
                        : 'No maintenance reasons yet.'}
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
        title={editing?.id === null ? 'Add Maintenance Reason' : `Edit ${editing?.reasonName}`}
        subtitle="Configure the reason, its trade category, default priority and status"
        wide
      >
        {editing && (
          <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2 py-2">
            <Field label="Reason Name / Description">
              <TextField
                value={editing.reasonName}
                onChange={(e) => setEditing({ ...editing, reasonName: e.target.value })}
                placeholder="e.g. Broken Shower Thermostatic Valve"
                autoFocus
              />
            </Field>

            <Field label="Trade / Department Category">
              <SelectField
                value={editing.tradeCategory}
                onChange={(e) =>
                  setEditing({ ...editing, tradeCategory: e.target.value as MaintenanceTradeCategory })
                }
              >
                {(Object.keys(CATEGORY_LABELS) as MaintenanceTradeCategory[]).map((c) => (
                  <option key={c} value={c}>{CATEGORY_LABELS[c]}</option>
                ))}
              </SelectField>
            </Field>

            <Field label="Default Severity Priority">
              <SelectField
                value={editing.priority}
                onChange={(e) =>
                  setEditing({ ...editing, priority: e.target.value as MaintenanceReasonPriority })
                }
              >
                <option value="URGENT">Urgent (Immediate attention)</option>
                <option value="HIGH">High (Same-day resolution)</option>
                <option value="MEDIUM">Medium (Routine turnover)</option>
                <option value="LOW">Low (Scheduled during low occupancy)</option>
              </SelectField>
            </Field>

            <Field label="Status">
              <SelectField
                value={editing.status}
                onChange={(e) =>
                  setEditing({ ...editing, status: e.target.value as MaintenanceReasonStatus })
                }
              >
                <option value="ACTIVE">Active</option>
                <option value="INACTIVE">Inactive</option>
              </SelectField>
            </Field>

            <div className="flex justify-end gap-2 sm:col-span-2 pt-3 border-t border-divider">
              <Button variant="secondary" onClick={() => setEditing(null)} disabled={isSaving}>
                Cancel
              </Button>
              <Button
                variant="primary"
                onClick={() => void handleSave()}
                disabled={isSaving}
                icon={isSaving ? <Lucide.Loader2 size={14} className="animate-spin" /> : <Lucide.Save size={14} />}
              >
                {isSaving ? 'Saving…' : 'Save Reason'}
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
