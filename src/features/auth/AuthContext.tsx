import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { getAccessToken } from '../../lib/api/authToken';
import { ApiError, setActivePropertyId } from '../../lib/api/client';
import { authApi } from '../../lib/api/pms';
import type { AuthMe } from '../../lib/api/pms';

interface AuthContextValue {
  me: AuthMe | null;
  loading: boolean;
  error: string | null;
  login: (email: string, password: string, remember: boolean) => Promise<void>;
  logout: () => Promise<void>;
  switchProperty: (propertyId: string) => Promise<void>;
  reload: () => Promise<void>;
  can: (permission: string) => boolean;
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

  const login = useCallback(async (email: string, password: string, remember: boolean) => {
    setError(null);
    setLoading(true);
    try {
      await authApi.login(email, password, remember);
      applyMe(await authApi.me());
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not sign in.');
      throw cause;
    } finally {
      setLoading(false);
    }
  }, [applyMe]);

  const logout = useCallback(async () => {
    try {
      await authApi.logout();
    } finally {
      applyMe(null);
    }
  }, [applyMe]);

  const switchProperty = useCallback(async (propertyId: string) => {
    await authApi.switchProperty(propertyId);
    applyMe(await authApi.me());
  }, [applyMe]);

  const value = useMemo<AuthContextValue>(() => ({
    me,
    loading,
    error,
    login,
    logout,
    switchProperty,
    reload,
    can: (permission) => me?.permissions.includes(permission) ?? false,
  }), [me, loading, error, login, logout, switchProperty, reload]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth() {
  const value = useContext(AuthContext);
  if (!value) throw new Error('useAuth must be used within AuthProvider');
  return value;
}
