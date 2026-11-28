import { useCallback, useEffect, useRef, useState } from 'react';
import { ErrorBoundary, PanelCrashFallback } from '../shared/components/feedback/ErrorBoundary';
import { Toaster } from '../shared/components/feedback/Toaster';
import { Button } from '../shared/components/ui/primitives';
import { useAuth } from '../shared/features/auth/AuthContext';
import { SetupWizard } from '../shared/features/property-setup/setup-wizard/SetupWizard';
import { ThemeSwatcher } from '../shared/theme/ThemeSwatcher';
import { ActivityLogPage } from './features/activity-log/ActivityLogPage';
import { AuditPage } from './features/audit/AuditPage';
import { ConsoleDashboard } from './features/dashboard/ConsoleDashboard';
import { ManagersPage } from './features/managers/ManagersPage';
import { OtaChannelsAdmin } from './features/ota-channels/OtaChannelsAdminPage';
import { OwnersPage } from './features/owners/OwnersPage';
import { PeoplePage } from './features/owners/PeoplePage';
import { PropertiesPage } from './features/properties/PropertiesPage';
import { ConsoleHeader } from './layout/ConsoleHeader';
import { ConsoleSidebar } from './layout/ConsoleSidebar';
import { CONSOLE_NAMES, consoleTitle } from './layout/consoleNav';
import type { ConsoleView } from './layout/consoleNav';

/**
 * Where the Super Super Admin, Relationship Managers and owners land after signing in: a dashboard, and the
 * owners, properties and people below them in the chain, with chrome that belongs to no property. Opening a
 * property hands over to the hotel workspace, and "Back to console" in its account menu returns.
 */
export function ConsoleShell() {
  const { me } = useAuth();
  const role = me?.user.role === 'RM' || me?.user.role === 'OWNER' ? me.user.role : 'SUPER_ADMIN';
  const [view, setView] = useState<ConsoleView>('overview');
  // The owner company a property is being added to, while the wizard is open.
  const [newPropertyOwner, setNewPropertyOwner] = useState<string | null>(null);
  const [navOpen, setNavOpen] = useState(false);
  const [swatcherOpen, setSwatcherOpen] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: 0 });
  }, [view]);

  const go = useCallback((next: ConsoleView) => {
    setView(next);
    setNavOpen(false);
  }, []);
  const closeNav = useCallback(() => setNavOpen(false), []);

  if (view === 'new-property' && newPropertyOwner) {
    return (
      <>
        <SetupWizard
          ownerId={newPropertyOwner}
          exitAction={
            <Button variant="ghost" onClick={() => go('properties')}>
              Exit setup
            </Button>
          }
          // The property is saved; stay in the console and show it in the list.
          onDone={() => go('properties')}
        />
        <Toaster />
      </>
    );
  }

  return (
    <div className="pms-app-shell flex h-dvh min-h-0 bg-page text-ink">
      <a href="#console-main" className="sr-only focus:not-sr-only focus:absolute focus:left-3 focus:top-3 focus:z-[70] focus:rounded-control focus:border focus:px-4 focus:py-2 focus:text-body focus:font-semibold bg-surface border-border text-ink">
        Skip to main content
      </a>
      <ConsoleSidebar role={role} active={view} onNavigate={go} open={navOpen} onClose={closeNav} onOpenThemes={() => setSwatcherOpen(true)} />
      <div className="pms-app-column flex min-h-0 min-w-0 flex-1 flex-col bg-page">
        <ConsoleHeader role={role} title={consoleTitle(role, view)} onMenu={() => setNavOpen(true)} onOpenThemes={() => setSwatcherOpen(true)} />
        <div ref={scrollRef} data-app-scroll className="pms-app-scroll flex min-h-0 flex-1 flex-col overflow-x-clip overflow-y-auto">
          <main id="console-main" tabIndex={-1} key={view} className="pms-animate-fade-in mx-auto w-full max-w-[1600px] flex-1 bg-page px-4 py-4 lg:px-6 lg:py-6 2xl:max-w-[1760px]">
            {view === 'overview' ? <ConsoleDashboard go={go} /> : null}
            {view === 'managers' && role === 'SUPER_ADMIN' ? <ManagersPage /> : null}
            {view === 'owners' && role !== 'OWNER' ? <OwnersPage /> : null}
            {view === 'properties' ? (
              <PropertiesPage
                onAddProperty={(ownerId) => {
                  setNewPropertyOwner(ownerId);
                  setView('new-property');
                }}
              />
            ) : null}
            {view === 'people' && role === 'OWNER' ? <PeoplePage /> : null}
            {view === 'audit' ? <AuditPage /> : null}
            {view === 'otas' && role === 'SUPER_ADMIN' ? <OtaChannelsAdmin /> : null}
            {view === 'activity' && role === 'SUPER_ADMIN' ? <ActivityLogPage /> : null}
          </main>
          <footer className="border-t border-border bg-surface px-4 py-3.5 lg:px-6">
            <p className="tnum mx-auto w-full max-w-[1600px] text-label font-normal text-ink-secondary 2xl:max-w-[1760px]">
              Hotel PMX · {CONSOLE_NAMES[role].console}
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
