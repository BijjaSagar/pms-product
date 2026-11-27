import { useCallback, useEffect, useState } from 'react';

/**
 * The hotel app's signed-out pages: Sign in, Create account and Forgot password. Everyone, super admins
 * included, signs in on the same page. There is no router, so the address is only read to
 * choose which page to show while nobody is signed in.
 */
export type AuthPage = 'login' | 'register' | 'forgot';

const REGISTER_PATH = '/register';
const FORGOT_PATH = '/forgot-password';

const PATHS: Record<AuthPage, string> = { login: '/', register: REGISTER_PATH, forgot: FORGOT_PATH };

const pageFor = (pathname: string): AuthPage => {
  const path = pathname.replace(/\/+$/, '');
  return path === REGISTER_PATH ? 'register' : path === FORGOT_PATH ? 'forgot' : 'login';
};

/**
 * The signed-out page being shown, a way to move between the two (the Back button works too), and a way
 * to leave them: once signed in the app lives at the root, so the sign-up address is dropped and the next signed-out visit starts on Sign in.
 */
export function useAuthPage(): { page: AuthPage; go: (page: AuthPage) => void; reset: () => void } {
  const [page, setPage] = useState<AuthPage>(() => pageFor(window.location.pathname));

  useEffect(() => {
    const onPop = () => setPage(pageFor(window.location.pathname));
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, []);

  const go = useCallback((next: AuthPage) => {
    window.history.pushState(null, '', PATHS[next]);
    setPage(next);
  }, []);

  const reset = useCallback(() => {
    if (window.location.pathname !== '/') window.history.replaceState(null, '', '/');
    setPage('login');
  }, []);

  return { page, go, reset };
}
