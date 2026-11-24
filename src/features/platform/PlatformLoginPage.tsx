import { useState, type FormEvent } from 'react';
import * as Lucide from 'lucide-react';
import { BrandMark } from '../../components/brand/BrandShell';
import { LABEL } from '../../components/brand/brandStyles';
import { displayApiError } from '../../lib/api/client';
import { toast } from '../../utils/toast';
import { useAuth } from '../auth/AuthContext';
import { PasswordField } from '../auth/PasswordField';
import { SIGN_IN_BUTTON, SIGN_IN_FIELD } from '../auth/authStyles';

/**
 * The platform console's own sign-in, at `/admin`: one plain card, super admins only, no sign-up.
 * Hotel staff sign in on the hotel app's page, which in turn refuses super admins.
 */
export function PlatformLoginPage({ onForgotPassword }: { onForgotPassword: () => void }) {
  const { login, sessionNotice } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);
    try {
      await login(email.trim(), password);
      toast('Signed in successfully', { tone: 'success' });
    } catch (cause) {
      setError(displayApiError(cause));
      setIsSubmitting(false);
    }
  };

  return (
    <main className="flex min-h-dvh items-center justify-center bg-page px-4 py-8 text-ink">
      <div className="w-full max-w-[380px] rounded-2xl border border-border bg-surface p-6 shadow-md sm:p-8">
        <BrandMark />
        <h1 className="mt-6 text-title font-bold text-ink">Platform sign in</h1>

        <form onSubmit={handleSubmit} className="mt-5 flex flex-col gap-4">
          <label className="flex flex-col gap-2" htmlFor="platform-email">
            <span className={LABEL}>Email address</span>
            <input
              id="platform-email"
              type="email"
              autoComplete="username"
              autoFocus
              required
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                setError(null);
              }}
              className={SIGN_IN_FIELD}
            />
          </label>

          <PasswordField
            id="platform-password"
            value={password}
            onChange={(value) => {
              setPassword(value);
              setError(null);
            }}
            autoComplete="current-password"
            placeholder=""
          />

          {sessionNotice && !error && (
            <p role="status" className="flex items-start gap-2 text-[13px] text-ink-secondary">
              <Lucide.Info size={15} className="mt-px flex-none" aria-hidden="true" />
              <span>{sessionNotice}</span>
            </p>
          )}
          {error && (
            <p role="alert" className="flex items-start gap-2 rounded-xl border border-danger-border bg-danger-bg px-3 py-2.5 text-[13px] font-medium text-danger-text">
              <Lucide.AlertCircle size={15} className="mt-px flex-none" aria-hidden="true" />
              <span>{error}</span>
            </p>
          )}

          <button type="submit" disabled={isSubmitting} className={SIGN_IN_BUTTON}>
            {isSubmitting ? (
              <>
                <Lucide.Loader2 size={16} className="animate-spin" />
                <span>Signing in…</span>
              </>
            ) : (
              <span>Sign in</span>
            )}
          </button>
        </form>

        <button type="button" onClick={onForgotPassword} className="mt-4 w-full cursor-pointer text-center text-[13px] font-semibold text-primary hover:underline">
          Forgot password?
        </button>
      </div>
    </main>
  );
}
