import { useState } from 'react';
import * as Lucide from 'lucide-react';
import { toast } from '../../../utils/toast';
import { Button, Checkbox, IconButton, SelectField, TextArea, TextField } from '../../../components/primitives';
import { Field } from '../../../components/controls';
import { Modal } from '../../../components/overlays';
import { Badge, Card, CardTitle, TableContainer } from '../../../components/ui';
import type { RoomStatusDefinition } from './types';
import { StatStrip, StatTile } from './RoomSettingsKit';

interface StatusConfigSectionProps {
  statuses: RoomStatusDefinition[];
  onChange: (items: RoomStatusDefinition[]) => void;
}

export function StatusConfigSection({ statuses, onChange }: StatusConfigSectionProps) {
  const [editing, setEditing] = useState<RoomStatusDefinition | null>(null);

  // Automation triggers state
  const [autoDirtyOnCheckout, setAutoDirtyOnCheckout] = useState(true);
  const [requireInspectionVIP, setRequireInspectionVIP] = useState(true);
  const [alertUncleanedAfter24h, setAlertUncleanedAfter24h] = useState(true);
  const [notifyFrontDeskReady, setNotifyFrontDeskReady] = useState(true);
  const [dndEscalation, setDndEscalation] = useState(true);
  const [isSavingRules, setIsSavingRules] = useState(false);

  const handleToggle = (id: string) => {
    const updated = statuses.map((s) => (s.id === id ? { ...s, active: !s.active } : s));
    onChange(updated);
    toast('Status workflow toggled', { tone: 'success' });
  };

  const handleSaveStatus = () => {
    if (!editing) return;
    const updated = statuses.map((s) => (s.id === editing.id ? editing : s));
    onChange(updated);
    toast('Status configuration saved', { detail: `${editing.name} workflow rules updated.`, tone: 'success' });
    setEditing(null);
  };

  const handleSaveAutomations = () => {
    setIsSavingRules(true);
    setTimeout(() => {
      setIsSavingRules(false);
      toast('Operational status automations saved', {
        detail: 'Checkout triggers, VIP inspection gates, and housekeeping notifications updated.',
        tone: 'success',
      });
    }, 250);
  };

  const sellableCount = statuses.filter((s) => s.isSellable).length;
  const hkRequiredCount = statuses.filter((s) => s.requiresHousekeeping).length;

  return (
    <div className="flex flex-col gap-5">
      <StatStrip>
        <StatTile
          label="Core Statuses"
          icon={Lucide.Activity}
          tone="info"
          value={statuses.length}
          caption="Front desk & HK states"
        />

        <StatTile
          label="Sellable States"
          icon={Lucide.CheckCircle2}
          tone="success"
          value={sellableCount}
          caption="Vacant Clean & Inspected"
        />

        <StatTile
          label="Housekeeping Queued"
          icon={Lucide.Sparkles}
          tone="warning"
          value={hkRequiredCount}
          caption="Triggers cleaning task"
        />

        <StatTile
          label="Automations"
          icon={Lucide.Zap}
          tone="primary"
          valueTone="success"
          value="5 Active"
          caption="Workflow auto-transitions"
        />
      </StatStrip>

      {/* Main Table Card */}
      <Card>
        <CardTitle
          title="Room Status Lifecycle & State Definitions"
          subtitle="Vacant Clean, Vacant Dirty, Occupied Clean, Occupied Dirty, Inspected, and Out of Order"
          icon={Lucide.Activity}
        />

        <TableContainer>
          <table className="pms-table min-w-[760px] w-full text-left">
            <thead>
              <tr>
                <th className="w-12 text-center">SHORT</th>
                <th>STATUS NAME</th>
                <th>SYSTEM CODE</th>
                <th>DESCRIPTION</th>
                <th className="text-center">SELLABLE</th>
                <th className="text-center">QUEUES HK</th>
                <th className="text-center">NEEDS INSPECTION</th>
                <th className="text-center">STATE</th>
                <th className="text-right">ACTIONS</th>
              </tr>
            </thead>
            <tbody>
              {statuses.map((s) => (
                <tr key={s.id} className="transition-colors hover:bg-hover-surface/60 border-b border-divider last:border-b-0">
                  <td className="text-center py-3">
                    <span className="font-mono text-micro font-black px-2 py-1 rounded bg-muted-surface text-ink border border-border">
                      {s.shortCode}
                    </span>
                  </td>
                  <td className="py-3">
                    <div className="flex items-center gap-2">
                      <Badge tone={s.tone} dot size="sm">
                        {s.name}
                      </Badge>
                    </div>
                  </td>
                  <td className="text-label font-mono text-ink-muted py-3">
                    {s.code}
                  </td>
                  <td className="text-label text-ink-secondary py-3 max-w-[260px]">
                    <span className="line-clamp-2">{s.description}</span>
                  </td>
                  <td className="text-center py-3">
                    {s.isSellable ? (
                      <span className="text-micro font-bold text-success-text bg-success-bg border border-success-border px-2 py-0.5 rounded-full inline-flex items-center gap-1">
                        <Lucide.Check size={11} /> Yes
                      </span>
                    ) : (
                      <span className="text-micro text-ink-muted">No</span>
                    )}
                  </td>
                  <td className="text-center py-3">
                    {s.requiresHousekeeping ? (
                      <span className="text-micro font-bold text-warning-text bg-warning-bg border border-warning-border px-2 py-0.5 rounded-full inline-flex items-center gap-1">
                        <Lucide.Sparkles size={11} /> Yes
                      </span>
                    ) : (
                      <span className="text-micro text-ink-muted">—</span>
                    )}
                  </td>
                  <td className="text-center py-3">
                    {s.requiresInspection ? (
                      <span className="text-micro font-bold text-info-text bg-info-bg border border-info-border px-2 py-0.5 rounded-full inline-flex items-center gap-1">
                        <Lucide.ShieldCheck size={11} /> Required
                      </span>
                    ) : (
                      <span className="text-micro text-ink-muted">No</span>
                    )}
                  </td>
                  <td className="text-center py-3">
                    <Badge tone={s.active ? 'success' : 'neutral'} dot size="sm">
                      {s.active ? 'Active' : 'Disabled'}
                    </Badge>
                  </td>
                  <td className="text-right py-3">
                    <div className="inline-flex items-center gap-1.5">
                      <IconButton
                        title={s.active ? 'Disable status' : 'Enable status'}
                        onClick={() => handleToggle(s.id)}
                        className={s.active ? 'hover:text-warning-text' : 'hover:text-success-text'}
                      >
                        {s.active ? <Lucide.PauseCircle size={15} /> : <Lucide.PlayCircle size={15} />}
                      </IconButton>
                      <IconButton
                        title={`Edit ${s.name} properties`}
                        onClick={() => setEditing(s)}
                      >
                        <Lucide.Pencil size={14} />
                      </IconButton>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </TableContainer>
      </Card>

      <Card>
        <CardTitle
          title="Automated Status Transitions & Safety Triggers"
          subtitle="Configure automatic housekeeping assignment, inspection requirements, and front desk notifications"
          icon={Lucide.SlidersHorizontal}
          action={
            <Button
              variant="primary"
              onClick={handleSaveAutomations}
              disabled={isSavingRules}
              icon={isSavingRules ? <Lucide.Loader2 size={14} className="animate-spin" /> : <Lucide.Save size={14} />}
            >
              Save Automations
            </Button>
          }
        />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="rounded-xl border border-border p-4 bg-muted-surface/40 flex items-start gap-3">
            <Checkbox
              checked={autoDirtyOnCheckout}
              onChange={(e) => setAutoDirtyOnCheckout(e.target.checked)}
              className="mt-0.5"
            />
            <div>
              <h4 className="text-body font-bold text-ink">Auto-Mark Dirty Upon Check-Out</h4>
              <p className="text-label text-ink-secondary mt-0.5">
                Automatically transition room to <span className="font-semibold text-warning-text">Vacant Dirty</span> and add departure cleaning task to housekeeping schedule as soon as front desk completes guest departure.
              </p>
            </div>
          </div>

          <div className="rounded-xl border border-border p-4 bg-muted-surface/40 flex items-start gap-3">
            <Checkbox
              checked={requireInspectionVIP}
              onChange={(e) => setRequireInspectionVIP(e.target.checked)}
              className="mt-0.5"
            />
            <div>
              <h4 className="text-body font-bold text-ink">Mandatory Supervisor Inspection for Suites</h4>
              <p className="text-label text-ink-secondary mt-0.5">
                Prevent front desk agents from assigning executive suites and penthouses until a Housekeeping Supervisor electronically marks the room as <span className="font-semibold text-success-text">Inspected</span>.
              </p>
            </div>
          </div>

          <div className="rounded-xl border border-border p-4 bg-muted-surface/40 flex items-start gap-3">
            <Checkbox
              checked={alertUncleanedAfter24h}
              onChange={(e) => setAlertUncleanedAfter24h(e.target.checked)}
              className="mt-0.5"
            />
            <div>
              <h4 className="text-body font-bold text-ink">Elevate Priority for Stale Dirty Rooms</h4>
              <p className="text-label text-ink-secondary mt-0.5">
                Automatically bump cleaning task priority from Medium to <span className="font-semibold text-danger-text">Urgent</span> if a room remains in Vacant Dirty status for more than 12 hours.
              </p>
            </div>
          </div>

          <div className="rounded-xl border border-border p-4 bg-muted-surface/40 flex items-start gap-3">
            <Checkbox
              checked={notifyFrontDeskReady}
              onChange={(e) => setNotifyFrontDeskReady(e.target.checked)}
              className="mt-0.5"
            />
            <div>
              <h4 className="text-body font-bold text-ink">Real-Time Ready Notification to Front Desk</h4>
              <p className="text-label text-ink-secondary mt-0.5">
                Push an instant chime notice to Front Desk arrivals dashboard when an awaiting guest’s assigned room transitions to Clean/Inspected.
              </p>
            </div>
          </div>

          <div className="rounded-xl border border-border p-4 bg-muted-surface/40 flex items-start gap-3 md:col-span-2">
            <Checkbox
              checked={dndEscalation}
              onChange={(e) => setDndEscalation(e.target.checked)}
              className="mt-0.5"
            />
            <div>
              <h4 className="text-body font-bold text-ink">Do Not Disturb (DND) 24-Hour Welfare Escalation</h4>
              <p className="text-label text-ink-secondary mt-0.5">
                Trigger a guest welfare notification to Duty Manager and Security when a room maintains Do Not Disturb indicator for 24 continuous hours.
              </p>
            </div>
          </div>
        </div>
      </Card>

      <Modal
        open={editing !== null}
        onClose={() => setEditing(null)}
        title={`Edit Status: ${editing?.name}`}
        subtitle="Manage status indicators, sellability permissions, and inspection gates"
      >
        {editing && (
          <div className="flex flex-col gap-3.5 py-2">
            <Field label="Status Display Name">
              <TextField
                value={editing.name}
                onChange={(e) => setEditing({ ...editing, name: e.target.value })}
                autoFocus
              />
            </Field>

            <Field label="Short Abbreviation Code">
              <TextField
                value={editing.shortCode}
                onChange={(e) => setEditing({ ...editing, shortCode: e.target.value.toUpperCase() })}
                className="font-mono"
              />
            </Field>

            <Field label="Visual Tone Indicator">
              <SelectField
                value={editing.tone}
                onChange={(e) =>
                  setEditing({
                    ...editing,
                    tone: e.target.value as RoomStatusDefinition['tone'],
                  })
                }
              >
                <option value="success">Success (Green / Available)</option>
                <option value="info">Info (Blue / Occupied Clean)</option>
                <option value="warning">Warning (Amber / Dirty)</option>
                <option value="danger">Danger (Red / Out of Order)</option>
                <option value="neutral">Neutral (Gray)</option>
              </SelectField>
            </Field>

            <Field label="Description">
              <TextArea
                rows={2}
                value={editing.description}
                onChange={(e) => setEditing({ ...editing, description: e.target.value })}
              />
            </Field>

            <div className="flex flex-col gap-2 pt-2 border-t border-divider">
              <Checkbox
                checked={editing.isSellable}
                onChange={(e) => setEditing({ ...editing, isSellable: e.target.checked })}
                label="Sellable (Can be allocated to arriving reservations)"
              />
              <Checkbox
                checked={editing.requiresHousekeeping}
                onChange={(e) => setEditing({ ...editing, requiresHousekeeping: e.target.checked })}
                label="Requires Housekeeping Turnover"
              />
              <Checkbox
                checked={editing.requiresInspection}
                onChange={(e) => setEditing({ ...editing, requiresInspection: e.target.checked })}
                label="Requires Supervisor Sign-Off / Inspection"
              />
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-divider">
              <Button variant="secondary" onClick={() => setEditing(null)}>
                Cancel
              </Button>
              <Button
                variant="primary"
                onClick={handleSaveStatus}
                icon={<Lucide.Save size={14} />}
              >
                Save Status
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}

