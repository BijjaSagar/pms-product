import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { createPortal } from 'react-dom';
import * as Lucide from 'lucide-react';
import { BOOKING_ENGINE_SOURCES } from '../../../data/channelManager';
import { displayApiError } from '../../../lib/api/client';
import { otaChannelApi } from '../../../lib/api/pms';
import { useApiResource } from '../../../lib/api/useApiResource';
import { ChannelLogo } from '../../../components/ui/ChannelLogo';

const GAP = 10; // room for the arrow between the tick and the card
const MARGIN = 8;
const ARROW = 12;

/** One line of the status table: name, rooms on offer and whether guests can see them. */
function StatusRow({ name, count, visible, heading = false, indent = false, icon }: {
  name: string;
  count?: number;
  visible?: boolean;
  heading?: boolean;
  indent?: boolean;
  icon?: ReactNode;
}) {
  return (
    <li className={`grid grid-cols-[minmax(0,1fr)_2.5rem_2.5rem] items-center gap-2 py-2 pr-3 text-label ${indent ? 'pl-9' : 'pl-3'} ${heading ? 'border-b border-border font-bold text-ink-secondary' : 'font-semibold text-ink'}`}>
      <span className="flex min-w-0 items-center gap-2.5">
        {icon}
        <span className="truncate">{name}</span>
      </span>
      <span className="tnum text-center">{count}</span>
      <span className="flex justify-center text-ink-secondary">
        {visible === true && <Lucide.Eye size={15} aria-label="Visible" />}
        {visible === false && <Lucide.EyeOff size={15} aria-label="Not visible" />}
      </span>
    </li>
  );
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
  const displayDate = date.split('-').reverse().join('-');
  const otas = useApiResource(async () => {
    try {
      return await otaChannelApi.list();
    } catch (cause) {
      throw new Error(displayApiError(cause), { cause });
    }
  }, []);

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
  }, [anchor, otas.data, otas.error]);

  useEffect(() => {
    ref.current?.querySelector('button')?.focus();
    const onPointerDown = (e: PointerEvent) => {
      if (!ref.current?.contains(e.target as Node)) onClose();
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    // The anchor goes stale once the grid or page moves
    const onScroll = (e: Event) => {
      if (!ref.current?.contains(e.target as Node)) onClose();
    };
    document.addEventListener('pointerdown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    window.addEventListener('scroll', onScroll, true);
    window.addEventListener('resize', onClose);
    return () => {
      document.removeEventListener('pointerdown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('scroll', onScroll, true);
      window.removeEventListener('resize', onClose);
    };
  }, [onClose]);

  return createPortal(
    <div
      ref={ref}
      role="dialog"
      aria-label="Distribution Status"
      className="fixed z-[100] w-[min(18.9rem,calc(100vw-1rem))] text-ink"
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

      <div className="relative flex max-h-[80vh] flex-col overflow-hidden rounded-lg border border-border bg-surface shadow-xl">
        <div className="flex items-center justify-between gap-3 bg-ink px-3 py-2 text-surface">
          <h2 className="text-title font-semibold">Distribution Status</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="rounded p-1 opacity-70 hover:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)]"
          >
            <Lucide.X size={14} aria-hidden="true" />
          </button>
        </div>

        <div className="border-b border-border px-3 pb-2 pt-3">
          <h3 className="truncate text-title font-bold text-ink">{roomType}-{displayDate}</h3>
          <p className="mt-0.5 flex items-center gap-1.5 text-label italic text-ink-muted">
            <span className={`h-2.5 w-2.5 flex-none rounded-full ${online ? 'bg-success-text' : 'bg-danger-text'}`} aria-hidden="true" />
            {online ? 'Full online exposure' : 'No online exposure'}
          </p>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto">
          {/* Same scrollbar gutter as the OTA list below, so the columns line up. */}
          <ul className="overflow-hidden [scrollbar-gutter:stable]">
            <StatusRow heading name="Available offline" count={free} />
            <StatusRow heading name="Visible on BE" count={free} visible={online} />
            {BOOKING_ENGINE_SOURCES.map((source) => (
              <StatusRow key={source} indent name={source} count={free} visible={online} />
            ))}
            <StatusRow heading name="Visible on OTA" visible={online} />
          </ul>
          {/* Three OTA rows (3rem each) show at once; the rest scroll here, not the whole card. */}
          <ul className="max-h-36 overflow-y-auto overscroll-contain [scrollbar-gutter:stable]" aria-label="OTA channels" tabIndex={0}>
            {otas.data?.map((ota) => (
              <StatusRow
                key={ota.id}
                name={ota.name.toUpperCase()}
                count={free}
                visible={online}
                icon={<ChannelLogo channel={{ name: ota.name, logoBg: 'var(--color-primary)', logoText: ota.name.charAt(0).toUpperCase() }} />}
              />
            ))}
          </ul>
          {otas.loading && <p className="px-3 py-2 text-label text-ink-muted" role="status">Loading OTA channels…</p>}
          {otas.error && <p className="px-3 py-2 text-label text-danger-text" role="alert">{otas.error}</p>}
          {otas.data?.length === 0 && <p className="px-3 py-2 text-label text-ink-muted">No active OTA channels.</p>}
        </div>

        <div className="flex items-center justify-between gap-2 border-t border-border px-1.5 py-2">
          <button
            type="button"
            onClick={onManageOta}
            className="rounded px-2 py-1 text-label font-semibold uppercase text-ink-secondary hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)]"
          >
            Manage OTA
          </button>
          <button
            type="button"
            onClick={onClose}
            className="rounded px-2 py-1 text-label font-semibold uppercase text-ink-secondary hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)]"
          >
            Close
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
