import * as Lucide from 'lucide-react';
import { TONE_VARS } from '../../../theme/tone';
import type { TimelineEvent, TimelineIcon } from '../../../types';
import { EVENT_TONE, barPlacement } from './timelineMath';

const ICONS: Record<TimelineIcon, Lucide.LucideIcon> = {
  luggage: Lucide.Luggage,
  clock: Lucide.Clock,
  user: Lucide.User,
};

/* One booking or status block on a room's track. It is a button so it can be reached by keyboard. */
export function TimelineBar({
  event,
  roomNumber,
  onOpen,
}: {
  event: TimelineEvent;
  roomNumber: string;
  onOpen: () => void;
}) {
  const { left, width } = barPlacement(event);
  const tone = TONE_VARS[EVENT_TONE[event.status]];
  const Icon = event.icon ? ICONS[event.icon] : null;
  const description = event.subLabel ? `${event.label}, ${event.subLabel}` : event.label;

  return (
    <button
      type="button"
      onClick={onOpen}
      aria-label={`Room ${roomNumber}: ${description}`}
      title={`Room ${roomNumber}: ${description}`}
      className="absolute top-1/2 flex h-8 -translate-y-1/2 items-center gap-1.5 overflow-hidden rounded-lg border px-2.5 text-left text-label shadow-2xs transition-shadow hover:shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
      style={{
        left: `${left}%`,
        width: `${width}%`,
        background: tone.bg,
        color: tone.text,
        borderColor: tone.border,
      }}
    >
      {Icon ? <Icon size={13} strokeWidth={2.4} aria-hidden="true" className="shrink-0" /> : null}
      <span className="min-w-0 truncate font-bold">{event.label}</span>
      {event.subLabel ? <span className="min-w-0 truncate font-medium opacity-80">{event.subLabel}</span> : null}
    </button>
  );
}
