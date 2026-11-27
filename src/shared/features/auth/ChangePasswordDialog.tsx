import { useState } from 'react';
import * as Lucide from 'lucide-react';
import { Field } from '../../components/ui/controls';
import { Modal } from '../../components/ui/overlays';
import { Button, TextField } from '../../components/ui/primitives';
import { displayError } from '../../services/errors';
import { toast } from '../../utils/toast';
import { useAuth } from './AuthContext';
import { MIN_PASSWORD, newPasswordProblem } from '../../utils/passwordRules';

function DialogBody({ onClose }: { onClose: () => void }) {
  const { changePassword } = useAuth();
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [confirm, setConfirm] = useState('');
  const [attempted, setAttempted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const problem = newPasswordProblem(current, next, confirm);

  const save = async () => {
    setAttempted(true);
    if (problem) return;
    setSaving(true);
    setError(null);
    try {
      await changePassword(current, next);
      toast('Password changed', { detail: 'Your other sessions were signed out.', tone: 'success' });
      onClose();
    } catch (cause) {
      setError(displayError(cause));
      setSaving(false);
    }
  };

  return (
    <Modal
      open
      onClose={onClose}
      title="Change password"
      subtitle="Your other signed-in devices are signed out when you save."
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button
            variant="primary"
            onClick={() => void save()}
            disabled={saving}
            icon={saving ? <Lucide.Loader2 size={14} className="animate-spin" /> : <Lucide.Save size={14} />}
          >
            {saving ? 'Saving…' : 'Change password'}
          </Button>
        </>
      }
    >
      <form
        className="flex flex-col gap-3.5 py-2"
        onSubmit={(e) => {
          e.preventDefault();
          void save();
        }}
        noValidate
      >
        <Field label="Current password" required>
          <TextField type="password" autoComplete="current-password" autoFocus value={current} onChange={(e) => setCurrent(e.target.value)} />
        </Field>
        <Field label="New password" required hint={`At least ${MIN_PASSWORD} characters.`}>
          <TextField type="password" autoComplete="new-password" value={next} onChange={(e) => setNext(e.target.value)} />
        </Field>
        <Field label="Confirm new password" required error={attempted && problem ? problem : undefined}>
          <TextField type="password" autoComplete="new-password" value={confirm} onChange={(e) => setConfirm(e.target.value)} />
        </Field>
        {error ? (
          <p role="alert" className="rounded-xl border border-danger-border bg-danger-bg p-3 text-label text-danger-text">
            {error}
          </p>
        ) : null}
        {/* Lets Enter submit the form. */}
        <button type="submit" className="sr-only" tabIndex={-1} aria-hidden="true">
          Change password
        </button>
      </form>
    </Modal>
  );
}

/** Lets a signed-in user replace their own password. Mounted only while open, so the fields start empty each time. */
export function ChangePasswordDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  return open ? <DialogBody onClose={onClose} /> : null;
}
