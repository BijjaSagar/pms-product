import { Suspense, lazy, useEffect } from 'react';
import { PageSkeleton } from './components/feedback/Skeleton';
import { ThemeProvider } from './theme/ThemeContext';
import { Toaster } from './components/feedback/Toaster';
import { AuthProvider, useAuth } from './features/auth/AuthContext';
import { PropertyPickerPage } from './features/property-setup/PropertyPickerPage';
import { useAuthPage } from './features/auth/authPage';
import { useServerTheme } from './theme/useServerTheme';
import { HotelWorkspace } from './HotelWorkspace';

const LoginPage = lazy(() => import('./features/auth/LoginPage').then((m) => ({ default: m.LoginPage })));
const RegisterPage = lazy(() => import('./features/auth/RegisterPage').then((m) => ({ default: m.RegisterPage })));
const ForgotPasswordPage = lazy(() => import('./features/auth/ForgotPasswordPage').then((m) => ({ default: m.ForgotPasswordPage })));
const RegistrationSetupPage = lazy(() => import('./features/auth/RegistrationSetupPage').then((m) => ({ default: m.RegistrationSetupPage })));
const AwaitingApprovalPage = lazy(() => import('./features/auth/AwaitingApprovalPage').then((m) => ({ default: m.AwaitingApprovalPage })));
const ChangePasswordPage = lazy(() => import('./features/auth/ChangePasswordPage').then((m) => ({ default: m.ChangePasswordPage })));

function AuthenticatedApp() {
  const { me, loading } = useAuth();
  const { page: authPage, go: setAuthPage, reset: resetAuthPage } = useAuthPage();
  // Once signed in, the address (/register) means nothing.
  const signedIn = me !== null;
  useEffect(() => {
    if (signedIn) resetAuthPage();
  }, [signedIn, resetAuthPage]);
  useServerTheme(me ? `${me.user.id}:${me.activePropertyId ?? 'none'}` : null);

  if (loading) {
    return (
      <main className="flex h-dvh items-center justify-center bg-page text-ink">
        <p className="pms-helper">Connecting to TriponX…</p>
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

  // A password a super admin set has to be replaced first; until then the API answers nothing else.
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

  // A new account describes its property, then waits for a super admin. The API refuses everything else meanwhile.
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
  if (me.user.approvalStatus === 'PENDING_APPROVAL') {
    return (
      <>
        <Suspense fallback={<PageSkeleton />}>
          <AwaitingApprovalPage />
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
