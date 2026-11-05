/**
 * Lightweight reactive toast notification store with rich actions and lifecycle control.
 */

export interface ToastAction {
  label: string;
  onClick: () => void | Promise<void> | unknown;
  altText?: string;
}

export interface ToastOptions {
  detail?: string;
  tone?: 'success' | 'info' | 'warning' | 'danger';
  duration?: number;
  action?: ToastAction;
}

export interface ToastItem {
  id: number;
  title: string;
  detail?: string;
  tone: 'success' | 'info' | 'warning' | 'danger';
  duration: number;
  action?: ToastAction;
  createdAt: number;
  isDismissing?: boolean;
}

type Listener = (items: ToastItem[]) => void;

let seq = 1;
let items: ToastItem[] = [];
const listeners = new Set<Listener>();

function emit() {
  const snapshot = [...items];
  listeners.forEach((l) => l(snapshot));
}

/**
 * Initiates an animated dismissal of a toast.
 */
export function dismissToast(id: number): void {
  const target = items.find((t) => t.id === id);
  if (!target) return;
  if (target.isDismissing) return;

  target.isDismissing = true;
  emit();

  window.setTimeout(() => {
    items = items.filter((t) => t.id !== id);
    emit();
  }, 220);
}

/**
 * Dismisses all active toasts with exit animations.
 */
export function clearToasts(): void {
  if (items.length === 0) return;
  items.forEach((t) => {
    t.isDismissing = true;
  });
  emit();
  window.setTimeout(() => {
    items = [];
    emit();
  }, 220);
}

/**
 * Primary toast invocation function.
 */
function createToast(title: string, opts?: ToastOptions): number {
  const id = seq++;
  const duration = opts?.duration ?? 4500;
  const item: ToastItem = {
    id,
    title,
    detail: opts?.detail,
    tone: opts?.tone ?? 'success',
    duration,
    action: opts?.action,
    createdAt: Date.now(),
  };

  // Keep up to 4 concurrent toasts
  items = [...items.slice(-3), item];
  emit();
  return id;
}

export interface ToastCallable {
  (title: string, opts?: ToastOptions): number;
  success: (title: string, detailOrOpts?: string | Omit<ToastOptions, 'tone'>) => number;
  error: (title: string, detailOrOpts?: string | Omit<ToastOptions, 'tone'>) => number;
  danger: (title: string, detailOrOpts?: string | Omit<ToastOptions, 'tone'>) => number;
  warning: (title: string, detailOrOpts?: string | Omit<ToastOptions, 'tone'>) => number;
  info: (title: string, detailOrOpts?: string | Omit<ToastOptions, 'tone'>) => number;
  dismiss: (id: number) => void;
  clear: () => void;
}

export const toast: ToastCallable = Object.assign(
  (title: string, opts?: ToastOptions) => createToast(title, opts),
  {
    success: (title: string, detailOrOpts?: string | Omit<ToastOptions, 'tone'>) => {
      const opts = typeof detailOrOpts === 'string' ? { detail: detailOrOpts } : detailOrOpts;
      return createToast(title, { ...opts, tone: 'success' });
    },
    error: (title: string, detailOrOpts?: string | Omit<ToastOptions, 'tone'>) => {
      const opts = typeof detailOrOpts === 'string' ? { detail: detailOrOpts } : detailOrOpts;
      return createToast(title, { ...opts, tone: 'danger' });
    },
    danger: (title: string, detailOrOpts?: string | Omit<ToastOptions, 'tone'>) => {
      const opts = typeof detailOrOpts === 'string' ? { detail: detailOrOpts } : detailOrOpts;
      return createToast(title, { ...opts, tone: 'danger' });
    },
    warning: (title: string, detailOrOpts?: string | Omit<ToastOptions, 'tone'>) => {
      const opts = typeof detailOrOpts === 'string' ? { detail: detailOrOpts } : detailOrOpts;
      return createToast(title, { ...opts, tone: 'warning' });
    },
    info: (title: string, detailOrOpts?: string | Omit<ToastOptions, 'tone'>) => {
      const opts = typeof detailOrOpts === 'string' ? { detail: detailOrOpts } : detailOrOpts;
      return createToast(title, { ...opts, tone: 'info' });
    },
    dismiss: dismissToast,
    clear: clearToasts,
  }
);

export function subscribeToasts(l: Listener): () => void {
  listeners.add(l);
  return () => {
    listeners.delete(l);
  };
}

export function snapshotToasts(): ToastItem[] {
  return items;
}

// Expose on global window object for interactive debugging and testing
if (typeof window !== 'undefined') {
  (window as unknown as { toast: typeof toast }).toast = toast;
}
