import * as Lucide from 'lucide-react';

/** What the Rooms page knows about a room: its row in the rooms table and its category's details. */
export interface RoomInfo {
  number: string;
  /** The room category's name. */
  type: string;
  floor: number;
  maxOccupancy: number | null;
  bedSetup: string | null;
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

export function RoomDetail({ room }: { room: RoomInfo }) {
  return (
    <div className="flex flex-col gap-6">
      <div className="rounded-2xl border border-border bg-muted-surface p-4">
        <p className="text-micro font-bold uppercase tracking-wider text-ink-secondary">
          {room.type} · Floor {room.floor}
        </p>
        <p className="tnum mt-1 text-disp3 font-bold leading-none text-ink">{room.number}</p>
      </div>

      <section className="flex flex-col gap-2.5">
        <h3 className="flex items-center gap-2 text-label font-bold uppercase tracking-wider text-ink-secondary">
          <Lucide.Info size={14} aria-hidden="true" />
          Room details
        </h3>
        <div className="grid grid-cols-1 gap-2 xs:grid-cols-2">
          <Fact icon={Lucide.Tag} label="Room category" value={room.type} />
          <Fact icon={Lucide.Layers} label="Floor" value={String(room.floor)} />
          {room.maxOccupancy !== null ? <Fact icon={Lucide.Users} label="Max occupancy" value={`${room.maxOccupancy} guests`} /> : null}
          {room.bedSetup ? <Fact icon={Lucide.BedDouble} label="Bed setup" value={room.bedSetup} /> : null}
        </div>
      </section>
    </div>
  );
}
