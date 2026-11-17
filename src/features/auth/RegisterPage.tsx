import { useState, type FormEvent } from 'react';
import * as Lucide from 'lucide-react';
import { toast } from '../../utils/toast';
import { apiRequest, displayApiError } from '../../lib/api/client';
import { AuthLayout } from './AuthLayout';
import { PasswordField } from './PasswordField';
import { SIGN_IN_BUTTON, SIGN_IN_FIELD } from './authStyles';
import { EYEBROW, HEADING, LABEL } from '../../components/brand/brandStyles';

const EMAIL_PATTERN = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;
const MIN_PASSWORD = 8;

/** The first thing wrong with the form, or null when it can be submitted. */
function formProblem(name: string, email: string, password: string): string | null {
  if (name.trim().length < 2) return 'Enter your full name.';
  if (!EMAIL_PATTERN.test(email.trim())) return 'Enter a valid email address.';
  if (password.length < MIN_PASSWORD) return `Use a password of at least ${MIN_PASSWORD} characters.`;
  return null;
}

/**
 * Registration, in the same 8 / 4 layout as Sign in. Valid details create the user through the
 * backend, then send the person to Sign in with their email filled in.
 */
export function RegisterPage({ onSignIn }: { onSignIn: (email?: string) => void }) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const problem = formProblem(name, email, password);
    if (problem) {
      setError(problem);
      return;
    }
    setError(null);
    setSubmitting(true);
    try {
      await apiRequest('/auth/register', {
        method: 'POST',
        body: { name: name.trim(), email: email.trim().toLowerCase(), password },
      });
    } catch (err) {
      setError(displayApiError(err));
      setSubmitting(false);
      return;
    }
    toast('Account created', { detail: 'Sign in to continue to your property setup.', tone: 'success' });
    onSignIn(email.trim());
  };

  // The message stays while the person fixes the fields and clears on the next submit.
  return (
    <AuthLayout sectionLabel="Create an account">
      <header>
        <p className={`${EYEBROW} [@media(max-height:560px)]:hidden`}>New to TriponX</p>
        <h1 className={`mt-3 text-[30px] font-bold leading-tight tracking-[-0.045em] text-ink sm:text-[36px] [@media(max-height:560px)]:mt-0 ${HEADING}`}>
          Create your account.
        </h1>
        <p className="mt-2 text-[15px] text-ink-secondary sm:mt-3 sm:text-[16px] [@media(max-height:560px)]:hidden">Register to set up your property on TriponX.</p>
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
            onChange={(e) => setName(e.target.value)}
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
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            className={SIGN_IN_FIELD}
          />
        </label>

        <PasswordField
          id="register-password"
          value={password}
          onChange={setPassword}
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
          <span>{submitting ? 'Creating account…' : 'Create account'}</span>
          <Lucide.ArrowRight size={16} />
        </button>
      </form>

      <p className="mt-5 text-center text-[14px] text-ink-secondary">
        Already have an account?{' '}
        <button type="button" onClick={() => onSignIn()} className="cursor-pointer font-semibold text-primary hover:underline">
          Sign in
        </button>
      </p>
    </AuthLayout>
  );
}
