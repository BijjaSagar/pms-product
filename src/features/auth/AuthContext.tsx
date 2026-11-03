import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';
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
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    if (!me) return;
    setError(null);
    try {
      setMe(await authApi.me());
    } catch (cause) {
      if (cause instanceof ApiError && cause.status === 401) setMe(null);
      else setError(cause instanceof Error ? cause.message : 'Could not load your session.');
    }
  }, [me]);

  const login = useCallback(async (email: string, password: string) => {
    setError(null);
    setLoading(true);
    try {
      await authApi.login(email, password);
      setMe(await authApi.me());
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not sign in to your session.');
      throw cause;
    } finally {
      setLoading(false);
    }
  }, []);

  const logout = useCallback(async () => {
    await authApi.logout();
    setMe(null);
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
