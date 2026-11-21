import { useState, type KeyboardEvent } from 'react';
import * as Lucide from 'lucide-react';
import { LABEL } from '../../components/brand/brandStyles';
import { SIGN_IN_FIELD } from './authStyles';

/** A password input with a show/hide eye and a Caps Lock warning, used by Sign in and Register. */
export function PasswordField({
  id,
  value,
  onChange,
  autoComplete,
  placeholder,
  label = 'Password',
}: {
  id: string;
  value: string;
  onChange: (value: string) => void;
  autoComplete: 'current-password' | 'new-password';
  placeholder: string;
  label?: string;
}) {
  const [show, setShow] = useState(false);
  const [capsLock, setCapsLock] = useState(false);
  const trackCapsLock = (e: KeyboardEvent<HTMLInputElement>) => setCapsLock(e.getModifierState('CapsLock'));

  return (
    <label className="flex flex-col gap-2" htmlFor={id}>
      <span className={LABEL}>{label}</span>
      <span className="relative">
        <input
          id={id}
          type={show ? 'text' : 'password'}
          autoComplete={autoComplete}
          required
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={trackCapsLock}
          onKeyUp={trackCapsLock}
          onBlur={() => setCapsLock(false)}
          placeholder={placeholder}
          className={`${SIGN_IN_FIELD} pr-10 ${value ? 'tracking-[0.12em]' : ''}`}
        />
        <button
          type="button"
          onClick={() => setShow((v) => !v)}
          aria-label={show ? 'Hide password' : 'Show password'}
          aria-pressed={show}
          className="absolute right-2 top-1/2 flex h-6 w-6 -translate-y-1/2 cursor-pointer items-center justify-center rounded-md text-ink-muted transition-colors hover:text-ink"
        >
          {show ? <Lucide.EyeOff size={15} /> : <Lucide.Eye size={15} />}
        </button>
      </span>
      {capsLock && (
        <span className="flex items-center gap-1.5 text-[12px] font-medium text-warning-text" role="status">
          <Lucide.ArrowBigUp size={14} aria-hidden="true" /> Caps Lock is on
        </span>
      )}
    </label>
  );
}
