import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import * as Lucide from 'lucide-react';

export type CellAction = 'Book' | 'Hold' | 'Block';

const ITEMS: Array<{ action: CellAction; icon: typeof Lucide.Clock }> = [
  { action: 'Book', icon: Lucide.CalendarPlus },
  { action: 'Hold', icon: Lucide.Clock },
  { action: 'Block', icon: Lucide.Ban },
];

const GAP = 4;
const MARGIN = 8;

/** Dropdown under a clicked calendar cell offering Book, Hold or Block. */
export function CellActionMenu({
  anchor,
  onSelect,
  onClose,
}: {
  anchor: DOMRect;
  onSelect: (action: CellAction) => void;
  onClose: () => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState<{ left: number; top: number } | null>(null);

  // Place under the cell, flipping above or sliding left when it would leave the screen
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const { width, height } = el.getBoundingClientRect();
    const fitsBelow = anchor.bottom + GAP + height <= window.innerHeight - MARGIN;
    const top = fitsBelow ? anchor.bottom + GAP : Math.max(MARGIN, anchor.top - GAP - height);
    const left = Math.max(MARGIN, Math.min(anchor.left, window.innerWidth - width - MARGIN));
    setPos({ left, top });
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
      role="menu"
      aria-label="Cell actions"
      className="fixed z-[100] flex w-36 flex-col rounded-xl border border-border bg-surface p-1 shadow-xl"
      style={{ left: pos?.left ?? 0, top: pos?.top ?? 0, visibility: pos ? 'visible' : 'hidden' }}
    >
      {ITEMS.map(({ action, icon: Icon }) => (
        <button
          key={action}
          type="button"
          role="menuitem"
          onClick={() => onSelect(action)}
          className="flex w-full cursor-pointer items-center gap-2 rounded-lg px-2.5 py-1.5 text-left text-label font-semibold text-ink hover:bg-page focus-visible:bg-page focus-visible:outline-none"
        >
          <Icon size={14} aria-hidden="true" />
          {action}
        </button>
      ))}
    </div>,
    document.body
  );
}
