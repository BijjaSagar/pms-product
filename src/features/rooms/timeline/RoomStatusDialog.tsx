import * as Lucide from 'lucide-react';
import { Modal } from '../../../components/overlays';
import { Badge } from '../../../components/ui';
import { Button } from '../../../components/primitives';
import type { TimelineEvent, TimelineStatus } from '../../../types';
import { EVENT_TONE, END_HOUR, START_HOUR, formatClock } from './timelineMath';

export interface TimelineRoomView {
  number: string;
  typeName: string;
  floor: number;
  /* The event that sets the room's status right now. */
  current: TimelineEvent | undefined;
}

/* Statuses a manager can set by hand. Maintenance is shown to staff as "Out of service". */
const STATUS_OPTIONS: { status: TimelineStatus; label: string; Icon: Lucide.LucideIcon }[] = [
  { status: 'Available', label: 'Available', Icon: Lucide.CheckCircle2 },
  { status: 'Occupied', label: 'Occupied', Icon: Lucide.Luggage },
  { status: 'Cleaning', label: 'Cleaning', Icon: Lucide.Sparkles },
  { status: 'Dirty', label: 'Dirty', Icon: Lucide.AlertCircle },
  { status: 'Inspected', label: 'Inspected', Icon: Lucide.ShieldCheck },
  { status: 'Maintenance', label: 'Out of service', Icon: Lucide.Wrench },
];

export function RoomStatusDialog({
  room,
  onClose,
  onSetStatus,
}: {
  room: TimelineRoomView | null;
  onClose: () => void;
  onSetStatus: (roomNumber: string, status: TimelineStatus) => void;
}) {
  const current = room?.current;
  const currentStatus = current?.status ?? 'Available';

  return (
    <Modal
      open={room !== null}
      onClose={onClose}
      title={room ? `Room ${room.number}` : ''}
      subtitle={room ? `${room.typeName} · Floor ${room.floor}` : undefined}
      footer={
        room ? (
          <>
            <Button variant="secondary" type="button" onClick={onClose}>
              Close
            </Button>
            <Button
              variant="primary"
              type="button"
              onClick={() => {
                onSetStatus(room.number, 'Inspected');
                onClose();
              }}
            >
              Mark inspected and ready
            </Button>
          </>
        ) : null
      }
    >
      {room ? (
        <div className="flex flex-col gap-5">
          <dl className="grid grid-cols-1 gap-x-4 gap-y-2 text-label sm:grid-cols-2">
            <div className="flex items-center justify-between gap-2 sm:col-span-2">
              <dt className="text-ink-secondary">Current status</dt>
              <dd>
                <Badge tone={EVENT_TONE[currentStatus]}>{current?.label ?? 'Available'}</Badge>
              </dd>
            </div>
            {current?.guestName ? (
              <div className="flex items-center justify-between gap-2">
                <dt className="text-ink-secondary">Guest</dt>
                <dd className="font-semibold text-ink">{current.guestName}</dd>
              </div>
            ) : null}
            {current?.subLabel ? (
              <div className="flex items-center justify-between gap-2">
                <dt className="text-ink-secondary">Movement</dt>
                <dd className="font-medium text-ink">{current.subLabel}</dd>
              </div>
            ) : null}
            <div className="flex items-center justify-between gap-2 sm:col-span-2">
              <dt className="text-ink-secondary">Scheduled</dt>
              <dd className="tnum font-semibold text-ink">
                {current
                  ? `${formatClock(current.startHour)} – ${formatClock(current.endHour)}`
                  : `${formatClock(START_HOUR)} – ${formatClock(END_HOUR)}`}
              </dd>
            </div>
          </dl>

          <section aria-labelledby="room-status-change">
            <h3 id="room-status-change" className="mb-2 text-label font-semibold text-ink">
              Change status
            </h3>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {STATUS_OPTIONS.map(({ status, label, Icon }) => {
                const active = currentStatus === status;
                return (
                  <Button
                    key={status}
                    variant="secondary"
                    type="button"
                    aria-pressed={active}
                    onClick={() => onSetStatus(room.number, status)}
                    icon={<Icon size={14} aria-hidden="true" />}
                    className={`justify-start text-label ${active ? 'ring-2 ring-primary' : ''}`}
                  >
                    {label}
                  </Button>
                );
              })}
            </div>
          </section>
        </div>
      ) : null}
    </Modal>
  );
}
