import { useState } from 'react';
import * as Lucide from 'lucide-react';
import { toast } from '../../../utils/toast';
import { Button, Checkbox, IconButton, SelectField, TextField } from '../../../components/primitives';
import { Field } from '../../../components/controls';
import { Modal } from '../../../components/overlays';
import { Badge, Card, CardTitle, TableContainer } from '../../../components/ui';
import type { MaintenancePriority, MaintenanceReasonItem } from './types';
import { StatStrip, StatTile } from './RoomSettingsKit';

interface MaintenanceReasonsSectionProps {
  reasons: MaintenanceReasonItem[];
  onChange: (items: MaintenanceReasonItem[]) => void;
}

const EMPTY_REASON: MaintenanceReasonItem = {
  id: '',
  code: '',
  name: '',
  category: 'General',
  priority: 'Medium',
  impact: 'Out of Service',
  avgResolutionHours: 4,
  activeRoomsCount: 0,
  requiresSupervisorSignoff: false,
  active: true,
};

function priorityTone(p: MaintenancePriority): 'danger' | 'warning' | 'info' | 'neutral' {
  if (p === 'Urgent') return 'danger';
  if (p === 'High') return 'warning';
  if (p === 'Medium') return 'info';
  return 'neutral';
}

export function MaintenanceReasonsSection({
  reasons,
  onChange,
}: MaintenanceReasonsSectionProps) {
  const [search, setSearch] = useState('');
  const [editing, setEditing] = useState<MaintenanceReasonItem | null>(null);

  const filtered = reasons.filter(
    (r) =>
      r.name.toLowerCase().includes(search.toLowerCase()) ||
      r.category.toLowerCase().includes(search.toLowerCase()),
  );

  const oooCount = reasons.filter((r) => r.impact === 'Out of Order').length;
  const oosCount = reasons.filter((r) => r.impact === 'Out of Service').length;
  const urgentCount = reasons.filter((r) => r.priority === 'Urgent' || r.priority === 'High').length;
  const blockedRoomsCount = reasons.reduce((s, r) => s + r.activeRoomsCount, 0);

  const handleToggle = (id: string) => {
    const updated = reasons.map((r) => (r.id === id ? { ...r, active: !r.active } : r));
    onChange(updated);
    toast('Maintenance reason status updated', { tone: 'success' });
  };

  const handleOpenAdd = () => {
    setEditing({
      ...EMPTY_REASON,
      id: `mr-${Date.now().toString(36)}`,
    });
  };

  const handleSave = () => {
    if (!editing) return;
    if (editing.name.trim().length < 2) {
      return toast('Name required', { detail: 'Please specify reason description.', tone: 'warning' });
    }

    const exists = reasons.some((r) => r.id === editing.id);
    let updated: MaintenanceReasonItem[];
    if (exists) {
      updated = reasons.map((r) => (r.id === editing.id ? editing : r));
      toast('Reason updated', { detail: `${editing.name} specifications updated.`, tone: 'success' });
    } else {
      updated = [...reasons, editing];
      toast('Maintenance reason created', { detail: `${editing.name} added to catalog.`, tone: 'success' });
    }
    onChange(updated);
    setEditing(null);
  };

  const handleDelete = (id: string, name: string) => {
    const updated = reasons.filter((r) => r.id !== id);
    onChange(updated);
    toast('Reason removed', { detail: `${name} deleted from catalog.`, tone: 'info' });
  };

  return (
    <div className="flex flex-col gap-5">
      <StatStrip>
        <StatTile
          label="Reasons Catalog"
          icon={Lucide.Wrench}
          tone="info"
          value={reasons.length}
          caption="Standardized codes"
        />

        <StatTile
          label="Hard Blocks (OOO)"
          icon={Lucide.Ban}
          tone="danger"
          value={oooCount}
          caption="Deducted from available inventory"
        />

        <StatTile
          label="Soft Blocks (OOS)"
          icon={Lucide.AlertCircle}
          tone="warning"
          value={oosCount}
          caption="Quick cosmetic maintenance"
        />

        <StatTile
          label="Currently Blocked"
          icon={Lucide.Lock}
          tone="primary"
          value={<>{blockedRoomsCount} Units</>}
          caption={<>{urgentCount} high priority categories</>}
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
              onClick={handleOpenAdd}
              icon={<Lucide.Plus size={14} />}
            >
              Add Reason Code
            </Button>
          }
        />

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
                    <span className="block font-bold text-ink text-label">{item.name}</span>
                  </td>
                  <td className="text-label font-medium text-ink-secondary py-3">
                    {item.category}
                  </td>
                  <td className="text-center py-3">
                    <Badge tone={priorityTone(item.priority)} size="sm">
                      {item.priority}
                    </Badge>
                  </td>
                  <td className="text-center py-3">
                    <Badge tone={item.active ? 'success' : 'neutral'} dot size="sm">
                      {item.active ? 'Active' : 'Disabled'}
                    </Badge>
                  </td>
                  <td className="text-right py-3">
                    <div className="inline-flex items-center gap-1.5">
                      <IconButton
                        title={item.active ? 'Disable reason code' : 'Enable reason code'}
                        onClick={() => handleToggle(item.id)}
                        className={item.active ? 'hover:text-warning-text' : 'hover:text-success-text'}
                      >
                        {item.active ? <Lucide.PauseCircle size={15} /> : <Lucide.PlayCircle size={15} />}
                      </IconButton>
                      <IconButton
                        title={`Edit ${item.name}`}
                        onClick={() => setEditing(item)}
                      >
                        <Lucide.Pencil size={14} />
                      </IconButton>
                      <IconButton
                        title={`Delete ${item.name}`}
                        onClick={() => handleDelete(item.id, item.name)}
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
                    No maintenance reasons match your search.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </TableContainer>
      </Card>

      {/* Edit / Add Modal */}
      <Modal
        open={editing !== null}
        onClose={() => setEditing(null)}
        title={editing?.id.startsWith('mr-') && !reasons.some((r) => r.id === editing?.id) ? 'Add Maintenance Reason' : `Edit ${editing?.name}`}
        subtitle="Configure maintenance reason code, physical inventory impact, and resolution timeline"
        wide
      >
        {editing && (
          <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2 py-2">
            <Field label="Reason Name / Description">
              <TextField
                value={editing.name}
                onChange={(e) => setEditing({ ...editing, name: e.target.value })}
                placeholder="e.g. Broken Shower Thermostatic Valve"
                autoFocus
              />
            </Field>

            <Field label="Trade / Department Category">
              <SelectField
                value={editing.category}
                onChange={(e) =>
                  setEditing({
                    ...editing,
                    category: e.target.value as MaintenanceReasonItem['category'],
                  })
                }
              >
                <option value="Plumbing">Plumbing & Pipes</option>
                <option value="Electrical">Electrical & Lighting</option>
                <option value="HVAC">HVAC & Climate Control</option>
                <option value="Renovation">Renovation & Painting</option>
                <option value="Housekeeping">Housekeeping & Deep Extraction</option>
                <option value="Security">Security & Locks</option>
                <option value="General">General Maintenance</option>
              </SelectField>
            </Field>

            <Field label="Default Severity Priority">
              <SelectField
                value={editing.priority}
                onChange={(e) =>
                  setEditing({
                    ...editing,
                    priority: e.target.value as MaintenancePriority,
                  })
                }
              >
                <option value="Urgent">Urgent (Immediate attention)</option>
                <option value="High">High (Same-day resolution)</option>
                <option value="Medium">Medium (Routine turnover)</option>
                <option value="Low">Low (Scheduled during low occupancy)</option>
              </SelectField>
            </Field>

            <div className="sm:col-span-2 pt-2">
              <Checkbox
                checked={editing.requiresSupervisorSignoff}
                onChange={(e) => setEditing({ ...editing, requiresSupervisorSignoff: e.target.checked })}
                label="Require Maintenance Supervisor electronic sign-off before returning room to service"
              />
            </div>

            <div className="flex justify-end gap-2 sm:col-span-2 pt-3 border-t border-divider">
              <Button variant="secondary" onClick={() => setEditing(null)}>
                Cancel
              </Button>
              <Button
                variant="primary"
                onClick={handleSave}
                icon={<Lucide.Save size={14} />}
              >
                Save Reason
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
