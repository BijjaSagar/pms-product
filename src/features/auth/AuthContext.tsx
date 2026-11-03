import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { ApiError, displayApiError } from '../../lib/api/client';
import { authApi } from '../../lib/api/pms';
import type { AuthMe } from '../../lib/api/pms';
import { toast } from '../../utils/toast';

interface AuthContextValue {
  me: AuthMe | null;
  loading: boolean;
  error: string | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  switchProperty: (propertyId: string) => Promise<void>;
  can: (permission: string) => boolean;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [me, setMe] = useState<AuthMe | null>(null);
  // A stored token means we are still deciding whether the session is valid, so show the loading state, not the login form.
  const [loading, setLoading] = useState(() => authApi.hasSession());
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!authApi.hasSession()) return;
    let active = true;
    authApi.me()
      .then((restored) => {
        if (active) setMe(restored);
      })
      .catch((cause: unknown) => {
        // 401 means the stored session is gone; the login form is the right answer. Anything else keeps the token so a later load can retry.
        if (active && !(cause instanceof ApiError && cause.status === 401)) {
          toast('Could not restore your session', { detail: displayApiError(cause), tone: 'danger' });
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

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
    can: (permission) => me?.permissions.includes(permission) ?? false,
  }), [me, loading, error, login, logout, switchProperty]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth() {
  const value = useContext(AuthContext);
  if (!value) throw new Error('useAuth must be used within AuthProvider');
  return value;
}
