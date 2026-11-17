import type { ReactNode } from 'react';
import * as Lucide from 'lucide-react';
import type { HkStatus, HousekeepingTask, MaintenanceRequest, Room, RoomStatus } from '../../types';
import { Avatar, Badge } from '../../components/ui';
import { roomTone } from '../../utils/status';
import type { BadgeTone } from '../../utils/status';
import { Button } from '../../components/primitives';
import { formatCurrency } from '../../utils/currency';

function hkTone(hk: HkStatus): BadgeTone {
  if (hk === 'Clean' || hk === 'Inspected') return 'success';
  if (hk === 'Cleaning') return 'info';
  return 'warning';
}

const taskTone = (status: HousekeepingTask['status']): BadgeTone =>
  status === 'Done' ? 'success' : status === 'In progress' ? 'info' : 'warning';

const ticketTone = (status: MaintenanceRequest['status']): BadgeTone =>
  status === 'Resolved' ? 'success' : status === 'In progress' ? 'info' : 'warning';

/** A titled block of the drawer; `count` shows how many entries it holds. */
function Section({
  icon: Icon,
  title,
  count,
  children,
}: {
  icon: Lucide.LucideIcon;
  title: string;
  count?: number;
  children: ReactNode;
}) {
  return (
    <section className="flex flex-col gap-2.5">
      <h3 className="flex items-center gap-2 text-label font-bold uppercase tracking-wider text-ink-secondary">
        <Icon size={14} aria-hidden="true" />
        {title}
        {count !== undefined ? (
          <span className="tnum rounded-full bg-muted-surface px-1.5 text-micro font-bold text-ink-secondary">{count}</span>
        ) : null}
      </h3>
      {children}
    </section>
  );
}

function Fact({ icon: Icon, label, value }: { icon: Lucide.LucideIcon; label: string; value: string }) {
  return (
    <div className="flex min-w-0 items-center gap-2.5 rounded-xl border border-border bg-surface p-3">
      <span className="flex h-8 w-8 flex-none items-center justify-center rounded-lg bg-muted-surface text-ink-secondary">
        <Icon size={15} aria-hidden="true" />
      </span>
      <span className="min-w-0">
        <span className="block text-micro font-semibold uppercase tracking-wide text-ink-muted">{label}</span>
        <span className="block truncate text-body font-semibold text-ink">{value}</span>
      </span>
    </div>
  );
}

function EmptyLine({ children }: { children: ReactNode }) {
  return (
    <p className="rounded-xl border border-dashed border-border px-3 py-3 text-center text-label text-ink-secondary">{children}</p>
  );
}

export function RoomDetail({
  room,
  hkHistory,
  mxHistory,
  currencyCode,
}: {
  room: Room;
  hkHistory: HousekeepingTask[];
  mxHistory: MaintenanceRequest[];
  currencyCode: string;
}) {
  const tone = roomTone(room.status);
  const outOfService = room.status === 'Out-of-service';

  return (
    <div className="flex flex-col gap-6">
      {/* Where the room stands right now, tinted by its status */}
      <div
        className="flex flex-wrap items-center justify-between gap-x-4 gap-y-3 rounded-2xl border p-4"
        style={{ background: `var(--color-${tone}-bg)`, borderColor: `var(--color-${tone}-border)` }}
      >
        <div className="min-w-0">
          <p className="text-micro font-bold uppercase tracking-wider" style={{ color: `var(--color-${tone}-text)` }}>
            {room.type} · Floor {room.floor}
          </p>
          <p className="tnum mt-1 text-disp3 font-bold leading-none text-ink">{room.number}</p>
        </div>
        <div className="flex flex-col items-end gap-1.5">
          <p className="tnum text-title font-bold leading-none text-ink">
            {formatCurrency(room.rate, currencyCode)}
            <span className="text-label font-medium text-ink-secondary"> /night</span>
          </p>
          <span className="flex flex-wrap justify-end gap-1.5">
            <Badge tone={tone}>{room.status}</Badge>
            <Badge tone={hkTone(room.hk)}>HK: {room.hk}</Badge>
          </span>
        </div>
      </div>

      {/* Stay, or why the room is not available */}
      {room.guest ? (
        <Section icon={Lucide.User} title="Current stay">
          <div className="flex items-center gap-3 rounded-xl border border-border bg-surface p-3.5">
            <Avatar name={room.guest} size={40} />
            <div className="min-w-0 flex-1">
              <p className="truncate text-body font-bold text-ink">{room.guest}</p>
              <p className="tnum mt-0.5 flex items-center gap-1.5 text-label text-ink-secondary">
                <Lucide.CalendarDays size={13} aria-hidden="true" />
                {room.checkIn} → {room.checkOut}
              </p>
            </div>
          </div>
        </Section>
      ) : outOfService ? (
        <Section icon={Lucide.Ban} title="Out of service">
          <div className="rounded-xl border border-danger-border bg-danger-bg p-3.5 text-body font-medium text-danger-text">
            {room.oosReason || 'Maintenance in progress'}
          </div>
        </Section>
      ) : (
        <Section icon={Lucide.Sparkles} title="Availability">
          <EmptyLine>No guest in this room right now.</EmptyLine>
        </Section>
      )}

      <Section icon={Lucide.Info} title="Room details">
        <div className="grid grid-cols-1 gap-2 xs:grid-cols-2">
          <Fact icon={Lucide.Tag} label="Room type" value={room.type} />
          <Fact icon={Lucide.Layers} label="Floor" value={String(room.floor)} />
          <Fact icon={Lucide.Users} label="Max occupancy" value={`${room.maxOccupancy ?? 2} guests`} />
          <Fact icon={Lucide.BedDouble} label="Bed setup" value={room.bedType ?? 'King bed'} />
        </div>
      </Section>

      <Section icon={Lucide.SprayCan} title="Housekeeping" count={hkHistory.length}>
        {hkHistory.length === 0 ? (
          <EmptyLine>No recent housekeeping tasks.</EmptyLine>
        ) : (
          <ul className="flex flex-col gap-2">
            {hkHistory.slice(0, 3).map((hk) => (
              <li key={hk.id} className="rounded-xl border border-border bg-surface p-3">
                <div className="flex items-start justify-between gap-2">
                  <span className="min-w-0 text-body font-semibold text-ink">{hk.task}</span>
                  <Badge tone={taskTone(hk.status)} size="sm">{hk.status}</Badge>
                </div>
                <p className="mt-1 text-label text-ink-secondary">
                  {hk.assignee} · {hk.priority} priority · {hk.updated}
                </p>
              </li>
            ))}
          </ul>
        )}
      </Section>

      <Section icon={Lucide.Wrench} title="Maintenance" count={mxHistory.length}>
        {mxHistory.length === 0 ? (
          <EmptyLine>No recent maintenance orders.</EmptyLine>
        ) : (
          <ul className="flex flex-col gap-2">
            {mxHistory.slice(0, 3).map((mx) => (
              <li key={mx.id} className="rounded-xl border border-border bg-surface p-3">
                <div className="flex items-start justify-between gap-2">
                  <span className="min-w-0 text-body font-semibold text-ink">{mx.description}</span>
                  <Badge tone={ticketTone(mx.status)} size="sm">{mx.status}</Badge>
                </div>
                <p className="mt-1 text-label text-ink-secondary">
                  {mx.category} · {mx.priority} priority · Due {mx.due}
                </p>
              </li>
            ))}
          </ul>
        )}
      </Section>
    </div>
  );
}

/** The drawer's pinned footer: the one status change that makes sense for this room. */
export function RoomDrawerActions({
  room,
  onClose,
  onStatus,
}: {
  room: Room;
  onClose: () => void;
  onStatus: (room: Room, status: RoomStatus) => void;
}) {
  return (
    <>
      <Button variant="secondary" onClick={onClose}>
        Close
      </Button>
      {room.status === 'Out-of-service' ? (
        <Button variant="primary" icon={<Lucide.CheckCircle2 size={16} />} onClick={() => onStatus(room, 'Available')}>
          Return to service
        </Button>
      ) : (
        <Button variant="danger" icon={<Lucide.AlertOctagon size={16} />} onClick={() => onStatus(room, 'Out-of-service')}>
          Take out of service
        </Button>
      )}
    </>
  );
}
