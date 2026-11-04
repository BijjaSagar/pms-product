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
const RESTORE_RETRY_MS = 3_000;

function isTemporaryFailure(cause: unknown): boolean {
  return cause instanceof ApiError && (cause.status === 0 || cause.status === 429 || cause.status >= 500);
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [me, setMe] = useState<AuthMe | null>(null);
  // A stored token means we are still deciding whether the session is valid, so show the loading state, not the login form.
  const [loading, setLoading] = useState(() => authApi.hasSession());
  const [error, setError] = useState<string | null>(null);

  useEffect(() => authApi.onSessionEnded(() => {
    setMe(null);
    toast('Your session has ended', { detail: 'Please sign in again.', tone: 'warning' });
  }), []);

  useEffect(() => authApi.onOtherTabChange((signedIn) => {
    if (!signedIn) {
      setMe(null);
      return;
    }
    authApi.me().then(setMe).catch((cause: unknown) => {
      toast('Could not restore your session', { detail: displayApiError(cause), tone: 'danger' });
    });
  }), []);

  useEffect(() => {
    if (!authApi.hasSession()) return;
    let active = true;
    let retryTimer: ReturnType<typeof setTimeout> | undefined;
    let warned = false;
    const restore = () => {
      authApi.me()
        .then((restored) => {
          if (!active) return;
          setMe(restored);
          setLoading(false);
        })
        .catch((cause: unknown) => {
          if (!active) return;
          // A PC that has just started may not be online yet. The login is still good, so wait for the server rather than show the login form.
          if (isTemporaryFailure(cause)) {
            if (!warned) toast('Waiting for the server', { detail: 'You are still signed in. Trying again…', tone: 'warning' });
            warned = true;
            retryTimer = setTimeout(restore, RESTORE_RETRY_MS);
            return;
          }
          // 401 means the stored session is gone; the login form is the right answer.
          if (!(cause instanceof ApiError && cause.status === 401)) {
            toast('Could not restore your session', { detail: displayApiError(cause), tone: 'danger' });
          }
          setLoading(false);
        });
    };
    restore();
    return () => {
      active = false;
      clearTimeout(retryTimer);
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
