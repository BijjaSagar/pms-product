import * as Lucide from 'lucide-react';
import { TableContainer } from '../../../components/ui';
import { SectionCard } from './SectionCard';

/*
 * The states a room can be in. The backend derives them from occupancy, housekeeping and operational
 * status, so they are listed here rather than edited: renaming one would not change what the backend does.
 */
const ROOM_STATES = [
  { label: 'Vacant', tone: 'bg-success-text', meaning: 'No guest in the room. Sellable once it is clean.', setBy: 'Check-out' },
  { label: 'Occupied', tone: 'bg-info-text', meaning: 'A guest is in the room.', setBy: 'Check-in' },
  { label: 'Dirty', tone: 'bg-warning-text', meaning: 'Needs cleaning before it can be sold.', setBy: 'Check-out, or a housekeeping task' },
  { label: 'Clean', tone: 'bg-success-text', meaning: 'Cleaned, and waiting for inspection or the next arrival.', setBy: 'Housekeeping' },
  { label: 'Inspected', tone: 'bg-info-text', meaning: 'Cleaned and passed inspection.', setBy: 'Housekeeping inspection' },
  { label: 'Out of order', tone: 'bg-danger-text', meaning: 'Blocked from sale until it is back in service.', setBy: 'Out-of-order action, with a reason' },
];

export function RoomStatusCard() {
  return (
    <SectionCard
      icon={Lucide.ShieldCheck}
      title="Room Status"
      description="The states a room moves through, and what changes each one"
    >
      <TableContainer>
        <table className="pms-table min-w-[640px] w-full text-left">
          <thead>
            <tr>
              <th>STATUS</th>
              <th>MEANING</th>
              <th>SET BY</th>
            </tr>
          </thead>
          <tbody>
            {ROOM_STATES.map((state) => (
              <tr key={state.label} className="border-b border-divider last:border-b-0">
                <td className="py-3">
                  <span className="inline-flex items-center gap-2 font-bold text-ink text-label">
                    <span className={`h-2 w-2 rounded-full ${state.tone}`} />
                    {state.label}
                  </span>
                </td>
                <td className="py-3 text-label text-ink-secondary">{state.meaning}</td>
                <td className="py-3 text-label text-ink-secondary">{state.setBy}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </TableContainer>
      <p className="mt-3 text-label text-ink-muted">
        Out of order overrides every other state, so a blocked room is never offered for sale.
      </p>
    </SectionCard>
  );
}
