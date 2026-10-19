import { Suspense, lazy, useCallback, useEffect, useMemo, useState } from 'react';
import { Header, Sidebar } from './components/layout';
import type { NavTarget } from './components/nav';
import { viewPermission } from './components/nav';
import { ThemeSwatcher } from './components/ThemeSwatcher';
import { AppCrashFallback, ErrorBoundary, PanelCrashFallback } from './components/ErrorBoundary';
import { ForbiddenPage, NotFoundPage } from './components/ErrorPages';
import { ThemeProvider } from './theme/ThemeContext';
import { useTheme } from './theme/useTheme';
import { THEME_PRESETS } from './theme/presets';
import type { ThemePresetId } from './theme/presets';
import { Toaster } from './components/overlays';
import { Dashboard } from './pages/Dashboard';
import { AuthProvider, useAuth } from './features/auth/AuthContext';
import { themeApi } from './lib/api/themeApi';
import type { ThemeKey } from './types';

const THEME_KEY_TO_PRESET: Record<ThemeKey, ThemePresetId> = {
  MIDNIGHT_NAVY: 'midnight',
  SKY_BLUE_WHITE: 'ocean',
  LUXURY_BEIGE_TAUPE: 'beige',
  SAGE_GREEN: 'sage',
  SOFT_BLUE_SLATE: 'slate',
  EUCALYPTUS: 'eucalyptus',
  OLIVE_CREAM: 'olive',
  DUSTY_LAVENDER: 'lavender',
  CRIMSON_RED: 'crimson',
};
const PRESET_TO_THEME_KEY = Object.fromEntries(Object.entries(THEME_KEY_TO_PRESET).map(([key, value]) => [value, key])) as Record<string, ThemeKey>;

const Reservations = lazy(() => import('./pages/Reservations').then((m) => ({ default: m.Reservations })));
const NewReservation = lazy(() => import('./pages/NewReservation').then((m) => ({ default: m.NewReservation })));
const NewReservation2 = lazy(() => import('./pages/NewReservation2').then((m) => ({ default: m.NewReservation2 })));
const NewReservation3 = lazy(() => import('./pages/NewReservation3').then((m) => ({ default: m.NewReservation3 })));
const RateManagement = lazy(() => import('./pages/RateManagement').then((m) => ({ default: m.RateManagement })));
const ChannelManager = lazy(() => import('./pages/ChannelManager').then((m) => ({ default: m.ChannelManager })));
const CheckIn = lazy(() => import('./pages/CheckIn').then((m) => ({ default: m.CheckIn })));
const CheckOut = lazy(() => import('./pages/CheckOut').then((m) => ({ default: m.CheckOut })));
const InHouse = lazy(() => import('./pages/InHouse').then((m) => ({ default: m.InHouse })));
const Guests = lazy(() => import('./pages/Guests').then((m) => ({ default: m.Guests })));
const WalkIn = lazy(() => import('./pages/WalkIn').then((m) => ({ default: m.WalkIn })));
const Rooms = lazy(() => import('./pages/Rooms').then((m) => ({ default: m.Rooms })));
const RoomTypes = lazy(() => import('./pages/RoomTypes').then((m) => ({ default: m.RoomTypes })));
const RoomInventory = lazy(() => import('./pages/RoomInventory').then((m) => ({ default: m.RoomInventory })));
const StatusBoard = lazy(() => import('./pages/StatusBoard').then((m) => ({ default: m.StatusBoard })));
const Housekeeping = lazy(() => import('./pages/Housekeeping').then((m) => ({ default: m.Housekeeping })));
const Maintenance = lazy(() => import('./pages/Maintenance').then((m) => ({ default: m.Maintenance })));
const Billing = lazy(() => import('./pages/Billing').then((m) => ({ default: m.Billing })));
const Payments = lazy(() => import('./pages/Payments').then((m) => ({ default: m.Payments })));
const Invoices = lazy(() => import('./pages/Invoices').then((m) => ({ default: m.Invoices })));
const NightAudit = lazy(() => import('./pages/NightAudit').then((m) => ({ default: m.NightAudit })));
const Reports = lazy(() => import('./pages/Reports').then((m) => ({ default: m.Reports })));
const OccupancyReport = lazy(() => import('./pages/OccupancyReport').then((m) => ({ default: m.OccupancyReport })));
const RevenueReport = lazy(() => import('./pages/RevenueReport').then((m) => ({ default: m.RevenueReport })));
const ArrivalsReport = lazy(() => import('./pages/ArrivalsReport').then((m) => ({ default: m.ArrivalsReport })));
const Staff = lazy(() => import('./pages/Staff').then((m) => ({ default: m.Staff })));
const Properties = lazy(() => import('./pages/Properties').then((m) => ({ default: m.Properties })));
const Settings = lazy(() => import('./pages/Settings').then((m) => ({ default: m.Settings })));

function PageFallback() {
  return (
    <div className="flex flex-col gap-3" aria-busy="true" aria-label="Loading page">
      <div className="pms-card p-4 sm:p-5">
        <div className="h-5 w-40 rounded-full" style={{ background: 'var(--color-muted-surface)' }} />
        <div className="mt-2 h-4 w-64 max-w-full rounded-full" style={{ background: 'var(--color-divider)' }} />
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="pms-card min-h-[112px] p-4" />
        ))}
      </div>
    </div>
  );
}

function Shell() {
  const { me, can } = useAuth();
  const [target, setTarget] = useState<NavTarget>({ view: 'dashboard' });
  const [navOpen, setNavOpen] = useState(false);
  const [swatcherOpen, setSwatcherOpen] = useState(false);
  const { preset } = useTheme();
  const view = target.view;

  useEffect(() => {
    window.scrollTo({ top: 0 });
  }, [view, target.focusId]);

  const go = useCallback((t: NavTarget) => {
    setTarget(t);
    setNavOpen(false);
  }, []);

  const page = useMemo(() => {
    // Presentation-level guard. The API still enforces every permission; this
    // only stops a deep link or notification from rendering a screen whose
    // data calls would all come back 403.
    const required = viewPermission(view);
    if (required && !can(required)) {
      const activeMembership = me?.user.propertyMemberships.find((m) => m.propertyId === me.activePropertyId);
      return (
        <ForbiddenPage
          permission={required}
          userRole={activeMembership?.role.name}
          propertyName={activeMembership?.property.name}
          onGo={go}
        />
      );
    }
    switch (view) {
      case 'dashboard':
        return <Dashboard go={go} onOpenThemes={() => setSwatcherOpen(true)} />;
      case 'reservations':
        return <Reservations initialViewMode="list" initialQuery={target.query} focusId={target.focusId} go={go} onOpenThemes={() => setSwatcherOpen(true)} />;
      case 'room-calendar':
        return <Reservations initialViewMode="calendar" initialQuery={target.query} focusId={target.focusId} go={go} onOpenThemes={() => setSwatcherOpen(true)} />;
      case 'new-reservation':
        return <NewReservation go={go} onOpenThemes={() => setSwatcherOpen(true)} />;
      case 'new-reservation-2':
        return <NewReservation2 go={go} onOpenThemes={() => setSwatcherOpen(true)} />;
      case 'new-reservation-3':
        return <NewReservation3 go={go} onOpenThemes={() => setSwatcherOpen(true)} />;
      case 'rate-management':
        return <RateManagement />;
      case 'channel-manager':
        return <ChannelManager />;
      case 'check-in':
        return <CheckIn initialQuery={target.query} />;
      case 'check-out':
        return <CheckOut />;
      case 'in-house':
        return <InHouse go={go} />;
      case 'guests':
        return <Guests initialQuery={target.query} focusId={target.focusId} go={go} />;
      case 'walk-in':
        return <WalkIn go={go} />;
      case 'room-overview':
        return <Rooms initialQuery={target.query} focusId={target.focusId} />;
      case 'room-types':
        return <RoomTypes />;
      case 'room-inventory':
        return <RoomInventory />;
      case 'status-board':
        return <StatusBoard />;
      case 'housekeeping':
        return <Housekeeping />;
      case 'maintenance':
        return <Maintenance />;
      case 'folios':
        return <Billing />;
      case 'payments':
        return <Payments />;
      case 'invoices':
        return <Invoices />;
      case 'night-audit':
        return <NightAudit go={go} onOpenThemes={() => setSwatcherOpen(true)} />;
      case 'reports':
        return <Reports go={go} />;
      case 'occupancy-report':
        return <OccupancyReport />;
      case 'revenue-report':
        return <RevenueReport />;
      case 'arrivals-departures':
        return <ArrivalsReport />;
      case 'staff-roles':
        return <Staff />;
      case 'properties':
        return <Properties />;
      case 'settings':
        return <Settings onOpenThemes={() => setSwatcherOpen(true)} />;
      default:
        return <NotFoundPage onGo={go} />;
    }
  }, [view, target.query, target.focusId, go, can, me]);

  return (
    <div className="flex min-h-screen" style={{ background: 'var(--color-page)', color: 'var(--color-ink)' }}>
      <a href="#pms-main" className="sr-only focus:not-sr-only focus:absolute focus:left-3 focus:top-3 focus:z-[70] focus:rounded-control focus:border focus:px-4 focus:py-2 focus:text-[13px] focus:font-semibold" style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)', color: 'var(--color-ink)' }}>
        Skip to main content
      </a>
      <Sidebar
        active={view}
        onNavigate={(v) => go({ view: v })}
        mobileOpen={navOpen}
        onClose={() => setNavOpen(false)}
        onOpenThemes={() => setSwatcherOpen(true)}
      />
      <div className="flex min-w-0 flex-1 flex-col" style={{ background: 'var(--color-page)' }}>
        <Header
          onMenu={() => setNavOpen(true)}
          onOpenThemes={() => setSwatcherOpen(true)}
          onGo={go}
        />
        <main id="pms-main" tabIndex={-1} key={`${me?.activePropertyId ?? ''}-${view}-${target.focusId ?? ''}-${target.query ?? ''}`} className={`pms-animate-fade-up mx-auto w-full flex-1 px-4 py-4 lg:px-6 lg:py-6 ${view === 'dashboard' || view === 'new-reservation' || view === 'new-reservation-2' || view === 'new-reservation-3' || view === 'reservations' || view === 'room-calendar' || view === 'status-board' ? 'max-w-[1600px] 2xl:max-w-[1760px]' : 'max-w-[1280px] 2xl:max-w-[1440px]'}`} style={{ background: 'var(--color-page)' }}>
          <Suspense fallback={<PageFallback />}>{page}</Suspense>
        </main>
        <footer
          className="border-t px-4 py-3.5 lg:px-6"
          style={{ borderColor: 'var(--color-border)', background: 'var(--color-surface)' }}
        >
          <p className="tnum mx-auto w-full max-w-[1280px] text-xs font-normal 2xl:max-w-[1440px]" style={{ color: 'var(--color-ink-secondary)' }}>
            TriponX PMS · {THEME_PRESETS[preset]?.name ?? 'Theme'} · 9 colour themes ·
            status colours fixed across themes · unsupported modules remain demo-only
          </p>
        </footer>
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

function ShellWithBoundary() {
  return (
    <ErrorBoundary fallback={(reset) => <AppCrashFallback reset={reset} />}>
      <Shell />
    </ErrorBoundary>
  );
}

function AuthenticatedApp() {
  const { me, loading, switchProperty } = useAuth();
  const { preset, setPreset } = useTheme();
  const [loadedThemeProperty, setLoadedThemeProperty] = useState<string | null>(null);
  const themeScope = me?.activePropertyId ? `${me.user.id}:${me.activePropertyId}` : null;

  useEffect(() => {
    if (!themeScope || !me?.activePropertyId) return;
    let active = true;
    const scope = themeScope;
    themeApi.get().then(({ themeKey }) => {
      const presetId = THEME_KEY_TO_PRESET[themeKey];
      if (active && presetId) setPreset(presetId);
    }).catch(() => undefined).finally(() => {
      if (active) setLoadedThemeProperty(scope);
    });
    return () => { active = false; };
  }, [themeScope, me?.activePropertyId, setPreset]);

  useEffect(() => {
    if (!themeScope || loadedThemeProperty !== themeScope) return;
    const themeKey = PRESET_TO_THEME_KEY[preset];
    if (themeKey) void themeApi.set(themeKey).catch(() => undefined);
  }, [themeScope, loadedThemeProperty, preset]);

  if (loading) {
    return <main className="flex min-h-screen items-center justify-center" style={{ background: 'var(--color-page)', color: 'var(--color-ink)' }}><p className="pms-helper">Connecting to TriponX…</p></main>;
  }

  if (!me) {
    return (
      <main className="flex min-h-screen items-center justify-center" style={{ background: 'var(--color-page)', color: 'var(--color-ink)' }}>
        <p className="pms-helper">Preparing your workspace…</p>
      </main>
    );
  }

  if (!me.activePropertyId) {
    const memberships = me.user.propertyMemberships.filter((membership) => membership.isActive);
    return (
      <main className="flex min-h-screen items-center justify-center px-4" style={{ background: 'var(--color-page)', color: 'var(--color-ink)' }}>
        <section className="pms-card w-full max-w-[520px] p-5">
          <h1 className="pms-section-title">Choose a property</h1>
          <p className="pms-helper mt-1">Select an active property to continue.</p>
          <div className="mt-4 flex flex-col gap-2">
            {memberships.map((membership) => (
              <button key={membership.propertyId} type="button" className="pms-btn-ghost px-4 py-3 text-left" onClick={() => void switchProperty(membership.propertyId)}>
                {membership.property.name} · {membership.role.name}
              </button>
            ))}
          </div>
        </section>
      </main>
    );
  }

  return <ShellWithBoundary />;
}

function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <AuthenticatedApp />
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;
