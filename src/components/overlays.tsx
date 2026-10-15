import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import type { ReactNode } from 'react';
import { snapshotToasts, subscribeToasts } from './toastStore';
import type { ToastItem } from './toastStore';

function useEsc(onClose: () => void) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);
}

/**
 * Locks background scrolling while a dialog is open, restoring it on close.
 *
 * Locks both the root element and the body: with `overflow-x: clip` on `html`
 * the root element can be the scroller, so locking only the body would leave the
 * page scrollable behind the dialog. `html { scrollbar-gutter: stable }` keeps
 * the scrollbar space reserved, so nothing shifts when the bar disappears.
 */
function useScrollLock(locked: boolean) {
  useEffect(() => {
    if (!locked) return;
    const root = document.documentElement;
    const previousRoot = root.style.overflow;
    const previousBody = document.body.style.overflow;
    root.style.overflow = 'hidden';
    document.body.style.overflow = 'hidden';
    return () => {
      root.style.overflow = previousRoot;
      document.body.style.overflow = previousBody;
    };
  }, [locked]);
}

/**
 * Focuses the dialog panel on open and restores focus to the trigger on close.
 * The ref must be attached to an element with tabIndex={-1}.
 */
function useDialogFocus<T extends HTMLElement>(open: boolean) {
  const ref = useRef<T>(null);
  useEffect(() => {
    if (!open) return;
    const previouslyFocused = document.activeElement as HTMLElement | null;
    ref.current?.focus({ preventScroll: true });
    return () => {
      previouslyFocused?.focus?.({ preventScroll: true });
    };
  }, [open]);
  return ref;
}

function Backdrop({ onClose, label }: { onClose: () => void; label: string }) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClose}
      className="pms-overlay-backdrop absolute inset-0 h-full w-full"
      style={{ background: 'var(--color-scrim)' }}
    />
  );
}

export function Modal({
  open,
  onClose,
  title,
  subtitle,
  children,
  footer,
  wide,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  children: ReactNode;
  footer?: ReactNode;
  wide?: boolean;
}) {
  useEsc(onClose);
  useScrollLock(open);
  const panelRef = useDialogFocus<HTMLDivElement>(open);
  if (!open) return null;
  // Portaled to document.body so no transformed or overflow-clipped ancestor
  // (e.g. the animated main container) can reposition or clip the dialog.
  return createPortal(
    <div className="pms-overlay-enter fixed inset-0 z-50 flex items-end justify-center overflow-y-auto p-0 sm:items-center sm:p-6" role="dialog" aria-modal="true" aria-label={title}>
      <Backdrop onClose={onClose} label="Close dialog" />
      <div
        ref={panelRef}
        tabIndex={-1}
        className={`pms-animate-pop relative my-auto flex max-h-[92dvh] w-full max-w-[calc(100vw-2rem)] flex-col border ${wide ? 'sm:max-w-[780px]' : 'sm:max-w-[540px]'}`}
        style={{
          background: 'var(--color-surface)',
          borderColor: 'var(--color-border)',
          borderRadius: 'var(--radius-modal)',
          boxShadow: 'var(--shadow-2xl)',
          overflow: 'hidden',
        }}
      >
        <span aria-hidden="true" className="pointer-events-none absolute inset-x-0 top-0 h-1" style={{ background: 'linear-gradient(90deg, var(--color-primary), var(--color-soft))' }} />
        <div className="flex items-start justify-between gap-3 border-b px-4 py-4 sm:px-5" style={{ borderColor: 'var(--color-border)', background: 'color-mix(in srgb, var(--color-muted-surface) 48%, var(--color-surface))' }}>
          <div className="min-w-0">
            <h2 className="pms-section-title truncate">{title}</h2>
            {subtitle ? <p className="pms-helper mt-0.5 text-pretty">{subtitle}</p> : null}
          </div>
          <button type="button" onClick={onClose} className="pms-btn-ghost min-h-[38px] min-w-[38px] flex-none px-2.5 py-1.5" aria-label="Close dialog">
            ✕
          </button>
        </div>
        <div className="overflow-y-auto px-4 py-4 sm:px-5">{children}</div>
        {footer ? (
          <div className="flex justify-end gap-2 border-t px-4 py-3 sm:px-5" style={{ borderColor: 'var(--color-border)' }}>
            {footer}
          </div>
        ) : null}
      </div>
    </div>,
    document.body,
  );
}

export function Drawer({
  open,
  onClose,
  title,
  subtitle,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  children: ReactNode;
}) {
  useEsc(onClose);
  useScrollLock(open);
  const panelRef = useDialogFocus<HTMLElement>(open);
  if (!open) return null;
  return createPortal(
    <div className="pms-overlay-enter fixed inset-0 z-50" role="dialog" aria-modal="true" aria-label={title}>
      <Backdrop onClose={onClose} label="Close panel" />
      <aside
        ref={panelRef}
        tabIndex={-1}
        className="absolute right-0 top-0 flex h-full w-full flex-col border-l sm:max-w-[520px]"
        style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)', boxShadow: 'var(--shadow-2xl)', maxWidth: 'min(520px, 100vw)' }}
      >
        <div className="flex items-start justify-between gap-3 border-b px-4 py-4 sm:px-5" style={{ borderColor: 'var(--color-border)', background: 'color-mix(in srgb, var(--color-muted-surface) 48%, var(--color-surface))' }}>
          <div className="min-w-0">
            <h2 className="pms-section-title truncate">{title}</h2>
            {subtitle ? <p className="pms-helper mt-0.5 text-pretty">{subtitle}</p> : null}
          </div>
          <button type="button" onClick={onClose} className="pms-btn-ghost min-h-[38px] min-w-[38px] flex-none px-2.5 py-1.5" aria-label="Close panel">
            ✕
          </button>
        </div>
        <div className="pms-safe-bottom flex-1 overflow-y-auto px-4 py-4 sm:px-5">{children}</div>
      </aside>
    </div>,
    document.body,
  );
}

export function ConfirmDialog({
  open,
  onClose,
  onConfirm,
  title,
  body,
  confirmLabel,
  danger,
  note,
  busy,
  autoClose = true,
}: {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void | Promise<unknown>;
  title: string;
  body: string;
  confirmLabel: string;
  danger?: boolean;
  note?: string;
  busy?: boolean;
  autoClose?: boolean;
}) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={title}
      footer={
        <>
          <button type="button" onClick={onClose} disabled={busy} className="pms-btn-ghost px-4 py-2.5 disabled:opacity-50">
            Cancel
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={() => {
              void onConfirm();
              if (autoClose) onClose();
            }}
            className={`${danger ? 'pms-btn-danger' : 'pms-btn-primary'} px-4 py-2.5 disabled:opacity-50`}
          >
            {confirmLabel}
          </button>
        </>
      }
    >
      <p className="text-[13.5px]" style={{ color: 'var(--color-ink-secondary)' }}>
        {body}
      </p>
      {note ? <p className="pms-helper mt-2">{note}</p> : null}
    </Modal>
  );
}

const TOAST_TONE: Record<ToastItem['tone'], string> = {
  success: 'bg-success-bg text-success-text border-success-border',
  info: 'bg-info-bg text-info-text border-info-border',
  warning: 'bg-warning-bg text-warning-text border-warning-border',
  danger: 'bg-danger-bg text-danger-text border-danger-border',
};

export function Toaster() {
  const [list, setList] = useState<ToastItem[]>(() => snapshotToasts());
  useEffect(() => subscribeToasts(setList), []);
  if (list.length === 0) return null;
  return (
    <div className="pms-safe-bottom fixed bottom-4 left-1/2 z-[60] flex w-full max-w-[440px] -translate-x-1/2 flex-col gap-2 px-4" role="status" aria-live="polite">
      {list.map((t) => (
        <div
          key={t.id}
          className={`pms-overlay-enter rounded-[14px] border px-4 py-3 backdrop-blur ${TOAST_TONE[t.tone]}`}
          style={{ boxShadow: 'var(--shadow-popover)' }}
        >
          <p className="text-[13px] font-bold">{t.title}</p>
          {t.detail ? <p className="mt-0.5 text-[12.5px] leading-snug opacity-90">{t.detail}</p> : null}
        </div>
      ))}
    </div>
  );
}
