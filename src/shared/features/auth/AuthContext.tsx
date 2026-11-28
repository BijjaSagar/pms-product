import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { canOpenView } from '../../config/navigation';
import type { ViewId } from '../../config/navigation';
import { setActivePropertyId } from '../../services/propertyAccess';
import { hasSession } from '../../services/session';
import { authApi, type AuthMe } from '../../services/authApi';

interface AuthContextValue {
  me: AuthMe | null;
  loading: boolean;
  error: string | null;
  /** Set when a signed-in session could not be restored or continued; shown once on the sign-in page. */
  sessionNotice: string | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  /** Opens a property, or (null) leaves the current one: console users return to their console, STAFF to Choose a property. */
  switchProperty: (propertyId: string | null) => Promise<void>;
  /** Reads the account again; resolves with it (null when signed out). */
  reload: () => Promise<AuthMe | null>;
  can: (permission: string) => boolean;
  /** The Super Super Admin, Relationship Managers and owners work from a console and open properties from it; staff work inside one property. */
  isConsoleUser: boolean;
  /** The Super Super Admin reaches every owner and property. */
  isSuperAdmin: boolean;
  /** Whether the hotel shell offers a view to this user. */
  canOpen: (view: ViewId) => boolean;
  changePassword: (currentPassword: string, newPassword: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [me, setMe] = useState<AuthMe | null>(null);
  // Everything that sets the session also tells the data layer which property it is for, before any screen
  // below has a chance to ask for its data.
  const applyMe = useCallback((value: AuthMe | null) => {
    setActivePropertyId(value?.activePropertyId ?? null);
    setMe(value);
  }, []);
  // Start in the loading state when a saved session has to be read first, so a
  // reload does not flash the login page.
  const [loading, setLoading] = useState(hasSession);
  const [error, setError] = useState<string | null>(null);
  const [sessionNotice, setSessionNotice] = useState<string | null>(null);

  useEffect(() => {
    if (!hasSession()) return;
    let active = true;

    const restoreSession = async () => {
      try {
        const session = await authApi.me();
        if (active) applyMe(session);
      } catch (cause) {
        // The saved session may name an account that is gone (data resets on reload): the
        // sign-in page then says why.
        if (active) setSessionNotice(cause instanceof Error ? cause.message : 'Could not restore your session.');
      } finally {
        if (active) setLoading(false);
      }
    };
    void restoreSession();

    return () => {
      active = false;
    };
  }, [applyMe]);

  const reload = useCallback(async (): Promise<AuthMe | null> => {
    if (!me) return null;
    setError(null);
    try {
      const session = await authApi.me();
      applyMe(session);
      return session;
    } catch (cause) {
      const message = cause instanceof Error ? cause.message : 'Could not load your session.';
      if (hasSession()) setError(message);
      else {
        applyMe(null);
        setSessionNotice(message);
      }
      return null;
    }
  }, [me, applyMe]);

  // `loading` is not raised here: it swaps the sign-in page for a splash, which would throw away the
  // page's own error message when the sign-in fails. The page shows its own busy state instead.
  const login = useCallback(async (email: string, password: string) => {
    setError(null);
    setSessionNotice(null);
    try {
      await authApi.login(email, password);
      applyMe(await authApi.me());
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

  // Changing the password lifts the must-change restriction, so the account is read again: it now includes the properties that were withheld until now.
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
      isConsoleUser: me !== null && me.user.role !== 'STAFF',
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
