import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import type { ReactNode } from 'react';
import * as Lucide from 'lucide-react';
import { dismissToast, snapshotToasts, subscribeToasts } from './toastStore';
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
  const [val, setVal] = useState(defaultValue);
  useEffect(() => {
    if (open) setVal(defaultValue);
  }, [open, defaultValue]);

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

const TOAST_CONFIG: Record<
  ToastItem['tone'],
  {
    icon: Lucide.LucideIcon;
    accentColor: string;
    bgTint: string;
    borderColor: string;
    badgeBg: string;
    badgeText: string;
  }
> = {
  success: {
    icon: Lucide.CheckCircle2,
    accentColor: '#10b981',
    bgTint: 'linear-gradient(135deg, rgba(16, 185, 129, 0.08), transparent 70%)',
    borderColor: 'color-mix(in srgb, #10b981 35%, var(--color-border))',
    badgeBg: 'rgba(16, 185, 129, 0.14)',
    badgeText: '#059669',
  },
  danger: {
    icon: Lucide.XCircle,
    accentColor: '#ef4444',
    bgTint: 'linear-gradient(135deg, rgba(239, 68, 68, 0.08), transparent 70%)',
    borderColor: 'color-mix(in srgb, #ef4444 35%, var(--color-border))',
    badgeBg: 'rgba(239, 68, 68, 0.14)',
    badgeText: '#dc2626',
  },
  warning: {
    icon: Lucide.AlertTriangle,
    accentColor: '#f59e0b',
    bgTint: 'linear-gradient(135deg, rgba(245, 158, 11, 0.08), transparent 70%)',
    borderColor: 'color-mix(in srgb, #f59e0b 35%, var(--color-border))',
    badgeBg: 'rgba(245, 158, 11, 0.14)',
    badgeText: '#d97706',
  },
  info: {
    icon: Lucide.Info,
    accentColor: '#0ea5e9',
    bgTint: 'linear-gradient(135deg, rgba(14, 165, 233, 0.08), transparent 70%)',
    borderColor: 'color-mix(in srgb, #0ea5e9 35%, var(--color-border))',
    badgeBg: 'rgba(14, 165, 233, 0.14)',
    badgeText: '#0284c7',
  },
};

export function Toaster() {
  const [list, setList] = useState<ToastItem[]>(() => snapshotToasts());
  useEffect(() => subscribeToasts(setList), []);

  if (list.length === 0) return null;

  return (
    <div
      className="fixed top-4 sm:top-5 right-4 sm:right-5 z-[9999] flex w-[calc(100vw-32px)] sm:w-[400px] flex-col gap-2.5 pointer-events-none"
      role="status"
      aria-live="polite"
    >
      {list.map((t) => {
        const cfg = TOAST_CONFIG[t.tone] ?? TOAST_CONFIG.info;
        const Icon = cfg.icon;

        return (
          <div
            key={t.id}
            className="pms-overlay-enter group pointer-events-auto relative flex overflow-hidden rounded-2xl border shadow-xl backdrop-blur-md transition-all duration-200 hover:shadow-2xl"
            style={{
              background: `var(--color-surface), ${cfg.bgTint}`,
              borderColor: cfg.borderColor,
              boxShadow: `0 12px 32px -4px rgba(0,0,0,0.12), 0 0 0 1px ${cfg.borderColor}`,
            }}
          >
            {/* Left Accent Bar */}
            <div
              className="w-1.5 flex-none"
              style={{ background: cfg.accentColor }}
            />

            {/* Toast Content Area */}
            <div className="flex flex-1 items-start gap-3 p-3.5 pr-2">
              {/* Circular Icon Badge */}
              <span
                className="flex h-9 w-9 flex-none items-center justify-center rounded-xl shadow-xs"
                style={{
                  background: cfg.badgeBg,
                  color: cfg.badgeText,
                }}
              >
                <Icon size={18} strokeWidth={2.2} />
              </span>

              {/* Text Information */}
              <div className="min-w-0 flex-1 pt-0.5">
                <div className="flex items-center gap-1.5">
                  <p className="text-[13px] font-bold tracking-tight text-ink">
                    {t.title}
                  </p>
                  <span
                    className="inline-block h-1.5 w-1.5 rounded-full"
                    style={{ background: cfg.accentColor }}
                  />
                </div>
                {t.detail ? (
                  <p className="mt-1 text-[12px] leading-relaxed text-ink-secondary">
                    {t.detail}
                  </p>
                ) : null}
              </div>

              {/* Dismiss Button */}
              <button
                type="button"
                onClick={() => dismissToast(t.id)}
                aria-label="Dismiss notice"
                className="flex h-7 w-7 flex-none items-center justify-center rounded-lg text-ink-muted hover:text-ink hover:bg-hover-surface transition-colors"
              >
                <Lucide.X size={14} />
              </button>
            </div>

            {/* Countdown animation progress bar */}
            <div
              className="absolute bottom-0 left-1.5 right-0 h-[2px] opacity-40"
              style={{
                background: cfg.accentColor,
                animation: 'pmsToastProgress 4500ms linear forwards',
              }}
            />
          </div>
        );
      })}
    </div>
  );
}
