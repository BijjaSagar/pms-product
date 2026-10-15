import { useEffect, useRef, useState } from 'react';
import { NAV_ITEMS, NAV_SECTIONS, sectionOf, viewPermission } from './nav';
import type { NavTarget, ViewId } from './nav';
import { NOTICES } from '../data/mock';
import { toast } from './toastStore';
import { useAuth } from '../features/auth/AuthContext';
import { displayApiError } from '../lib/api/client';

function NavIcon({ id }: { id: ViewId }) {
  const common = 'h-[18px] w-[18px] flex-none';
  const stroke = {
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 1.7,
    strokeLinecap: 'round',
    strokeLinejoin: 'round',
  } as const;
  switch (id) {
    case 'dashboard':
      return (
        <svg viewBox="0 0 24 24" className={common} {...stroke} aria-hidden="true">
          <rect x="3" y="3" width="7.5" height="7.5" rx="1.5" />
          <rect x="13.5" y="3" width="7.5" height="7.5" rx="1.5" />
          <rect x="3" y="13.5" width="7.5" height="7.5" rx="1.5" />
          <rect x="13.5" y="13.5" width="7.5" height="7.5" rx="1.5" />
        </svg>
      );
    case 'reservations':
    case 'occupancy-report':
    case 'revenue-report':
    case 'arrivals-departures':
    case 'reports':
      return (
        <svg viewBox="0 0 24 24" className={common} {...stroke} aria-hidden="true">
          <path d="M4 20h16" />
          <path d="M7 16v-5M12 16V7M17 16v-8" />
        </svg>
      );
    case 'new-reservation':
      return (
        <svg viewBox="0 0 24 24" className={common} {...stroke} aria-hidden="true">
          <rect x="3.5" y="5" width="17" height="15.5" rx="2" />
          <path d="M3.5 10h17M8 3v4M16 3v4M12 13v5M9.5 15.5h5" />
        </svg>
      );
    case 'room-overview':
    case 'room-inventory':
    case 'status-board':
    case 'room-types':
      return (
        <svg viewBox="0 0 24 24" className={common} {...stroke} aria-hidden="true">
          <path d="M3 18v-6a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v6" />
          <path d="M3 18h18M5 10V7a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v3" />
        </svg>
      );
    case 'check-in':
    case 'check-out':
      return (
        <svg viewBox="0 0 24 24" className={common} {...stroke} aria-hidden="true">
          <path d="M4 20h16M6 20v-9h12v9M9 11V8h6v3" />
          <path d="M12 5V3.5" />
        </svg>
      );
    case 'guests':
    case 'in-house':
    case 'walk-in':
      return (
        <svg viewBox="0 0 24 24" className={common} {...stroke} aria-hidden="true">
          <circle cx="9" cy="8" r="3.2" />
          <path d="M3.5 20c.6-3.4 2.8-5 5.5-5s4.9 1.6 5.5 5" />
          <circle cx="17" cy="9" r="2.4" />
          <path d="M15.5 14.6c2.9.1 4.4 1.7 5 4.4" />
        </svg>
      );
    case 'housekeeping':
      return (
        <svg viewBox="0 0 24 24" className={common} {...stroke} aria-hidden="true">
          <path d="M12 3l1.9 4.6L18.5 9l-4.6 1.9L12 15.5l-1.9-4.6L5.5 9l4.6-1.4z" />
          <path d="M18.5 15.5l.9 2.1 2.1.9-2.1.9-.9 2.1-.9-2.1-2.1-.9 2.1-.9z" />
        </svg>
      );
    case 'maintenance':
      return (
        <svg viewBox="0 0 24 24" className={common} {...stroke} aria-hidden="true">
          <path d="M14.5 6.5a4 4 0 0 0-5.6 5L4 16.4V20h3.6l4.9-4.9a4 4 0 0 0 5-5.6l-2.8 2.8-2.4-2.4z" />
        </svg>
      );
    case 'folios':
    case 'invoices':
      return (
        <svg viewBox="0 0 24 24" className={common} {...stroke} aria-hidden="true">
          <path d="M6 3.5h12v17l-2.6-1.8L12.8 20.5l-2.6-1.8L7.6 20.5 6 19.2z" />
          <path d="M9.5 8h5M9.5 11.5h5" />
        </svg>
      );
    case 'payments':
      return (
        <svg viewBox="0 0 24 24" className={common} {...stroke} aria-hidden="true">
          <rect x="3" y="6" width="18" height="13" rx="2" />
          <path d="M3 10.5h18M7 15h4" />
        </svg>
      );
    case 'staff-roles':
      return (
        <svg viewBox="0 0 24 24" className={common} {...stroke} aria-hidden="true">
          <circle cx="8" cy="8" r="3" />
          <path d="M3 20c.5-3 2.4-4.5 5-4.5 1.4 0 2.7.4 3.6 1.2M15 4.5a3 3 0 0 1 0 7M17.5 15.7c1.7.7 2.7 2 3 4.3" />
        </svg>
      );
    case 'properties':
      return (
        <svg viewBox="0 0 24 24" className={common} {...stroke} aria-hidden="true">
          <path d="M4 10l8-6 8 6v9a1 1 0 0 1-1 1h-5v-6h-4v6H5a1 1 0 0 1-1-1z" />
        </svg>
      );
    default:
      return (
        <svg viewBox="0 0 24 24" className={common} {...stroke} aria-hidden="true">
          <circle cx="12" cy="12" r="3" />
          <path d="M12 2.5v3M12 18.5v3M2.5 12h3M18.5 12h3" />
        </svg>
      );
  }
}

function NavButton({
  id,
  label,
  selected,
  onSelect,
}: {
  id: ViewId;
  label: string;
  selected: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      aria-current={selected ? 'page' : undefined}
      className="flex min-h-[40px] w-full items-center gap-2.5 rounded-control px-3 py-2 text-left text-[13.5px]"
      style={
        selected
          ? {
              background: 'var(--color-sidebar-active-bg)',
              color: 'var(--color-sidebar-active-ink)',
              border: '1px solid color-mix(in srgb, var(--color-sidebar-active-ink) 22%, transparent)',
              boxShadow: 'var(--shadow-xs), inset 3px 0 0 var(--color-sidebar-active-ink)',
              fontWeight: 650,
            }
          : {
              background: 'transparent',
              color: 'var(--color-sidebar-ink)',
              border: '1px solid transparent',
              fontWeight: 500,
            }
      }
    >
      <span className="flex-none" style={{ color: selected ? 'var(--color-sidebar-active-ink)' : 'inherit' }}>
        <NavIcon id={id} />
      </span>
      <span className="min-w-0 flex-1 truncate">{label}</span>
    </button>
  );
}

export function Sidebar({
  active,
  onNavigate,
  mobileOpen,
  onClose,
}: {
  active: ViewId;
  onNavigate: (v: ViewId) => void;
  mobileOpen: boolean;
  onClose: () => void;
}) {
  const { can } = useAuth();
  const [openSections, setOpenSections] = useState<string[]>(() => NAV_SECTIONS.map((s) => s.title));
  const visibleSections = NAV_SECTIONS.map((section) => ({
    ...section,
    items: section.items.filter((item) => {
      const permission = viewPermission(item.id);
      return !permission || can(permission);
    }),
  })).filter((section) => section.items.length > 0);

  const toggleSection = (title: string) => {
    setOpenSections((prev) => (prev.includes(title) ? prev.filter((t) => t !== title) : [...prev, title]));
  };

  const go = (v: ViewId) => {
    const section = sectionOf(v);
    setOpenSections((prev) => (prev.includes(section) ? prev : [...prev, section]));
    onNavigate(v);
    onClose();
  };

  const panel = (
    <div className="flex h-full flex-col" style={{ background: 'var(--color-sidebar)' }}>
      <div className="flex items-center gap-3 border-b px-4 pb-4 pt-5" style={{ borderColor: 'var(--color-sidebar-border)' }}>
        <span
          className="flex h-10 w-10 items-center justify-center rounded-xl font-brand text-[19px] font-bold"
          style={{ background: 'var(--color-dark-accent)', color: 'var(--color-sidebar-ink-strong)', boxShadow: 'var(--shadow-sm)' }}
          aria-hidden="true"
        >
          T
        </span>
        <div className="min-w-0">
          <p className="font-brand truncate text-[18px] font-bold leading-none tracking-tight" style={{ color: 'var(--color-sidebar-ink-strong)' }}>
            TriponX
          </p>
          <p className="mt-1 text-[10.5px] font-semibold uppercase tracking-[0.14em]" style={{ color: 'var(--color-sidebar-ink-muted)' }}>
            Hotel PMS
          </p>
        </div>
      </div>
      <nav className="min-h-0 flex-1 overflow-y-auto px-2.5 py-3" aria-label="Primary">
        <ul className="flex flex-col gap-0.5">
          {visibleSections.map((section) => {
            const open = openSections.includes(section.title);
            const containsActive = section.items.some((i) => i.id === active);
            if (section.title === 'Overview') {
              return (
                <li key={section.title}>
                  <ul className="flex flex-col gap-0.5">
                    {section.items.map((item) => (
                      <li key={item.id}>
                        <NavButton id={item.id} label={item.label} selected={item.id === active} onSelect={() => go(item.id)} />
                      </li>
                    ))}
                  </ul>
                </li>
              );
            }
            return (
              <li key={section.title} className="mt-4 first:mt-0">
                <button
                  type="button"
                  onClick={() => toggleSection(section.title)}
                  aria-expanded={open}
                  className="flex min-h-[32px] w-full items-center justify-between rounded-[8px] px-3 py-1.5 text-left text-[11px] font-bold uppercase tracking-[0.12em]"
                  style={{
                    color: containsActive ? 'var(--color-sidebar-ink-strong)' : 'var(--color-sidebar-ink-muted)',
                    background: 'transparent',
                  }}
                >
                  {section.title}
                  <svg viewBox="0 0 24 24" className={`h-4 w-4 transition-transform duration-200 ${open ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" aria-hidden="true">
                    <path d="M6 9l6 6 6-6" />
                  </svg>
                </button>
                {open ? (
                  <ul className="mt-1 flex flex-col gap-0.5">
                    {section.items.map((item) => (
                      <li key={item.id}>
                        <NavButton id={item.id} label={item.label} selected={item.id === active} onSelect={() => go(item.id)} />
                      </li>
                    ))}
                  </ul>
                ) : null}
              </li>
            );
          })}
        </ul>
      </nav>
    </div>
  );

  return (
    <>
      <aside
        className="hidden w-[260px] flex-none self-start border-r lg:sticky lg:top-0 lg:block lg:h-screen"
        style={{ borderColor: 'var(--color-border)' }}
      >
        {panel}
      </aside>
      {mobileOpen ? (
        <div className="fixed inset-0 z-40 lg:hidden" role="dialog" aria-modal="true" aria-label="Navigation">
          <button
            type="button"
            aria-label="Close navigation"
            className="pms-overlay-backdrop absolute inset-0 h-full w-full"
            style={{ background: 'var(--color-scrim)' }}
            onClick={onClose}
          />
          <aside
            className="pms-overlay-enter absolute left-0 top-0 h-full w-[86vw] max-w-[320px] overflow-hidden rounded-r-[16px] border-r"
            style={{ borderColor: 'var(--color-border)', boxShadow: 'var(--shadow-2xl)', background: 'var(--color-sidebar)' }}
          >
            <div className="flex items-center justify-between border-b px-4 py-3 lg:hidden" style={{ borderColor: 'var(--color-sidebar-border)' }}>
              <span className="text-[12px] font-bold uppercase tracking-[0.12em]" style={{ color: 'var(--color-sidebar-ink-muted)' }}>Menu</span>
              <button type="button" onClick={onClose} aria-label="Close navigation" className="pms-btn-ghost min-h-[38px] min-w-[38px] px-2.5 py-1.5">✕</button>
            </div>
            <div className="h-[calc(100%-53px)]">{panel}</div>
          </aside>
        </div>
      ) : null}
    </>
  );
}

const NOTICE_TONE_DOT: Record<string, string> = {
  warning: 'var(--color-warning-text)',
  info: 'var(--color-info-text)',
  danger: 'var(--color-danger-text)',
  success: 'var(--color-success-text)',
};

function useDismiss(onDismiss: () => void) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onDismiss();
    };
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onDismiss();
    };
    window.addEventListener('keydown', onKey);
    window.addEventListener('mousedown', onClick);
    return () => {
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('mousedown', onClick);
    };
  }, [onDismiss]);
  return ref;
}

export function Header({
  onMenu,
  onOpenThemes,
  onGo,
}: {
  onMenu: () => void;
  onOpenThemes: () => void;
  onGo: (t: NavTarget) => void;
}) {
  const { me, can, logout, switchProperty } = useAuth();
  const [panel, setPanel] = useState<'none' | 'notices' | 'profile'>('none');
  const [read, setRead] = useState<string[]>([]);
  const closePanels = () => setPanel('none');
  const dismissRef = useDismiss(closePanels);
  // Notices link into views, so hide the ones the current role cannot open.
  // Otherwise a tap lands on a screen whose API calls are all denied.
  const visibleNotices = NOTICES.filter((notice) => {
    const target = NAV_ITEMS.find((i) => i.id === notice.target);
    if (!target) return true;
    const permission = viewPermission(target.id);
    return !permission || can(permission);
  });
  const unread = visibleNotices.filter((n) => !read.includes(n.id)).length;
  const activeMembership = me?.user.propertyMemberships.find((membership) => membership.propertyId === me.activePropertyId);
  const fullName = me?.user.fullName ?? 'User';
  const roleName = activeMembership?.role.name ?? 'Staff';
  const initials = fullName.split(/\s+/).map((part) => part[0]).slice(0, 2).join('').toUpperCase();

  const openNotice = (target: string, id: string) => {
    setRead((r) => (r.includes(id) ? r : [...r, id]));
    const match = NAV_ITEMS.find((i) => i.id === target);
    onGo({ view: match ? match.id : 'dashboard' });
    closePanels();
  };

  return (
    <header
      className="sticky top-0 z-30 border-b"
      style={{
        background: 'color-mix(in srgb, var(--color-page) 78%, transparent)',
        backdropFilter: 'var(--blur-glass)',
        WebkitBackdropFilter: 'var(--blur-glass)',
        borderColor: 'var(--color-border)',
        boxShadow: '0 8px 28px -14px rgb(40 30 20 / 0.18)',
      }}
    >
      <div className="mx-auto flex w-full max-w-[1280px] items-center gap-2 px-3 py-3 sm:gap-3 sm:px-5 lg:px-8 2xl:max-w-[1440px]">
        <button
          type="button"
          onClick={onMenu}
          aria-label="Open navigation"
          className="pms-btn-ghost min-h-[42px] min-w-[42px] flex-none px-2.5 py-2 lg:hidden"
        >
          <svg viewBox="0 0 24 24" className="h-[18px] w-[18px]" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" aria-hidden="true">
            <path d="M4 7h16M4 12h16M4 17h16" />
          </svg>
        </button>
        <div className="min-w-0 flex-1 basis-40" aria-hidden="true" />
        <div className="relative flex-none" ref={panel === 'notices' ? dismissRef : undefined}>
          <button
            type="button"
            onClick={() => setPanel(panel === 'notices' ? 'none' : 'notices')}
            aria-label={`Notifications, ${unread} unread`}
            aria-expanded={panel === 'notices'}
            className="pms-btn-ghost relative min-h-[42px] min-w-[42px] px-2.5 py-2"
          >
            <svg viewBox="0 0 24 24" className="h-[18px] w-[18px]" fill="none" stroke="currentColor" strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M18 9a6 6 0 1 0-12 0c0 5-2 6-2 6h16s-2-1-2-6" />
              <path d="M10 20a2.2 2.2 0 0 0 4 0" />
            </svg>
            {unread > 0 ? (
              <span
                className="tnum absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full px-1 text-[10.5px] font-bold"
                style={{ background: 'var(--color-danger-text)', color: '#fff' }}
              >
                {unread}
              </span>
            ) : null}
          </button>
          {panel === 'notices' ? (
            <div
              className="pms-animate-pop absolute right-0 top-full z-40 mt-2 max-h-[70dvh] w-[min(340px,86vw)] overflow-y-auto rounded-card border"
              style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)', boxShadow: 'var(--shadow-popover)' }}
              role="dialog"
              aria-label="Notifications"
            >
              <p className="px-4 pb-1 pt-3 text-[12px] font-semibold uppercase tracking-[0.1em]" style={{ color: 'var(--color-ink-secondary)' }}>
                Sample alerts · not server-backed
              </p>
              <ul>
                {visibleNotices.map((n) => (
                  <li key={n.id}>
                    <button
                      type="button"
                      onClick={() => openNotice(n.target, n.id)}
                      className="flex w-full items-start gap-2.5 px-4 py-2.5 text-left"
                    >
                      <span className="mt-1.5 h-2 w-2 flex-none rounded-full" style={{ background: NOTICE_TONE_DOT[n.tone] ?? NOTICE_TONE_DOT.info }} aria-hidden="true" />
                      <span className="min-w-0 flex-1">
                        <span className="flex items-center justify-between gap-2">
                          <span className="text-[13px] font-semibold" style={{ color: 'var(--color-ink)' }}>
                            {!read.includes(n.id) ? '● ' : ''}{n.title}
                          </span>
                          <span className="tnum flex-none text-[11px]" style={{ color: 'var(--color-ink-muted)' }}>
                            {n.time}
                          </span>
                        </span>
                        <span className="mt-0.5 block text-[12px]" style={{ color: 'var(--color-ink-secondary)' }}>
                          {n.detail}
                        </span>
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
              <p className="pms-helper px-4 py-3">Selecting an alert opens the relevant screen.</p>
            </div>
          ) : null}
        </div>
        <button
          type="button"
          onClick={onOpenThemes}
          className="pms-btn-primary hidden px-3.5 py-2.5 sm:block"
        >
          Customize theme
        </button>
        <div className="relative" ref={panel === 'profile' ? dismissRef : undefined}>
          <button
            type="button"
            onClick={() => setPanel(panel === 'profile' ? 'none' : 'profile')}
            aria-label="Open user profile menu"
            aria-expanded={panel === 'profile'}
            className="flex items-center gap-2 rounded-full border py-1 pl-1 pr-2.5"
            style={{ borderColor: 'var(--color-border)', background: 'var(--color-surface)' }}
          >
            <span
              className="flex h-8 w-8 items-center justify-center rounded-full text-[12px] font-semibold"
              style={{ background: 'var(--color-primary)', color: 'var(--color-primary-foreground)' }}
              aria-hidden="true"
            >
              {initials}
            </span>
            <span className="hidden text-left sm:block">
              <span className="block text-[12.5px] font-semibold leading-tight" style={{ color: 'var(--color-ink)' }}>
                {roleName}
              </span>
              <span className="block text-[11px] leading-tight" style={{ color: 'var(--color-ink-secondary)' }}>
                {fullName}
              </span>
            </span>
          </button>
          {panel === 'profile' ? (
            <div
              className="pms-animate-pop absolute right-0 top-full z-40 mt-2 w-[min(240px,80vw)] overflow-hidden rounded-[14px] border"
              style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)', boxShadow: 'var(--shadow-popover)' }}
              role="menu"
              aria-label="User profile"
            >
              {[
                { label: 'My profile & settings', target: { view: 'settings' } as NavTarget },
                // The Staff screen needs `user.read`; showing it without the
                // permission renders a 403 error page behind the menu.
                ...(can('user.read') ? [{ label: 'Staff directory', target: { view: 'staff-roles' } as NavTarget }] : []),
                { label: 'Appearance', target: null },
              ].map((item) => (
                <button
                  key={item.label}
                  type="button"
                  role="menuitem"
                  onClick={() => {
                    if (item.target) onGo(item.target);
                    else onOpenThemes();
                    closePanels();
                  }}
                  className="block w-full px-4 py-2.5 text-left text-[13px] font-medium"
                  style={{ color: 'var(--color-ink)' }}
                >
                  {item.label}
                </button>
              ))}
              {me?.user.propertyMemberships.filter((membership) => membership.isActive && membership.propertyId !== me.activePropertyId).map((membership) => (
                <button
                  key={membership.propertyId}
                  type="button"
                  role="menuitem"
                  onClick={() => {
                    closePanels();
                    void switchProperty(membership.propertyId).catch((error: unknown) => toast('Property switch failed', { detail: displayApiError(error), tone: 'danger' }));
                  }}
                  className="block w-full border-t px-4 py-2.5 text-left text-[13px] font-medium"
                  style={{ borderColor: 'var(--color-border)', color: 'var(--color-ink)' }}
                >
                  Switch to {membership.property.name}
                </button>
              ))}
              <button
                type="button"
                role="menuitem"
                onClick={() => {
                  closePanels();
                  void logout().catch((error: unknown) => toast('Sign out failed', { detail: displayApiError(error), tone: 'danger' }));
                }}
                className="block w-full border-t px-4 py-2.5 text-left text-[13px] font-medium"
                style={{ borderColor: 'var(--color-border)', color: 'var(--color-ink-secondary)' }}
              >
                Sign out
              </button>
            </div>
          ) : null}
        </div>
      </div>
    </header>
  );
}
