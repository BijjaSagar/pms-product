import { Suspense, lazy, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { PageSkeleton } from './components/feedback/Skeleton';
import { Header } from './components/layout/Header';
import { Sidebar } from './components/layout/Sidebar';
import type { NavTarget } from './config/navigation';
import { viewPermission } from './config/navigation';
import { ThemeSwatcher } from './theme/ThemeSwatcher';
import { AppCrashFallback, ErrorBoundary, PanelCrashFallback } from './components/feedback/ErrorBoundary';
import { ForbiddenPage, NotFoundPage } from './components/feedback/ErrorPages';
import { useTheme } from './theme/useTheme';
import { THEME_PRESETS } from './theme/presets';
import { Toaster } from './components/feedback/Toaster';
import { Dashboard } from './features/dashboard/DashboardPage';
import { useAuth } from './features/auth/AuthContext';
import { InventoryProvider } from './features/inventory/InventoryProvider';

const Reservations = lazy(() => import('./features/reservations/ReservationsPage').then((m) => ({ default: m.Reservations })));
const NewReservation = lazy(() => import('./features/reservations/NewReservationPage').then((m) => ({ default: m.NewReservation })));
const RateManagement = lazy(() => import('./features/distribution/RateManagementPage').then((m) => ({ default: m.RateManagement })));
const ChannelManager = lazy(() => import('./features/distribution/ChannelManagerPage').then((m) => ({ default: m.ChannelManager })));
const Guests = lazy(() => import('./features/guests/GuestsPage').then((m) => ({ default: m.Guests })));
const Rooms = lazy(() => import('./features/rooms/RoomsPage').then((m) => ({ default: m.Rooms })));
const Billing = lazy(() => import('./features/finance/BillingPage').then((m) => ({ default: m.Billing })));
const Payments = lazy(() => import('./features/finance/PaymentsPage').then((m) => ({ default: m.Payments })));
const Invoices = lazy(() => import('./features/finance/InvoicesPage').then((m) => ({ default: m.Invoices })));
const NightAudit = lazy(() => import('./features/finance/NightAuditPage').then((m) => ({ default: m.NightAudit })));
const Reports = lazy(() => import('./features/analytics/ReportsPage').then((m) => ({ default: m.Reports })));
const Settings = lazy(() => import('./features/settings/SettingsPage').then((m) => ({ default: m.Settings })));

function Shell() {
  const { me, canOpen } = useAuth();
  const [target, setTarget] = useState<NavTarget>({ view: 'dashboard' });
  const [navOpen, setNavOpen] = useState(false);
  const [swatcherOpen, setSwatcherOpen] = useState(false);
  const { preset } = useTheme();
  const scrollRef = useRef<HTMLDivElement>(null);
  const view = target.view;

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: 0 });
  }, [view, target.focusId]);

  const go = useCallback((t: NavTarget) => {
    setTarget(t);
    setNavOpen(false);
  }, []);

  const page = useMemo(() => {
    // Presentation-level guard. The API still enforces every permission; this
    // only stops a deep link or notification from rendering a screen whose
    // data calls would all come back 403.
    if (!canOpen(view)) {
      const activeMembership = me?.user.propertyMemberships.find((m) => m.propertyId === me.activePropertyId);
      return (
        <ForbiddenPage
          permission={viewPermission(view) ?? view}
          userRole={activeMembership?.role.name}
          propertyName={activeMembership?.property.name}
          onGo={go}
        />
      );
    }
    switch (view) {
      case 'dashboard':
        return <Dashboard go={go} />;
      case 'reservations':
        return <Reservations initialViewMode="calendar" initialQuery={target.query} focusId={target.focusId} go={go} />;
      case 'room-calendar':
        return <Reservations initialViewMode="calendar" initialQuery={target.query} focusId={target.focusId} go={go} />;
      case 'new-reservation':
        return <NewReservation go={go} initialDraft={target.draft} editId={target.focusId} />;
      case 'rate-management':
        return <RateManagement />;
      case 'channel-manager':
        return <ChannelManager />;
      case 'guests':
        return <Guests initialQuery={target.query} focusId={target.focusId} go={go} />;
      case 'room-overview':
        return <Rooms initialViewMode="grid" focusId={target.focusId} />;
      case 'room-types':
        return <Settings initialTab="room-setup-2" onOpenThemes={() => setSwatcherOpen(true)} />;
      case 'status-board':
        return <Rooms initialViewMode="timeline" />;
      case 'folios':
        return <Billing />;
      case 'payments':
        return <Payments />;
      case 'invoices':
        return <Invoices />;
      case 'night-audit':
        return <NightAudit go={go} />;
      case 'reports':
        return <Reports initialTab="overview" go={go} />;
      case 'occupancy-report':
        return <Reports initialTab="occupancy" go={go} />;
      case 'revenue-report':
        return <Reports initialTab="revenue" go={go} />;
      case 'arrivals-departures':
        return <Reports initialTab="movements" go={go} />;
      case 'settings':
        return <Settings onOpenThemes={() => setSwatcherOpen(true)} />;
      default:
        return <NotFoundPage onGo={go} />;
    }
  }, [view, target.query, target.focusId, target.draft, go, canOpen, me]);

  return (
    <div className="pms-app-shell flex h-dvh min-h-0 bg-page text-ink">
      <a href="#pms-main" className="sr-only focus:not-sr-only focus:absolute focus:left-3 focus:top-3 focus:z-[70] focus:rounded-control focus:border focus:px-4 focus:py-2 focus:text-body focus:font-semibold bg-surface border-border text-ink">
        Skip to main content
      </a>
      <Sidebar
        active={view}
        onNavigate={(v) => go({ view: v })}
        mobileOpen={navOpen}
        onClose={() => setNavOpen(false)}
        onOpenThemes={() => setSwatcherOpen(true)}
      />
      <div className="pms-app-column flex min-h-0 min-w-0 flex-1 flex-col bg-page">
        <Header
          currentView={view}
          onMenu={() => setNavOpen(true)}
          onOpenThemes={() => setSwatcherOpen(true)}
          onGo={go}
        />
        <div
          ref={scrollRef}
          data-app-scroll
          className="pms-app-scroll flex min-h-0 flex-1 flex-col overflow-x-clip overflow-y-auto"
        >
          <main id="pms-main" tabIndex={-1} key={`${me?.activePropertyId ?? ''}-${view}-${target.focusId ?? ''}-${target.query ?? ''}-${target.draft?.roomNumber ?? ''}-${target.draft?.checkIn ?? ''}`} className={"pms-animate-fade-in mx-auto w-full flex-1 px-4 py-4 lg:px-6 lg:py-6 max-w-[1600px] 2xl:max-w-[1760px] bg-page"}>
            <Suspense fallback={<PageSkeleton />}>{page}</Suspense>
          </main>
          <footer
            className="border-t px-4 py-3.5 lg:px-6 border-border bg-surface"
          >
            <p className="tnum mx-auto w-full max-w-[1600px] text-label font-normal 2xl:max-w-[1760px] text-ink-secondary">
              Hotel PMX · {THEME_PRESETS[preset]?.name ?? 'Theme'} · 9 colour themes ·
              status colours fixed across themes · unsupported modules remain demo-only
            </p>
          </footer>
        </div>
      </div>
      <ErrorBoundary
        resetKeys={[swatcherOpen]}
        onReset={() => setSwatcherOpen(false)}
        fallback={(reset) => <PanelCrashFallback reset={reset} onClose={() => setSwatcherOpen(false)} />}
      >
        <ThemeSwatcher open={swatcherOpen} onClose={() => setSwatcherOpen(false)} />
      </ErrorBoundary>
      <Toaster />
    </div>
  );
}

/** One property's workspace: the sidebar, header and every hotel screen. Shared by the hotel app and by the platform console's "Open". */
export function HotelWorkspace({ propertyId }: { propertyId: string }) {
  return (
    <InventoryProvider propertyId={propertyId}>
      <ErrorBoundary fallback={(reset) => <AppCrashFallback reset={reset} />}>
        <Shell />
      </ErrorBoundary>
    </InventoryProvider>
  );
}
