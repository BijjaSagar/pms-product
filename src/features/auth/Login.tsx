import { useState, type FormEvent } from 'react';
import { Card, CardTitle } from '../../components/ui';
import { Field } from '../../components/controls';
import { inputClass } from '../../components/inputClass';
import { useAuth } from './AuthContext';
import { adminApi } from '../../lib/api/pms';
import { ThemeSwatcher } from '../../components/ThemeSwatcher';

export function Login() {
  const { login } = useAuth();
  const inviteToken = new URLSearchParams(window.location.search).get('token');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [pending, setPending] = useState(false);
  const [swatcherOpen, setSwatcherOpen] = useState(false);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setError('');
    setPending(true);
    try {
      let loginEmail = email;
      if (inviteToken) {
        if (password.length < 12) throw new Error('Choose a password with at least 12 characters.');
        if (password !== confirmPassword) throw new Error('The passwords do not match.');
        const accepted = await adminApi.acceptInvite(inviteToken, password);
        loginEmail = accepted.email;
        setEmail(accepted.email);
        window.history.replaceState({}, '', window.location.pathname);
      }
      await login(loginEmail, password);
    }
    catch (cause) { setError(cause instanceof Error ? cause.message : 'Sign in failed.'); }
    finally { setPending(false); }
  };

  return (
    <main className="relative flex min-h-screen items-center overflow-hidden px-4 py-6 sm:px-6 sm:py-10" style={{ background: 'var(--color-page)', color: 'var(--color-ink)' }}>
      <div className="pointer-events-none absolute inset-0 opacity-70" style={{ background: 'radial-gradient(circle at 12% 16%, color-mix(in srgb, var(--color-primary) 16%, transparent), transparent 34%), radial-gradient(circle at 92% 86%, color-mix(in srgb, var(--color-soft) 34%, transparent), transparent 30%)' }} aria-hidden="true" />
      <button
        type="button"
        onClick={() => setSwatcherOpen(true)}
        aria-label="Open appearance settings"
        title="Appearance settings"
        className="pms-btn-ghost absolute right-4 top-4 z-10 flex h-11 w-11 items-center justify-center p-0 sm:right-6 sm:top-6"
      >
        <svg viewBox="0 0 24 24" className="h-[19px] w-[19px]" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M12 3v2M12 19v2M3 12h2M19 12h2M5.64 5.64l1.42 1.42M16.94 16.94l1.42 1.42M5.64 18.36l1.42-1.42M16.94 7.06l1.42-1.42" />
          <circle cx="12" cy="12" r="3.5" />
        </svg>
      </button>

      <div className="relative mx-auto grid w-full max-w-[1040px] overflow-hidden rounded-[24px] border sm:grid-cols-[0.92fr_1.08fr]" style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)', boxShadow: 'var(--shadow-2xl)' }}>
        <section className="hidden flex-col justify-between p-8 sm:flex lg:p-10" style={{ background: 'linear-gradient(145deg, var(--color-sidebar), color-mix(in srgb, var(--color-primary) 22%, var(--color-sidebar)))', color: 'var(--color-primary-foreground)' }}>
          <div>
            <div className="flex items-center gap-3">
              <span className="flex h-11 w-11 items-center justify-center rounded-[14px] text-lg font-bold" style={{ background: 'var(--color-primary)', color: 'var(--color-primary-foreground)' }}>T</span>
              <div>
                <p className="font-brand text-[19px] font-bold tracking-tight">TriponX</p>
                <p className="text-[11px] opacity-70">Hotel operations, composed.</p>
              </div>
            </div>
            <div className="mt-20 max-w-[340px]">
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] opacity-65">Property command center</p>
              <h1 className="mt-3 text-[34px] font-semibold leading-[1.08] tracking-[-0.02em]">A calmer way to run every stay.</h1>
              <p className="mt-4 max-w-[300px] text-[14px] leading-relaxed opacity-75">Keep rooms, reservations, guests, and revenue moving in one clear operational view.</p>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3 border-t pt-5" style={{ borderColor: 'rgb(255 255 255 / 0.16)' }}>
            <div><p className="text-[22px] font-semibold">24/7</p><p className="text-[11px] opacity-65">Live visibility</p></div>
            <div><p className="text-[22px] font-semibold">One view</p><p className="text-[11px] opacity-65">For every property</p></div>
          </div>
        </section>

        <section className="p-6 sm:p-9 lg:p-12">
          <div className="mb-8 sm:hidden">
            <p className="font-brand text-[21px] font-bold tracking-tight" style={{ color: 'var(--color-ink)' }}>TriponX</p>
            <p className="pms-helper mt-1">Hotel operations, composed.</p>
          </div>
          <Card className="border-0 p-0 shadow-none" elevated={false}>
            <CardTitle title={inviteToken ? 'Accept your invitation' : 'Welcome back'} subtitle={inviteToken ? 'Set a password to activate your account.' : 'Sign in to continue to your property workspace.'} />
            <form onSubmit={submit} className="mt-5 flex flex-col gap-3.5">
              {!inviteToken ? <Field label="Email"><input autoComplete="username" type="email" required value={email} onChange={(event) => setEmail(event.target.value)} className={inputClass()} /></Field> : null}
              <Field label={inviteToken ? 'New password' : 'Password'}><input autoComplete={inviteToken ? 'new-password' : 'current-password'} type="password" minLength={inviteToken ? 12 : undefined} required value={password} onChange={(event) => setPassword(event.target.value)} className={inputClass()} /></Field>
              {inviteToken ? <Field label="Confirm password"><input autoComplete="new-password" type="password" minLength={12} required value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} className={inputClass()} /></Field> : null}
              {error ? <p role="alert" className="rounded-control border p-3 text-[13px]" style={{ borderColor: 'var(--color-danger-border)', background: 'var(--color-danger-bg)', color: 'var(--color-danger-text)' }}>{error}</p> : null}
              <button className="pms-btn-primary mt-2 flex min-h-[46px] items-center justify-center px-4 py-2.5" disabled={pending} type="submit">{pending ? 'Signing in…' : inviteToken ? 'Activate account' : 'Sign in'}</button>
            </form>
          </Card>
          <p className="pms-helper mt-8 text-center text-[11.5px]">Secure access for authorised TriponX property teams.</p>
        </section>
      </div>
      <ThemeSwatcher open={swatcherOpen} onClose={() => setSwatcherOpen(false)} />
    </main>
  );
}
