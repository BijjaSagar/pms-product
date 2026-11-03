import { useState, type FormEvent } from 'react';
import * as Lucide from 'lucide-react';
import { useAuth } from './AuthContext';
import { useTheme } from '../../theme/useTheme';
import { THEME_PRESETS } from '../../theme/presets';
import { ThemeSwatcher } from '../../theme/ThemeSwatcher';
import { Checkbox, FieldLabel } from '../../components/primitives';
import { toast } from '../../utils/toast';
import { displayApiError } from '../../lib/api/client';

export function LoginPage() {
  const { login } = useAuth();
  const { preset } = useTheme();
  const [email, setEmail] = useState('admin@pms.local');
  const [password, setPassword] = useState('Password@123');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [swatcherOpen, setSwatcherOpen] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await login(email, password);
      toast('Signed in successfully', {
        detail: 'Welcome to Grand Horizon Hotel PMS workspace.',
        tone: 'success',
      });
    } catch (cause) {
      toast('Sign in failed', {
        detail: displayApiError(cause),
        tone: 'danger',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleQuickDemo = async (demoEmail: string) => {
    setEmail(demoEmail);
    setIsSubmitting(true);
    try {
      await login(demoEmail, password);
      toast('Signed in successfully', {
        detail: 'Welcome to Grand Horizon Hotel PMS workspace.',
        tone: 'success',
      });
    } catch (cause) {
      toast('Sign in failed', {
        detail: displayApiError(cause),
        tone: 'danger',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      className="relative flex h-dvh max-h-dvh min-h-dvh w-full flex-col justify-between overflow-hidden p-3 sm:p-5 lg:p-6 select-none"
      style={{ background: 'var(--color-page)', color: 'var(--color-ink)' }}
    >
      {/* Background luxury ambient glow */}
      <div
        className="pointer-events-none absolute -left-20 -top-20 h-72 w-72 rounded-full opacity-20 blur-3xl"
        style={{ background: 'var(--color-primary)' }}
        aria-hidden="true"
      />
      <div
        className="pointer-events-none absolute -bottom-20 -right-20 h-72 w-72 rounded-full opacity-15 blur-3xl"
        style={{ background: 'var(--color-primary)' }}
        aria-hidden="true"
      />

      {/* ================= 1. TOP HEADER BAR ================= */}
      <header className="relative z-10 flex flex-none items-center justify-between gap-3">
        {/* Brand mark */}
        <div className="flex items-center gap-2.5">
          <div
            className="flex h-8 w-8 items-center justify-center rounded-xl font-brand text-disp2 font-bold shadow-xs transition-transform hover:scale-105 sm:h-9 sm:w-9"
            style={{
              background: 'var(--color-primary)',
              color: 'var(--color-primary-foreground)',
            }}
          >
            T
          </div>
          <div>
            <p className="font-brand truncate text-title font-bold leading-none tracking-tight text-ink">
              TriponX
            </p>
            <p className="text-micro font-semibold uppercase tracking-[0.14em] text-ink-muted">
              Hotel PMS
            </p>
          </div>
        </div>

        {/* Theme and static demo pill */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setSwatcherOpen(true)}
            className="flex items-center gap-1.5 rounded-full border border-border bg-surface px-2.5 py-1 text-label font-medium text-ink transition-colors hover:bg-hover-surface cursor-pointer shadow-xs active:scale-95"
            title="Switch color theme preset"
            aria-label="Theme preset selector"
          >
            <Lucide.Palette size={14} className="text-primary" />
            <span className="hidden sm:inline font-semibold">
              {THEME_PRESETS[preset]?.name ?? 'Theme'}
            </span>
          </button>
          <span className="rounded-full border border-border bg-surface/80 px-2.5 py-0.5 text-micro font-bold uppercase tracking-wider text-ink-secondary">
            Static Demo
          </span>
        </div>
      </header>

      {/* ================= 2. MAIN LOGIN CARD (FIT TO SCREEN) ================= */}
      <main className="relative z-10 my-auto flex flex-1 items-center justify-center min-h-0 py-2 sm:py-3">
        <div className="pms-card flex w-full max-w-[420px] flex-col overflow-hidden border border-border shadow-xl lg:max-w-[880px] lg:flex-row">
          {/* Desktop Left Showcase Pane */}
          <section
            className="relative hidden flex-col justify-between border-r border-border bg-surface p-6 lg:flex lg:w-5/12 xl:p-8"
            aria-label="Hospitality system highlights"
          >
            <div>
              <span className="inline-flex items-center gap-1.5 rounded-full border border-primary/20 bg-primary/10 px-2.5 py-0.5 text-micro font-bold text-primary">
                <Lucide.Hotel size={13} />
                Enterprise Hospitality
              </span>
              <h2 className="mt-3.5 font-brand text-disp2 font-bold leading-snug tracking-tight text-ink">
                Intelligent Front Desk & Hotel Operations
              </h2>
              <p className="mt-2 text-label leading-relaxed text-ink-secondary">
                Unified reservations, live room calendars, split-folios, and automated night audits in one seamless interface.
              </p>

              {/* Feature highlight list */}
              <div className="mt-5 space-y-2.5">
                <div className="flex items-center gap-2.5 rounded-lg border border-border/70 bg-page/40 px-3 py-2 text-label">
                  <div className="flex h-7 w-7 flex-none items-center justify-center rounded-md bg-primary/10 text-primary">
                    <Lucide.CalendarDays size={15} />
                  </div>
                  <div className="min-w-0">
                    <p className="truncate font-semibold text-ink">Interactive Room Calendar</p>
                    <p className="truncate text-micro text-ink-muted">Drag-and-drop allocations & live status</p>
                  </div>
                </div>

                <div className="flex items-center gap-2.5 rounded-lg border border-border/70 bg-page/40 px-3 py-2 text-label">
                  <div className="flex h-7 w-7 flex-none items-center justify-center rounded-md bg-primary/10 text-primary">
                    <Lucide.ReceiptText size={15} />
                  </div>
                  <div className="min-w-0">
                    <p className="truncate font-semibold text-ink">Split-Folios & Instant Invoices</p>
                    <p className="truncate text-micro text-ink-muted">Multi-charge routing and bill settlements</p>
                  </div>
                </div>

                <div className="flex items-center gap-2.5 rounded-lg border border-border/70 bg-page/40 px-3 py-2 text-label">
                  <div className="flex h-7 w-7 flex-none items-center justify-center rounded-md bg-primary/10 text-primary">
                    <Lucide.MoonStar size={15} />
                  </div>
                  <div className="min-w-0">
                    <p className="truncate font-semibold text-ink">Audit & Daily Rollover</p>
                    <p className="truncate text-micro text-ink-muted">Automated business date progression</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Bottom active property card */}
            <div className="mt-6 flex items-center gap-3 rounded-xl border border-border bg-page/60 p-2.5">
              <div className="flex h-8 w-8 flex-none items-center justify-center rounded-lg bg-primary/10 text-primary">
                <Lucide.Building2 size={16} />
              </div>
              <div className="min-w-0">
                <p className="truncate text-label font-bold text-ink">Grand Horizon Hotel</p>
                <p className="truncate text-micro text-ink-muted">Active Demo Property · 48 Rooms</p>
              </div>
            </div>
          </section>

          {/* Right Login Form Pane */}
          <section
            className="flex w-full flex-col justify-center bg-surface p-4 sm:p-6 lg:w-7/12 xl:p-8"
            aria-label="Staff Login"
          >
            {/* Mobile-only brand badge */}
            <div className="mb-2.5 flex items-center gap-2 lg:hidden">
              <div
                className="flex h-7 w-7 items-center justify-center rounded-lg font-brand text-body font-bold"
                style={{
                  background: 'var(--color-primary)',
                  color: 'var(--color-primary-foreground)',
                }}
              >
                T
              </div>
              <span className="font-brand text-title font-bold text-ink">TriponX PMS</span>
            </div>

            <header>
              <h1 className="font-brand text-title font-bold tracking-tight text-ink sm:text-disp2">
                Sign In to Workspace
              </h1>
              <p className="mt-1 text-label text-ink-muted">
                Sign in with your PMS account. Demo users use the password Password@123.
              </p>
            </header>

            <form onSubmit={handleSubmit} className="mt-4 space-y-3">
              {/* Email Address */}
              <div>
                <FieldLabel htmlFor="login-email">Email Address</FieldLabel>
                <div className="relative">
                  <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-2.5 text-ink-muted">
                    <Lucide.Mail size={15} />
                  </span>
                  <input
                    id="login-email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    placeholder="name@hotel.com"
                    className="pms-input pl-8 w-full min-h-[34px] md:min-h-[32px]"
                  />
                </div>
              </div>

              {/* Password */}
              <div>
                <div className="flex items-center justify-between">
                  <FieldLabel htmlFor="login-password">Password</FieldLabel>
                  <button
                    type="button"
                    onClick={() =>
                      toast('Static Demo Notice', {
                        detail: 'No credentials needed. Click Sign In to enter directly.',
                        tone: 'info',
                      })
                    }
                    className="text-micro font-semibold text-primary hover:underline cursor-pointer"
                  >
                    Forgot password?
                  </button>
                </div>
                <div className="relative">
                  <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-2.5 text-ink-muted">
                    <Lucide.Lock size={15} />
                  </span>
                  <input
                    id="login-password"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    placeholder="••••••••"
                    className="pms-input pl-8 pr-9 w-full min-h-[34px] md:min-h-[32px]"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((prev) => !prev)}
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                    className="absolute inset-y-0 right-0 flex items-center pr-2.5 text-ink-muted hover:text-ink cursor-pointer transition-colors"
                  >
                    {showPassword ? <Lucide.EyeOff size={15} /> : <Lucide.Eye size={15} />}
                  </button>
                </div>
              </div>

              {/* Remember device checkbox */}
              <div className="pt-0.5">
                <Checkbox
                  id="login-remember"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  label={<span className="text-label text-ink-secondary">Remember this workstation</span>}
                />
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={isSubmitting}
                className="pms-btn-primary w-full justify-center min-h-[36px] text-label sm:text-body font-bold cursor-pointer transition-all shadow-xs active:scale-98"
              >
                {isSubmitting ? (
                  <>
                    <Lucide.Loader2 size={16} className="animate-spin" />
                    <span>Signing In…</span>
                  </>
                ) : (
                  <>
                    <span>Sign In to Dashboard</span>
                    <Lucide.ArrowRight size={16} />
                  </>
                )}
              </button>

              {/* Demo Notice Banner */}
              <div className="flex items-center gap-2 rounded-lg border border-border bg-muted-surface/70 px-3 py-2 text-micro text-ink-secondary">
                <Lucide.Sparkles size={14} className="text-primary flex-none" />
                <span className="min-w-0">
                  <strong>Static Demo Mode:</strong> No credentials required. Click <strong>Sign In</strong> directly.
                </span>
              </div>

              {/* Quick Demo Sign-In Chips */}
              <div className="flex flex-wrap items-center gap-1.5 pt-1">
                <span className="text-micro font-medium text-ink-muted">Quick login:</span>
                <button
                  type="button"
                  onClick={() => void handleQuickDemo('gm@pms.local')}
                  className="rounded-md border border-border bg-page px-2 py-0.5 text-micro font-semibold text-ink hover:bg-hover-surface cursor-pointer transition-colors"
                >
                  General Manager
                </button>
                <button
                  type="button"
                  onClick={() => void handleQuickDemo('fde@pms.local')}
                  className="rounded-md border border-border bg-page px-2 py-0.5 text-micro font-semibold text-ink hover:bg-hover-surface cursor-pointer transition-colors"
                >
                  Front Desk
                </button>
              </div>
            </form>
          </section>
        </div>
      </main>

      {/* ================= 3. BOTTOM FOOTER BAR ================= */}
      <footer className="relative z-10 flex flex-none flex-col sm:flex-row items-center justify-between gap-1 text-center sm:text-left text-micro text-ink-muted">
        <p className="tnum">
          TriponX Hotel PMS
        </p>
        <p>© {new Date().getFullYear()} TriponX Systems. All rights reserved.</p>
      </footer>

      {/* Theme Swatcher Drawer */}
      <ThemeSwatcher open={swatcherOpen} onClose={() => setSwatcherOpen(false)} />
    </div>
  );
}

