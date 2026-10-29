import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import type { ReactNode } from 'react';
import * as Lucide from 'lucide-react';
import { lockAppScroll } from '../lib/scrollLock';
export { Toaster } from './Toaster';
export type { ToasterProps } from './Toaster';


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
 * The shell scrolls inside `[data-app-scroll]`, so the shared helper locks
 * that region as well as the root/body. Its `scrollbar-gutter: stable` keeps
 * the scrollbar space reserved, so nothing shifts when the bar disappears.
 */
function useScrollLock(locked: boolean) {
  useEffect(() => {
    if (!locked) return;
    return lockAppScroll();
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
          <button type="button" onClick={onClose} className="pms-btn-ghost flex h-9 w-9 items-center justify-center rounded-lg p-0" aria-label="Close dialog">
            <Lucide.X size={18} />
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
          <button type="button" onClick={onClose} className="pms-btn-ghost flex h-9 w-9 items-center justify-center rounded-lg p-0" aria-label="Close panel">
            <Lucide.X size={18} />
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

export function PromptDialog({
  open,
  onClose,
  onSubmit,
  title,
  subtitle,
  label,
  defaultValue = '',
  placeholder = '',
  confirmLabel = 'Submit',
  danger = false,
  inputType = 'text',
}: {
  open: boolean;
  onClose: () => void;
  onSubmit: (value: string) => void | Promise<unknown>;
  title: string;
  subtitle?: string;
  label?: string;
  defaultValue?: string;
  placeholder?: string;
  confirmLabel?: string;
  danger?: boolean;
  inputType?: 'text' | 'number' | 'date';
}) {
  const [prevTrack, setPrevTrack] = useState({ open, defaultValue });
  const [val, setVal] = useState(defaultValue);

  if (prevTrack.open !== open || prevTrack.defaultValue !== defaultValue) {
    setPrevTrack({ open, defaultValue });
    if (open) {
      setVal(defaultValue);
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={title}
      subtitle={subtitle}
      footer={
        <>
          <button type="button" onClick={onClose} className="pms-btn-ghost px-4 py-2.5">
            Cancel
          </button>
          <button
            type="button"
            onClick={() => {
              void onSubmit(val);
              onClose();
            }}
            className={`${danger ? 'pms-btn-danger' : 'pms-btn-primary'} px-4 py-2.5`}
          >
            {confirmLabel}
          </button>
        </>
      }
    >
      <form
        onSubmit={(e) => {
          e.preventDefault();
          void onSubmit(val);
          onClose();
        }}
        className="flex flex-col gap-2"
      >
        {label ? <span className="pms-label">{label}</span> : null}
        <input
          type={inputType}
          autoFocus
          value={val}
          onChange={(e) => setVal(e.target.value)}
          placeholder={placeholder}
          className="pms-input w-full min-h-[42px] px-3.5 py-2.5"
        />
      </form>
    </Modal>
  );
}


