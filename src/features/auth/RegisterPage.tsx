import { useState, type FormEvent } from 'react';
import * as Lucide from 'lucide-react';
import { displayApiError } from '../../lib/api/client';
import { EYEBROW, HEADING, LABEL } from '../../components/brand/brandStyles';
import { useAuth } from './AuthContext';
import { AuthLayout } from './AuthLayout';
import { PasswordField } from './PasswordField';
import { SIGN_IN_BUTTON, SIGN_IN_FIELD } from './authStyles';
import { MIN_PASSWORD, registrationProblem } from '../../utils/passwordRules';

/**
 * Step one of three: name, email and password. The account is created and signed in at once, and the
 * app moves on to describing the property; a super admin approves it after that.
 */
export function RegisterPage({ onSignIn }: { onSignIn: () => void }) {
  const { register } = useAuth();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const problem = registrationProblem(name, email, password);
    if (problem) {
      setError(problem);
      return;
    }
    setError(null);
    setSubmitting(true);
    try {
      await register(name.trim(), email.trim().toLowerCase(), password);
      // Signed in: the app now shows the property setup, so this page is replaced.
    } catch (cause) {
      setError(displayApiError(cause));
      setSubmitting(false);
    }
  };

  const clearOnEdit = (set: (value: string) => void) => (value: string) => {
    set(value);
    setError(null);
  };

  return (
    <AuthLayout sectionLabel="Create an account">
      <header>
        <p className={`${EYEBROW} [@media(max-height:560px)]:hidden`}>New to Hotel PMX</p>
        <h1 className={`mt-3 text-[30px] font-bold leading-tight tracking-[-0.045em] text-ink sm:text-[36px] [@media(max-height:560px)]:mt-0 ${HEADING}`}>
          Create your account.
        </h1>
        <p className="mt-2 text-[15px] text-ink-secondary sm:mt-3 sm:text-[16px] [@media(max-height:560px)]:hidden">
          Next you will set up your property. We review it before you can start.
        </p>
      </header>

      <form onSubmit={handleSubmit} noValidate className="mt-6 flex flex-col gap-4 sm:mt-8 sm:gap-5 lg:[@media(max-height:600px)]:mt-4 lg:[@media(max-height:600px)]:gap-3">
        <label className="flex flex-col gap-2" htmlFor="register-name">
          <span className={LABEL}>Full name</span>
          <input
            id="register-name"
            type="text"
            autoComplete="name"
            autoFocus
            value={name}
            onChange={(e) => clearOnEdit(setName)(e.target.value)}
            placeholder="Your full name"
            className={SIGN_IN_FIELD}
          />
        </label>

        <label className="flex flex-col gap-2" htmlFor="register-email">
          <span className={LABEL}>Email address</span>
          <input
            id="register-email"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(e) => clearOnEdit(setEmail)(e.target.value)}
            placeholder="you@example.com"
            className={SIGN_IN_FIELD}
          />
        </label>

        <PasswordField
          id="register-password"
          value={password}
          onChange={clearOnEdit(setPassword)}
          autoComplete="new-password"
          placeholder={`At least ${MIN_PASSWORD} characters`}
        />

        {error && (
          <div role="alert" className="flex items-start gap-2 rounded-xl border border-danger-border bg-danger-bg px-3 py-2.5 text-[13px] font-medium text-danger-text">
            <Lucide.AlertCircle size={15} className="mt-px flex-none" aria-hidden="true" />
            <span>{error}</span>
          </div>
        )}

        <button type="submit" disabled={submitting} className={SIGN_IN_BUTTON}>
          {submitting ? (
            <>
              <Lucide.Loader2 size={16} className="animate-spin" />
              <span>Creating account…</span>
            </>
          ) : (
            <>
              <span>Create account</span>
              <Lucide.ArrowRight size={16} />
            </>
          )}
        </button>
      </form>

      <p className="mt-5 text-center text-[14px] text-ink-secondary">
        Already have an account?{' '}
        <button type="button" onClick={onSignIn} className="cursor-pointer font-semibold text-primary hover:underline">
          Sign in
        </button>
      </p>
    </AuthLayout>
  );
}
