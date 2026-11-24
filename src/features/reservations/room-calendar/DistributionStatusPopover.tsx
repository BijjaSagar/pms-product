import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import * as Lucide from 'lucide-react';
import { Badge } from '../../../components/ui/display';
import { BOOKING_ENGINE_SOURCES, INITIAL_CHANNELS, INITIAL_MAPPINGS } from '../../../data/channelManager';
import { ChannelLogo } from '../../../components/ui/ChannelLogo';

const GAP = 10; // room for the arrow between the tick and the card
const MARGIN = 8;
const ARROW = 12;

function GroupLabel({ children }: { children: string }) {
  return <h3 className="px-4 pb-1 pt-3 text-micro font-bold uppercase tracking-wider text-ink-secondary">{children}</h3>;
}

/** Popover under the clicked tick showing where a room category's free rooms are being sold for one night. */
export function DistributionStatusPopover({
  anchor,
  roomType,
  date,
  free,
  onManageOta,
  onClose,
}: {
  anchor: DOMRect;
  roomType: string;
  date: string;
  free: number;
  onManageOta: () => void;
  onClose: () => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState<{ left: number; top: number; arrowLeft: number; above: boolean } | null>(null);
  const online = free > 0;

  // Centre under the tick, flipping above or sliding sideways; the arrow keeps pointing at the tick
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const { width, height } = el.getBoundingClientRect();
    const fitsBelow = anchor.bottom + GAP + height <= window.innerHeight - MARGIN;
    const top = fitsBelow ? anchor.bottom + GAP : Math.max(MARGIN, anchor.top - GAP - height);
    const centre = anchor.left + anchor.width / 2;
    const left = Math.max(MARGIN, Math.min(centre - width / 2, window.innerWidth - width - MARGIN));
    const arrowLeft = Math.max(16, Math.min(centre - left, width - 16));
    setPos({ left, top, arrowLeft, above: !fitsBelow });
  }, [anchor]);

  useEffect(() => {
    ref.current?.querySelector('button')?.focus();
    const onPointerDown = (e: PointerEvent) => {
      if (!ref.current?.contains(e.target as Node)) onClose();
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    // The anchor goes stale once the grid or page moves
    document.addEventListener('pointerdown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    window.addEventListener('scroll', onClose, true);
    window.addEventListener('resize', onClose);
    return () => {
      document.removeEventListener('pointerdown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('scroll', onClose, true);
      window.removeEventListener('resize', onClose);
    };
  }, [onClose]);

  return createPortal(
    <div
      ref={ref}
      role="dialog"
      aria-label="Distribution Status"
      className="fixed z-[100] w-[min(21rem,calc(100vw-1rem))] text-ink"
      style={{ left: pos?.left ?? 0, top: pos?.top ?? 0, visibility: pos ? 'visible' : 'hidden' }}
    >
      {pos && (
        <span
          aria-hidden="true"
          className={`absolute z-10 rotate-45 border-border bg-surface ${pos.above ? 'border-b border-r' : 'border-l border-t'}`}
          style={{
            width: ARROW,
            height: ARROW,
            left: pos.arrowLeft - ARROW / 2,
            [pos.above ? 'bottom' : 'top']: -ARROW / 2 + 1,
          }}
        />
      )}

      <div className="relative flex max-h-[80vh] flex-col overflow-hidden rounded-2xl border border-border bg-surface shadow-xl">
        <div className="flex items-start justify-between gap-3 px-4 pb-3 pt-4">
          <div className="min-w-0">
            <p className="text-micro font-bold uppercase tracking-wider text-ink-secondary">Distribution status</p>
            <h2 className="mt-0.5 truncate text-title font-bold">{roomType}</h2>
            <p className="text-label text-ink-secondary">{date}</p>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <Badge tone={online ? 'success' : 'danger'} dot size="sm">
              {online ? 'Online' : 'Sold out'}
            </Badge>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close"
              className="rounded-full p-1 text-ink-secondary hover:bg-page hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)]"
            >
              <Lucide.X size={14} aria-hidden="true" />
            </button>
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto pb-1">
          <GroupLabel>Booking engine</GroupLabel>
          <ul>
            {BOOKING_ENGINE_SOURCES.map((source) => (
              <li key={source} className="flex items-center gap-2.5 px-4 py-1.5 text-label font-semibold">
                <span className={`h-2 w-2 shrink-0 rounded-full ${online ? 'bg-[var(--color-success-text)]' : 'bg-[var(--color-neutral-text)]'}`} aria-hidden="true" />
                <span className="min-w-0 flex-1 truncate">{source}</span>
                <span className="tnum text-ink-secondary">{free}</span>
                {online ? <Lucide.Eye size={14} aria-label="Visible" /> : <Lucide.EyeOff size={14} className="text-ink-muted" aria-label="Not visible" />}
              </li>
            ))}
          </ul>

          <GroupLabel>OTA channels</GroupLabel>
          <ul>
            {INITIAL_CHANNELS.map((channel) => {
              const mapped = INITIAL_MAPPINGS.some((m) => m.channelId === channel.id && m.roomType === roomType);
              return (
                <li key={channel.id} className="flex items-center gap-2.5 px-4 py-1.5 text-label font-semibold">
                  <ChannelLogo channel={channel} />
                  <span className="min-w-0 flex-1 truncate">{channel.name}</span>
                  <Badge tone={mapped ? 'success' : 'neutral'} size="sm">
                    {mapped ? 'Mapped' : 'Not mapped'}
                  </Badge>
                </li>
              );
            })}
          </ul>
        </div>

        <div className="flex items-center justify-between gap-2 border-t border-divider bg-page px-4 py-2.5">
          <button
            type="button"
            onClick={onManageOta}
            className="inline-flex items-center gap-1.5 rounded-lg bg-[var(--color-primary)] px-3 py-1.5 text-label font-bold text-white hover:brightness-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)] focus-visible:ring-offset-2"
          >
            <Lucide.Network size={13} aria-hidden="true" />
            Manage OTA
          </button>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg px-3 py-1.5 text-label font-bold text-ink-secondary hover:bg-surface hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)]"
          >
            Close
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
