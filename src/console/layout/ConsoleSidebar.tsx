import { useEffect } from 'react';
import * as Lucide from 'lucide-react';
import { CONSOLE_NAMES, consoleNav } from './consoleNav';
import type { ConsoleView } from './consoleNav';
import type { UserRoleKey } from '../../shared/services/authApi';

/**
 * The console's own navigation: a fixed rail from the large breakpoint up, a drawer below it. It is
 * separate from the hotel sidebar, which belongs to one property.
 */
export function ConsoleSidebar({
  role,
  active,
  onNavigate,
  open,
  onClose,
  onOpenThemes,
}: {
  role: Exclude<UserRoleKey, 'STAFF'>;
  active: ConsoleView;
  onNavigate: (view: ConsoleView) => void;
  open: boolean;
  onClose: () => void;
  onOpenThemes: () => void;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  return (
    <>
      {open ? <div className="fixed inset-0 z-40 bg-ink/40 lg:hidden" onClick={onClose} aria-hidden="true" /> : null}
      <aside
        aria-label="Console navigation"
        className={`fixed inset-y-0 left-0 z-50 flex w-64 flex-none flex-col border-r border-border bg-sidebar transition-transform duration-200 lg:static lg:z-auto lg:translate-x-0 ${
          open ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex items-center justify-between border-b border-border px-4 pb-4 pt-5">
          <div className="flex min-w-0 items-center gap-3">
            <span className="flex h-10 w-10 flex-none items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-sm" aria-hidden="true">
              <Lucide.Crown size={18} />
            </span>
            <div className="min-w-0">
              <p className="font-brand truncate text-disp2 font-bold leading-none tracking-tight text-ink">Hotel PMX</p>
              <p className="mt-1 text-label font-semibold uppercase tracking-[0.14em] text-ink-muted">{CONSOLE_NAMES[role].console}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close menu"
            className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-lg text-ink-muted transition-colors hover:bg-muted-surface hover:text-ink lg:hidden"
          >
            <Lucide.X size={16} />
          </button>
        </div>

        <nav className="min-h-0 flex-1 overflow-y-auto px-2.5 py-3" aria-label="Primary">
          <ul className="flex flex-col gap-0.5">
            {consoleNav(role).map(({ id, label, hint, icon: Icon }) => {
              // Adding a property is part of Properties.
              const selected = id === active || (id === 'properties' && active === 'new-property');
              return (
                <li key={id}>
                  <button
                    type="button"
                    onClick={() => onNavigate(id)}
                    aria-current={selected ? 'page' : undefined}
                    className={`flex min-h-[44px] w-full cursor-pointer items-center gap-3 rounded-lg px-3 py-2 text-left transition-colors ${
                      selected ? 'bg-primary/10 text-primary' : 'text-ink hover:bg-muted-surface'
                    }`}
                  >
                    <Icon size={17} className={`flex-none ${selected ? 'text-primary' : 'text-ink-muted'}`} aria-hidden="true" />
                    <span className="min-w-0">
                      <span className="block truncate text-body font-semibold">{label}</span>
                      <span className="block truncate text-micro text-ink-muted">{hint}</span>
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        </nav>

        <div className="border-t border-border p-3">
          <button
            type="button"
            onClick={onOpenThemes}
            className="flex min-h-[40px] w-full cursor-pointer items-center gap-2.5 rounded-lg px-3 py-2 text-left text-label font-semibold text-ink transition-colors hover:bg-muted-surface"
          >
            <Lucide.Palette size={16} className="text-primary" aria-hidden="true" />
            Theme colors
          </button>
        </div>
      </aside>
    </>
  );
}
