import { useRef, useState } from 'react';
import * as Lucide from 'lucide-react';
import { propertyLogoApi, type LogoStatus } from '../../../../shared/services/propertyLogoApi';
import { displayError } from '../../../../shared/services/errors';
import { toast } from '../../../../shared/utils/toast';
import { Button } from '../../../../shared/components/ui/primitives';
import { Card, CardTitle } from '../../../../shared/components/ui/display';
import { ConfirmDialog } from '../../../../shared/components/ui/overlays';
import { AuthImage } from './AuthImage';

const MAX_LOGO_BYTES = 2 * 1024 * 1024;
const LOGO_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

/** The property logo. It is saved as soon as it is chosen, apart from the form's Save button. */
export function PropertyLogoCard({
  propertyId,
  initial,
  canEdit,
}: {
  propertyId: string;
  initial: LogoStatus;
  canEdit: boolean;
}) {
  const [logo, setLogo] = useState(initial);
  const [busy, setBusy] = useState(false);
  const [confirmingRemoval, setConfirmingRemoval] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);
  const adminOnly = 'Only administrators can change the logo';

  const upload = async (file: File | undefined) => {
    if (!file) return;
    if (!LOGO_TYPES.includes(file.type) || file.size > MAX_LOGO_BYTES) {
      toast(`Cannot upload ${file.name}`, { detail: 'Use a JPEG, PNG or WebP image of at most 2 MB.', tone: 'warning' });
      return;
    }
    setBusy(true);
    try {
      setLogo(await propertyLogoApi.upload(propertyId, file));
      toast('Logo uploaded', { tone: 'success' });
    } catch (err) {
      toast('Could not upload the logo', { detail: displayError(err), tone: 'danger' });
    } finally {
      setBusy(false);
      if (fileInput.current) fileInput.current.value = '';
    }
  };

  const remove = async () => {
    setBusy(true);
    try {
      await propertyLogoApi.remove(propertyId);
      setLogo({ hasLogo: false, logoUpdatedAt: null });
      toast('Logo deleted', { tone: 'success' });
    } catch (err) {
      toast('Could not delete the logo', { detail: displayError(err), tone: 'danger' });
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card>
      <CardTitle icon={Lucide.Image} title="Logo" subtitle="JPEG, PNG or WebP, up to 2 MB" />
      <input
        ref={fileInput}
        type="file"
        accept={LOGO_TYPES.join(',')}
        className="hidden"
        onChange={(e) => void upload(e.target.files?.[0])}
      />
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
        <div className="flex h-32 w-full items-center justify-center overflow-hidden rounded-xl border border-border bg-muted-surface sm:max-w-[16rem]">
          {logo.hasLogo ? (
            <AuthImage key={logo.logoUpdatedAt} load={() => propertyLogoApi.image(propertyId)} alt="Property logo" fit="contain" />
          ) : (
            <span className="text-label text-ink-muted">No logo yet</span>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-2 sm:flex-col sm:items-start">
          <Button
            variant="secondary"
            onClick={() => fileInput.current?.click()}
            disabled={!canEdit || busy}
            title={canEdit ? undefined : adminOnly}
            icon={busy ? <Lucide.Loader2 size={14} className="animate-spin" /> : <Lucide.Upload size={14} />}
          >
            {logo.hasLogo ? 'Change image' : 'Upload image'}
          </Button>
          {logo.hasLogo ? (
            <Button
              variant="secondary"
              onClick={() => setConfirmingRemoval(true)}
              disabled={!canEdit || busy}
              icon={<Lucide.Trash2 size={14} />}
              className="hover:text-danger-text"
            >
              Delete
            </Button>
          ) : null}
        </div>
      </div>

      <ConfirmDialog
        open={confirmingRemoval}
        onClose={() => setConfirmingRemoval(false)}
        onConfirm={() => remove()}
        title="Delete logo"
        body="Delete the property logo? This cannot be undone."
        confirmLabel="Delete"
        danger
      />
    </Card>
  );
}
