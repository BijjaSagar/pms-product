import { useState, type FormEvent } from 'react';
import * as Lucide from 'lucide-react';
import { EYEBROW, HEADING } from '../../components/brand/brandStyles';
import { displayApiError } from '../../lib/api/client';
import { toast } from '../../utils/toast';
import { useAuth } from './AuthContext';
import { AuthLayout } from './AuthLayout';
import { PasswordField } from './PasswordField';
import { SIGN_IN_BUTTON } from './authStyles';
import { MIN_PASSWORD, newPasswordProblem } from './passwordRules';

/**
 * Shown instead of the app while the account still has the password a super admin set for it. The API
 * refuses everything else until it is replaced, so there is nothing else to show.
 */
export function ChangePasswordPage() {
  const { me, changePassword, logout } = useAuth();
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const problem = newPasswordProblem(current, next, confirm);
    if (problem) {
      setError(problem);
      return;
    }
    setError(null);
    setSubmitting(true);
    try {
      await changePassword(current, next);
      toast('Password changed', { detail: 'Your new password is in use.', tone: 'success' });
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
    <AuthLayout sectionLabel="Set a new password">
      <header>
        <p className={`${EYEBROW} [@media(max-height:560px)]:hidden`}>One last step</p>
        <h1 className={`mt-3 text-[30px] font-bold leading-tight tracking-[-0.045em] text-ink sm:text-[36px] [@media(max-height:560px)]:mt-0 ${HEADING}`}>
          Choose your password.
        </h1>
        <p className="mt-2 text-[15px] text-ink-secondary sm:mt-3 sm:text-[16px] [@media(max-height:560px)]:hidden">
          {me?.user.email ? `${me.user.email} is signed in with a temporary password. ` : ''}Set your own to continue.
        </p>
      </header>

      <form onSubmit={handleSubmit} noValidate className="mt-6 flex flex-col gap-4 sm:mt-8 sm:gap-5 lg:[@media(max-height:600px)]:mt-4 lg:[@media(max-height:600px)]:gap-3">
        <PasswordField
          id="change-current"
          label="Temporary password"
          value={current}
          onChange={clearOnEdit(setCurrent)}
          autoComplete="current-password"
          placeholder="The password you were given"
        />
        <PasswordField
          id="change-new"
          label="New password"
          value={next}
          onChange={clearOnEdit(setNext)}
          autoComplete="new-password"
          placeholder={`At least ${MIN_PASSWORD} characters`}
        />
        <PasswordField
          id="change-confirm"
          label="Confirm new password"
          value={confirm}
          onChange={clearOnEdit(setConfirm)}
          autoComplete="new-password"
          placeholder="Type it again"
        />

        {error && (
          <div role="alert" className="flex items-start gap-2 rounded-xl border border-danger-border bg-danger-bg px-3 py-2.5 text-[13px] font-medium text-danger-text">
            <Lucide.AlertCircle size={15} className="mt-px flex-none" aria-hidden="true" />
            <span>{error}</span>
          </div>
        )}

        <button type="submit" disabled={submitting} className={SIGN_IN_BUTTON}>
          <span>{submitting ? 'Saving…' : 'Save and continue'}</span>
          <Lucide.ArrowRight size={16} />
        </button>
      </form>

      <p className="mt-5 text-center text-[14px] text-ink-secondary">
        Not you?{' '}
        <button type="button" onClick={() => void logout()} className="cursor-pointer font-semibold text-primary hover:underline">
          Sign out
        </button>
      </p>
    </AuthLayout>
  );
}
