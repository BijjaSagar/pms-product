import { Suspense, lazy, useState } from 'react';
import { AppCrashFallback, ErrorBoundary } from '../../components/feedback/ErrorBoundary';
import { PageSkeleton } from '../../components/feedback/Skeleton';
import { Toaster } from '../../components/feedback/Toaster';
import { HotelWorkspace } from '../../HotelWorkspace';
import { ThemeProvider } from '../../theme/ThemeContext';
import { useServerTheme } from '../../theme/useServerTheme';
import { AuthProvider, useAuth } from '../auth/AuthContext';

const PlatformLoginPage = lazy(() => import('./PlatformLoginPage').then((m) => ({ default: m.PlatformLoginPage })));
const ForgotPasswordPage = lazy(() => import('../auth/ForgotPasswordPage').then((m) => ({ default: m.ForgotPasswordPage })));
const ChangePasswordPage = lazy(() => import('../auth/ChangePasswordPage').then((m) => ({ default: m.ChangePasswordPage })));
const PlatformConsole = lazy(() => import('./PlatformConsole').then((m) => ({ default: m.PlatformConsole })));

function PlatformGate() {
  const { me, loading } = useAuth();
  const [forgot, setForgot] = useState(false);
  // The console has its own appearance scope; so does each hotel a super admin opens from it.
  useServerTheme(me ? `${me.user.id}:${me.activePropertyId ?? 'platform'}` : null);

  if (loading) {
    return (
      <main className="flex h-dvh items-center justify-center bg-page text-ink">
        <p className="pms-helper">Connecting to TriponX…</p>
      </main>
    );
  }

  if (!me || me.user.mustChangePassword) {
    return (
      <>
        <Suspense fallback={<PageSkeleton />}>
          {!me ? (
            forgot ? (
              <ForgotPasswordPage audience="platform" onSignIn={() => setForgot(false)} />
            ) : (
              <PlatformLoginPage onForgotPassword={() => setForgot(true)} />
            )
          ) : (
            // A password another super admin set has to be replaced first; until then the API answers nothing else.
            <ChangePasswordPage />
          )}
        </Suspense>
        <Toaster />
      </>
    );
  }

  // A super admin belongs to no property: the console is home, and hotels open from it.
  if (me.activePropertyId) return <HotelWorkspace propertyId={me.activePropertyId} />;

  return (
    <ErrorBoundary fallback={(reset) => <AppCrashFallback reset={reset} />}>
      <Suspense fallback={<PageSkeleton />}>
        <PlatformConsole />
      </Suspense>
    </ErrorBoundary>
  );
}

/** The whole platform console app, served at `/admin`: its own sign-in, session and dashboard. */
export function PlatformApp() {
  return (
    <ThemeProvider>
      <AuthProvider audience="platform">
        <PlatformGate />
      </AuthProvider>
    </ThemeProvider>
  );
}
