import { useEffect, useRef } from 'react';
import type { KeyboardEvent, Ref } from 'react';
import * as Lucide from 'lucide-react';

interface PropertyChoice {
  propertyId: string;
  property: { name: string };
}

const initialsOf = (name: string) =>
  name
    .trim()
    .split(/\s+/)
    .map((part) => part[0])
    .slice(0, 2)
    .join('')
    .toUpperCase() || 'U';

/** The round initials badge, in two sizes, used on the button and at the top of the menu. */
function AvatarBadge({ initials, size }: { initials: string; size: 'sm' | 'lg' }) {
  return (
    <span
      aria-hidden="true"
      className={`flex flex-none items-center justify-center rounded-full bg-gradient-to-br from-primary to-dark-accent font-bold text-primary-foreground shadow-xs ${
        size === 'lg' ? 'h-12 w-12 text-title' : 'h-8 w-8 text-label'
      }`}
    >
      {initials}
    </span>
  );
}

const ITEM =
  'flex min-h-[40px] w-full cursor-pointer items-center gap-3 rounded-lg px-3 py-2 text-left text-body font-medium text-ink transition-colors hover:bg-muted-surface focus-visible:bg-muted-surface';

/**
 * The avatar button and its account menu. On large screens the button also shows the name and role,
 * so who is signed in is visible without opening anything.
 */
export function ProfileMenu({
  open,
  onToggle,
  containerRef,
  fullName,
  email,
  roleName,
  propertyName,
  canViewStaff,
  otherProperties,
  onSettings,
  onStaff,
  onThemes,
  onSwitchProperty,
  onSignOut,
}: {
  open: boolean;
  onToggle: () => void;
  /** Attached while the menu is open, so a click outside can close it. */
  containerRef?: Ref<HTMLDivElement>;
  fullName: string;
  email: string | null;
  roleName: string;
  propertyName: string | null;
  canViewStaff: boolean;
  otherProperties: PropertyChoice[];
  onSettings: () => void;
  onStaff: () => void;
  onThemes: () => void;
  onSwitchProperty: (propertyId: string) => void;
  onSignOut: () => void;
}) {
  const menuRef = useRef<HTMLDivElement>(null);
  const initials = initialsOf(fullName);

  // Land on the first item when the menu opens, so the keyboard can carry on from there.
  useEffect(() => {
    if (open) menuRef.current?.querySelector<HTMLElement>('[role="menuitem"]')?.focus();
  }, [open]);

  const onMenuKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    const items = [...(menuRef.current?.querySelectorAll<HTMLElement>('[role="menuitem"]') ?? [])];
    if (items.length === 0) return;
    const at = items.indexOf(document.activeElement as HTMLElement);
    let next = -1;
    if (e.key === 'ArrowDown') next = (at + 1) % items.length;
    else if (e.key === 'ArrowUp') next = (at - 1 + items.length) % items.length;
    else if (e.key === 'Home') next = 0;
    else if (e.key === 'End') next = items.length - 1;
    if (next < 0) return;
    e.preventDefault();
    items[next]?.focus();
  };

  return (
    <div className="relative flex-none" ref={containerRef}>
      <button
        type="button"
        onClick={onToggle}
        aria-label={`Account menu for ${fullName}`}
        aria-haspopup="menu"
        aria-expanded={open}
        className={`flex cursor-pointer items-center gap-2.5 rounded-full border bg-surface p-1 transition-colors hover:bg-hover-surface lg:pr-3 ${
          open ? 'border-primary' : 'border-border'
        }`}
      >
        <AvatarBadge initials={initials} size="sm" />
        <span className="hidden min-w-0 text-left lg:block">
          <span className="block max-w-[9rem] truncate text-label font-bold leading-tight text-ink">{fullName}</span>
          <span className="block max-w-[9rem] truncate text-micro leading-tight text-ink-muted">{roleName}</span>
        </span>
        <Lucide.ChevronDown
          size={14}
          aria-hidden="true"
          className={`hidden text-ink-muted transition-transform lg:block ${open ? 'rotate-180' : ''}`}
        />
      </button>

      {open ? (
        <div
          ref={menuRef}
          role="menu"
          aria-label="Account"
          onKeyDown={onMenuKeyDown}
          className="pms-animate-pop absolute right-0 top-full z-50 mt-2.5 w-[min(20rem,calc(100vw-1.5rem))] overflow-hidden rounded-2xl border border-border bg-surface shadow-2xl"
        >
          <div className="flex items-center gap-3 border-b border-divider bg-muted-surface/40 p-4">
            <AvatarBadge initials={initials} size="lg" />
            <div className="min-w-0 flex-1">
              <p className="truncate text-body font-bold text-ink">{fullName}</p>
              {email ? <p className="truncate text-label text-ink-secondary">{email}</p> : null}
              <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                <span className="rounded-full bg-primary/10 px-2 py-px text-micro font-bold text-primary">{roleName}</span>
                {propertyName ? (
                  <span className="inline-flex min-w-0 items-center gap-1 text-micro text-ink-muted">
                    <Lucide.Building2 size={11} aria-hidden="true" className="flex-none" />
                    <span className="truncate">{propertyName}</span>
                  </span>
                ) : null}
              </div>
            </div>
          </div>

          <div className="p-1.5">
            <button type="button" role="menuitem" onClick={onSettings} className={ITEM}>
              <Lucide.Settings size={16} className="flex-none text-ink-muted" aria-hidden="true" />
              Profile &amp; settings
            </button>
            {canViewStaff ? (
              <button type="button" role="menuitem" onClick={onStaff} className={ITEM}>
                <Lucide.ShieldCheck size={16} className="flex-none text-ink-muted" aria-hidden="true" />
                Staff &amp; roles
              </button>
            ) : null}
            <button type="button" role="menuitem" onClick={onThemes} className={ITEM}>
              <Lucide.Palette size={16} className="flex-none text-primary" aria-hidden="true" />
              Appearance &amp; themes
            </button>
          </div>

          {otherProperties.length > 0 ? (
            <div className="border-t border-divider p-1.5">
              <p className="px-3 pb-1 pt-1.5 text-micro font-bold uppercase tracking-[0.14em] text-ink-muted">Switch property</p>
              {otherProperties.map((membership) => (
                <button
                  key={membership.propertyId}
                  type="button"
                  role="menuitem"
                  onClick={() => onSwitchProperty(membership.propertyId)}
                  className={ITEM}
                >
                  <Lucide.Building2 size={16} className="flex-none text-ink-muted" aria-hidden="true" />
                  <span className="min-w-0 flex-1 truncate">{membership.property.name}</span>
                  <Lucide.ArrowRightLeft size={14} className="flex-none text-ink-muted" aria-hidden="true" />
                </button>
              ))}
            </div>
          ) : null}

          <div className="border-t border-divider p-1.5">
            <button
              type="button"
              role="menuitem"
              onClick={onSignOut}
              className={`${ITEM} font-semibold !text-danger-text hover:!bg-danger-bg focus-visible:!bg-danger-bg`}
            >
              <Lucide.LogOut size={16} className="flex-none" aria-hidden="true" />
              Sign out
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
