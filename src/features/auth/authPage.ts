import { useCallback, useEffect, useState } from 'react';

/**
 * Everyone signs in on the same page: hotel staff and super admins alike, and the account decides where
 * they land. New people create an account on a second page. There is no router, so the address is only
 * read to choose which of the two to show while nobody is signed in.
 */
export type AuthPage = 'login' | 'register';

export const REGISTER_PATH = '/register';

const pageFor = (pathname: string): AuthPage => (pathname.replace(/\/+$/, '') === REGISTER_PATH ? 'register' : 'login');

/**
 * The signed-out page being shown, a way to move between the two (the Back button works too), and a way
 * to leave them: once signed in the app lives at the root, so the sign-up address (or an old `/admin`
 * bookmark) is dropped and the next signed-out visit starts on Sign in.
 */
export function useAuthPage(): { page: AuthPage; go: (page: AuthPage) => void; reset: () => void } {
  const [page, setPage] = useState<AuthPage>(() => pageFor(window.location.pathname));

  useEffect(() => {
    const onPop = () => setPage(pageFor(window.location.pathname));
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, []);

  const go = useCallback((next: AuthPage) => {
    window.history.pushState(null, '', next === 'register' ? REGISTER_PATH : '/');
    setPage(next);
  }, []);

  const reset = useCallback(() => {
    if (window.location.pathname !== '/') window.history.replaceState(null, '', '/');
    setPage('login');
  }, []);

  return { page, go, reset };
}
