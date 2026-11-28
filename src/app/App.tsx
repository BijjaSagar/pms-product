import { Suspense, lazy, useEffect } from 'react';
import { PageSkeleton } from '../shared/components/feedback/Skeleton';
import { ThemeProvider } from '../shared/theme/ThemeContext';
import { Toaster } from '../shared/components/feedback/Toaster';
import { AuthProvider, useAuth } from '../shared/features/auth/AuthContext';
import { PropertyPickerPage } from '../customer/features/property-picker/PropertyPickerPage';
import { useAuthPage } from '../shared/features/auth/authPage';
import { useServerTheme } from '../shared/theme/useServerTheme';
import { HotelWorkspace } from '../customer/HotelWorkspace';
import { AppCrashFallback, ErrorBoundary } from '../shared/components/feedback/ErrorBoundary';

const LoginPage = lazy(() => import('../shared/features/auth/LoginPage').then((m) => ({ default: m.LoginPage })));
const ForgotPasswordPage = lazy(() => import('../shared/features/auth/ForgotPasswordPage').then((m) => ({ default: m.ForgotPasswordPage })));
const ConsoleShell = lazy(() => import('../console/ConsoleShell').then((m) => ({ default: m.ConsoleShell })));
const ChangePasswordPage = lazy(() => import('../shared/features/auth/ChangePasswordPage').then((m) => ({ default: m.ChangePasswordPage })));

function AuthenticatedApp() {
  const { me, loading } = useAuth();
  const { page: authPage, go: setAuthPage, reset: resetAuthPage } = useAuthPage();
  // Once signed in, the address (/forgot-password) means nothing.
  const signedIn = me !== null;
  useEffect(() => {
    if (signedIn) resetAuthPage();
  }, [signedIn, resetAuthPage]);
  useServerTheme(me ? `${me.user.id}:${me.activePropertyId ?? 'console'}` : null);

  if (loading) {
    return (
      <main className="flex h-dvh items-center justify-center bg-page text-ink">
        <p className="pms-helper">Connecting to Hotel PMX…</p>
      </main>
    );
  }

  if (!me) {
    return (
      <>
        <Suspense fallback={<PageSkeleton />}>
          {authPage === 'forgot' ? (
            <ForgotPasswordPage onSignIn={() => setAuthPage('login')} />
          ) : (
            <LoginPage onForgotPassword={() => setAuthPage('forgot')} />
          )}
        </Suspense>
        {/* The shell mounts its own Toaster; the login page needs one for sign-in errors. */}
        <Toaster />
      </>
    );
  }

  // A password someone else set has to be replaced first; until then the server answers nothing else.
  if (me.user.mustChangePassword) {
    return (
      <>
        <Suspense fallback={<PageSkeleton />}>
          <ChangePasswordPage />
        </Suspense>
        <Toaster />
      </>
    );
  }

  // The Super Super Admin, Relationship Managers and owners work from a console and open properties from it.
  if (me.user.role !== 'STAFF' && !me.activePropertyId) {
    return (
      <ErrorBoundary fallback={(reset) => <AppCrashFallback reset={reset} />}>
        <Suspense fallback={<PageSkeleton />}>
          <ConsoleShell />
        </Suspense>
      </ErrorBoundary>
    );
  }
  // Staff work at the property the server names (the picker shows only if they somehow have none).
  if (!me.activePropertyId) return <PropertyPickerPage />;

  return <HotelWorkspace propertyId={me.activePropertyId} />;
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
