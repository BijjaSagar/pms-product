/**
 * Locks the application's scroll region while a dialog is open.
 *
 * The shell scrolls inside `[data-app-scroll]`, not the window. Locking only
 * `html`/`body` would leave the page scrollable behind the dialog, so the
 * scroller is locked too and every previous value is restored on close.
 */
export function lockAppScroll(): () => void {
  const scroller = document.querySelector<HTMLElement>('[data-app-scroll]');
  const previousRoot = document.documentElement.style.overflow;
  const previousBody = document.body.style.overflow;
  const previousScroller = scroller?.style.overflowY ?? '';

  document.documentElement.style.overflow = 'hidden';
  document.body.style.overflow = 'hidden';
  if (scroller) scroller.style.overflowY = 'hidden';

  return () => {
    document.documentElement.style.overflow = previousRoot;
    document.body.style.overflow = previousBody;
    if (scroller) scroller.style.overflowY = previousScroller;
  };
}
