import { useState } from 'react';
import * as Lucide from 'lucide-react';
import { Button } from '../../../../shared/components/ui/primitives';
import { Badge, TableContainer } from '../../../../shared/components/ui/display';
import { PageTabs } from '../../../../shared/components/ui/PageTabs';
import type { RatePlan } from './types';

interface Props {
  plans: RatePlan[];
  connectedChannelIds: string[];
  onEdit: (plan: RatePlan) => void;
  onToggleStatus: (plan: RatePlan) => void;
}

type PlanTab = 'active' | 'inactive';

function MappingStatus({ plan, connectedChannelIds }: { plan: RatePlan; connectedChannelIds: string[] }) {
  const mapped = plan.channels.filter((id) => connectedChannelIds.includes(id)).length;
  const total = plan.channels.length;
  if (!mapped) return <Badge tone="neutral" dot>Not mapped</Badge>;
  if (mapped < total) return <Badge tone="warning" dot>Partially mapped · {mapped}/{total}</Badge>;
  return <Badge tone="success" dot>Mapped · {mapped} channels</Badge>;
}

export function BarPlansPanel({ plans, connectedChannelIds, onEdit, onToggleStatus }: Props) {
  const [tab, setTab] = useState<PlanTab>('active');
  // Scheduled plans are not selling yet, so they are listed with the inactive ones.
  const active = plans.filter((plan) => plan.status === 'Active');
  const inactive = plans.filter((plan) => plan.status !== 'Active');
  const visible = tab === 'active' ? active : inactive;

  return (
    <div className="flex min-w-0 flex-col gap-3">
      <PageTabs
        label="Plan status"
        idPrefix="bar-plans"
        panelId="bar-plans-panel"
        active={tab}
        onChange={setTab}
        tabs={[
          { id: 'active', label: 'Active Plans', badge: active.length },
          { id: 'inactive', label: 'Inactive Plans', badge: inactive.length },
        ]}
      />
      <div id="bar-plans-panel" role="tabpanel" aria-labelledby={`bar-plans-tab-${tab}`} className="min-w-0">
        <TableContainer>
          <table className="pms-table min-w-[620px]">
            <thead>
              <tr><th className="w-[80px]">Color</th><th>Name</th><th>Mapping Status</th><th className="text-right">Action</th></tr>
            </thead>
            <tbody>
              {visible.map((plan) => (
                <tr key={plan.id}>
                  <td><span role="img" aria-label={`Colour ${plan.color}`} className="block h-4 w-4 rounded-full" style={{ background: plan.color }} /></td>
                  <td className="font-semibold text-ink">{plan.name}</td>
                  <td><MappingStatus plan={plan} connectedChannelIds={connectedChannelIds} /></td>
                  <td>
                    <div className="flex justify-end gap-1.5">
                      <Button variant="secondary" type="button" onClick={() => onEdit(plan)} aria-label={`Edit ${plan.name}`}>
                        <Lucide.Pencil size={13} /> Edit
                      </Button>
                      <Button variant="secondary" type="button" onClick={() => onToggleStatus(plan)} className="whitespace-nowrap">
                        {plan.status === 'Active' ? <Lucide.Pause size={13} /> : <Lucide.Play size={13} />}
                        {plan.status === 'Active' ? 'Mark as Inactive' : 'Mark as Active'}
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
              {visible.length === 0 && (
                <tr><td colSpan={4} className="py-10 text-center text-label text-ink-muted">No {tab} plans.</td></tr>
              )}
            </tbody>
          </table>
        </TableContainer>
      </div>
    </div>
  );
}
