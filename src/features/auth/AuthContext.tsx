import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { ApiError } from '../../lib/api/client';
import { authApi } from '../../lib/api/pms';
import type { AuthMe } from '../../lib/api/pms';

interface AuthContextValue {
  me: AuthMe | null;
  loading: boolean;
  error: string | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  switchProperty: (propertyId: string) => Promise<void>;
  reload: () => Promise<void>;
  can: (permission: string) => boolean;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [me, setMe] = useState<AuthMe | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    setError(null);
    try {
      setMe(await authApi.me());
    } catch (cause) {
      if (cause instanceof ApiError && cause.status === 401) setMe(null);
      else setError(cause instanceof Error ? cause.message : 'Could not load your session.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let active = true;
    authApi.me().then((session) => {
      if (active) { setMe(session); setError(null); }
    }).catch((cause: unknown) => {
      if (!active) return;
      if (cause instanceof ApiError && cause.status === 401) setMe(null);
      else setError(cause instanceof Error ? cause.message : 'Could not load your session.');
    }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    setError(null);
    await authApi.login(email, password);
    setMe(await authApi.me());
  }, []);

  const logout = useCallback(async () => {
    await authApi.logout();
    // Static build: there is no login screen, so "signing out" simply reloads
    // the fixed demo session rather than dropping the user.
    setMe(await authApi.me());
  }, []);

  const switchProperty = useCallback(async (propertyId: string) => {
    await authApi.switchProperty(propertyId);
    setMe(await authApi.me());
  }, []);

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
