import * as Lucide from 'lucide-react';
import type { NavTarget } from '../../config/navigation';
import type { StayRow } from '../../lib/api/pms';

interface ActivityItem {
  id: string;
  time: string;
  type: 'arrival' | 'departure' | 'in-house';
  icon: Lucide.LucideIcon;
  iconBg: string;
  title: string;
  subtitle: string;
  room?: string;
  status: string;
  statusTone: string;
  actionLabel: string;
  actionTone: string;
  target: NavTarget;
}

const ARRIVAL_STYLE = {
  icon: Lucide.DoorOpen,
  iconBg: 'bg-success-bg text-success-text border border-success-border',
  status: 'Arriving',
  statusTone: 'bg-success-bg text-success-text border-success-border/60',
  actionLabel: 'View booking',
  actionTone: 'text-success-text bg-success-bg/80 hover:bg-success-bg border-success-border',
  target: { view: 'reservations' } as NavTarget,
};

const DEPARTURE_STYLE = {
  icon: Lucide.DoorClosed,
  iconBg: 'bg-warning-bg text-warning-text border border-warning-border',
  status: 'Due Out',
  statusTone: 'bg-warning-bg text-warning-text border-warning-border/60',
  actionLabel: 'Open folio',
  actionTone: 'text-warning-text bg-warning-bg/80 hover:bg-warning-bg border-warning-border',
  target: { view: 'folios' } as NavTarget,
};

const IN_HOUSE_STYLE = {
  icon: Lucide.Users,
  iconBg: 'bg-info-bg text-info-text border border-info-border',
  status: 'In-house',
  statusTone: 'bg-info-bg text-info-text border-info-border/60',
  actionLabel: 'View booking',
  actionTone: 'text-ink bg-page hover:bg-muted-surface border-border',
  target: { view: 'reservations' } as NavTarget,
};

/** One timeline entry per arriving, departing and in-house stay for the business date. */
export function buildTimeline(arrivals: StayRow[], departures: StayRow[], inHouse: StayRow[]): ActivityItem[] {
  const entry = (stay: StayRow, type: ActivityItem['type'], style: typeof ARRIVAL_STYLE): ActivityItem => ({
    id: `${type}-${stay.id}`,
    time: '—',
    type,
    icon: style.icon,
    iconBg: style.iconBg,
    title: stay.guestName ?? 'Guest',
    subtitle: `${stay.bookingCode} • ${stay.roomTypeName ?? 'Room'}`,
    room: stay.roomNumber ? `Room ${stay.roomNumber}` : undefined,
    status: style.status,
    statusTone: style.statusTone,
    actionLabel: style.actionLabel,
    actionTone: style.actionTone,
    target: style.target,
  });
  // Each stay shows once: a guest already checked in is in-house, and a departure is listed as departing, not in-house.
  const departing = new Set(departures.map((stay) => stay.id));
  return [
    ...arrivals.filter((stay) => stay.status !== 'CHECKED_IN').map((stay) => entry(stay, 'arrival', ARRIVAL_STYLE)),
    ...departures.map((stay) => entry(stay, 'departure', DEPARTURE_STYLE)),
    ...inHouse.filter((stay) => !departing.has(stay.id)).map((stay) => entry(stay, 'in-house', IN_HOUSE_STYLE)),
  ];
}
