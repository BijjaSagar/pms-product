import { useState, type FormEvent } from 'react';
import * as Lucide from 'lucide-react';
import { useAuth } from './AuthContext';
import { displayApiError } from '../../lib/api/client';
import { toast } from '../../utils/toast';
import { AuthLayout } from './AuthLayout';
import { PasswordField } from './PasswordField';
import { SIGN_IN_BUTTON, SIGN_IN_FIELD } from './authStyles';
import { PLATFORM_LOGIN_PATH, STAFF_LOGIN_PATH } from './loginPath';
import { EYEBROW, HEADING, LABEL } from '../../components/brand/brandStyles';

const SWITCH_LINK = 'font-semibold text-primary hover:underline';

/**
 * `platform` is the sign-in for super admins: it refuses everyone else and lands in the platform console.
 * The staff sign-in lets a super admin through too, since the account decides where they land.
 */
export function LoginPage({ platform = false }: { platform?: boolean }) {
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
      await login(email.trim(), password, { superAdminOnly: platform });
      toast('Signed in successfully', {
        detail: platform ? 'Welcome to the platform console.' : 'Welcome to your PMS workspace.',
        tone: 'success',
      });
    } catch (cause) {
      // Inline, so the reason stays next to the fields instead of vanishing with a toast.
      setError(displayApiError(cause));
      setIsSubmitting(false);
    }
  };

  return (
    <AuthLayout sectionLabel={platform ? 'Platform sign in' : 'Sign in'}>
      <header>
        <p className={`${EYEBROW} [@media(max-height:560px)]:hidden`}>{platform ? 'Platform administration' : 'Staff access'}</p>
        <h1 className={`mt-3 text-[30px] font-bold leading-tight tracking-[-0.045em] text-ink sm:text-[36px] [@media(max-height:560px)]:mt-0 ${HEADING}`}>
          {platform ? 'Super admin sign in.' : 'Welcome back.'}
        </h1>
        <p className="mt-2 text-[15px] text-ink-secondary sm:mt-3 sm:text-[16px] [@media(max-height:560px)]:hidden">
          {platform ? 'Sign in to manage every hotel on the platform.' : 'Sign in to continue to TriponX.'}
        </p>
      </header>

      <form onSubmit={handleSubmit} className="mt-6 flex flex-col gap-4 sm:mt-8 sm:gap-5 lg:[@media(max-height:600px)]:mt-4 lg:[@media(max-height:600px)]:gap-3">
        <label className="flex flex-col gap-2" htmlFor="login-email">
          <span className={LABEL}>Email address</span>
          <input
            id="login-email"
            type="email"
            autoComplete="username"
            autoFocus
            required
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              setError(null);
            }}
            placeholder="you@example.com"
            className={SIGN_IN_FIELD}
          />
        </label>

        <PasswordField
          id="login-password"
          value={password}
          onChange={(value) => {
            setPassword(value);
            setError(null);
          }}
          autoComplete="current-password"
          placeholder="Enter your password"
        />

        {sessionNotice && !error && (
          <div role="status" className="flex items-start gap-2 rounded-xl border border-border bg-page px-3 py-2.5 text-[13px] font-medium text-ink-secondary">
            <Lucide.Info size={15} className="mt-px flex-none" aria-hidden="true" />
            <span>{sessionNotice}</span>
          </div>
        )}

        {error && (
          <div role="alert" className="flex items-start gap-2 rounded-xl border border-danger-border bg-danger-bg px-3 py-2.5 text-[13px] font-medium text-danger-text">
            <Lucide.AlertCircle size={15} className="mt-px flex-none" aria-hidden="true" />
            <span>{error}</span>
          </div>
        )}

        <button type="submit" disabled={isSubmitting} className={SIGN_IN_BUTTON}>
          {isSubmitting ? (
            <>
              <Lucide.Loader2 size={16} className="animate-spin" />
              <span>Signing in…</span>
            </>
          ) : (
            <>
              <span>Continue</span>
              <Lucide.ArrowRight size={16} />
            </>
          )}
        </button>
      </form>

      <div className="mt-5 flex flex-col gap-1 text-center text-[14px] text-ink-secondary">
        {platform ? (
          <p>
            Hotel staff?{' '}
            <a href={STAFF_LOGIN_PATH} className={SWITCH_LINK}>
              Sign in here
            </a>
          </p>
        ) : (
          <>
            <p>Need an account? Ask your administrator.</p>
            <p>
              Platform administrator?{' '}
              <a href={PLATFORM_LOGIN_PATH} className={SWITCH_LINK}>
                Sign in here
              </a>
            </p>
          </>
        )}
      </div>
    </AuthLayout>
  );
}
