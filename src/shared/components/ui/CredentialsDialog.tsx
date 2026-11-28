import * as Lucide from 'lucide-react';
import { Modal } from './overlays';
import { Button } from './primitives';
import { toast } from '../../utils/toast';

export interface Credentials {
  name: string;
  email: string;
  password: string;
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-1">
      <span className="pms-label">{label}</span>
      <code className="select-all break-all rounded-lg border border-border bg-muted-surface px-3 py-2 font-mono text-body font-semibold text-ink">{value}</code>
    </div>
  );
}

/**
 * Shows the password just set for someone, once. There is no email service, so the person who created the account hands
 * it over themselves; the user must replace it at their first sign-in.
 */
export function CredentialsDialog({ credentials, onClose }: { credentials: Credentials | null; onClose: () => void }) {
  if (!credentials) return null;

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(`Email: ${credentials.email}\nTemporary password: ${credentials.password}`);
      toast('Copied', { detail: 'Share it only with the person it is for.', tone: 'success' });
    } catch {
      toast('Could not copy', { detail: 'Select the text and copy it by hand.', tone: 'warning' });
    }
  };

  return (
    <Modal
      open
      onClose={onClose}
      title="Share these sign-in details"
      subtitle={`For ${credentials.name}. This password is shown only now.`}
      footer={
        <>
          <Button variant="secondary" onClick={() => void copy()} icon={<Lucide.Copy size={14} />}>
            Copy
          </Button>
          <Button variant="primary" onClick={onClose}>
            Done
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-3.5 py-2">
        <Row label="Email" value={credentials.email} />
        <Row label="Temporary password" value={credentials.password} />
        <p className="pms-helper">They are asked to choose their own password the first time they sign in.</p>
      </div>
    </Modal>
  );
}
