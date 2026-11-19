import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { canOpenView } from '../../config/navigation';
import type { ViewId } from '../../config/navigation';
import { getAccessToken } from '../../lib/api/authToken';
import { ApiError, onSessionEnded, setActivePropertyId } from '../../lib/api/client';
import { authApi } from '../../lib/api/pms';
import type { AuthMe } from '../../lib/api/pms';

interface LoginOptions {
  /** Refuses (and signs out) anyone who is not a SUPER_ADMIN: the platform sign-in is not for hotel staff. */
  superAdminOnly?: boolean;
}

interface AuthContextValue {
  me: AuthMe | null;
  loading: boolean;
  error: string | null;
  /** Set when a signed-in session was ended by the server; shown once on the sign-in page. */
  sessionNotice: string | null;
  login: (email: string, password: string, options?: LoginOptions) => Promise<void>;
  logout: () => Promise<void>;
  /** Opens a property, or (null) leaves the current one: a SUPER_ADMIN returns to the platform console, STAFF to Choose a property. */
  switchProperty: (propertyId: string | null) => Promise<void>;
  reload: () => Promise<void>;
  can: (permission: string) => boolean;
  /** A SUPER_ADMIN has the platform console and reaches every property. */
  isSuperAdmin: boolean;
  /** Whether the hotel shell offers a view to this user. */
  canOpen: (view: ViewId) => boolean;
  changePassword: (currentPassword: string, newPassword: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [me, setMe] = useState<AuthMe | null>(null);
  // Everything that sets the session also tells the API layer which property it is for, before any screen
  // below has a chance to ask for its data.
  const applyMe = useCallback((value: AuthMe | null) => {
    setActivePropertyId(value?.activePropertyId ?? null);
    setMe(value);
  }, []);
  // Start in the loading state when a saved token has to be checked first, so a
  // reload does not flash the login page.
  const [loading, setLoading] = useState(() => getAccessToken() !== null);
  const [error, setError] = useState<string | null>(null);
  const [sessionNotice, setSessionNotice] = useState<string | null>(null);

  // Any call answered 401 while signed in means the session is over: go back to the sign-in page and say why.
  useEffect(
    () =>
      onSessionEnded(() => {
        applyMe(null);
        setSessionNotice('Your session has ended. Please sign in again.');
      }),
    [applyMe],
  );

  useEffect(() => {
    if (!getAccessToken()) return;
    let active = true;

    const restoreSession = async () => {
      try {
        const session = await authApi.me();
        if (active) applyMe(session);
      } catch (cause) {
        // A 401 means the saved token is dead (already cleared); anything else
        // (server down) also lands on the login page, with the reason shown.
        if (active && !(cause instanceof ApiError && cause.status === 401)) {
          setError(cause instanceof Error ? cause.message : 'Could not restore your session.');
        }
      } finally {
        if (active) setLoading(false);
      }
    };
    void restoreSession();

    return () => {
      active = false;
    };
  }, [applyMe]);

  const reload = useCallback(async () => {
    if (!me) return;
    setError(null);
    try {
      applyMe(await authApi.me());
    } catch (cause) {
      if (cause instanceof ApiError && cause.status === 401) applyMe(null);
      else setError(cause instanceof Error ? cause.message : 'Could not load your session.');
    }
  }, [me, applyMe]);

  // `loading` is not raised here: it swaps the sign-in page for a splash, which would throw away the
  // page's own error message when the sign-in fails. The page shows its own busy state instead.
  const login = useCallback(async (email: string, password: string, options: LoginOptions = {}) => {
    setError(null);
    setSessionNotice(null);
    try {
      await authApi.login(email, password);
      const session = await authApi.me();
      if (options.superAdminOnly && session.user.role !== 'SUPER_ADMIN') {
        await authApi.logout().catch(() => undefined);
        throw new Error('This sign-in is for platform administrators. Hotel staff sign in on the main page.');
      }
      applyMe(session);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not sign in.');
      throw cause;
    }
  }, [applyMe]);

  const logout = useCallback(async () => {
    try {
      await authApi.logout();
    } finally {
      applyMe(null);
    }
  }, [applyMe]);

  const switchProperty = useCallback(async (propertyId: string | null) => {
    await authApi.switchProperty(propertyId);
    applyMe(await authApi.me());
  }, [applyMe]);

  // The API signs out the account's other sessions and lifts the must-change restriction on this one,
  // so the account is read again: it now includes the properties that were withheld until now.
  const changePassword = useCallback(async (currentPassword: string, newPassword: string) => {
    await authApi.changePassword(currentPassword, newPassword);
    applyMe(await authApi.me());
  }, [applyMe]);

  const value = useMemo<AuthContextValue>(() => {
    const can = (permission: string) => me?.permissions.includes(permission) ?? false;
    return {
      me,
      loading,
      error,
      sessionNotice,
      login,
      logout,
      switchProperty,
      reload,
      can,
      isSuperAdmin: me?.user.role === 'SUPER_ADMIN',
      canOpen: (view) => canOpenView(view, can),
      changePassword,
    };
  }, [me, loading, error, sessionNotice, login, logout, switchProperty, reload, changePassword]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth() {
  const value = useContext(AuthContext);
  if (!value) throw new Error('useAuth must be used within AuthProvider');
  return value;
}
