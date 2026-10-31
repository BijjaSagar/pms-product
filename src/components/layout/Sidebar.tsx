import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import * as Lucide from 'lucide-react';
import { NAV_SECTIONS, sectionOf, viewPermission } from '../../config/navigation';
import type { ViewId } from '../../config/navigation';
import { useAuth } from '../../features/auth/AuthContext';
import { useTheme } from '../../theme/useTheme';
import { THEME_PRESETS } from '../../theme/presets';
import { NAV_ICONS, SECTION_ICONS } from './navIcons';
import { Backdrop, Button, IconButton, ListItem } from '../primitives';

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
    <ListItem
      type="button"
      onClick={onSelect}
      aria-current={selected ? 'page' : undefined}
      className="flex w-full items-center gap-2.5 text-left text-body transition-all cursor-pointer hover:bg-muted-surface/70"
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
            color: 'var(--color-ink-secondary)',
            border: '1.5px solid transparent',
            fontWeight: 500,
          }
      }
    >
      <span className="flex-none" style={{ color: selected ? 'var(--color-primary)' : 'var(--color-ink-muted)' }}>
        <NavIcon id={id} />
      </span>
      <span className="min-w-0 flex-1 truncate" style={{ color: selected ? 'var(--color-primary)' : 'var(--color-ink)' }}>
        {label}
      </span>
    </ListItem>
  );
}

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
    <div className="flex h-full flex-col bg-surface" style={{ background: 'var(--color-sidebar)', color: 'var(--color-ink)' }}>
      {/* Brand Header */}
      <div className="flex items-center justify-between border-b px-4 pb-4 pt-5" style={{ borderColor: 'var(--color-border)' }}>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => go('dashboard')}
            className="flex h-10 w-10 items-center justify-center rounded-xl font-brand text-disp2 font-bold shadow-sm transition-transform hover:scale-105 active:scale-95 cursor-pointer"
            style={{ background: 'var(--color-primary)', color: 'var(--color-primary-foreground)' }}
            aria-label="Dashboard"
          >
            T
          </button>
          <div className="min-w-0">
            <p className="font-brand truncate text-disp2 font-bold leading-none tracking-tight text-ink">
              TriponX
            </p>
            <p className="mt-1 text-label font-semibold uppercase tracking-[0.14em] text-ink-muted">
              Hotel PMS
            </p>
          </div>
        </div>

        {/* Collapse button on desktop */}
        <button
          type="button"
          onClick={toggleCollapsed}
          title="Collapse to icon sidebar (Ctrl+\)"
          className="hidden lg:flex h-8 w-8 items-center justify-center rounded-lg text-ink-muted hover:bg-muted-surface hover:text-ink transition-colors cursor-pointer"
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
                <ListItem
                  type="button"
                  onClick={() => toggleSection(section.title)}
                  aria-expanded={open}
                  className="flex w-full items-center justify-between text-left text-label font-bold uppercase tracking-[0.12em] transition-colors cursor-pointer hover:bg-muted-surface/60"
                  style={{
                    color: containsActive ? 'var(--color-primary)' : 'var(--color-ink-secondary)',
                  }}
                >
                  <span className="flex items-center gap-2">
                    <SectionIcon size={14} style={{ color: containsActive ? 'var(--color-primary)' : 'var(--color-ink-muted)' }} />
                    <span className="font-bold">{section.title}</span>
                  </span>
                  <Lucide.ChevronDown
                    size={14}
                    className={`transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
                    style={{ color: containsActive ? 'var(--color-primary)' : 'var(--color-ink-muted)' }}
                  />
                </ListItem>
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
          <ListItem
            type="button"
            onClick={onOpenThemes}
            className="flex items-center gap-2.5 text-label font-semibold text-ink hover:bg-muted-surface transition-colors cursor-pointer"
          >
            <Lucide.Palette size={16} className="text-[var(--color-primary)]" />
            <span>Theme Colors</span>
          </ListItem>
        )}
        <ListItem
          type="button"
          onClick={toggleCollapsed}
          className="items-center gap-2.5 rounded-md px-2.5 py-2 text-label font-medium text-ink-secondary hover:bg-muted-surface hover:text-ink transition-colors cursor-pointer !hidden lg:!flex"
        >
          <Lucide.ChevronsLeft size={16} />
          <span>Collapse sidebar</span>
        </ListItem>
      </div>
    </div>
  );

  // ================= COMPACT ICON RAIL (Desktop Default) =================
  const compactRail = (
    <div className="flex h-full flex-col items-center justify-between bg-surface" style={{ background: 'var(--color-sidebar)' }}>
      {/* 1. Top Brand Logo */}
      <div className="flex h-16 w-full items-center justify-center border-b" style={{ borderColor: 'var(--color-border)' }}>
        <button
          type="button"
          onClick={() => go('dashboard')}
          onMouseEnter={(e) => handleMouseEnter(e, 'TriponX Hotel PMS', 'Go to Dashboard', 'PMS')}
          onMouseLeave={handleMouseLeave}
          className="flex h-10 w-10 items-center justify-center rounded-xl font-brand text-disp2 font-bold shadow-sm transition-transform hover:scale-105 active:scale-95 cursor-pointer"
          style={{ background: 'var(--color-primary)', color: 'var(--color-primary-foreground)' }}
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

              <IconButton variant="plain"
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
                className={`!h-11 !w-11 relative flex items-center justify-center transition-all duration-150 cursor-pointer ${isFlyoutOpen ? 'ring-2 ring-ink-muted scale-105' : 'hover:bg-muted-surface hover:scale-105 active:scale-95' }`}
                style={
                  isSectionActive
                    ? {
                      background: fourthColor,
                      border: '1.5px solid var(--color-primary)',
                      boxShadow: 'var(--shadow-xs)',
                    }
                    : {
                      background: isFlyoutOpen ? 'var(--color-muted-surface)' : 'transparent',
                      border: '1.5px solid transparent',
                    }
                }
              >
                <Icon
                  size={20}
                  strokeWidth={isSectionActive ? 2.2 : 1.8}
                  style={{ color: isSectionActive ? 'var(--color-primary)' : 'var(--color-ink-muted)' }}
                />

                {/* Sub-item count badge indicator */}
                {!isDirectItem && (
                  <span
                    className="absolute -bottom-0.5 -right-0.5 flex h-3.5 min-w-[14px] px-0.5 items-center justify-center rounded-full text-micro font-bold"
                    style={{
                      background: isSectionActive ? 'var(--color-primary)' : 'var(--color-ink-muted)',
                      color: 'var(--color-primary-foreground)',
                    }}
                  >
                    {section.items.length}
                  </span>
                )}
              </IconButton>
            </div>
          );
        })}
      </nav>

      {/* 3. Bottom Utility Actions */}
      <div className="flex h-20 w-full flex-col items-center justify-center border-t gap-1.5 py-2" style={{ borderColor: 'var(--color-border)' }}>
        {/* Theme Swatcher Trigger */}
        {onOpenThemes && (
          <IconButton variant="plain"
            type="button"
            onClick={onOpenThemes}
            onMouseEnter={(e) => handleMouseEnter(e, 'Hotel Theme', 'Switch between 9 color palettes', 'Theme')}
            onMouseLeave={handleMouseLeave}
            className="!h-9 !w-9 flex items-center justify-center transition-all hover:bg-muted-surface hover:scale-110 active:scale-95 cursor-pointer text-ink-secondary hover:text-ink"
            aria-label="Change Theme"
          >
            <Lucide.Palette size={18} />
          </IconButton>
        )}

        {/* Expand Sidebar Toggle */}
        <IconButton variant="plain"
          type="button"
          onClick={toggleCollapsed}
          onMouseEnter={(e) => handleMouseEnter(e, 'Expand Sidebar', 'Show full navigation (Ctrl+\\)', 'Shortcut')}
          onMouseLeave={handleMouseLeave}
          className="!h-8 !w-8 flex items-center justify-center transition-all hover:bg-muted-surface hover:scale-110 active:scale-95 cursor-pointer text-ink-muted hover:text-ink"
          aria-label="Expand sidebar"
        >
          <Lucide.ChevronsRight size={17} />
        </IconButton>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Sidebar: Smoothly transitions between compact 72px icon rail and full 260px panel */}
      <aside
        className={`hidden flex-none self-start border-r lg:sticky lg:top-0 lg:block lg:h-screen transition-[width] duration-200 ease-in-out ${collapsed ? 'w-[72px]' : 'w-[260px]'
          }`}
        style={{ borderColor: 'var(--color-border)', background: 'var(--color-sidebar)' }}
      >
        {collapsed ? compactRail : fullPanel}
      </aside>

      {/* Floating Tooltip via Portal */}
      {tooltip &&
        createPortal(
          <div
            className="pointer-events-none fixed z-[9999] flex items-center duration-100"
            style={{
              left: `${tooltip.x}px`,
              top: `${tooltip.y}px`,
              transform: 'translateY(-50%)',
            }}
          >
            {/* Arrow pointing left */}
            <div className="mr-[-1px] h-0 w-0 border-y-[5px] border-y-transparent border-r-[6px] border-r-slate-900" />
            <div className="rounded-xl bg-ink/95 backdrop-blur-md px-3 py-1.5 text-white shadow-2xl border border-ink-disabled/60 text-left">
              <div className="flex items-center gap-1.5">
                <span className="text-label font-semibold tracking-tight text-white">
                  {tooltip.title}
                </span>
                {tooltip.badge && (
                  <span className="rounded-md bg-surface/20 px-1.5 py-0.5 text-micro font-bold tracking-wide uppercase text-ink-disabled">
                    {tooltip.badge}
                  </span>
                )}
              </div>
              {tooltip.hint && (
                <p className="mt-0.5 text-label text-ink-disabled font-normal">
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
              className="fixed z-[9990] w-[310px] overflow-hidden rounded-2xl border border-border/90 bg-surface text-ink shadow-xl duration-150"
              style={{
                left: `${flyout.x}px`,
                top: `${flyout.y}px`,
              }}
            >
              {/* Flyout Header */}
              <div className="flex items-center justify-between border-b border-divider bg-page/80 px-4 py-3">
                <div className="flex items-center gap-2.5">
                  <div
                    className="flex h-7 w-7 items-center justify-center rounded-lg shadow-2xs"
                    style={{
                      background: 'var(--color-primary)',
                      color: 'var(--color-primary-foreground)',
                    }}
                  >
                    <SectionIcon size={15} />
                  </div>
                  <div>
                    <p className="text-body font-bold text-ink leading-tight">
                      {activeSection.title}
                    </p>
                    <p className="text-label font-medium text-ink-muted">
                      {activeSection.items.length} views available
                    </p>
                  </div>
                </div>
                <IconButton variant="plain"
                  type="button"
                  onClick={() => setFlyout(null)}
                  className="!h-6 !w-6 flex items-center justify-center text-ink-muted hover:bg-border/60 hover:text-ink-secondary transition-colors cursor-pointer"
                  aria-label="Close menu"
                >
                  <Lucide.X size={14} />
                </IconButton>
              </div>

              {/* Flyout Items List */}
              <div className="max-h-[60vh] overflow-y-auto p-1.5 flex flex-col gap-0.5">
                {activeSection.items.map((item) => {
                  const isItemActive = item.id === active;
                  return (
                    <ListItem
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
                      className={`group flex w-full items-center gap-3 text-left transition-all cursor-pointer ${isItemActive ? 'font-semibold shadow-2xs' : 'text-ink hover:bg-muted-surface/80 hover:text-ink' }`}
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
                              background: 'var(--color-muted-surface)',
                              color: 'var(--color-ink-muted)',
                            }
                        }
                      >
                        <NavIcon id={item.id} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between">
                          <p
                            className="text-body font-semibold leading-snug truncate"
                            style={{ color: isItemActive ? 'var(--color-primary)' : 'var(--color-ink)' }}
                          >
                            {item.label}
                          </p>
                          {isItemActive && (
                            <span className="h-1.5 w-1.5 rounded-full flex-none" style={{ background: 'var(--color-primary)' }} />
                          )}
                        </div>
                        <p className="text-label text-ink-muted font-normal truncate mt-0.5">
                          {item.hint}
                        </p>
                      </div>
                    </ListItem>
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
          <Backdrop
            type="button"
            aria-label="Close navigation"
            
            style={{ background: 'var(--color-scrim)' }}
            onClick={onClose}
          />
          <aside
            className="pms-overlay-enter absolute left-0 top-0 h-full w-[86vw] max-w-[320px] overflow-hidden rounded-r-[16px] border-r"
            style={{ borderColor: 'var(--color-border)', boxShadow: 'var(--shadow-2xl)', background: 'var(--color-sidebar)' }}
          >
            <div className="flex items-center justify-between border-b px-4 py-3 lg:hidden" style={{ borderColor: 'var(--color-border)' }}>
              <span className="text-label font-bold uppercase tracking-[0.12em] text-ink-muted">Menu</span>
              <Button variant="secondary" type="button" onClick={onClose} aria-label="Close navigation" className="min-w-[38px] cursor-pointer">✕</Button>
            </div>
            <div className="h-[calc(100%-53px)]">{fullPanel}</div>
          </aside>
        </div>
      ) : null}
    </>
  );
}
