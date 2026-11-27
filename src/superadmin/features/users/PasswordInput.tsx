import * as Lucide from 'lucide-react';
import { IconButton, TextField } from '../../../shared/components/ui/primitives';
import { generatePassword } from './password';

/** A visible password field with a button that fills in a generated one, for passwords an admin sets for someone. */
export function PasswordInput({ value, onChange, autoFocus = false }: { value: string; onChange: (value: string) => void; autoFocus?: boolean }) {
  return (
    <div className="flex items-center gap-2">
      <TextField value={value} onChange={(e) => onChange(e.target.value)} autoComplete="off" autoFocus={autoFocus} className="font-mono" />
      <IconButton title="Generate a password" aria-label="Generate a password" onClick={() => onChange(generatePassword())}>
        <Lucide.Shuffle size={14} />
      </IconButton>
    </div>
  );
}
