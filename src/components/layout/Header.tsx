import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import * as Lucide from 'lucide-react';
import { NAV_ITEMS, NAV_SECTIONS, viewPermission } from '../../config/navigation';
import type { NavTarget, ViewId } from '../../config/navigation';
import { loadNotices } from '../../lib/api/notices';
import type { Notice } from '../../types';
import { toast } from '../../utils/toast';
import { useAuth } from '../../features/auth/AuthContext';
import { displayApiError } from '../../lib/api/client';
import { folioApi, frontDeskApi, reportsApi } from '../../lib/api/pms';
import { NAV_ICONS } from './navIcons';
import { Button, IconButton, ListItem, TextField } from '../primitives';
import { NotificationHub } from './NotificationHub';
import { ProfileMenu } from './ProfileMenu';
import { TodayGlance } from './TodayGlance';
import type { GlanceItem } from './TodayGlance';

const SEARCH_KEYWORDS: Record<ViewId, string[]> = {
  dashboard: ['home', 'overview', 'summary', 'metrics', 'kpi', 'revenue', 'occupancy', 'analytics'],
  reservations: ['booking', 'bookings', 'calendar', 'room calendar', 'room rack', 'tape chart', 'calendar view', 'schedule', 'stays', 'guest reservation', 'list view', 'table view', 'timeline', 'grid', 'reallocate'],
  'room-calendar': ['room calendar', 'room rack', 'drag and drop', 'timeline', 'grid', 'reservations calendar', 'reallocate', 'tape chart'],
  'new-reservation': ['create booking', 'add reservation', 'new booking', 'book room', 'reservation create', 'make reservation', 'folio reservation', 'quick reservation', 'booking console'],
  'rate-management': ['rate', 'rates', 'pricing', 'seasonal pricing', 'restrictions', 'minimum stay', 'stop sell', 'cta', 'ctd', 'rate plan', 'bar', 'rate calendar', 'rate management'],
  'channel-manager': ['channel', 'channels', 'ota', 'otas', 'booking.com', 'airbnb', 'expedia', 'agoda', 'makemytrip', 'goibibo', 'rate sync', 'inventory sync', 'distribution', 'channel manager'],
  guests: ['guest list', 'profiles', 'directory', 'customers', 'clients', 'loyalty', 'history', 'vip', 'guest history'],
  'room-overview': ['rooms', 'beds', 'room matrix', 'floor plan', 'available rooms', 'room status', 'grid', 'inventory', 'room list', 'room numbers'],
  'room-types': ['categories', 'suites', 'deluxe', 'rates', 'pricing', 'amenities', 'bedding', 'room category'],
  'status-board': ['grid', 'live board', 'room board', 'occupancy board', 'status grid'],
  folios: ['billing', 'charges', 'invoice', 'guest bill', 'account', 'tab', 'ledger', 'balance', 'guest folio'],
  payments: ['cash', 'card', 'credit', 'payment ledger', 'transactions', 'receipt', 'settlement', 'refund'],
  invoices: ['tax invoice', 'bills', 'printable bill', 'pdf invoice', 'corporate billing', 'receipts'],
  'night-audit': ['night audit', 'day close', 'end of day', 'eod', 'post room charges', 'rollover', 'audit summary', 'pre-audit checks', 'close day', 'audit logs'],
  reports: ['analytics', 'metrics', 'audit', 'daily report', 'financials', 'manager report', 'summary report', 'occupancy', 'occupancy report', 'revenue', 'revenue report', 'adr', 'revpar', 'arrivals', 'departures', 'movements', 'guest manifest'],
  'occupancy-report': ['occupancy', 'percentage', 'fill rate', 'room nights', 'adr', 'capacity'],
  'revenue-report': ['income', 'earnings', 'revpar', 'adr', 'sales', 'financial performance', 'money made'],
  'arrivals-departures': ['movements', 'daily movement', 'transfers', 'today arrivals', 'today departures'],
  'staff-roles': ['team', 'employees', 'permissions', 'users', 'access control', 'rbac', 'security', 'hotel staff'],
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
  currentView,
  onMenu,
  onOpenThemes,
  onGo,
}: {
  currentView: ViewId;
  onMenu: () => void;
  onOpenThemes: () => void;
  onGo: (t: NavTarget) => void;
}) {
  const { me, can, logout, switchProperty } = useAuth();
  const [panel, setPanel] = useState<'none' | 'notices' | 'profile'>('none');
  const [prevView, setPrevView] = useState(currentView);
  const [glanceOpen, setGlanceOpen] = useState(currentView === 'dashboard');

  if (currentView !== prevView) {
    setPrevView(currentView);
    setGlanceOpen(currentView === 'dashboard');
  }

  const [readNotices, setReadNotices] = useState<string[]>([]);
  const [dismissedNotices, setDismissedNotices] = useState<string[]>([]);
  const [notices, setNotices] = useState<Notice[]>([]);

  useEffect(() => {
    let mounted = true;
    loadNotices()
      .then((items) => {
        if (mounted) setNotices(items);
      })
      .catch(() => undefined);
    return () => {
      mounted = false;
    };
  }, [me?.activePropertyId]);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);

  const searchInputRef = useRef<HTMLInputElement>(null);
  const closePanels = () => setPanel('none');
  const dismissRef = useDismiss(closePanels);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && glanceOpen) setGlanceOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [glanceOpen]);

  // Every figure comes from the store (see the effect below). Nothing is invented:
  // until the data arrives, and when it is genuinely zero, the value is 0.
  const [glance, setGlance] = useState({
    occupancyPct: 0,
    occupiedRooms: 0,
    totalRooms: 0,
    arrivalsCount: 0,
    departuresCount: 0,
    inHouseCount: 0,
    totalRevenue: 0,
    pendingPaymentsCount: 0,
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
        const occupiedRooms = rooms?.occupied ?? 0;
        const totalRooms = rooms?.total ?? 0;
        const occupancyPct = totalRooms > 0 ? Math.round((occupiedRooms / totalRooms) * 100) : 0;
        const arrivalsCount = arrivals?.data?.length ?? 0;
        const departuresCount = departures?.data?.length ?? 0;
        const inHouseCount = daily?.inHouseCount ?? 0;

        let totalRevenue = 0;
        if (daily?.businessDate) {
          const rev = await reportsApi.revenue(daily.businessDate, daily.businessDate).catch(() => null);
          if (rev?.grossRevenue) {
            totalRevenue = Number(rev.grossRevenue) || 0;
          }
        }

        const pendingPaymentsCount = payments?.filter((p: { status?: string }) => p.status === 'Pending').length ?? 0;

        if (mounted) {
          setGlance({
            occupancyPct,
            occupiedRooms,
            totalRooms,
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
  const visibleNotices = notices.filter((notice) => {
    if (dismissedNotices.includes(notice.id)) return false;
    const target = NAV_ITEMS.find((i) => i.id === notice.target);
    if (!target) return true;
    const permission = viewPermission(target.id);
    return !permission || can(permission);
  });

  const activeMembership = me?.user.propertyMemberships.find((m) => m.propertyId === me.activePropertyId);
  const otherMemberships = me?.user.propertyMemberships.filter((m) => m.isActive && m.propertyId !== me.activePropertyId) ?? [];
  const fullName = me?.user.fullName ?? 'Hospitality Staff';
  const roleName = activeMembership?.role.name ?? 'Staff';

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

  const toggleSingleRead = (id: string) => {
    setReadNotices((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

  const dismissSingleNotice = (id: string) => {
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

  const glanceItems: GlanceItem[] = [
    { key: 'occupancy', label: 'Occupancy', value: `${glance.occupancyPct}%`, detail: `${glance.occupiedRooms} of ${glance.totalRooms} rooms`, tone: 'primary', icon: Lucide.BedDouble, target: { view: 'occupancy-report' } },
    { key: 'arrivals', label: 'Arrivals', value: String(glance.arrivalsCount), detail: 'Expected today', tone: 'success', icon: Lucide.DoorOpen, target: { view: 'reservations' } },
    { key: 'departures', label: 'Departures', value: String(glance.departuresCount), detail: 'Due out today', tone: 'warning', icon: Lucide.DoorClosed, target: { view: 'folios' } },
    { key: 'in-house', label: 'In-house', value: String(glance.inHouseCount), detail: 'Guests staying', tone: 'info', icon: Lucide.Users, target: { view: 'reservations' } },
    { key: 'revenue', label: 'Revenue', value: `₹${glance.totalRevenue.toLocaleString('en-IN')}`, detail: 'Gross today', tone: 'success', icon: Lucide.CreditCard, target: { view: 'revenue-report' } },
    { key: 'pending', label: 'Pending', value: String(glance.pendingPaymentsCount), detail: 'Payments awaiting', tone: 'danger', icon: Lucide.Banknote, target: { view: 'payments' } },
  ];

  return (
    <>
      <header
        className="relative z-30 flex-none border-b backdrop-blur-xl transition-all border-border"
        style={{ background: 'color-mix(in srgb, var(--color-surface) 88%, transparent)', boxShadow: 'var(--shadow-sm)' }}
      >
        <div className="flex h-16 w-full items-center justify-between gap-3 pl-2.5 pr-4 sm:pl-3 sm:pr-6 lg:pl-2.5 lg:pr-8">
          {/* ================= LEFT GROUP: Mobile menu toggle ================= */}
          <div className="flex items-center gap-2 lg:hidden">
            <IconButton variant="ghost"
              type="button"
              onClick={onMenu}
              aria-label="Open mobile menu"
              className="flex items-center justify-center border transition-colors cursor-pointer border-border bg-surface text-ink"
            >
              <Lucide.Menu size={20} />
            </IconButton>
          </div>

          {/* ================= HORIZONTAL SLIDING KPI DRAWER ================= */}
          <div className="flex items-center gap-2 min-w-0">
            <button
              type="button"
              onClick={() => {
                setGlanceOpen((open) => !open);
                setPanel('none');
              }}
              aria-label={glanceOpen ? 'Collapse KPIs' : 'Display KPIs'}
              aria-expanded={glanceOpen}
              title={glanceOpen ? 'Collapse KPIs' : 'Display KPIs'}
              className={`flex h-8 w-8 sm:h-9 sm:w-9 flex-none items-center justify-center rounded-full border transition-all cursor-pointer shadow-xs active:scale-95 ${
                glanceOpen
                  ? 'border-primary bg-primary/10 text-primary'
                  : 'border-border bg-surface text-ink hover:bg-page hover:border-ink-muted'
              }`}
            >
              <Lucide.ChevronRight
                size={16}
                strokeWidth={2.4}
                className={`transition-transform duration-300 ease-in-out ${
                  glanceOpen ? 'rotate-180 text-primary' : 'text-ink'
                }`}
              />
            </button>

            {/* Sliding KPI Strip Container */}
            <div
              className="overflow-hidden transition-all duration-300 ease-in-out min-w-0"
              style={{
                maxWidth: glanceOpen ? '1400px' : '0px',
                opacity: glanceOpen ? 1 : 0,
                pointerEvents: glanceOpen ? 'auto' : 'none',
              }}
            >
              <TodayGlance
                items={glanceItems}
                layout="strip"
                onGo={onGo}
                className="flex-none"
              />
            </div>
          </div>

          {/* ================= RIGHT GROUP: Actions, Alerts, Themes, Profile ================= */}
          <div className="flex items-center gap-2 sm:gap-2.5 ml-auto flex-none">
            {/* + New Booking Button */}
            {can('reservation.create') ? (
              <Button variant="primary"
                type="button"
                onClick={() => onGo({ view: 'new-reservation' })}
                className="flex items-center gap-1.5 shadow-xs transition-all hover:scale-[1.02] active:scale-[0.98] cursor-pointer flex-none"
                title="Create a new reservation"
              >
                <Lucide.Plus size={15} strokeWidth={2.6} />
              </Button>
            ) : null}

            <NotificationHub
              open={panel === 'notices'}
              onToggle={() => {
                setPanel(panel === 'notices' ? 'none' : 'notices');
                setGlanceOpen(false);
              }}
              containerRef={panel === 'notices' ? dismissRef : undefined}
              notices={visibleNotices}
              readIds={readNotices}
              onOpenNotice={openNotice}
              onToggleRead={toggleSingleRead}
              onDismiss={dismissSingleNotice}
              onMarkAllRead={markAllAsRead}
              onClearRead={clearAllRead}
              onPreferences={() => {
                onGo({ view: 'settings' });
                closePanels();
              }}
            />

            <ProfileMenu
              open={panel === 'profile'}
              onToggle={() => {
                setPanel(panel === 'profile' ? 'none' : 'profile');
                setGlanceOpen(false);
              }}
              containerRef={panel === 'profile' ? dismissRef : undefined}
              fullName={fullName}
              email={me?.user.email ?? null}
              roleName={roleName}
              propertyName={activeMembership?.property.name ?? null}
              canViewStaff={can('user.read')}
              otherProperties={otherMemberships}
              onSettings={() => {
                onGo({ view: 'settings' });
                closePanels();
              }}
              onStaff={() => {
                onGo({ view: 'staff-roles' });
                closePanels();
              }}
              onThemes={() => {
                onOpenThemes();
                closePanels();
              }}
              onSwitchProperty={(propertyId) => {
                closePanels();
                void switchProperty(propertyId).catch((error: unknown) =>
                  toast('Property switch failed', { detail: displayApiError(error), tone: 'danger' })
                );
              }}
              onSignOut={() => {
                closePanels();
                void logout().catch((error: unknown) =>
                  toast('Sign out failed', { detail: displayApiError(error), tone: 'danger' })
                );
              }}
            />
          </div>
        </div>


      </header>

      {/* ================= GLOBAL SEARCH & NAVIGATION MODAL (Ctrl+F) ================= */}
      {searchOpen && typeof document !== 'undefined'
        ? createPortal(
          <div
            className="fixed inset-0 z-[100] flex items-start justify-center pt-16 sm:pt-24 px-4 bg-ink/60 backdrop-blur-md pms-animate-fade-in"
            onClick={() => setSearchOpen(false)}
          >
            <div
              className="w-full max-w-2xl overflow-hidden rounded-2xl border shadow-2xl backdrop-blur-2xl bg-surface border-border"
              style={{ boxShadow: 'var(--shadow-2xl), 0 0 0 1px var(--color-border)' }}
              onClick={(e) => e.stopPropagation()}
              onKeyDown={handleSearchKeyDown}
            >
              {/* Search Input Bar */}
              <div
                className="flex items-center gap-3 border-b px-4 py-4 border-border"
              >
                <div
                  className="flex h-9 w-9 items-center justify-center rounded-xl flex-none text-primary"
                  style={{ background: 'color-mix(in srgb, var(--color-primary) 12%, transparent)' }}
                >
                  <Lucide.Search size={20} strokeWidth={2.4} />
                </div>
                <TextField
                  ref={searchInputRef}
                  type="text"
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setSelectedIndex(0);
                  }}
                  placeholder="Type anything to search (e.g., 'reservations', 'check in', 'cleaning', 'rooms', 'bills')..."
                  className="border-0 bg-transparent shadow-none px-0 py-0 min-h-0 w-full text-title font-semibold text-ink placeholder:text-ink-muted focus:outline-none"
                />
                {searchQuery ? (
                  <IconButton variant="plain"
                    type="button"
                    onClick={() => {
                      setSearchQuery('');
                      setSelectedIndex(0);
                    }}
                    className="text-ink-muted hover:text-ink hover:bg-ink/[0.05]"
                    title="Clear input"
                  >
                    <Lucide.X size={17} />
                  </IconButton>
                ) : null}
                <kbd
                  onClick={() => setSearchOpen(false)}
                  className="rounded-lg border px-2 py-1 text-label font-bold text-ink-muted cursor-pointer hover:bg-ink/[0.04] border-border"
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
                          <span className="text-label font-bold uppercase tracking-wider text-ink-muted">
                            Matching Screens & Views ({matchedNavItems.length})
                          </span>
                          <span className="text-label text-ink-muted">Click or press Enter to navigate</span>
                        </div>
                        <div className="flex flex-col gap-1">
                          {matchedNavItems.map((item, index) => {
                            const Icon = NAV_ICONS[item.id] ?? Lucide.Circle;
                            const isSelected = selectedIndex === index;

                            // Find section name
                            const section = NAV_SECTIONS.find((s) => s.items.some((i) => i.id === item.id));

                            return (
                              <ListItem
                                key={item.id}
                                type="button"
                                onClick={() => {
                                  setSearchOpen(false);
                                  onGo({ view: item.id });
                                }}
                                className={`group flex items-center justify-between text-left transition-all ${isSelected ? 'bg-primary text-white shadow-md' : 'hover:bg-primary/[0.07] text-ink' }`}
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
                                    className={`flex h-9 w-9 flex-none items-center justify-center rounded-xl ${isSelected
                                      ? 'bg-surface/20 text-white'
                                      : 'bg-primary/10 text-primary'
                                      }`}
                                  >
                                    <Icon size={18} strokeWidth={2.2} />
                                  </div>
                                  <div className="min-w-0">
                                    <div className="flex items-center gap-2">
                                      <span className="text-body font-bold truncate">
                                        {item.label}
                                      </span>
                                      {section ? (
                                        <span
                                          className={`rounded px-1.5 py-0.5 text-micro font-bold uppercase tracking-wider ${isSelected
                                            ? 'bg-surface/25 text-white'
                                            : 'bg-ink/[0.05] text-ink-muted'
                                            }`}
                                        >
                                          {section.title}
                                        </span>
                                      ) : null}
                                    </div>
                                    <p
                                      className={`text-label truncate mt-0.5 ${isSelected ? 'text-white/80' : 'text-ink-secondary'
                                        }`}
                                    >
                                      {item.hint}
                                    </p>
                                  </div>
                                </div>

                                <div className="flex items-center gap-1.5 flex-none ml-2">
                                  <span
                                    className={`text-label font-bold ${isSelected ? 'text-white' : 'text-primary group-hover:translate-x-0.5 transition-transform'
                                      }`}
                                  >
                                    Go to page
                                  </span>
                                  <Lucide.ArrowRight size={14} strokeWidth={2.4} />
                                </div>
                              </ListItem>
                            );
                          })}
                        </div>
                      </div>
                    ) : null}

                    {/* 2. DEEP SEARCH ACTIONS (Search query inside specific database modules) */}
                    <div className="mt-2">
                      <p className="px-2 py-1 text-label font-bold uppercase tracking-wider text-ink-muted">
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
                            color: 'var(--color-success-text)',
                          },
                          {
                            idx: matchedNavItems.length + 2,
                            label: `Search "${searchQuery}" in Room Overview`,
                            sub: 'Find room numbers, room types, or floor locations',
                            icon: Lucide.BedDouble,
                            action: () => onGo({ view: 'room-overview', query: searchQuery }),
                            color: 'var(--color-info-text)',
                          },
                        ].map((act) => {
                          const isSelected = selectedIndex === act.idx;
                          return (
                            <ListItem
                              key={act.idx}
                              type="button"
                              onClick={() => {
                                setSearchOpen(false);
                                act.action();
                              }}
                              className={`flex items-center justify-between text-left transition-all ${isSelected ? 'bg-primary text-white shadow-md' : 'hover:bg-ink/[0.04] text-ink' }`}
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
                                  className={`flex h-9 w-9 flex-none items-center justify-center rounded-xl ${isSelected ? 'bg-surface/20 text-white' : 'bg-ink/[0.04]'
                                    }`}
                                  style={!isSelected ? { color: act.color } : undefined}
                                >
                                  <act.icon size={18} strokeWidth={2.2} />
                                </div>
                                <div className="min-w-0">
                                  <p className="text-body font-bold truncate">{act.label}</p>
                                  <p
                                    className={`text-label truncate mt-0.5 ${isSelected ? 'text-white/80' : 'text-ink-secondary'
                                      }`}
                                  >
                                    {act.sub}
                                  </p>
                                </div>
                              </div>
                              <Lucide.ArrowRight size={14} className={isSelected ? 'text-white' : 'text-ink-muted'} />
                            </ListItem>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                ) : (
                  /* QUICK CATEGORIZED SHORTCUTS WHEN SEARCH INPUT IS EMPTY */
                  <div className="flex flex-col gap-4 p-1">
                    <div>
                      <p className="px-2 py-1 text-label font-bold uppercase tracking-wider text-ink-muted">
                        Front Office & Operations
                      </p>
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mt-1">
                        {[
                          { id: 'dashboard' as const, label: 'Dashboard', icon: Lucide.LayoutDashboard },
                          { id: 'reservations' as const, label: 'Reservations', icon: Lucide.CalendarDays },
                          { id: 'new-reservation' as const, label: '+ New Booking', icon: Lucide.CalendarPlus },
                          { id: 'guests' as const, label: 'Guest Directory', icon: Lucide.BookUser },
                        ].map((item) => (
                          <ListItem
                            key={item.id}
                            type="button"
                            onClick={() => {
                              setSearchOpen(false);
                              onGo({ view: item.id });
                            }}
                            className="flex items-center gap-2.5 border text-left text-body font-bold transition-all hover:bg-primary/[0.05] hover:border-primary"
                            style={{ borderColor: 'var(--color-border)', background: 'var(--color-surface)' }}
                          >
                            <item.icon size={17} className="text-primary flex-none" />
                            <span className="truncate">{item.label}</span>
                          </ListItem>
                        ))}
                      </div>
                    </div>

                    <div>
                      <p className="px-2 py-1 text-label font-bold uppercase tracking-wider text-ink-muted">
                        Rooms & Billing
                      </p>
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mt-1">
                        {[
                          { id: 'room-overview' as const, label: 'Room Matrix', icon: Lucide.BedDouble },
                          { id: 'status-board' as const, label: 'Status Board', icon: Lucide.LayoutGrid },
                          { id: 'folios' as const, label: 'Folios & Billing', icon: Lucide.ReceiptText },
                          { id: 'invoices' as const, label: 'Invoices', icon: Lucide.FileText },
                        ].map((item) => (
                          <ListItem
                            key={item.id}
                            type="button"
                            onClick={() => {
                              setSearchOpen(false);
                              onGo({ view: item.id });
                            }}
                            className="flex items-center gap-2.5 border text-left text-body font-bold transition-all hover:bg-primary/[0.05] hover:border-primary"
                            style={{ borderColor: 'var(--color-border)', background: 'var(--color-surface)' }}
                          >
                            <item.icon size={17} className="text-primary flex-none" />
                            <span className="truncate">{item.label}</span>
                          </ListItem>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Modal Footer */}
              <div
                className="flex items-center justify-between border-t px-4 py-3 text-label text-ink-muted border-border"
                style={{ background: 'color-mix(in srgb, var(--color-muted-surface) 40%, var(--color-surface))' }}
              >
                <div className="flex items-center gap-2">
                  <span>Shortcut:</span>
                  <kbd className="rounded border px-1.5 py-0.5 font-bold text-ink border-border">Ctrl + F</kbd>
                  <span>or</span>
                  <kbd className="rounded border px-1.5 py-0.5 font-bold text-ink border-border">Ctrl + K</kbd>
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
