import { useState, type FormEvent, type KeyboardEvent } from 'react';
import * as Lucide from 'lucide-react';
import { useAuth } from './AuthContext';
import { displayApiError } from '../../lib/api/client';
import { toast } from '../../utils/toast';
import { BrandMark } from '../../components/brand/BrandShell';
import { BODY, CONTROL, EYEBROW, HEADING, LABEL } from '../../components/brand/brandStyles';

/**
 * A full-screen 8 / 4 split. The left side is a soft, light brand panel; the
 * right side is the sign-in form. The page is exactly one viewport tall and
 * never scrolls: below the large breakpoint the brand panel shrinks to a
 * header strip, and on short screens the extras drop away so the form fits.
 */
export function LoginPage() {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [capsLock, setCapsLock] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);
    try {
      await login(email.trim(), password);
      toast('Signed in successfully', { detail: 'Welcome to your PMS workspace.', tone: 'success' });
    } catch (cause) {
      // Inline, so the reason stays next to the fields instead of vanishing with a toast.
      setError(displayApiError(cause));
    } finally {
      setIsSubmitting(false);
    }
  };

  const trackCapsLock = (e: KeyboardEvent<HTMLInputElement>) => setCapsLock(e.getModifierState('CapsLock'));

  return (
    <div className={`grid h-dvh w-full grid-rows-[auto_minmax(0,1fr)] overflow-hidden bg-surface text-ink lg:grid-cols-12 lg:grid-rows-1 ${BODY}`}>
      {/* Brand side: 8 of 12 columns */}
      <aside
        className="relative flex items-center overflow-hidden bg-gradient-to-br from-surface via-primary/[0.06] to-primary/[0.22] px-5 py-3.5 lg:col-span-8 lg:items-stretch lg:px-16 lg:py-12"
        aria-label="About TriponX"
      >
        {/* Soft light streaks, blurred glows and two outlined tiles (decorative) */}
        <div
          className="pointer-events-none absolute inset-0 hidden opacity-20 lg:block"
          style={{ backgroundImage: 'repeating-linear-gradient(115deg, transparent 0 140px, var(--color-surface) 140px 143px, transparent 143px 300px)' }}
          aria-hidden="true"
        />
        <div className="pointer-events-none absolute -right-16 top-16 hidden h-96 w-96 rounded-full bg-primary/15 blur-3xl lg:block" aria-hidden="true" />
        <div className="pointer-events-none absolute -bottom-24 left-64 hidden h-80 w-80 rounded-full bg-primary/10 blur-3xl lg:block" aria-hidden="true" />
        <div className="pointer-events-none absolute right-[8%] top-[28%] hidden h-[304px] w-[304px] rotate-[12deg] rounded-[40px] border border-primary/15 lg:block" aria-hidden="true" />
        <div className="pointer-events-none absolute right-[14%] top-[34%] hidden h-[304px] w-[304px] -rotate-[8deg] rounded-[40px] border border-primary/10 lg:block" aria-hidden="true" />

        <div className="relative flex w-full flex-col justify-between">
          <BrandMark />

          <div className="hidden max-w-xl lg:block">
            <p className={`flex items-center gap-4 ${EYEBROW}`}>
              <span className="h-px w-16 bg-primary" aria-hidden="true" /> Every stay begins here
            </p>
            <h2 className={`mt-6 text-[clamp(2.5rem,4vw,3.75rem)] font-bold leading-[1.05] tracking-[-0.05em] text-ink ${HEADING}`}>
              Run calmer.<br />
              <span className="text-primary">Host better.</span>
            </h2>
            <p className="mt-6 max-w-lg text-[16px] leading-7 text-ink-secondary [@media(max-height:660px)]:hidden">
              Your reservations, rooms and billing — gathered in one gentle, easy place.
            </p>
          </div>

          <p className="hidden max-w-[16rem] border-l-2 border-primary/50 pl-4 text-[12px] leading-6 text-ink-muted lg:block [@media(max-height:700px)]:hidden">
            Thoughtfully designed for teams who love the details.
          </p>
        </div>
      </aside>

      {/* Sign-in side: 4 of 12 columns */}
      <main className="flex min-h-0 items-center justify-center !bg-surface px-5 py-4 sm:px-10 lg:col-span-4 lg:px-14">
        <section className="pms-animate-fade-in w-full max-w-[400px]" aria-label="Sign in">
          <header>
            <p className={`${EYEBROW} [@media(max-height:560px)]:hidden`}>Staff access</p>
            <h1 className={`mt-3 text-[36px] font-bold leading-tight tracking-[-0.045em] text-ink [@media(max-height:560px)]:mt-0 ${HEADING}`}>
              Welcome back.
            </h1>
            <p className="mt-3 text-[16px] text-ink-secondary [@media(max-height:560px)]:hidden">Sign in to continue to TriponX.</p>
          </header>

          <form onSubmit={handleSubmit} className="mt-8 flex flex-col gap-5 [@media(max-height:600px)]:mt-4 [@media(max-height:600px)]:gap-3">
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
                className={CONTROL}
              />
            </label>

            <label className="flex flex-col gap-2" htmlFor="login-password">
              <span className={LABEL}>Password</span>
              <span className="relative">
                <input
                  id="login-password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    setError(null);
                  }}
                  onKeyDown={trackCapsLock}
                  onKeyUp={trackCapsLock}
                  onBlur={() => setCapsLock(false)}
                  placeholder="Enter your password"
                  className={`${CONTROL} pr-12`}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  aria-pressed={showPassword}
                  className="absolute right-3 top-1/2 flex h-8 w-8 -translate-y-1/2 cursor-pointer items-center justify-center rounded-lg text-ink-muted transition-colors hover:text-ink"
                >
                  {showPassword ? <Lucide.EyeOff size={17} /> : <Lucide.Eye size={17} />}
                </button>
              </span>
              {capsLock && (
                <span className="flex items-center gap-1.5 text-[12px] font-medium text-warning-text" role="status">
                  <Lucide.ArrowBigUp size={14} aria-hidden="true" /> Caps Lock is on
                </span>
              )}
            </label>

            {error && (
              <div role="alert" className="flex items-start gap-2 rounded-xl border border-danger-border bg-danger-bg px-3 py-2.5 text-[13px] font-medium text-danger-text">
                <Lucide.AlertCircle size={15} className="mt-px flex-none" aria-hidden="true" />
                <span>{error}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={isSubmitting}
              className="mt-1 flex h-12 w-full cursor-pointer items-center justify-center gap-2 rounded-[14px] bg-primary text-[14px] font-semibold text-primary-foreground shadow-lg shadow-primary/25 transition-colors hover:bg-primary-hover active:bg-primary-active disabled:cursor-not-allowed disabled:opacity-70"
            >
              {isSubmitting ? (
                <>
                  <Lucide.Loader2 size={16} className="animate-spin" aria-hidden="true" />
                  <span>Signing in…</span>
                </>
              ) : (
                <>
                  <span>Continue</span>
                  <Lucide.ArrowRight size={16} aria-hidden="true" />
                </>
              )}
            </button>
          </form>
        </section>
      </main>
    </div>
  );
}
