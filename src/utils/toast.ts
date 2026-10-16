/**
 * Lightweight reactive toast notification store.
 */

export interface ToastItem {
  id: number;
  title: string;
  detail?: string;
  tone: 'success' | 'info' | 'warning' | 'danger';
}

type Listener = (items: ToastItem[]) => void;

let seq = 1;
let items: ToastItem[] = [];
const listeners = new Set<Listener>();

function emit() {
  listeners.forEach((l) => l([...items]));
}

export function dismissToast(id: number): void {
  items = items.filter((t) => t.id !== id);
  emit();
}

export function toast(title: string, opts?: { detail?: string; tone?: ToastItem['tone'] }): void {
  const item: ToastItem = { id: seq++, title, detail: opts?.detail, tone: opts?.tone ?? 'success' };
  items = [...items.slice(-3), item];
  emit();
  window.setTimeout(() => {
    dismissToast(item.id);
  }, 4500);
}

export function subscribeToasts(l: Listener): () => void {
  listeners.add(l);
  return () => {
    listeners.delete(l);
  };
}

export function snapshotToasts(): ToastItem[] {
  return items;
}
