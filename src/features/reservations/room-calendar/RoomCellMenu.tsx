import { useEffect, useRef } from 'react';
import * as Lucide from 'lucide-react';

const MENU_WIDTH = 176;
const MENU_HEIGHT = 136;

/** Right-click menu for a free room-night cell on the room calendar. */
export function RoomCellMenu({
  roomNumber,
  date,
  x,
  y,
  onHold,
  onEnquire,
  onBook,
  onClose,
}: {
  roomNumber: string;
  date: string;
  x: number;
  y: number;
  onHold: () => void;
  onEnquire: () => void;
  onBook: () => void;
  onClose: () => void;
}) {
  const menuRef = useRef<HTMLDivElement>(null);

  // Clicks outside the menu, Escape, or a resize dismiss it
  useEffect(() => {
    const onPointerDown = (e: MouseEvent) => {
      if (!menuRef.current?.contains(e.target as Node)) onClose();
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('mousedown', onPointerDown);
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('resize', onClose);
    return () => {
      window.removeEventListener('mousedown', onPointerDown);
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('resize', onClose);
    };
  }, [onClose]);

  // Keep the menu inside the viewport when the right-click lands near an edge
  const left = Math.max(8, Math.min(x, window.innerWidth - MENU_WIDTH - 8));
  const top = Math.max(8, Math.min(y, window.innerHeight - MENU_HEIGHT - 8));

  const items = [
    { label: 'Hold', Icon: Lucide.Clock, onSelect: onHold },
    { label: 'Enquire', Icon: Lucide.MessageSquareText, onSelect: onEnquire },
    { label: 'Book', Icon: Lucide.CalendarPlus, onSelect: onBook },
  ];

  return (
    <div
      ref={menuRef}
      role="menu"
      aria-label={`Room ${roomNumber} on ${date}`}
      className="fixed z-[9990] w-44 overflow-hidden rounded-xl border border-border/90 bg-surface p-1 text-ink shadow-xl"
      style={{ left, top }}
      onContextMenu={(e) => e.preventDefault()}
    >
      <p className="px-2.5 pb-1 pt-1.5 text-micro font-bold uppercase tracking-wider text-ink-muted">
        Room {roomNumber} · {date}
      </p>
      {items.map(({ label, Icon, onSelect }) => (
        <button
          key={label}
          type="button"
          role="menuitem"
          onClick={onSelect}
          className="flex w-full cursor-pointer items-center gap-2 rounded-lg px-2.5 py-1.5 text-left text-label font-semibold text-ink transition-colors hover:bg-page"
        >
          <Icon size={14} className="text-ink-secondary" aria-hidden="true" />
          {label}
        </button>
      ))}
    </div>
  );
}
