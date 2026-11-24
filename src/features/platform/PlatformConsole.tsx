import { useCallback, useEffect, useRef, useState } from 'react';
import { ErrorBoundary, PanelCrashFallback } from '../../components/feedback/ErrorBoundary';
import { Toaster } from '../../components/feedback/Toaster';
import { Button } from '../../components/ui/primitives';
import { ThemeSwatcher } from '../../theme/ThemeSwatcher';
import { SetupWizard } from '../property-setup/setup-wizard/SetupWizard';
import { ActivityLogPage } from './ActivityLogPage';
import { OtaChannelsAdmin } from './OtaChannelsAdminPage';
import { PlansAdmin } from './PlansAdminPage';
import { PlatformDashboard } from './PlatformDashboard';
import { PlatformHeader } from './PlatformHeader';
import { PlatformSidebar } from './PlatformSidebar';
import { PropertiesAdmin } from './PropertiesAdminPage';
import { UsersAdmin } from './UsersAdminPage';
import { platformTitle } from './platformNav';
import type { PlatformView } from './platformNav';
import type { UsersStatusFilter } from './UsersAdminPage';

/**
 * Where a super admin lands after signing in: their own dashboard, properties and users, with chrome
 * that belongs to no property. Opening a hotel from here hands over to the hotel shell, and "Back to
 * platform console" in its account menu returns.
 */
export function PlatformConsole() {
  const [view, setView] = useState<PlatformView>('overview');
  // The property the activity log opens on, when it was reached from a property's row.
  const [activityProperty, setActivityProperty] = useState<string | undefined>();
  // The filter the users page opens on, when it was reached from "sign-ups waiting for approval".
  const [usersFilter, setUsersFilter] = useState<UsersStatusFilter | undefined>();
  const [navOpen, setNavOpen] = useState(false);
  const [swatcherOpen, setSwatcherOpen] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: 0 });
  }, [view]);

  const go = useCallback((next: PlatformView) => {
    setActivityProperty(undefined);
    setUsersFilter(undefined);
    setView(next);
    setNavOpen(false);
  }, []);
  const showActivity = useCallback((propertyId: string) => {
    setActivityProperty(propertyId);
    setView('activity');
    setNavOpen(false);
  }, []);
  const reviewSignups = useCallback(() => {
    setUsersFilter('pending');
    setView('users');
    setNavOpen(false);
  }, []);
  const closeNav = useCallback(() => setNavOpen(false), []);

  if (view === 'new-property') {
    return (
      <>
        <SetupWizard
          exitAction={
            <Button variant="ghost" onClick={() => go('properties')}>
              Exit setup
            </Button>
          }
          // The wizard has already confirmed the property; stay in the console and show it in the list.
          onDone={() => go('properties')}
        />
        <Toaster />
      </>
    );
  }

  return (
    <div className="pms-app-shell flex h-dvh min-h-0 bg-page text-ink">
      <a href="#platform-main" className="sr-only focus:not-sr-only focus:absolute focus:left-3 focus:top-3 focus:z-[70] focus:rounded-control focus:border focus:px-4 focus:py-2 focus:text-body focus:font-semibold bg-surface border-border text-ink">
        Skip to main content
      </a>
      <PlatformSidebar active={view} onNavigate={go} open={navOpen} onClose={closeNav} onOpenThemes={() => setSwatcherOpen(true)} />
      <div className="pms-app-column flex min-h-0 min-w-0 flex-1 flex-col bg-page">
        <PlatformHeader title={platformTitle(view)} onMenu={() => setNavOpen(true)} onOpenThemes={() => setSwatcherOpen(true)} />
        <div ref={scrollRef} data-app-scroll className="pms-app-scroll flex min-h-0 flex-1 flex-col overflow-x-clip overflow-y-auto">
          <main id="platform-main" tabIndex={-1} key={view} className="pms-animate-fade-in mx-auto w-full max-w-[1600px] flex-1 bg-page px-4 py-4 lg:px-6 lg:py-6 2xl:max-w-[1760px]">
            {view === 'overview' ? <PlatformDashboard go={go} onReviewSignups={reviewSignups} /> : null}
            {view === 'properties' ? <PropertiesAdmin onAddProperty={() => go('new-property')} onViewActivity={showActivity} /> : null}
            {view === 'users' ? <UsersAdmin key={usersFilter ?? 'all'} initialStatus={usersFilter} /> : null}
            {view === 'plans' ? <PlansAdmin /> : null}
            {view === 'otas' ? <OtaChannelsAdmin /> : null}
            {view === 'activity' ? <ActivityLogPage key={activityProperty ?? 'all'} initialPropertyId={activityProperty} /> : null}
          </main>
          <footer className="border-t border-border bg-surface px-4 py-3.5 lg:px-6">
            <p className="tnum mx-auto w-full max-w-[1600px] text-label font-normal text-ink-secondary 2xl:max-w-[1760px]">
              TriponX PMS · Platform console · one database, every property
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
