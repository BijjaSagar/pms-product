import { useState, type FormEvent } from 'react';
import {
  Calendar,
  BedDouble,
  BarChart3,
  Settings,
  Mail,
  Lock,
  Eye,
  EyeOff,
  ArrowRight,
  Globe,
  ChevronDown,
  Palette,
  Check,
  AlertCircle,
  HelpCircle,
} from 'lucide-react';
import { useAuth } from './AuthContext';
import { adminApi } from '../../lib/api/pms';
import { ThemeSwatcher } from '../../components/ThemeSwatcher';

const LANGUAGES = [
  { code: 'en', label: 'English' },
  { code: 'es', label: 'Español' },
  { code: 'fr', label: 'Français' },
  { code: 'de', label: 'Deutsch' },
  { code: 'it', label: 'Italiano' },
];

export function Login() {
  const { login } = useAuth();
  const inviteToken = new URLSearchParams(window.location.search).get('token');

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [pending, setPending] = useState(false);

  // Modals & UI states
  const [swatcherOpen, setSwatcherOpen] = useState(false);
  const [langMenuOpen, setLangMenuOpen] = useState(false);
  const [selectedLang, setSelectedLang] = useState('English');
  const [adminContactModal, setAdminContactModal] = useState(false);
  const [forgotPasswordModal, setForgotPasswordModal] = useState(false);
  const [ssoInfoModal, setSsoInfoModal] = useState<string | null>(null);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setError('');
    setPending(true);
    try {
      let loginEmail = email;
      if (inviteToken) {
        if (password.length < 12) {
          throw new Error('Choose a password with at least 12 characters.');
        }
        if (password !== confirmPassword) {
          throw new Error('The passwords do not match.');
        }
        const accepted = await adminApi.acceptInvite(inviteToken, password);
        loginEmail = accepted.email;
        setEmail(accepted.email);
        window.history.replaceState({}, '', window.location.pathname);
      }
      await login(loginEmail, password);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Sign in failed.');
    } finally {
      setPending(false);
    }
  };

  return (
    <main className="relative flex min-h-screen w-full bg-[#f8fafc] text-slate-900 font-sans antialiased overflow-x-hidden">
      {/* 2-Column Responsive Layout: Left showcase, Right login */}
      <div className="flex flex-col lg:flex-row w-full min-h-screen">
        {/* ================= LEFT COLUMN: HERO SHOWCASE ================= */}
        <div className="relative hidden lg:flex lg:w-[54%] xl:w-[58%] flex-col justify-between p-10 xl:p-14 overflow-hidden select-none">
          {/* Background Image */}
          <div
            className="absolute inset-0 bg-cover bg-center transition-transform duration-700 ease-out hover:scale-105"
            style={{
              backgroundImage: `url('/images/login-resort.jpg')`,
            }}
          />

          {/* Luxury Twilight Gradient Overlay */}
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              background:
                'linear-gradient(180deg, rgba(7, 16, 34, 0.6) 0%, rgba(9, 21, 44, 0.35) 45%, rgba(6, 14, 30, 0.88) 100%)',
            }}
          />

          {/* Top Brand Area */}
          <div className="relative z-10">
            <div className="inline-block">
              <div className="flex items-baseline">
                <span className="font-brand text-[34px] font-bold tracking-tight text-white drop-shadow-sm">
                  Tripon
                </span>
                <span className="text-[34px] font-black tracking-tight text-[#3b82f6] ml-[1px] drop-shadow-sm">
                  X
                </span>
              </div>
              <p className="text-[10.5px] font-semibold tracking-[0.28em] text-white/85 uppercase -mt-1 drop-shadow-sm">
                HOTEL PMS
              </p>
            </div>
          </div>

          {/* Middle Hero Content */}
          <div className="relative z-10 max-w-[560px] my-auto py-10">
            <h1 className="font-brand text-[36px] xl:text-[44px] font-bold text-white leading-[1.14] tracking-tight drop-shadow-md">
              Simplify Hotel Operations,
              <br />
              Deliver Memorable Stays
            </h1>
            <p className="mt-4 text-[14.5px] xl:text-[15.5px] text-white/85 leading-relaxed font-normal max-w-[480px] drop-shadow-sm">
              One powerful platform to manage reservations, guests, rooms, and hotel operations.
            </p>

            {/* 4 Feature Badges in a Row */}
            <div className="grid grid-cols-4 gap-3 xl:gap-4 mt-9">
              {/* Feature 1 */}
              <div className="flex flex-col items-start group">
                <div className="w-[46px] h-[46px] rounded-full bg-white/15 backdrop-blur-md border border-white/25 flex items-center justify-center text-white shadow-sm transition-all duration-200 group-hover:bg-white/25 group-hover:scale-105">
                  <Calendar size={19} strokeWidth={2} />
                </div>
                <h3 className="mt-2.5 text-[13px] font-semibold text-white tracking-tight leading-snug">
                  Reservations
                </h3>
                <p className="text-[11px] text-white/75 leading-tight mt-0.5">
                  All channels in one place
                </p>
              </div>

              {/* Feature 2 */}
              <div className="flex flex-col items-start group">
                <div className="w-[46px] h-[46px] rounded-full bg-white/15 backdrop-blur-md border border-white/25 flex items-center justify-center text-white shadow-sm transition-all duration-200 group-hover:bg-white/25 group-hover:scale-105">
                  <BedDouble size={19} strokeWidth={2} />
                </div>
                <h3 className="mt-2.5 text-[13px] font-semibold text-white tracking-tight leading-snug">
                  Front Office
                </h3>
                <p className="text-[11px] text-white/75 leading-tight mt-0.5">
                  Seamless guest experience
                </p>
              </div>

              {/* Feature 3 */}
              <div className="flex flex-col items-start group">
                <div className="w-[46px] h-[46px] rounded-full bg-white/15 backdrop-blur-md border border-white/25 flex items-center justify-center text-white shadow-sm transition-all duration-200 group-hover:bg-white/25 group-hover:scale-105">
                  <BarChart3 size={19} strokeWidth={2} />
                </div>
                <h3 className="mt-2.5 text-[13px] font-semibold text-white tracking-tight leading-snug">
                  Revenue
                </h3>
                <p className="text-[11px] text-white/75 leading-tight mt-0.5">
                  Maximize your revenue
                </p>
              </div>

              {/* Feature 4 */}
              <div className="flex flex-col items-start group">
                <div className="w-[46px] h-[46px] rounded-full bg-white/15 backdrop-blur-md border border-white/25 flex items-center justify-center text-white shadow-sm transition-all duration-200 group-hover:bg-white/25 group-hover:scale-105">
                  <Settings size={19} strokeWidth={2} />
                </div>
                <h3 className="mt-2.5 text-[13px] font-semibold text-white tracking-tight leading-snug">
                  Operations
                </h3>
                <p className="text-[11px] text-white/75 leading-tight mt-0.5">
                  Efficient hotel management
                </p>
              </div>
            </div>
          </div>

          {/* Bottom Stats Row */}
          <div className="relative z-10 flex items-center gap-7 xl:gap-9 pt-7 border-t border-white/20">
            <div>
              <p className="text-[23px] xl:text-[25px] font-bold text-white tracking-tight leading-none">
                500+
              </p>
              <p className="text-[11.5px] text-white/75 mt-1 font-medium">Hotels Worldwide</p>
            </div>
            <div className="h-9 w-[1px] bg-white/25" />
            <div>
              <p className="text-[23px] xl:text-[25px] font-bold text-white tracking-tight leading-none">
                99.9%
              </p>
              <p className="text-[11.5px] text-white/75 mt-1 font-medium">Uptime Reliability</p>
            </div>
            <div className="h-9 w-[1px] bg-white/25" />
            <div>
              <p className="text-[23px] xl:text-[25px] font-bold text-white tracking-tight leading-none">
                24/7
              </p>
              <p className="text-[11.5px] text-white/75 mt-1 font-medium">Expert Support</p>
            </div>
          </div>
        </div>

        {/* ================= RIGHT COLUMN: SIGN-IN FORM ================= */}
        <div className="flex flex-1 flex-col justify-between p-6 sm:p-10 lg:p-12 xl:p-16 bg-[#f8fafc] min-h-screen">
          {/* Top Bar: Language Dropdown & Theme Settings */}
          <div className="flex items-center justify-between sm:justify-end gap-3 w-full max-w-[440px] mx-auto lg:max-w-none">
            {/* Mobile Brand (only visible on mobile screens) */}
            <div className="lg:hidden flex items-baseline">
              <span className="font-brand text-[21px] font-bold text-slate-900">Tripon</span>
              <span className="text-[21px] font-black text-[var(--color-primary)] ml-[1px]">X</span>
            </div>

            <div className="flex items-center gap-2 relative">
              {/* Theme Settings Button */}
              <button
                type="button"
                onClick={() => setSwatcherOpen(true)}
                aria-label="Appearance settings"
                title="Theme appearance"
                className="flex h-9 w-9 items-center justify-center rounded-md border border-slate-200/90 bg-white text-slate-600 hover:bg-slate-50 hover:text-slate-900 shadow-xs transition-all"
              >
                <Palette size={15} />
              </button>

              {/* Language Selector Pill */}
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setLangMenuOpen(!langMenuOpen)}
                  aria-expanded={langMenuOpen}
                  aria-label="Select language"
                  className="flex h-9 items-center gap-1.5 rounded-md border border-slate-200/90 bg-white px-3 text-xs font-medium text-slate-700 hover:bg-slate-50 shadow-xs transition-all"
                >
                  <Globe size={14} className="text-slate-500" />
                  <span>{selectedLang}</span>
                  <ChevronDown size={13} className="text-slate-400" />
                </button>

                {/* Dropdown Menu */}
                {langMenuOpen && (
                  <>
                    <div
                      className="fixed inset-0 z-20"
                      onClick={() => setLangMenuOpen(false)}
                    />
                    <div className="absolute right-0 top-full mt-1.5 z-30 w-36 overflow-hidden rounded-md border border-slate-200 bg-white p-1 shadow-lg ring-1 ring-black/5 animate-in fade-in slide-in-from-top-1 duration-150">
                      {LANGUAGES.map((lang) => (
                        <button
                          key={lang.code}
                          type="button"
                          onClick={() => {
                            setSelectedLang(lang.label);
                            setLangMenuOpen(false);
                          }}
                          className={`flex w-full items-center justify-between rounded-md px-2.5 py-1.5 text-left text-xs transition-colors ${
                            selectedLang === lang.label
                              ? 'bg-[var(--color-muted-surface)] font-semibold text-[var(--color-primary)]'
                              : 'text-slate-700 hover:bg-slate-50'
                          }`}
                        >
                          <span>{lang.label}</span>
                          {selectedLang === lang.label && <Check size={13} />}
                        </button>
                      ))}
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Center Form Section */}
          <div className="my-auto w-full max-w-[420px] mx-auto py-6">
            {/* Right Side Brand Logo Header */}
            <div className="text-center mb-6">
              <div className="inline-block">
                <div className="flex items-baseline justify-center">
                  <span className="font-brand text-[32px] font-bold tracking-tight text-slate-900">
                    Tripon
                  </span>
                  <span className="text-[32px] font-black tracking-tight text-[var(--color-primary)] ml-[1px]">
                    X
                  </span>
                </div>
                <p className="text-[10.5px] font-semibold tracking-[0.28em] text-slate-400 uppercase -mt-0.5">
                  HOTEL PMS
                </p>
              </div>

              <h2 className="mt-5 text-[24px] font-bold text-slate-900 tracking-tight">
                {inviteToken ? 'Accept your invitation' : 'Welcome Back'}
              </h2>
              <p className="mt-1 text-[13px] text-slate-500">
                {inviteToken
                  ? 'Set a secure password to activate your staff account'
                  : 'Sign in to your account to continue'}
              </p>
            </div>

            {/* Login Card */}
            <div className="rounded-2xl border border-slate-200/80 bg-white p-6 sm:p-7 shadow-[0_10px_30px_-5px_rgba(15,23,42,0.06)]">
              <form onSubmit={submit} className="flex flex-col gap-4">
                {/* Email Field */}
                {!inviteToken && (
                  <div>
                    <label
                      htmlFor="email"
                      className="block text-xs font-semibold text-slate-700 mb-1.5"
                    >
                      Email Address
                    </label>
                    <div className="relative flex items-center">
                      <div className="pointer-events-none absolute left-3.5 flex items-center text-slate-400">
                        <Mail size={16} />
                      </div>
                      <input
                        id="email"
                        type="email"
                        required
                        autoComplete="username"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="Enter your email address"
                        className="w-full rounded-md border border-slate-200 bg-white py-2.5 pl-10 pr-3.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-[var(--color-primary)] focus:outline-none focus:ring-4 focus:ring-[var(--color-primary)]/10 transition-all"
                      />
                    </div>
                  </div>
                )}

                {/* Password Field */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label
                      htmlFor="password"
                      className="block text-xs font-semibold text-slate-700"
                    >
                      {inviteToken ? 'Create Password' : 'Password'}
                    </label>
                    {!inviteToken && (
                      <button
                        type="button"
                        onClick={() => setForgotPasswordModal(true)}
                        className="text-xs font-medium text-[var(--color-primary)] hover:text-[var(--color-primary-hover)] hover:underline transition-colors cursor-pointer"
                      >
                        Forgot password?
                      </button>
                    )}
                  </div>
                  <div className="relative flex items-center">
                    <div className="pointer-events-none absolute left-3.5 flex items-center text-slate-400">
                      <Lock size={16} />
                    </div>
                    <input
                      id="password"
                      type={showPassword ? 'text' : 'password'}
                      required
                      minLength={inviteToken ? 12 : undefined}
                      autoComplete={inviteToken ? 'new-password' : 'current-password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder={inviteToken ? 'At least 12 characters' : 'Enter your password'}
                      className="w-full rounded-md border border-slate-200 bg-white py-2.5 pl-10 pr-10 text-sm text-slate-900 placeholder:text-slate-400 focus:border-[var(--color-primary)] focus:outline-none focus:ring-4 focus:ring-[var(--color-primary)]/10 transition-all"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                      className="absolute right-3 flex items-center text-slate-400 hover:text-slate-600 transition-colors"
                    >
                      {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>

                {/* Confirm Password (only for invitation acceptance) */}
                {inviteToken && (
                  <div>
                    <label
                      htmlFor="confirmPassword"
                      className="block text-xs font-semibold text-slate-700 mb-1.5"
                    >
                      Confirm Password
                    </label>
                    <div className="relative flex items-center">
                      <div className="pointer-events-none absolute left-3.5 flex items-center text-slate-400">
                        <Lock size={16} />
                      </div>
                      <input
                        id="confirmPassword"
                        type={showPassword ? 'text' : 'password'}
                        required
                        minLength={12}
                        autoComplete="new-password"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        placeholder="Re-enter your new password"
                        className="w-full rounded-md border border-slate-200 bg-white py-2.5 pl-10 pr-3.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-[var(--color-primary)] focus:outline-none focus:ring-4 focus:ring-[var(--color-primary)]/10 transition-all"
                      />
                    </div>
                  </div>
                )}

                {/* Remember Me Checkbox */}
                {!inviteToken && (
                  <div className="flex items-center gap-2 pt-0.5">
                    <input
                      id="rememberMe"
                      type="checkbox"
                      checked={rememberMe}
                      onChange={(e) => setRememberMe(e.target.checked)}
                      className="h-4 w-4 rounded border-slate-300 text-[var(--color-primary)] focus:ring-2 focus:ring-[var(--color-primary)]/20 cursor-pointer accent-[var(--color-primary)]"
                    />
                    <label
                      htmlFor="rememberMe"
                      className="text-xs font-medium text-slate-600 select-none cursor-pointer"
                    >
                      Remember me
                    </label>
                  </div>
                )}

                {/* Error Banner */}
                {error && (
                  <div
                    role="alert"
                    className="flex items-start gap-2.5 rounded-md border border-red-200 bg-red-50/90 p-3 text-xs text-red-700 animate-in fade-in duration-200"
                  >
                    <AlertCircle size={15} className="mt-0.5 shrink-0 text-red-500" />
                    <span>{error}</span>
                  </div>
                )}

                {/* Submit Button */}
                <button
                  type="submit"
                  disabled={pending}
                  className="w-full mt-1 flex items-center justify-center gap-2 rounded-md bg-[var(--color-primary)] py-2.5 sm:py-3 px-4 text-sm font-semibold text-white shadow-sm hover:bg-[var(--color-primary-hover)] active:bg-[var(--color-primary-active)] disabled:opacity-60 disabled:cursor-not-allowed transition-all duration-150"
                >
                  <span>{pending ? 'Signing In…' : inviteToken ? 'Activate Account' : 'Sign In'}</span>
                  {!pending && <ArrowRight size={16} strokeWidth={2.2} />}
                </button>
              </form>

              {/* Or continue with divider */}
              {!inviteToken && (
                <>
                  <div className="relative my-5">
                    <div className="absolute inset-0 flex items-center">
                      <div className="w-full border-t border-slate-200" />
                    </div>
                    <div className="relative flex justify-center text-xs">
                      <span className="bg-white px-3 text-slate-400 font-medium">
                        Or continue with
                      </span>
                    </div>
                  </div>

                  {/* SSO Buttons: Google & Microsoft */}
                  <div className="grid grid-cols-2 gap-3">
                    {/* Google Button */}
                    <button
                      type="button"
                      onClick={() => setSsoInfoModal('Google Single Sign-On')}
                      className="flex items-center justify-center gap-2.5 rounded-md border border-slate-200 bg-white py-2.5 px-3 text-xs font-semibold text-slate-700 hover:bg-slate-50 hover:border-slate-300 active:bg-slate-100 transition-colors"
                    >
                      <svg viewBox="0 0 24 24" className="h-4 w-4 shrink-0" aria-hidden="true">
                        <path
                          d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                          fill="#4285F4"
                        />
                        <path
                          d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                          fill="#34A853"
                        />
                        <path
                          d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                          fill="#FBBC05"
                        />
                        <path
                          d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                          fill="#EA4335"
                        />
                      </svg>
                      <span>Google</span>
                    </button>

                    {/* Microsoft Button */}
                    <button
                      type="button"
                      onClick={() => setSsoInfoModal('Microsoft Single Sign-On')}
                      className="flex items-center justify-center gap-2.5 rounded-md border border-slate-200 bg-white py-2.5 px-3 text-xs font-semibold text-slate-700 hover:bg-slate-50 hover:border-slate-300 active:bg-slate-100 transition-colors"
                    >
                      <svg viewBox="0 0 24 24" className="h-4 w-4 shrink-0" aria-hidden="true">
                        <rect x="1" y="1" width="10" height="10" fill="#F25022" />
                        <rect x="13" y="1" width="10" height="10" fill="#7FBA00" />
                        <rect x="1" y="13" width="10" height="10" fill="#00A4EF" />
                        <rect x="13" y="13" width="10" height="10" fill="#FFB900" />
                      </svg>
                      <span>Microsoft</span>
                    </button>
                  </div>
                </>
              )}
            </div>

            {/* Bottom Contact Administrator text */}
            <p className="mt-6 text-center text-xs text-slate-500">
              Don’t have an account?{' '}
              <button
                type="button"
                onClick={() => setAdminContactModal(true)}
                className="font-medium text-[var(--color-primary)] hover:text-[var(--color-primary-hover)] hover:underline cursor-pointer"
              >
                Contact your administrator
              </button>
            </p>
          </div>

          {/* Bottom Copyright / Security Tag */}
          <div className="w-full text-center">
            <p className="text-[11px] text-slate-400">
              © {new Date().getFullYear()} TriponX Hospitality Technologies. All rights reserved.
            </p>
          </div>
        </div>
      </div>

      {/* ================= MODALS & POPUPS ================= */}

      {/* Forgot Password Modal */}
      {forgotPasswordModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 backdrop-blur-xs p-4 animate-in fade-in duration-200">
          <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl border border-slate-100 animate-in zoom-in-95 duration-150">
            <div className="flex h-11 w-11 items-center justify-center rounded-md bg-[var(--color-muted-surface)] text-[var(--color-primary)] mb-3.5">
              <HelpCircle size={22} />
            </div>
            <h3 className="text-base font-bold text-slate-900">Reset Your Password</h3>
            <p className="mt-2 text-xs text-slate-600 leading-relaxed">
              For security compliance, hotel staff password resets must be initiated by your Property
              Administrator or General Manager.
            </p>
            <div className="mt-3 rounded-md bg-slate-50 border border-slate-200 p-3 text-xs text-slate-600">
              <span className="font-semibold text-slate-700">Need immediate access?</span>
              <p className="mt-0.5">
                Contact your hotel IT helpdesk or system administrator to receive a secure password reset link.
              </p>
            </div>
            <div className="mt-5 flex justify-end">
              <button
                type="button"
                onClick={() => setForgotPasswordModal(false)}
                className="rounded-md bg-[var(--color-primary)] px-4 py-2 text-xs font-semibold text-white hover:bg-[var(--color-primary-hover)] cursor-pointer"
              >
                Got It
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Contact Administrator Modal */}
      {adminContactModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 backdrop-blur-xs p-4 animate-in fade-in duration-200">
          <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl border border-slate-100 animate-in zoom-in-95 duration-150">
            <div className="flex h-11 w-11 items-center justify-center rounded-md bg-[var(--color-muted-surface)] text-[var(--color-primary)] mb-3.5">
              <Mail size={22} />
            </div>
            <h3 className="text-base font-bold text-slate-900">Staff Account Access</h3>
            <p className="mt-2 text-xs text-slate-600 leading-relaxed">
              New property accounts and staff role assignments are provisioned directly by your hotel
              operations director or management.
            </p>
            <div className="mt-3 rounded-md bg-slate-50 border border-slate-200 p-3 text-xs text-slate-600">
              <p>
                Once an administrator invites your email address, you will receive an invitation email
                with an activation token to configure your credentials.
              </p>
            </div>
            <div className="mt-5 flex justify-end">
              <button
                type="button"
                onClick={() => setAdminContactModal(false)}
                className="rounded-md bg-[var(--color-primary)] px-4 py-2 text-xs font-semibold text-white hover:bg-[var(--color-primary-hover)] cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* SSO Info Modal */}
      {ssoInfoModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 backdrop-blur-xs p-4 animate-in fade-in duration-200">
          <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl border border-slate-100 animate-in zoom-in-95 duration-150">
            <h3 className="text-base font-bold text-slate-900">{ssoInfoModal}</h3>
            <p className="mt-2 text-xs text-slate-600 leading-relaxed">
              Enterprise Single Sign-On (SSO) with {ssoInfoModal} is enabled for enterprise hotel
              chains configured through SAML 2.0 / OAuth.
            </p>
            <p className="mt-2 text-xs text-slate-500 leading-relaxed">
              Please enter your corporate email address above or sign in with your property credentials.
            </p>
            <div className="mt-5 flex justify-end">
              <button
                type="button"
                onClick={() => setSsoInfoModal(null)}
                className="rounded-md bg-[var(--color-primary)] px-4 py-2 text-xs font-semibold text-white hover:bg-[var(--color-primary-hover)] cursor-pointer"
              >
                Okay
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Theme Swatcher (Preserved from original PMS) */}
      <ThemeSwatcher open={swatcherOpen} onClose={() => setSwatcherOpen(false)} />
    </main>
  );
}
