import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import * as Lucide from 'lucide-react';
import { NAV_ITEMS, NAV_SECTIONS, sectionOf, viewPermission } from './nav';
import type { NavTarget, ViewId } from './nav';
import { NOTICES } from '../constants/notices';
import { toast } from './toastStore';
import { useAuth } from '../features/auth/AuthContext';
import { displayApiError } from '../lib/api/client';
import { useTheme } from '../theme/useTheme';
import { THEME_PRESETS } from '../theme/presets';
import { folioApi, frontDeskApi, reportsApi } from '../lib/api/pms';

const NAV_ICONS: Record<ViewId, Lucide.LucideIcon> = {
  dashboard: Lucide.LayoutDashboard,
  reservations: Lucide.CalendarDays,
  'new-reservation': Lucide.CalendarPlus,
  'rate-management': Lucide.SlidersHorizontal,
  'channel-manager': Lucide.Globe,
  'check-in': Lucide.DoorOpen,
  'check-out': Lucide.DoorClosed,
  'in-house': Lucide.Users,
  guests: Lucide.BookUser,
  'walk-in': Lucide.Footprints,
  'room-overview': Lucide.BedDouble,
  'room-types': Lucide.Layers,
  'room-inventory': Lucide.Boxes,
  'status-board': Lucide.LayoutGrid,
  housekeeping: Lucide.Sparkles,
  maintenance: Lucide.Wrench,
  folios: Lucide.ReceiptText,
  invoices: Lucide.FileText,
  payments: Lucide.CreditCard,
  'night-audit': Lucide.MoonStar,
  reports: Lucide.BarChart3,
  'occupancy-report': Lucide.Percent,
  'revenue-report': Lucide.TrendingUp,
  'arrivals-departures': Lucide.ArrowLeftRight,
  'staff-roles': Lucide.UserCog,
  properties: Lucide.Building2,
  settings: Lucide.Settings,
};

function NavIcon({ id, className = 'h-[18px] w-[18px] flex-none' }: { id: ViewId; className?: string }) {
  const Icon = NAV_ICONS[id] || Lucide.CircleDot;
  return <Icon className={className} size={18} strokeWidth={1.8} aria-hidden="true" />;
}

function NavButton({
  id,
  label,
  selected,
  onSelect,
  fourthColor,
}: {
  id: ViewId;
  label: string;
  selected: boolean;
  onSelect: () => void;
  fourthColor?: string;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      aria-current={selected ? 'page' : undefined}
      className="flex min-h-[40px] w-full items-center gap-2.5 rounded-xl px-3 py-2 text-left text-sm transition-all cursor-pointer hover:bg-slate-100/70"
      style={
        selected
          ? {
              background: fourthColor || 'var(--color-sidebar-active-bg)',
              color: 'var(--color-primary)',
              border: '1.5px solid var(--color-primary)',
              boxShadow: 'var(--shadow-xs)',
              fontWeight: 650,
            }
          : {
              background: 'transparent',
              color: '#475569',
              border: '1.5px solid transparent',
              fontWeight: 500,
            }
      }
    >
      <span className="flex-none" style={{ color: selected ? 'var(--color-primary)' : '#64748b' }}>
        <NavIcon id={id} />
      </span>
      <span className="min-w-0 flex-1 truncate" style={{ color: selected ? 'var(--color-primary)' : '#334155' }}>
        {label}
      </span>
    </button>
  );
}

const SECTION_ICONS: Record<string, Lucide.LucideIcon> = {
  Overview: Lucide.LayoutDashboard,
  'Front Office': Lucide.CalendarDays,
  'Rooms & Housekeeping': Lucide.BedDouble,
  'Rates & Distribution': Lucide.SlidersHorizontal,
  Finance: Lucide.ReceiptText,
  Analytics: Lucide.BarChart3,
  Administration: Lucide.ShieldCheck,
};

interface TooltipData {
  x: number;
  y: number;
  title: string;
  hint?: string;
  badge?: string;
}

interface FlyoutData {
  sectionTitle: string;
  x: number;
  y: number;
}

export function Sidebar({
  active,
  onNavigate,
  mobileOpen,
  onClose,
  onOpenThemes,
}: {
  active: ViewId;
  onNavigate: (v: ViewId) => void;
  mobileOpen: boolean;
  onClose: () => void;
  onOpenThemes?: () => void;
}) {
  const { can } = useAuth();
  const { preset } = useTheme();
  const activePreset = THEME_PRESETS[preset] || THEME_PRESETS.ocean;
  const fourthColor = activePreset.swatch[3];

  // Collapsed compact mode state (persisted) - defaults to true (compact icon-based sidebar)
  const [collapsed, setCollapsed] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem('pms_sidebar_collapsed');
      return saved !== null ? JSON.parse(saved) : true;
    } catch {
      return true;
    }
  });

  const toggleCollapsed = () => {
    setCollapsed((prev) => {
      const next = !prev;
      try {
        localStorage.setItem('pms_sidebar_collapsed', JSON.stringify(next));
      } catch {
        // ignore storage errors
      }
      return next;
    });
    setFlyout(null);
    setTooltip(null);
  };

  const [tooltip, setTooltip] = useState<TooltipData | null>(null);
  const [flyout, setFlyout] = useState<FlyoutData | null>(null);
  const flyoutRef = useRef<HTMLDivElement>(null);

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
    setFlyout(null);
    setTooltip(null);
  };

  // Keyboard shortcut listener (Ctrl+\ or Escape) and click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (flyoutRef.current && !flyoutRef.current.contains(e.target as Node)) {
        setFlyout(null);
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setFlyout(null);
        setTooltip(null);
      }
      if ((e.ctrlKey || e.metaKey) && e.key === '\\') {
        e.preventDefault();
        toggleCollapsed();
      }
    };

    if (flyout) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [flyout]);

  const handleMouseEnter = (
    e: React.MouseEvent<HTMLElement>,
    title: string,
    hint?: string,
    badge?: string
  ) => {
    if (flyout?.sectionTitle === title) {
      setTooltip(null);
      return;
    }
    const rect = e.currentTarget.getBoundingClientRect();
    setTooltip({
      x: rect.right + 12,
      y: rect.top + rect.height / 2,
      title,
      hint,
      badge,
    });
  };

  const handleMouseLeave = () => {
    setTooltip(null);
  };

  const handleSectionClick = (
    e: React.MouseEvent<HTMLElement>,
    section: (typeof visibleSections)[number]
  ) => {
    if (section.items.length === 1) {
      go(section.items[0].id);
      setFlyout(null);
      setTooltip(null);
      return;
    }

    if (flyout?.sectionTitle === section.title) {
      setFlyout(null);
    } else {
      const rect = e.currentTarget.getBoundingClientRect();
      setTooltip(null);
      setFlyout({
        sectionTitle: section.title,
        x: rect.right + 10,
        y: Math.max(16, Math.min(window.innerHeight - 440, rect.top - 12)),
      });
    }
  };

  // ================= EXPANDED FULL PANEL (Used when expanded or inside mobile drawer) =================
  const fullPanel = (
    <div className="flex h-full flex-col bg-white" style={{ background: '#ffffff', color: '#1e293b' }}>
      {/* Brand Header */}
      <div className="flex items-center justify-between border-b px-4 pb-4 pt-5" style={{ borderColor: 'var(--color-border)' }}>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => go('dashboard')}
            className="flex h-10 w-10 items-center justify-center rounded-xl font-brand text-[19px] font-bold shadow-sm transition-transform hover:scale-105 active:scale-95 cursor-pointer"
            style={{ background: 'var(--color-primary, #165dfc)', color: '#ffffff' }}
            aria-label="Dashboard"
          >
            T
          </button>
          <div className="min-w-0">
            <p className="font-brand truncate text-[18px] font-bold leading-none tracking-tight text-slate-900">
              TriponX
            </p>
            <p className="mt-1 text-[10.5px] font-semibold uppercase tracking-[0.14em] text-slate-400">
              Hotel PMS
            </p>
          </div>
        </div>

        {/* Collapse button on desktop */}
        <button
          type="button"
          onClick={toggleCollapsed}
          title="Collapse to icon sidebar (Ctrl+\)"
          className="hidden lg:flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-colors cursor-pointer"
        >
          <Lucide.ChevronsLeft size={16} />
        </button>
      </div>

      {/* Nav Menu Items */}
      <nav className="min-h-0 flex-1 overflow-y-auto px-2.5 py-3" aria-label="Primary">
        <ul className="flex flex-col gap-0.5">
          {visibleSections.map((section) => {
            const open = openSections.includes(section.title);
            const containsActive = section.items.some((i) => i.id === active);
            const SectionIcon = SECTION_ICONS[section.title] || Lucide.Layers;

            if (section.title === 'Overview') {
              return (
                <li key={section.title}>
                  <ul className="flex flex-col gap-0.5">
                    {section.items.map((item) => (
                      <li key={item.id}>
                        <NavButton id={item.id} label={item.label} selected={item.id === active} onSelect={() => go(item.id)} fourthColor={fourthColor} />
                      </li>
                    ))}
                  </ul>
                </li>
              );
            }

            return (
              <li key={section.title} className="mt-3.5 first:mt-0">
                <button
                  type="button"
                  onClick={() => toggleSection(section.title)}
                  aria-expanded={open}
                  className="flex min-h-[34px] w-full items-center justify-between rounded-lg px-2.5 py-1.5 text-left text-[11px] font-bold uppercase tracking-[0.12em] transition-colors cursor-pointer hover:bg-slate-100/60"
                  style={{
                    color: containsActive ? 'var(--color-primary)' : '#64748b',
                  }}
                >
                  <span className="flex items-center gap-2">
                    <SectionIcon size={14} style={{ color: containsActive ? 'var(--color-primary)' : '#94a3b8' }} />
                    <span className="font-bold">{section.title}</span>
                  </span>
                  <Lucide.ChevronDown
                    size={14}
                    className={`transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
                    style={{ color: containsActive ? 'var(--color-primary)' : '#94a3b8' }}
                  />
                </button>
                {open ? (
                  <ul className="mt-1 flex flex-col gap-0.5 pl-1.5">
                    {section.items.map((item) => (
                      <li key={item.id}>
                        <NavButton id={item.id} label={item.label} selected={item.id === active} onSelect={() => go(item.id)} fourthColor={fourthColor} />
                      </li>
                    ))}
                  </ul>
                ) : null}
              </li>
            );
          })}
        </ul>
      </nav>

      {/* Footer controls in full panel */}
      <div className="border-t p-3 flex flex-col gap-1.5" style={{ borderColor: 'var(--color-border)' }}>
        {onOpenThemes && (
          <button
            type="button"
            onClick={onOpenThemes}
            className="flex items-center gap-2.5 rounded-md px-2.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
          >
            <Lucide.Palette size={16} className="text-[var(--color-primary)]" />
            <span>Theme Colors</span>
          </button>
        )}
        <button
          type="button"
          onClick={toggleCollapsed}
          className="hidden lg:flex items-center gap-2.5 rounded-md px-2.5 py-2 text-xs font-medium text-slate-500 hover:bg-slate-100 hover:text-slate-900 transition-colors cursor-pointer"
        >
          <Lucide.ChevronsLeft size={16} />
          <span>Collapse sidebar</span>
        </button>
      </div>
    </div>
  );

  // ================= COMPACT ICON RAIL (Desktop Default) =================
  const compactRail = (
    <div className="flex h-full flex-col items-center justify-between bg-white" style={{ background: '#ffffff' }}>
      {/* 1. Top Brand Logo */}
      <div className="flex h-16 w-full items-center justify-center border-b" style={{ borderColor: 'var(--color-border)' }}>
        <button
          type="button"
          onClick={() => go('dashboard')}
          onMouseEnter={(e) => handleMouseEnter(e, 'TriponX Hotel PMS', 'Go to Dashboard', 'PMS')}
          onMouseLeave={handleMouseLeave}
          className="flex h-10 w-10 items-center justify-center rounded-xl font-brand text-[19px] font-bold shadow-sm transition-transform hover:scale-105 active:scale-95 cursor-pointer"
          style={{ background: 'var(--color-primary, #165dfc)', color: '#ffffff' }}
          aria-label="TriponX Home"
        >
          T
        </button>
      </div>

      {/* 2. Middle Icon Navigation Rail */}
      <nav className="flex-1 w-full overflow-y-auto px-2 py-3.5 flex flex-col items-center gap-2.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden" aria-label="Icon Navigation">
        {visibleSections.map((section) => {
          const isDirectItem = section.items.length === 1;
          const directItem = isDirectItem ? section.items[0] : null;
          const Icon = isDirectItem && directItem ? (NAV_ICONS[directItem.id] || Lucide.LayoutDashboard) : (SECTION_ICONS[section.title] || Lucide.Layers);
          const isSectionActive = section.items.some((i) => i.id === active);
          const isFlyoutOpen = flyout?.sectionTitle === section.title;

          return (
            <div key={section.title} className="relative flex items-center justify-center w-full">
              {/* Active left indicator pill */}
              {isSectionActive && (
                <span
                  className="absolute left-0 top-2 bottom-2 w-1 rounded-r-full"
                  style={{ background: 'var(--color-primary)' }}
                />
              )}

              <button
                type="button"
                onClick={(e) => handleSectionClick(e, section)}
                onMouseEnter={(e) =>
                  handleMouseEnter(
                    e,
                    isDirectItem ? directItem!.label : section.title,
                    isDirectItem ? directItem!.hint : `${section.items.length} views • Click to open menu`,
                    isSectionActive ? 'Active' : undefined
                  )
                }
                onMouseLeave={handleMouseLeave}
                aria-label={section.title}
                aria-expanded={isFlyoutOpen}
                className={`relative flex h-11 w-11 items-center justify-center rounded-xl transition-all duration-150 cursor-pointer ${
                  isFlyoutOpen
                    ? 'ring-2 ring-slate-300 scale-105'
                    : 'hover:bg-slate-100 hover:scale-105 active:scale-95'
                }`}
                style={
                  isSectionActive
                    ? {
                        background: fourthColor,
                        border: '1.5px solid var(--color-primary)',
                        boxShadow: 'var(--shadow-xs)',
                      }
                    : {
                        background: isFlyoutOpen ? '#f1f5f9' : 'transparent',
                        border: '1.5px solid transparent',
                      }
                }
              >
                <Icon
                  size={20}
                  strokeWidth={isSectionActive ? 2.2 : 1.8}
                  style={{ color: isSectionActive ? 'var(--color-primary)' : '#64748b' }}
                />

                {/* Sub-item count badge indicator */}
                {!isDirectItem && (
                  <span
                    className="absolute -bottom-0.5 -right-0.5 flex h-3.5 min-w-[14px] px-0.5 items-center justify-center rounded-full text-[8.5px] font-bold"
                    style={{
                      background: isSectionActive ? 'var(--color-primary)' : '#94a3b8',
                      color: '#ffffff',
                    }}
                  >
                    {section.items.length}
                  </span>
                )}
              </button>
            </div>
          );
        })}
      </nav>

      {/* 3. Bottom Utility Actions */}
      <div className="flex h-20 w-full flex-col items-center justify-center border-t gap-1.5 py-2" style={{ borderColor: 'var(--color-border)' }}>
        {/* Theme Swatcher Trigger */}
        {onOpenThemes && (
          <button
            type="button"
            onClick={onOpenThemes}
            onMouseEnter={(e) => handleMouseEnter(e, 'Hotel Theme', 'Switch between 8 color palettes', 'Theme')}
            onMouseLeave={handleMouseLeave}
            className="flex h-9 w-9 items-center justify-center rounded-xl transition-all hover:bg-slate-100 hover:scale-110 active:scale-95 cursor-pointer text-slate-500 hover:text-slate-900"
            aria-label="Change Theme"
          >
            <Lucide.Palette size={18} />
          </button>
        )}

        {/* Expand Sidebar Toggle */}
        <button
          type="button"
          onClick={toggleCollapsed}
          onMouseEnter={(e) => handleMouseEnter(e, 'Expand Sidebar', 'Show full navigation (Ctrl+\\)', 'Shortcut')}
          onMouseLeave={handleMouseLeave}
          className="flex h-8 w-8 items-center justify-center rounded-lg transition-all hover:bg-slate-100 hover:scale-110 active:scale-95 cursor-pointer text-slate-400 hover:text-slate-900"
          aria-label="Expand sidebar"
        >
          <Lucide.ChevronsRight size={17} />
        </button>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Sidebar: Smoothly transitions between compact 72px icon rail and full 260px panel */}
      <aside
        className={`hidden flex-none self-start border-r lg:sticky lg:top-0 lg:block lg:h-screen transition-[width] duration-200 ease-in-out ${
          collapsed ? 'w-[72px]' : 'w-[260px]'
        }`}
        style={{ borderColor: 'var(--color-border)', background: '#ffffff' }}
      >
        {collapsed ? compactRail : fullPanel}
      </aside>

      {/* Floating Tooltip via Portal */}
      {tooltip &&
        createPortal(
          <div
            className="pointer-events-none fixed z-[9999] flex items-center animate-in fade-in zoom-in-95 duration-100"
            style={{
              left: `${tooltip.x}px`,
              top: `${tooltip.y}px`,
              transform: 'translateY(-50%)',
            }}
          >
            {/* Arrow pointing left */}
            <div className="mr-[-1px] h-0 w-0 border-y-[5px] border-y-transparent border-r-[6px] border-r-slate-900" />
            <div className="rounded-xl bg-slate-900/95 backdrop-blur-md px-3 py-1.5 text-white shadow-2xl border border-slate-700/60 text-left">
              <div className="flex items-center gap-1.5">
                <span className="text-[12.5px] font-semibold tracking-tight text-white">
                  {tooltip.title}
                </span>
                {tooltip.badge && (
                  <span className="rounded-md bg-white/20 px-1.5 py-0.5 text-[9.5px] font-bold tracking-wide uppercase text-slate-200">
                    {tooltip.badge}
                  </span>
                )}
              </div>
              {tooltip.hint && (
                <p className="mt-0.5 text-[11px] text-slate-300 font-normal">
                  {tooltip.hint}
                </p>
              )}
            </div>
          </div>,
          document.body
        )}

      {/* Expandable Menu Items Flyout Panel via Portal */}
      {flyout &&
        (() => {
          const activeSection = visibleSections.find((s) => s.title === flyout.sectionTitle);
          if (!activeSection) return null;
          const SectionIcon = SECTION_ICONS[activeSection.title] || Lucide.Layers;

          return createPortal(
            <div
              ref={flyoutRef}
              className="fixed z-[9990] w-[310px] overflow-hidden rounded-2xl border border-slate-200/90 bg-white text-slate-800 shadow-[0_20px_50px_rgba(15,23,42,0.18)] animate-in fade-in zoom-in-95 duration-150"
              style={{
                left: `${flyout.x}px`,
                top: `${flyout.y}px`,
              }}
            >
              {/* Flyout Header */}
              <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50/80 px-4 py-3">
                <div className="flex items-center gap-2.5">
                  <div
                    className="flex h-7 w-7 items-center justify-center rounded-lg shadow-2xs"
                    style={{
                      background: 'var(--color-primary, #165dfc)',
                      color: '#ffffff',
                    }}
                  >
                    <SectionIcon size={15} />
                  </div>
                  <div>
                    <p className="text-[13px] font-bold text-slate-900 leading-tight">
                      {activeSection.title}
                    </p>
                    <p className="text-[10.5px] font-medium text-slate-400">
                      {activeSection.items.length} views available
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setFlyout(null)}
                  className="flex h-6 w-6 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-200/60 hover:text-slate-600 transition-colors cursor-pointer"
                  aria-label="Close menu"
                >
                  <Lucide.X size={14} />
                </button>
              </div>

              {/* Flyout Items List */}
              <div className="max-h-[60vh] overflow-y-auto p-1.5 flex flex-col gap-0.5">
                {activeSection.items.map((item) => {
                  const isItemActive = item.id === active;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => {
                        go(item.id);
                        setFlyout(null);
                        setTooltip(null);
                      }}
                      style={
                        isItemActive
                          ? {
                              background: fourthColor,
                              border: '1.5px solid var(--color-primary)',
                            }
                          : {
                              border: '1.5px solid transparent',
                            }
                      }
                      className={`group flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left transition-all cursor-pointer ${
                        isItemActive
                          ? 'font-semibold shadow-2xs'
                          : 'text-slate-700 hover:bg-slate-100/80 hover:text-slate-900'
                      }`}
                    >
                      <div
                        className="flex h-8 w-8 flex-none items-center justify-center rounded-lg transition-colors"
                        style={
                          isItemActive
                            ? {
                                background: 'transparent',
                                color: 'var(--color-primary)',
                              }
                            : {
                                background: '#f1f5f9',
                                color: '#64748b',
                              }
                        }
                      >
                        <NavIcon id={item.id} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between">
                          <p
                            className="text-[13px] font-semibold leading-snug truncate"
                            style={{ color: isItemActive ? 'var(--color-primary)' : '#1e293b' }}
                          >
                            {item.label}
                          </p>
                          {isItemActive && (
                            <span className="h-1.5 w-1.5 rounded-full flex-none" style={{ background: 'var(--color-primary)' }} />
                          )}
                        </div>
                        <p className="text-[11px] text-slate-400 font-normal truncate mt-0.5">
                          {item.hint}
                        </p>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>,
            document.body
          );
        })()}

      {/* Mobile Drawer */}
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
            style={{ borderColor: 'var(--color-border)', boxShadow: 'var(--shadow-2xl)', background: '#ffffff' }}
          >
            <div className="flex items-center justify-between border-b px-4 py-3 lg:hidden" style={{ borderColor: 'var(--color-border)' }}>
              <span className="text-[12px] font-bold uppercase tracking-[0.12em] text-slate-400">Menu</span>
              <button type="button" onClick={onClose} aria-label="Close navigation" className="pms-btn-ghost min-h-[38px] min-w-[38px] px-2.5 py-1.5 cursor-pointer">✕</button>
            </div>
            <div className="h-[calc(100%-53px)]">{fullPanel}</div>
          </aside>
        </div>
      ) : null}
    </>
  );
}

const NOTICE_TONE_CONFIG: Record<
  string,
  {
    icon: Lucide.LucideIcon;
    bg: string;
    border: string;
    color: string;
    badgeBg: string;
    badgeText: string;
    label: string;
  }
> = {
  danger: {
    icon: Lucide.AlertOctagon,
    bg: 'color-mix(in srgb, #ef4444 14%, var(--color-surface))',
    border: 'color-mix(in srgb, #ef4444 28%, transparent)',
    color: '#ef4444',
    badgeBg: 'color-mix(in srgb, #ef4444 16%, transparent)',
    badgeText: '#dc2626',
    label: 'Critical Alert',
  },
  warning: {
    icon: Lucide.AlertTriangle,
    bg: 'color-mix(in srgb, #f59e0b 14%, var(--color-surface))',
    border: 'color-mix(in srgb, #f59e0b 28%, transparent)',
    color: '#d97706',
    badgeBg: 'color-mix(in srgb, #f59e0b 16%, transparent)',
    badgeText: '#b45309',
    label: 'Action Required',
  },
  info: {
    icon: Lucide.Info,
    bg: 'color-mix(in srgb, #0ea5e9 14%, var(--color-surface))',
    border: 'color-mix(in srgb, #0ea5e9 28%, transparent)',
    color: '#0284c7',
    badgeBg: 'color-mix(in srgb, #0ea5e9 16%, transparent)',
    badgeText: '#0369a1',
    label: 'Operational Notice',
  },
  success: {
    icon: Lucide.CheckCircle2,
    bg: 'color-mix(in srgb, #10b981 14%, var(--color-surface))',
    border: 'color-mix(in srgb, #10b981 28%, transparent)',
    color: '#059669',
    badgeBg: 'color-mix(in srgb, #10b981 16%, transparent)',
    badgeText: '#047857',
    label: 'Completed / Ready',
  },
};

const SEARCH_KEYWORDS: Record<ViewId, string[]> = {
  dashboard: ['home', 'overview', 'summary', 'metrics', 'kpi', 'revenue', 'occupancy', 'analytics'],
  reservations: ['booking', 'bookings', 'calendar', 'calendar view', 'schedule', 'stays', 'guest reservation'],
  'new-reservation': ['create booking', 'add reservation', 'new booking', 'book room', 'reservation create', 'make reservation'],
  'rate-management': ['rate', 'rates', 'pricing', 'seasonal pricing', 'restrictions', 'minimum stay', 'stop sell', 'cta', 'ctd', 'rate plan', 'bar', 'rate calendar', 'rate management'],
  'channel-manager': ['channel', 'channels', 'ota', 'otas', 'booking.com', 'airbnb', 'expedia', 'agoda', 'makemytrip', 'goibibo', 'rate sync', 'inventory sync', 'distribution', 'channel manager'],
  'check-in': ['arrival', 'arrivals', 'check in', 'guest arrival', 'reception', 'front desk', 'key handover', 'today arrivals'],
  'check-out': ['departure', 'departures', 'check out', 'guest departure', 'settle folio', 'bill settle', 'leave hotel'],
  'in-house': ['active guests', 'staying', 'residents', 'occupied rooms', 'current guests', 'in house'],
  guests: ['guest list', 'profiles', 'directory', 'customers', 'clients', 'loyalty', 'history', 'vip', 'guest history'],
  'walk-in': ['walk in', 'no reservation', 'direct booking', 'instant check in', 'immediate guest', 'walk in guest'],
  'room-overview': ['rooms', 'beds', 'room matrix', 'floor plan', 'available rooms', 'room status', 'grid'],
  'room-types': ['categories', 'suites', 'deluxe', 'rates', 'pricing', 'amenities', 'bedding', 'room category'],
  'room-inventory': ['inventory', 'room list', 'room numbers', 'room table', 'all rooms', 'bed list'],
  'status-board': ['grid', 'live board', 'room board', 'occupancy board', 'status grid'],
  housekeeping: ['cleaning', 'clean', 'dirty', 'maid', 'linen', 'housekeeper', 'turn down', 'inspected', 'room cleaning'],
  maintenance: ['repairs', 'broken', 'leak', 'ac', 'plumbing', 'work order', 'issue', 'ticket', 'fix', 'engineer'],
  folios: ['billing', 'charges', 'invoice', 'guest bill', 'account', 'tab', 'ledger', 'balance', 'guest folio'],
  payments: ['cash', 'card', 'credit', 'payment ledger', 'transactions', 'receipt', 'settlement', 'refund'],
  invoices: ['tax invoice', 'bills', 'printable bill', 'pdf invoice', 'corporate billing', 'receipts'],
  'night-audit': ['night audit', 'day close', 'end of day', 'eod', 'post room charges', 'rollover', 'audit summary', 'pre-audit checks', 'close day', 'audit logs'],
  reports: ['analytics', 'metrics', 'audit', 'daily report', 'financials', 'manager report', 'summary report'],
  'occupancy-report': ['occupancy', 'percentage', 'fill rate', 'room nights', 'adr', 'capacity'],
  'revenue-report': ['income', 'earnings', 'revpar', 'adr', 'sales', 'financial performance', 'money made'],
  'arrivals-departures': ['movements', 'daily movement', 'transfers', 'today arrivals', 'today departures'],
  'staff-roles': ['team', 'employees', 'permissions', 'users', 'access control', 'rbac', 'security', 'hotel staff'],
  properties: ['hotels', 'branches', 'resorts', 'locations', 'chains', 'multi property', 'locations'],
  settings: ['configuration', 'preferences', 'theme', 'color theme', 'hotel details', 'taxes', 'policies', 'profile'],
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
  const [readNotices, setReadNotices] = useState<string[]>([]);
  const [dismissedNotices, setDismissedNotices] = useState<string[]>([]);
  const [noticeTab, setNoticeTab] = useState<'all' | 'unread' | 'urgent'>('all');
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);

  const searchInputRef = useRef<HTMLInputElement>(null);
  const closePanels = () => setPanel('none');
  const dismissRef = useDismiss(closePanels);

  const [kpi, setKpi] = useState({
    occupancyPct: 30,
    arrivalsCount: 8,
    departuresCount: 7,
    inHouseCount: 8,
    totalRevenue: 0,
    pendingPaymentsCount: 3,
  });

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const [daily, arrivals, departures, payments] = await Promise.all([
          reportsApi.dailyFlash().catch(() => null),
          frontDeskApi.arrivals().catch(() => ({ data: [] })),
          frontDeskApi.departures().catch(() => ({ data: [] })),
          folioApi.listPayments().catch(() => []),
        ]);
        if (!mounted) return;
        const rooms = daily?.rooms;
        const occupiedRooms = rooms?.occupied ?? 6;
        const totalRooms = rooms?.total ?? 20;
        const occupancyPct = totalRooms > 0 ? Math.round((occupiedRooms / totalRooms) * 100) : 30;
        const arrivalsCount = arrivals?.data?.length || 8;
        const departuresCount = departures?.data?.length || 7;
        const inHouseCount = daily?.inHouseCount || 8;

        let totalRevenue = 0;
        if (daily?.businessDate) {
          const rev = await reportsApi.revenue(daily.businessDate, daily.businessDate).catch(() => null);
          if (rev?.grossRevenue) {
            totalRevenue = Number(rev.grossRevenue) || 0;
          }
        }

        const pendingPaymentsCount = payments?.filter((p: { status?: string }) => p.status === 'Pending').length || 3;

        if (mounted) {
          setKpi({
            occupancyPct,
            arrivalsCount,
            departuresCount,
            inHouseCount,
            totalRevenue,
            pendingPaymentsCount,
          });
        }
      } catch {
        // keep defaults
      }
    })();

    return () => {
      mounted = false;
    };
  }, [me?.activePropertyId]);



  // Global Ctrl+F / Cmd+F / Ctrl+K / Cmd+K listener
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const isCtrlOrCmd = e.ctrlKey || e.metaKey;
      const key = e.key.toLowerCase();
      if (isCtrlOrCmd && (key === 'f' || key === 'k')) {
        e.preventDefault();
        setSearchOpen(true);
      }
      if (e.key === 'Escape') {
        setSearchOpen(false);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const [prevSearchOpen, setPrevSearchOpen] = useState(searchOpen);
  if (prevSearchOpen !== searchOpen) {
    setPrevSearchOpen(searchOpen);
    if (!searchOpen) {
      setSearchQuery('');
      setSelectedIndex(0);
    }
  }

  useEffect(() => {
    if (searchOpen) {
      const timer = window.setTimeout(() => {
        searchInputRef.current?.focus();
        searchInputRef.current?.select();
        setSelectedIndex(0);
      }, 50);
      return () => window.clearTimeout(timer);
    }
  }, [searchOpen]);

  // Notices filtering & permissions
  const visibleNotices = NOTICES.filter((notice) => {
    if (dismissedNotices.includes(notice.id)) return false;
    const target = NAV_ITEMS.find((i) => i.id === notice.target);
    if (!target) return true;
    const permission = viewPermission(target.id);
    return !permission || can(permission);
  });

  const unreadCount = visibleNotices.filter((n) => !readNotices.includes(n.id)).length;
  const urgentCount = visibleNotices.filter((n) => n.tone === 'danger' || n.tone === 'warning').length;

  const filteredNotices = visibleNotices.filter((n) => {
    const isUnread = !readNotices.includes(n.id);
    if (noticeTab === 'unread') return isUnread;
    if (noticeTab === 'urgent') return n.tone === 'danger' || n.tone === 'warning';
    return true;
  });

  const activeMembership = me?.user.propertyMemberships.find((m) => m.propertyId === me.activePropertyId);
  const otherMemberships = me?.user.propertyMemberships.filter((m) => m.isActive && m.propertyId !== me.activePropertyId) ?? [];
  const fullName = me?.user.fullName ?? 'Hospitality Staff';
  const roleName = activeMembership?.role.name ?? 'Staff';
  const initials = fullName
    .split(/\s+/)
    .map((p) => p[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

  const openNotice = (target: string, id: string) => {
    setReadNotices((prev) => (prev.includes(id) ? prev : [...prev, id]));
    const match = NAV_ITEMS.find((i) => i.id === target);
    onGo({ view: match ? match.id : 'dashboard' });
    closePanels();
  };

  const markAllAsRead = () => {
    setReadNotices(visibleNotices.map((n) => n.id));
    toast('All notifications marked as read', { tone: 'success' });
  };

  const clearAllRead = () => {
    const readIds = visibleNotices.filter((n) => readNotices.includes(n.id)).map((n) => n.id);
    setDismissedNotices((prev) => [...prev, ...readIds]);
    toast('Cleared read notifications', { tone: 'info' });
  };

  const toggleSingleRead = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setReadNotices((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const dismissSingleNotice = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setDismissedNotices((prev) => [...prev, id]);
    toast('Notification dismissed', { tone: 'info' });
  };

  // Comprehensive view searching for Ctrl+F
  const query = searchQuery.trim().toLowerCase();

  const matchedNavItems = query
    ? NAV_ITEMS.filter((item) => {
        const perm = viewPermission(item.id);
        if (perm && !can(perm)) return false;

        const inLabel = item.label.toLowerCase().includes(query);
        const inHint = item.hint.toLowerCase().includes(query);
        const inId = item.id.toLowerCase().includes(query);
        const keywords = SEARCH_KEYWORDS[item.id] ?? [];
        const inKeywords = keywords.some((kw) => kw.includes(query) || query.includes(kw));

        return inLabel || inHint || inId || inKeywords;
      })
    : [];

  // Total selectable items in search dialog for keyboard navigation
  const totalSelectableCount = query
    ? matchedNavItems.length + 3 // Matched views + 3 module search shortcuts
    : 8; // 8 frequent shortcut buttons

  const handleSearchKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev + 1) % Math.max(1, totalSelectableCount));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev - 1 + totalSelectableCount) % Math.max(1, totalSelectableCount));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (query) {
        if (selectedIndex < matchedNavItems.length) {
          const item = matchedNavItems[selectedIndex];
          if (item) {
            setSearchOpen(false);
            onGo({ view: item.id });
          }
        } else {
          const actionIdx = selectedIndex - matchedNavItems.length;
          setSearchOpen(false);
          if (actionIdx === 0) onGo({ view: 'reservations', query: searchQuery });
          else if (actionIdx === 1) onGo({ view: 'guests', query: searchQuery });
          else onGo({ view: 'room-overview', query: searchQuery });
        }
      }
    }
  };

  return (
    <>
      <header
        className="sticky top-0 z-30 border-b backdrop-blur-xl transition-all"
        style={{
          background: 'color-mix(in srgb, var(--color-surface) 88%, transparent)',
          borderColor: 'var(--color-border)',
          boxShadow: '0 4px 20px -8px rgba(0, 0, 0, 0.08)',
        }}
      >
        <div className="flex h-16 w-full items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
          {/* ================= LEFT GROUP: Mobile menu toggle ================= */}
          <div className="flex items-center gap-2 lg:hidden">
            <button
              type="button"
              onClick={onMenu}
              aria-label="Open mobile menu"
              className="flex h-10 w-10 items-center justify-center rounded-xl border transition-colors cursor-pointer"
              style={{
                borderColor: 'var(--color-border)',
                background: 'var(--color-surface)',
                color: 'var(--color-ink)',
              }}
            >
              <Lucide.Menu size={20} />
            </button>
          </div>

          {/* ================= ULTRA-ATTRACTIVE HEADER KPI STATUS DECK ================= */}
          <div
            className="hidden lg:flex items-center rounded-2xl p-1 border shadow-xs backdrop-blur-md gap-0.5 xl:gap-1 overflow-x-auto no-scrollbar scroll-smooth flex-none"
            style={{
              borderColor: 'var(--color-border)',
              background: 'color-mix(in srgb, var(--color-surface) 94%, var(--color-page))',
              boxShadow: '0 2px 10px -3px rgba(0,0,0,0.04), inset 0 1px 0 rgba(255,255,255,0.6)',
            }}
          >
            {/* 1. Occupancy */}
            <button
              type="button"
              onClick={() => onGo({ view: 'occupancy-report' })}
              className="group flex items-center gap-2 px-2.5 py-1 xl:px-3 rounded-xl transition-all duration-150 hover:bg-surface hover:shadow-xs active:scale-[0.98] cursor-pointer text-left flex-none"
              title="Occupancy: 30% (6 of 20 rooms)"
            >
              <div className="flex h-7 w-7 flex-none items-center justify-center rounded-lg bg-gradient-to-tr from-rose-500 to-pink-500 text-white shadow-xs shadow-rose-500/25 group-hover:scale-105 transition-transform">
                <Lucide.BedDouble size={14} strokeWidth={2.2} />
              </div>
              <div className="flex flex-col leading-tight gap-0.5">
                <span className="text-[10.5px] font-bold uppercase tracking-wider text-ink-muted">Occupancy</span>
                <div className="flex items-center gap-1.5">
                  <span className="text-[13.5px] font-bold tnum text-ink">{kpi.occupancyPct}%</span>
                  <span className="text-[10px] font-bold text-emerald-600 bg-emerald-500/10 dark:bg-emerald-500/20 px-1.5 py-0.5 rounded-md leading-tight">
                    +12%
                  </span>
                </div>
              </div>
            </button>

            <div className="h-5 w-px my-auto mx-0.5 flex-none" style={{ background: 'var(--color-border)' }} />

            {/* 2. Today's Arrivals */}
            <button
              type="button"
              onClick={() => onGo({ view: 'check-in' })}
              className="group flex items-center gap-2 px-2.5 py-1 xl:px-3 rounded-xl transition-all duration-150 hover:bg-surface hover:shadow-xs active:scale-[0.98] cursor-pointer text-left flex-none"
              title="Today's Arrivals: 8 (+3 vs yesterday)"
            >
              <div className="flex h-7 w-7 flex-none items-center justify-center rounded-lg bg-gradient-to-tr from-emerald-500 to-teal-500 text-white shadow-xs shadow-emerald-500/25 group-hover:scale-105 transition-transform">
                <Lucide.ArrowUpRight size={14} strokeWidth={2.5} />
              </div>
              <div className="flex flex-col leading-tight gap-0.5">
                <span className="text-[10.5px] font-bold uppercase tracking-wider text-ink-muted">Arrivals</span>
                <div className="flex items-center gap-1.5">
                  <span className="text-[13.5px] font-bold tnum text-ink">{kpi.arrivalsCount}</span>
                  <span className="text-[10px] font-bold text-amber-700 bg-amber-500/15 dark:bg-amber-500/20 px-1.5 py-0.5 rounded-md leading-tight">
                    2 VIP
                  </span>
                </div>
              </div>
            </button>

            <div className="h-5 w-px my-auto mx-0.5 flex-none" style={{ background: 'var(--color-border)' }} />

            {/* 3. Today's Departures */}
            <button
              type="button"
              onClick={() => onGo({ view: 'check-out' })}
              className="group flex items-center gap-2 px-2.5 py-1 xl:px-3 rounded-xl transition-all duration-150 hover:bg-surface hover:shadow-xs active:scale-[0.98] cursor-pointer text-left flex-none"
              title="Today's Departures: 7 (-1 vs yesterday)"
            >
              <div className="flex h-7 w-7 flex-none items-center justify-center rounded-lg bg-gradient-to-tr from-amber-500 to-orange-500 text-white shadow-xs shadow-amber-500/25 group-hover:scale-105 transition-transform">
                <Lucide.ArrowDownRight size={14} strokeWidth={2.5} />
              </div>
              <div className="flex flex-col leading-tight gap-0.5">
                <span className="text-[10.5px] font-bold uppercase tracking-wider text-ink-muted">Departures</span>
                <div className="flex items-center gap-1.5">
                  <span className="text-[13.5px] font-bold tnum text-ink">{kpi.departuresCount}</span>
                  <span className="text-[10px] font-semibold text-ink-secondary bg-black/[0.04] dark:bg-white/[0.06] px-1.5 py-0.5 rounded-md leading-tight">
                    7 sched
                  </span>
                </div>
              </div>
            </button>

            <div className="h-5 w-px my-auto mx-0.5 flex-none" style={{ background: 'var(--color-border)' }} />

            {/* 4. In-house Guests */}
            <button
              type="button"
              onClick={() => onGo({ view: 'in-house' })}
              className="group flex items-center gap-2 px-2.5 py-1 xl:px-3 rounded-xl transition-all duration-150 hover:bg-surface hover:shadow-xs active:scale-[0.98] cursor-pointer text-left flex-none"
              title="In-house Guests: 8 (28 rooms • 4 extra guests)"
            >
              <div className="flex h-7 w-7 flex-none items-center justify-center rounded-lg bg-gradient-to-tr from-violet-500 to-purple-600 text-white shadow-xs shadow-purple-500/25 group-hover:scale-105 transition-transform">
                <Lucide.Users size={14} strokeWidth={2.2} />
              </div>
              <div className="flex flex-col leading-tight gap-0.5">
                <span className="text-[10.5px] font-bold uppercase tracking-wider text-ink-muted">In-House</span>
                <div className="flex items-center gap-1.5">
                  <span className="text-[13.5px] font-bold tnum text-ink">{kpi.inHouseCount}</span>
                  <span className="text-[10px] font-semibold text-purple-700 bg-purple-500/15 dark:bg-purple-500/20 px-1.5 py-0.5 rounded-md leading-tight">
                    Active
                  </span>
                </div>
              </div>
            </button>

            <div className="h-5 w-px my-auto mx-0.5 flex-none" style={{ background: 'var(--color-border)' }} />

            {/* 5. Total Revenue */}
            <button
              type="button"
              onClick={() => onGo({ view: 'revenue-report' })}
              className="group flex items-center gap-2 px-2.5 py-1 xl:px-3 rounded-xl transition-all duration-150 hover:bg-surface hover:shadow-xs active:scale-[0.98] cursor-pointer text-left flex-none"
              title="Total Revenue (Today)"
            >
              <div className="flex h-7 w-7 flex-none items-center justify-center rounded-lg bg-gradient-to-tr from-emerald-500 to-green-600 text-white shadow-xs shadow-emerald-500/25 group-hover:scale-105 transition-transform">
                <Lucide.CreditCard size={14} strokeWidth={2.2} />
              </div>
              <div className="flex flex-col leading-tight gap-0.5">
                <span className="text-[10.5px] font-bold uppercase tracking-wider text-ink-muted">Revenue</span>
                <div className="flex items-center gap-1.5">
                  <span className="text-[13.5px] font-bold tnum text-emerald-600 dark:text-emerald-400">₹{kpi.totalRevenue.toLocaleString('en-IN')}</span>
                  <span className="text-[10px] font-bold text-emerald-700 bg-emerald-500/15 dark:bg-emerald-500/20 px-1.5 py-0.5 rounded-md leading-tight">
                    Today
                  </span>
                </div>
              </div>
            </button>

            <div className="h-5 w-px my-auto mx-0.5 flex-none" style={{ background: 'var(--color-border)' }} />

            {/* 6. Pending Payments */}
            <button
              type="button"
              onClick={() => onGo({ view: 'payments' })}
              className="group flex items-center gap-2 px-2.5 py-1 xl:px-3 rounded-xl transition-all duration-150 hover:bg-surface hover:shadow-xs active:scale-[0.98] cursor-pointer text-left flex-none"
              title="Pending Payments: 3 (₹28,160 outstanding)"
            >
              <div className="flex h-7 w-7 flex-none items-center justify-center rounded-lg bg-gradient-to-tr from-rose-500 to-red-600 text-white shadow-xs shadow-rose-500/25 group-hover:scale-105 transition-transform animate-pulse">
                <Lucide.AlertCircle size={14} strokeWidth={2.3} />
              </div>
              <div className="flex flex-col leading-tight gap-0.5">
                <span className="text-[10.5px] font-bold uppercase tracking-wider text-ink-muted">Pending</span>
                <div className="flex items-center gap-1.5">
                  <span className="text-[13.5px] font-bold tnum text-rose-600 dark:text-rose-400">{kpi.pendingPaymentsCount}</span>
                  <span className="text-[10px] font-bold text-rose-700 bg-rose-500/15 dark:bg-rose-500/20 px-1.5 py-0.5 rounded-md leading-tight">
                    Due
                  </span>
                </div>
              </div>
            </button>
          </div>

          {/* ================= RIGHT GROUP: Actions, Alerts, Themes, Profile ================= */}
          <div className="flex items-center gap-2 sm:gap-2.5 ml-auto flex-none">
            {/* + New Booking Button */}
            {can('reservation.create') ? (
              <button
                type="button"
                onClick={() => onGo({ view: 'new-reservation' })}
                className="pms-btn-primary flex items-center gap-1.5 px-3.5 py-2 text-[13px] font-semibold rounded-xl shadow-xs transition-all hover:scale-[1.02] active:scale-[0.98] cursor-pointer flex-none"
                title="Create a new reservation"
              >
                <Lucide.Plus size={15} strokeWidth={2.6} />
                <span className="hidden sm:inline">New Booking</span>
              </button>
            ) : null}

            {/* ================= LUXURY NOTIFICATIONS POPOVER ================= */}
            <div className="relative flex-none" ref={panel === 'notices' ? dismissRef : undefined}>
              <button
                type="button"
                onClick={() => setPanel(panel === 'notices' ? 'none' : 'notices')}
                aria-label={`Notifications, ${unreadCount} unread`}
                aria-expanded={panel === 'notices'}
                className="group relative flex h-10 w-10 items-center justify-center rounded-xl border transition-all hover:bg-black/[0.03] cursor-pointer flex-none"
                style={{
                  borderColor: panel === 'notices' ? 'var(--color-primary)' : 'var(--color-border)',
                  background: panel === 'notices' ? 'color-mix(in srgb, var(--color-primary) 10%, var(--color-surface))' : 'var(--color-surface)',
                  color: 'var(--color-ink)',
                }}
                title="Operational Notifications Hub"
              >
                <Lucide.Bell size={18} strokeWidth={1.9} className="group-hover:rotate-6 transition-transform" />
                {unreadCount > 0 ? (
                  <span
                    className="tnum absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full px-1.5 text-[10.5px] font-bold text-white shadow-md ring-2 ring-[var(--color-surface)] animate-pulse"
                    style={{ background: '#ef4444' }}
                  >
                    {unreadCount}
                  </span>
                ) : null}
              </button>

              {panel === 'notices' ? (
                <div
                  className="pms-animate-pop absolute right-0 top-full z-50 mt-2.5 w-[min(460px,94vw)] overflow-hidden rounded-2xl border shadow-2xl backdrop-blur-2xl"
                  style={{
                    background: 'var(--color-surface)',
                    borderColor: 'var(--color-border)',
                    boxShadow: '0 24px 60px -12px rgba(0, 0, 0, 0.22), 0 0 0 1px var(--color-border)',
                  }}
                  role="dialog"
                  aria-label="Notifications"
                >
                  {/* Luxury Top Accent Line */}
                  <div className="h-1 w-full bg-gradient-to-r from-primary via-amber-500 to-emerald-500" />

                  {/* Notifications Header */}
                  <div
                    className="flex flex-col border-b p-4 gap-3"
                    style={{ borderColor: 'var(--color-border)' }}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <div
                          className="flex h-8 w-8 items-center justify-center rounded-xl shadow-xs"
                          style={{
                            background: 'color-mix(in srgb, var(--color-primary) 14%, transparent)',
                            color: 'var(--color-primary)',
                          }}
                        >
                          <Lucide.BellRing size={17} />
                        </div>
                        <div>
                          <h2 className="text-[14.5px] font-bold text-ink leading-tight">Notifications Hub</h2>
                          <p className="text-[11.5px] text-ink-muted">
                            {unreadCount > 0 ? `${unreadCount} unread operational alerts` : 'All operational alerts are cleared'}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        {unreadCount > 0 ? (
                          <button
                            type="button"
                            onClick={markAllAsRead}
                            className="flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-[11.5px] font-bold transition-all hover:bg-black/[0.04]"
                            style={{
                              borderColor: 'var(--color-border)',
                              color: 'var(--color-primary)',
                            }}
                            title="Mark all notifications as read"
                          >
                            <Lucide.CheckCheck size={14} />
                            <span>Mark all read</span>
                          </button>
                        ) : null}

                        {readNotices.length > 0 ? (
                          <button
                            type="button"
                            onClick={clearAllRead}
                            className="flex items-center gap-1 rounded-lg border px-2 py-1 text-[11.5px] font-semibold text-ink-muted hover:text-red-600 transition-colors"
                            style={{ borderColor: 'var(--color-border)' }}
                            title="Clear read notifications"
                          >
                            <Lucide.Trash2 size={13} />
                            <span>Clear</span>
                          </button>
                        ) : null}
                      </div>
                    </div>

                    {/* Filter Tabs */}
                    <div
                      className="flex rounded-xl p-1 gap-1 border"
                      style={{
                        background: 'color-mix(in srgb, var(--color-muted-surface) 65%, var(--color-surface))',
                        borderColor: 'var(--color-border)',
                      }}
                    >
                      <button
                        type="button"
                        onClick={() => setNoticeTab('all')}
                        className={`flex-1 rounded-lg py-1.5 text-center text-[12px] font-bold transition-all ${
                          noticeTab === 'all'
                            ? 'bg-white shadow-xs text-ink'
                            : 'text-ink-secondary hover:text-ink'
                        }`}
                        style={noticeTab === 'all' ? { background: 'var(--color-surface)' } : undefined}
                      >
                        All ({visibleNotices.length})
                      </button>
                      <button
                        type="button"
                        onClick={() => setNoticeTab('unread')}
                        className={`flex-1 rounded-lg py-1.5 text-center text-[12px] font-bold transition-all ${
                          noticeTab === 'unread'
                            ? 'bg-white shadow-xs text-ink'
                            : 'text-ink-secondary hover:text-ink'
                        }`}
                        style={noticeTab === 'unread' ? { background: 'var(--color-surface)' } : undefined}
                      >
                        Unread ({unreadCount})
                      </button>
                      <button
                        type="button"
                        onClick={() => setNoticeTab('urgent')}
                        className={`flex-1 rounded-lg py-1.5 text-center text-[12px] font-bold transition-all ${
                          noticeTab === 'urgent'
                            ? 'bg-white shadow-xs text-ink'
                            : 'text-ink-secondary hover:text-ink'
                        }`}
                        style={noticeTab === 'urgent' ? { background: 'var(--color-surface)' } : undefined}
                      >
                        Urgent ({urgentCount})
                      </button>
                    </div>
                  </div>

                  {/* Notifications List */}
                  <div className="max-h-[400px] overflow-y-auto divide-y" style={{ borderColor: 'var(--color-border-subtle)' }}>
                    {filteredNotices.length > 0 ? (
                      filteredNotices.map((n) => {
                        const isRead = readNotices.includes(n.id);
                        const cfg = NOTICE_TONE_CONFIG[n.tone] ?? NOTICE_TONE_CONFIG.info;
                        const ToneIcon = cfg.icon;

                        return (
                          <div
                            key={n.id}
                            className={`group relative flex items-start gap-3.5 p-4 transition-all cursor-pointer ${
                              isRead
                                ? 'opacity-70 hover:opacity-100 hover:bg-black/[0.02]'
                                : 'hover:bg-primary/[0.04]'
                            }`}
                            style={!isRead ? { background: 'color-mix(in srgb, var(--color-primary) 3.5%, var(--color-surface))' } : undefined}
                            onClick={() => openNotice(n.target, n.id)}
                          >
                            {/* Left Accent indicator for unread */}
                            {!isRead ? (
                              <div
                                className="absolute left-0 top-3 bottom-3 w-1 rounded-r-full"
                                style={{ background: cfg.color }}
                              />
                            ) : null}

                            {/* Tone Icon Squircle Badge */}
                            <div
                              className="relative mt-0.5 flex h-10 w-10 flex-none items-center justify-center rounded-2xl border shadow-xs transition-transform group-hover:scale-105"
                              style={{
                                background: cfg.bg,
                                borderColor: cfg.border,
                                color: cfg.color,
                              }}
                            >
                              <ToneIcon size={19} strokeWidth={2.2} />
                              {!isRead ? (
                                <span className="absolute -top-1 -right-1 h-2.5 w-2.5 rounded-full border-2 border-white bg-blue-500 shadow-xs" />
                              ) : null}
                            </div>

                            {/* Content Body */}
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center justify-between gap-2">
                                <span className="text-[13.5px] font-bold text-ink group-hover:text-primary transition-colors">
                                  {n.title}
                                </span>
                                <span className="tnum flex-none text-[11px] font-semibold text-ink-muted">
                                  {n.time}
                                </span>
                              </div>

                              <p className="mt-1 text-[12.5px] leading-relaxed text-ink-secondary">
                                {n.detail}
                              </p>

                              <div className="mt-2.5 flex items-center justify-between gap-2 flex-wrap">
                                <div className="flex items-center gap-1.5">
                                  <span
                                    className="inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[10.5px] font-bold uppercase tracking-wider"
                                    style={{
                                      background: cfg.badgeBg,
                                      color: cfg.badgeText,
                                    }}
                                  >
                                    {cfg.label}
                                  </span>

                                  <span className="text-[11px] text-ink-muted">·</span>

                                  <button
                                    type="button"
                                    onClick={(e) => toggleSingleRead(n.id, e)}
                                    className="text-[11.5px] font-semibold text-ink-muted hover:text-ink transition-colors"
                                  >
                                    {isRead ? 'Mark as unread' : 'Mark as read'}
                                  </button>
                                </div>

                                <div className="flex items-center gap-2">
                                  <span className="flex items-center gap-1 text-[12px] font-bold text-primary group-hover:translate-x-0.5 transition-transform">
                                    <span>Go to screen</span>
                                    <Lucide.ArrowRight size={13} strokeWidth={2.4} />
                                  </span>

                                  <button
                                    type="button"
                                    onClick={(e) => dismissSingleNotice(n.id, e)}
                                    className="opacity-0 group-hover:opacity-100 p-1 text-ink-muted hover:text-red-600 transition-opacity"
                                    title="Dismiss alert"
                                  >
                                    <Lucide.X size={13} />
                                  </button>
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      })
                    ) : (
                      /* Empty State */
                      <div className="flex flex-col items-center justify-center p-10 text-center">
                        <div
                          className="flex h-14 w-14 items-center justify-center rounded-2xl border mb-3"
                          style={{
                            background: 'color-mix(in srgb, #10b981 12%, transparent)',
                            borderColor: 'color-mix(in srgb, #10b981 25%, transparent)',
                            color: '#059669',
                          }}
                        >
                          <Lucide.CheckCircle2 size={28} />
                        </div>
                        <p className="text-[15px] font-bold text-ink">You are all caught up!</p>
                        <p className="mt-1 text-[12.5px] text-ink-muted max-w-[240px]">
                          No alerts matching the {noticeTab} filter at this moment.
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Notifications Footer */}
                  <div
                    className="flex items-center justify-between border-t px-4 py-3"
                    style={{
                      background: 'color-mix(in srgb, var(--color-muted-surface) 40%, var(--color-surface))',
                      borderColor: 'var(--color-border)',
                    }}
                  >
                    <span className="text-[11.5px] text-ink-muted">TriponX Notification Hub · Operational Alerts</span>
                    <button
                      type="button"
                      onClick={() => {
                        onGo({ view: 'settings' });
                        closePanels();
                      }}
                      className="text-[11.5px] font-bold text-primary hover:underline flex items-center gap-1"
                    >
                      <Lucide.SlidersHorizontal size={13} />
                      <span>Preferences</span>
                    </button>
                  </div>
                </div>
              ) : null}
            </div>

            {/* User Profile Pill & Dropdown */}
            <div className="relative" ref={panel === 'profile' ? dismissRef : undefined}>
              <button
                type="button"
                onClick={() => setPanel(panel === 'profile' ? 'none' : 'profile')}
                aria-label="Open user profile menu"
                aria-expanded={panel === 'profile'}
                className="group flex items-center gap-2 rounded-xl border p-1 sm:pr-2.5 transition-all hover:shadow-xs cursor-pointer flex-none"
                style={{
                  borderColor: panel === 'profile' ? 'var(--color-primary)' : 'var(--color-border)',
                  background: 'var(--color-surface)',
                }}
              >
                <div
                  className="flex h-8 w-8 items-center justify-center rounded-lg text-[12px] font-bold shadow-xs transition-transform group-hover:scale-105"
                  style={{ background: 'var(--color-primary)', color: 'var(--color-primary-foreground)' }}
                  aria-hidden="true"
                >
                  {initials}
                </div>
                <div className="hidden text-left sm:block">
                  <span className="block text-[12.5px] font-bold leading-tight truncate max-w-[120px]" style={{ color: 'var(--color-ink)' }}>
                    {fullName}
                  </span>
                  <span className="block text-[11px] font-medium leading-tight text-ink-muted">
                    {roleName}
                  </span>
                </div>
                <Lucide.ChevronDown size={14} className="text-ink-muted hidden sm:block group-hover:text-ink transition-colors" />
              </button>

              {panel === 'profile' ? (
                <div
                  className="pms-animate-pop absolute right-0 top-full z-50 mt-2 w-64 overflow-hidden rounded-2xl border shadow-2xl backdrop-blur-xl"
                  style={{
                    background: 'var(--color-surface)',
                    borderColor: 'var(--color-border)',
                    boxShadow: 'var(--shadow-popover)',
                  }}
                  role="menu"
                  aria-label="User profile"
                >
                  <div className="border-b p-4" style={{ borderColor: 'var(--color-border)' }}>
                    <div className="flex items-center gap-3">
                      <div
                        className="flex h-10 w-10 flex-none items-center justify-center rounded-xl text-[14px] font-bold shadow-sm"
                        style={{ background: 'var(--color-primary)', color: 'var(--color-primary-foreground)' }}
                      >
                        {initials}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-[13.5px] font-bold text-ink">{fullName}</p>
                        <p className="truncate text-[11.5px] text-ink-muted">{me?.user.email ?? roleName}</p>
                        <span
                          className="mt-1 inline-block rounded-md px-1.5 py-0.5 text-[10.5px] font-bold uppercase tracking-wider"
                          style={{
                            background: 'color-mix(in srgb, var(--color-primary) 14%, transparent)',
                            color: 'var(--color-primary)',
                          }}
                        >
                          {roleName}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="p-1.5">
                    <button
                      type="button"
                      role="menuitem"
                      onClick={() => {
                        onGo({ view: 'settings' });
                        closePanels();
                      }}
                      className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-left text-[13px] font-medium transition-colors hover:bg-black/[0.03]"
                      style={{ color: 'var(--color-ink)' }}
                    >
                      <Lucide.Settings size={16} className="text-ink-muted" />
                      <span>My profile & settings</span>
                    </button>

                    {can('user.read') ? (
                      <button
                        type="button"
                        role="menuitem"
                        onClick={() => {
                          onGo({ view: 'staff-roles' });
                          closePanels();
                        }}
                        className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-left text-[13px] font-medium transition-colors hover:bg-black/[0.03]"
                        style={{ color: 'var(--color-ink)' }}
                      >
                        <Lucide.ShieldCheck size={16} className="text-ink-muted" />
                        <span>Staff directory & roles</span>
                      </button>
                    ) : null}

                    <button
                      type="button"
                      role="menuitem"
                      onClick={() => {
                        onOpenThemes();
                        closePanels();
                      }}
                      className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-left text-[13px] font-medium transition-colors hover:bg-black/[0.03] cursor-pointer"
                      style={{ color: 'var(--color-ink)' }}
                    >
                      <Lucide.Palette size={16} className="text-primary" />
                      <span>Appearance & themes</span>
                    </button>
                  </div>

                  {otherMemberships.length > 0 ? (
                    <div className="border-t p-1.5" style={{ borderColor: 'var(--color-border)' }}>
                      <p className="px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-ink-muted">
                        Switch Property
                      </p>
                      {otherMemberships.map((membership) => (
                        <button
                          key={membership.propertyId}
                          type="button"
                          role="menuitem"
                          onClick={() => {
                            closePanels();
                            void switchProperty(membership.propertyId).catch((error: unknown) =>
                              toast('Property switch failed', { detail: displayApiError(error), tone: 'danger' })
                            );
                          }}
                          className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-left text-[13px] font-medium transition-colors hover:bg-black/[0.03]"
                          style={{ color: 'var(--color-ink)' }}
                        >
                          <Lucide.Building2 size={16} className="text-ink-muted" />
                          <span className="truncate">Switch to {membership.property.name}</span>
                        </button>
                      ))}
                    </div>
                  ) : null}

                  <div className="border-t p-1.5" style={{ borderColor: 'var(--color-border)' }}>
                    <button
                      type="button"
                      role="menuitem"
                      onClick={() => {
                        closePanels();
                        void logout().catch((error: unknown) =>
                          toast('Sign out failed', { detail: displayApiError(error), tone: 'danger' })
                        );
                      }}
                      className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-left text-[13px] font-bold transition-colors hover:bg-red-50 text-red-600"
                    >
                      <Lucide.LogOut size={16} />
                      <span>Sign out</span>
                    </button>
                  </div>
                </div>
              ) : null}
            </div>
          </div>
        </div>
      </header>

      {/* ================= GLOBAL SEARCH & NAVIGATION MODAL (Ctrl+F) ================= */}
      {searchOpen && typeof document !== 'undefined'
        ? createPortal(
            <div
              className="fixed inset-0 z-[100] flex items-start justify-center pt-16 sm:pt-24 px-4 bg-black/60 backdrop-blur-md pms-animate-fade-in"
              onClick={() => setSearchOpen(false)}
            >
          <div
            className="w-full max-w-2xl overflow-hidden rounded-2xl border shadow-2xl backdrop-blur-2xl"
            style={{
              background: 'var(--color-surface)',
              borderColor: 'var(--color-border)',
              boxShadow: '0 30px 70px -15px rgba(0, 0, 0, 0.3), 0 0 0 1px var(--color-border)',
            }}
            onClick={(e) => e.stopPropagation()}
            onKeyDown={handleSearchKeyDown}
          >
            {/* Search Input Bar */}
            <div
              className="flex items-center gap-3 border-b px-4 py-4"
              style={{ borderColor: 'var(--color-border)' }}
            >
              <div
                className="flex h-9 w-9 items-center justify-center rounded-xl flex-none"
                style={{
                  background: 'color-mix(in srgb, var(--color-primary) 12%, transparent)',
                  color: 'var(--color-primary)',
                }}
              >
                <Lucide.Search size={20} strokeWidth={2.4} />
              </div>
              <input
                ref={searchInputRef}
                type="text"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setSelectedIndex(0);
                }}
                placeholder="Type anything to search (e.g., 'reservations', 'check in', 'cleaning', 'rooms', 'bills')..."
                className="w-full bg-transparent text-[16px] font-semibold text-ink placeholder:text-ink-muted focus:outline-none"
              />
              {searchQuery ? (
                <button
                  type="button"
                  onClick={() => {
                    setSearchQuery('');
                    setSelectedIndex(0);
                  }}
                  className="rounded-lg p-1 text-ink-muted hover:text-ink hover:bg-black/[0.05]"
                  title="Clear input"
                >
                  <Lucide.X size={17} />
                </button>
              ) : null}
              <kbd
                onClick={() => setSearchOpen(false)}
                className="rounded-lg border px-2 py-1 text-[11px] font-bold text-ink-muted cursor-pointer hover:bg-black/[0.04]"
                style={{ borderColor: 'var(--color-border)' }}
              >
                ESC
              </kbd>
            </div>

            {/* Results or Categorized Shortcuts */}
            <div className="max-h-[460px] overflow-y-auto p-3">
              {query ? (
                <div className="flex flex-col gap-2">
                  {/* 1. MATCHING PMS SCREENS (At the very top as requested!) */}
                  {matchedNavItems.length > 0 ? (
                    <div>
                      <div className="flex items-center justify-between px-2 py-1 mb-1">
                        <span className="text-[11px] font-bold uppercase tracking-wider text-ink-muted">
                          Matching Screens & Views ({matchedNavItems.length})
                        </span>
                        <span className="text-[11px] text-ink-muted">Click or press Enter to navigate</span>
                      </div>
                      <div className="flex flex-col gap-1">
                        {matchedNavItems.map((item, index) => {
                          const Icon = NAV_ICONS[item.id] ?? Lucide.Circle;
                          const isSelected = selectedIndex === index;

                          // Find section name
                          const section = NAV_SECTIONS.find((s) => s.items.some((i) => i.id === item.id));

                          return (
                            <button
                              key={item.id}
                              type="button"
                              onClick={() => {
                                setSearchOpen(false);
                                onGo({ view: item.id });
                              }}
                              className={`group flex items-center justify-between rounded-xl px-3.5 py-2.5 text-left transition-all ${
                                isSelected
                                  ? 'bg-primary text-white shadow-md'
                                  : 'hover:bg-primary/[0.07] text-ink'
                              }`}
                              style={
                                !isSelected
                                  ? {
                                      background: 'var(--color-surface)',
                                      border: '1px solid var(--color-border-subtle)',
                                    }
                                  : undefined
                              }
                            >
                              <div className="flex items-center gap-3 min-w-0">
                                <div
                                  className={`flex h-9 w-9 flex-none items-center justify-center rounded-xl ${
                                    isSelected
                                      ? 'bg-white/20 text-white'
                                      : 'bg-primary/10 text-primary'
                                  }`}
                                >
                                  <Icon size={18} strokeWidth={2.2} />
                                </div>
                                <div className="min-w-0">
                                  <div className="flex items-center gap-2">
                                    <span className="text-[14px] font-bold truncate">
                                      {item.label}
                                    </span>
                                    {section ? (
                                      <span
                                        className={`rounded px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                                          isSelected
                                            ? 'bg-white/25 text-white'
                                            : 'bg-black/[0.05] text-ink-muted'
                                        }`}
                                      >
                                        {section.title}
                                      </span>
                                    ) : null}
                                  </div>
                                  <p
                                    className={`text-[12px] truncate mt-0.5 ${
                                      isSelected ? 'text-white/80' : 'text-ink-secondary'
                                    }`}
                                  >
                                    {item.hint}
                                  </p>
                                </div>
                              </div>

                              <div className="flex items-center gap-1.5 flex-none ml-2">
                                <span
                                  className={`text-[12px] font-bold ${
                                    isSelected ? 'text-white' : 'text-primary group-hover:translate-x-0.5 transition-transform'
                                  }`}
                                >
                                  Go to page
                                </span>
                                <Lucide.ArrowRight size={14} strokeWidth={2.4} />
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  ) : null}

                  {/* 2. DEEP SEARCH ACTIONS (Search query inside specific database modules) */}
                  <div className="mt-2">
                    <p className="px-2 py-1 text-[11px] font-bold uppercase tracking-wider text-ink-muted">
                      Search "{searchQuery}" inside Modules
                    </p>
                    <div className="flex flex-col gap-1 mt-1">
                      {[
                        {
                          idx: matchedNavItems.length,
                          label: `Search "${searchQuery}" in Reservations`,
                          sub: 'Find booking codes, guest names, or confirmation numbers',
                          icon: Lucide.CalendarDays,
                          action: () => onGo({ view: 'reservations', query: searchQuery }),
                          color: 'var(--color-primary)',
                        },
                        {
                          idx: matchedNavItems.length + 1,
                          label: `Search "${searchQuery}" in Guest Directory`,
                          sub: 'Search guest profiles, emails, phone numbers or loyalty IDs',
                          icon: Lucide.BookUser,
                          action: () => onGo({ view: 'guests', query: searchQuery }),
                          color: '#059669',
                        },
                        {
                          idx: matchedNavItems.length + 2,
                          label: `Search "${searchQuery}" in Room Overview`,
                          sub: 'Find room numbers, room types, or floor locations',
                          icon: Lucide.BedDouble,
                          action: () => onGo({ view: 'room-overview', query: searchQuery }),
                          color: '#0284c7',
                        },
                      ].map((act) => {
                        const isSelected = selectedIndex === act.idx;
                        return (
                          <button
                            key={act.idx}
                            type="button"
                            onClick={() => {
                              setSearchOpen(false);
                              act.action();
                            }}
                            className={`flex items-center justify-between rounded-xl px-3.5 py-2.5 text-left transition-all ${
                              isSelected
                                ? 'bg-primary text-white shadow-md'
                                : 'hover:bg-black/[0.04] text-ink'
                            }`}
                            style={
                              !isSelected
                                ? {
                                    background: 'var(--color-surface)',
                                    border: '1px solid var(--color-border-subtle)',
                                  }
                                : undefined
                            }
                          >
                            <div className="flex items-center gap-3 min-w-0">
                              <div
                                className={`flex h-9 w-9 flex-none items-center justify-center rounded-xl ${
                                  isSelected ? 'bg-white/20 text-white' : 'bg-black/[0.04]'
                                }`}
                                style={!isSelected ? { color: act.color } : undefined}
                              >
                                <act.icon size={18} strokeWidth={2.2} />
                              </div>
                              <div className="min-w-0">
                                <p className="text-[13.5px] font-bold truncate">{act.label}</p>
                                <p
                                  className={`text-[11.5px] truncate mt-0.5 ${
                                    isSelected ? 'text-white/80' : 'text-ink-secondary'
                                  }`}
                                >
                                  {act.sub}
                                </p>
                              </div>
                            </div>
                            <Lucide.ArrowRight size={14} className={isSelected ? 'text-white' : 'text-ink-muted'} />
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              ) : (
                /* QUICK CATEGORIZED SHORTCUTS WHEN SEARCH INPUT IS EMPTY */
                <div className="flex flex-col gap-4 p-1">
                  <div>
                    <p className="px-2 py-1 text-[11px] font-bold uppercase tracking-wider text-ink-muted">
                      Front Office & Operations
                    </p>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mt-1">
                      {[
                        { id: 'dashboard' as const, label: 'Dashboard', icon: Lucide.LayoutDashboard },
                        { id: 'reservations' as const, label: 'Reservations', icon: Lucide.CalendarDays },
                        { id: 'new-reservation' as const, label: '+ New Booking', icon: Lucide.CalendarPlus },
                        { id: 'check-in' as const, label: 'Check-In Desk', icon: Lucide.DoorOpen },
                        { id: 'check-out' as const, label: 'Check-Out Desk', icon: Lucide.DoorClosed },
                        { id: 'in-house' as const, label: 'In-House Guests', icon: Lucide.Users },
                      ].map((item) => (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => {
                            setSearchOpen(false);
                            onGo({ view: item.id });
                          }}
                          className="flex items-center gap-2.5 rounded-xl border p-2.5 text-left text-[13px] font-bold transition-all hover:bg-primary/[0.05] hover:border-primary"
                          style={{ borderColor: 'var(--color-border)', background: 'var(--color-surface)' }}
                        >
                          <item.icon size={17} className="text-primary flex-none" />
                          <span className="truncate">{item.label}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <p className="px-2 py-1 text-[11px] font-bold uppercase tracking-wider text-ink-muted">
                      Rooms, Housekeeping & Billing
                    </p>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mt-1">
                      {[
                        { id: 'room-overview' as const, label: 'Room Matrix', icon: Lucide.BedDouble },
                        { id: 'status-board' as const, label: 'Status Board', icon: Lucide.LayoutGrid },
                        { id: 'housekeeping' as const, label: 'Housekeeping', icon: Lucide.Sparkles },
                        { id: 'maintenance' as const, label: 'Maintenance', icon: Lucide.Wrench },
                        { id: 'folios' as const, label: 'Folios & Billing', icon: Lucide.ReceiptText },
                        { id: 'invoices' as const, label: 'Invoices', icon: Lucide.FileText },
                      ].map((item) => (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => {
                            setSearchOpen(false);
                            onGo({ view: item.id });
                          }}
                          className="flex items-center gap-2.5 rounded-xl border p-2.5 text-left text-[13px] font-bold transition-all hover:bg-primary/[0.05] hover:border-primary"
                          style={{ borderColor: 'var(--color-border)', background: 'var(--color-surface)' }}
                        >
                          <item.icon size={17} className="text-primary flex-none" />
                          <span className="truncate">{item.label}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div
              className="flex items-center justify-between border-t px-4 py-3 text-xs text-ink-muted"
              style={{
                background: 'color-mix(in srgb, var(--color-muted-surface) 40%, var(--color-surface))',
                borderColor: 'var(--color-border)',
              }}
            >
              <div className="flex items-center gap-2">
                <span>Shortcut:</span>
                <kbd className="rounded border px-1.5 py-0.5 font-bold text-ink" style={{ borderColor: 'var(--color-border)' }}>Ctrl + F</kbd>
                <span>or</span>
                <kbd className="rounded border px-1.5 py-0.5 font-bold text-ink" style={{ borderColor: 'var(--color-border)' }}>Ctrl + K</kbd>
              </div>
              <div className="flex items-center gap-3">
                <span>Navigate: <kbd className="font-bold text-ink">↑ ↓</kbd></span>
                <span>Select: <kbd className="font-bold text-ink">Enter ↵</kbd></span>
                <span>Exit: <kbd className="font-bold text-ink">ESC</kbd></span>
              </div>
            </div>
          </div>
        </div>,
        document.body
      ) : null}
    </>
  );
}
