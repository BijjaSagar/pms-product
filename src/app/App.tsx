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
const RegisterPage = lazy(() => import('../shared/features/auth/RegisterPage').then((m) => ({ default: m.RegisterPage })));
const ForgotPasswordPage = lazy(() => import('../shared/features/auth/ForgotPasswordPage').then((m) => ({ default: m.ForgotPasswordPage })));
const RegistrationSetupPage = lazy(() => import('../customer/features/onboarding/RegistrationSetupPage').then((m) => ({ default: m.RegistrationSetupPage })));
const PlatformConsole = lazy(() => import('../superadmin/PlatformConsole').then((m) => ({ default: m.PlatformConsole })));
const ChangePasswordPage = lazy(() => import('../shared/features/auth/ChangePasswordPage').then((m) => ({ default: m.ChangePasswordPage })));

function AuthenticatedApp() {
  const { me, loading } = useAuth();
  const { page: authPage, go: setAuthPage, reset: resetAuthPage } = useAuthPage();
  // Once signed in, the address (/register) means nothing.
  const signedIn = me !== null;
  useEffect(() => {
    if (signedIn) resetAuthPage();
  }, [signedIn, resetAuthPage]);
  useServerTheme(me ? `${me.user.id}:${me.activePropertyId ?? 'platform'}` : null);

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
          {authPage === 'register' ? (
            <RegisterPage onSignIn={() => setAuthPage('login')} />
          ) : authPage === 'forgot' ? (
            <ForgotPasswordPage onSignIn={() => setAuthPage('login')} />
          ) : (
            <LoginPage onRegister={() => setAuthPage('register')} onForgotPassword={() => setAuthPage('forgot')} />
          )}
        </Suspense>
        {/* The shell mounts its own Toaster; the login page needs one for sign-in errors. */}
        <Toaster />
      </>
    );
  }

  // A password a super admin set has to be replaced first; until then the data layer answers nothing else.
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

  // A super admin belongs to no property: the platform console is home, and hotels open from it.
  if (me.user.role === 'SUPER_ADMIN' && !me.activePropertyId) {
    return (
      <ErrorBoundary fallback={(reset) => <AppCrashFallback reset={reset} />}>
        <Suspense fallback={<PageSkeleton />}>
          <PlatformConsole />
        </Suspense>
      </ErrorBoundary>
    );
  }

  // A new account describes its property and enters an activation key. The data layer refuses everything else meanwhile.
  if (me.user.approvalStatus === 'PENDING_SETUP') {
    return (
      <>
        <Suspense fallback={<PageSkeleton />}>
          <RegistrationSetupPage />
        </Suspense>
        <Toaster />
      </>
    );
  }
  // Staff choose which of their properties to open (a single one opens straight away).
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
