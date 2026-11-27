import { useState, type FormEvent } from 'react';
import * as Lucide from 'lucide-react';
import { displayError } from '../../services/errors';
import { authApi } from '../../services/authApi';
import { toast } from '../../utils/toast';
import { EYEBROW, HEADING, LABEL } from '../../components/brand/brandStyles';
import { AuthLayout } from './AuthLayout';
import { PasswordField } from './PasswordField';
import { SIGN_IN_BUTTON, SIGN_IN_FIELD } from './authStyles';
import { MIN_PASSWORD, resetPasswordProblem } from '../../utils/passwordRules';

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function ErrorNote({ message }: { message: string }) {
  return (
    <div role="alert" className="flex items-start gap-2 rounded-xl border border-danger-border bg-danger-bg px-3 py-2.5 text-[13px] font-medium text-danger-text">
      <Lucide.AlertCircle size={15} className="mt-px flex-none" aria-hidden="true" />
      <span>{message}</span>
    </div>
  );
}

/**
 * Forgot password in two steps on one page: ask for a code by email, then enter the code with a new
 * password. Signing in with the new password follows on the sign-in page.
 */
export function ForgotPasswordPage({ onSignIn }: { onSignIn: () => void }) {
  const [step, setStep] = useState<'email' | 'reset'>('email');
  const [email, setEmail] = useState('');
  const [delivery, setDelivery] = useState<'email' | 'none'>('email');
  const [otp, setOtp] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const normalisedEmail = email.trim().toLowerCase();

  const sendCode = async (e?: FormEvent) => {
    e?.preventDefault();
    if (!EMAIL.test(normalisedEmail)) {
      setError('Enter a valid email address.');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const result = await authApi.forgotPassword(normalisedEmail);
      setDelivery(result.delivery);
      setStep('reset');
    } catch (cause) {
      setError(displayError(cause));
    } finally {
      setBusy(false);
    }
  };

  const resetPassword = async (e: FormEvent) => {
    e.preventDefault();
    const problem = resetPasswordProblem(otp, password, confirm);
    if (problem) {
      setError(problem);
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await authApi.resetPassword(normalisedEmail, otp.trim(), password);
      toast('Password changed', { detail: 'Sign in with your new password.', tone: 'success' });
      onSignIn();
    } catch (cause) {
      setError(displayError(cause));
      setBusy(false);
    }
  };

  return (
    <AuthLayout sectionLabel="Reset your password">
      <header>
        <p className={`${EYEBROW} [@media(max-height:560px)]:hidden`}>Account recovery</p>
        <h1 className={`mt-3 text-[30px] font-bold leading-tight tracking-[-0.045em] text-ink sm:text-[36px] [@media(max-height:560px)]:mt-0 ${HEADING}`}>
          {step === 'email' ? 'Forgot password?' : 'Set a new password.'}
        </h1>
        <p className="mt-2 text-[15px] text-ink-secondary sm:mt-3 sm:text-[16px] [@media(max-height:560px)]:hidden">
          {step === 'email' ? 'Enter your email and we will send you a 6-digit code.' : `Enter the 6-digit code for ${normalisedEmail}.`}
        </p>
      </header>

      {step === 'email' ? (
        <form onSubmit={(e) => void sendCode(e)} noValidate className="mt-6 flex flex-col gap-4 sm:mt-8 sm:gap-5">
          <label className="flex flex-col gap-2" htmlFor="forgot-email">
            <span className={LABEL}>Email address</span>
            <input
              id="forgot-email"
              type="email"
              autoComplete="username"
              autoFocus
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                setError(null);
              }}
              placeholder="you@example.com"
              className={SIGN_IN_FIELD}
            />
          </label>
          {error && <ErrorNote message={error} />}
          <button type="submit" disabled={busy} className={SIGN_IN_BUTTON}>
            {busy ? (
              <>
                <Lucide.Loader2 size={16} className="animate-spin" />
                <span>Sending…</span>
              </>
            ) : (
              <>
                <span>Send code</span>
                <Lucide.ArrowRight size={16} />
              </>
            )}
          </button>
        </form>
      ) : (
        <form onSubmit={(e) => void resetPassword(e)} noValidate className="mt-6 flex flex-col gap-4 sm:mt-8 sm:gap-5">
          <div role="status" className="flex items-start gap-2 rounded-xl border border-border bg-page px-3 py-2.5 text-[13px] font-medium text-ink-secondary">
            <Lucide.Mail size={15} className="mt-px flex-none" aria-hidden="true" />
            <span>
              {delivery === 'email'
                ? 'We have sent a code to your email. It is valid for 10 minutes.'
                : "Email delivery is not set up yet, so no email was sent. Use today's date as the code, written DDMMYY."}
            </span>
          </div>

          <label className="flex flex-col gap-2" htmlFor="forgot-otp">
            <span className={LABEL}>6-digit code</span>
            <input
              id="forgot-otp"
              inputMode="numeric"
              autoComplete="one-time-code"
              autoFocus
              maxLength={6}
              value={otp}
              onChange={(e) => {
                setOtp(e.target.value.replace(/\D/g, ''));
                setError(null);
              }}
              placeholder="000000"
              className={`${SIGN_IN_FIELD} tnum tracking-[0.3em]`}
            />
          </label>

          <PasswordField
            id="forgot-new-password"
            label="New password"
            value={password}
            onChange={(value) => {
              setPassword(value);
              setError(null);
            }}
            autoComplete="new-password"
            placeholder={`At least ${MIN_PASSWORD} characters`}
          />
          <PasswordField
            id="forgot-confirm-password"
            label="Confirm new password"
            value={confirm}
            onChange={(value) => {
              setConfirm(value);
              setError(null);
            }}
            autoComplete="new-password"
            placeholder="Repeat the new password"
          />

          {error && <ErrorNote message={error} />}

          <button type="submit" disabled={busy} className={SIGN_IN_BUTTON}>
            {busy ? (
              <>
                <Lucide.Loader2 size={16} className="animate-spin" />
                <span>Saving…</span>
              </>
            ) : (
              <>
                <span>Reset password</span>
                <Lucide.Check size={16} />
              </>
            )}
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={() => {
              setStep('email');
              setOtp('');
              setError(null);
            }}
            className="cursor-pointer text-center text-[13px] font-semibold text-primary hover:underline disabled:opacity-60"
          >
            Use a different email or send the code again
          </button>
        </form>
      )}

      <p className="mt-5 text-center text-[14px] text-ink-secondary">
        Remembered it?{' '}
        <button type="button" onClick={onSignIn} className="cursor-pointer font-semibold text-primary hover:underline">
          Back to sign in
        </button>
      </p>
    </AuthLayout>
  );
}
