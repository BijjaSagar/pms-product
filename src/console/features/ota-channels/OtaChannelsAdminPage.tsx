import { useState } from 'react';
import * as Lucide from 'lucide-react';
import { Badge, Card, CardTitle, TableContainer } from '../../../shared/components/ui/display';
import { Field, Switch } from '../../../shared/components/ui/controls';
import { CardSkeleton } from '../../../shared/components/feedback/Skeleton';
import { ConfirmDialog, Modal } from '../../../shared/components/ui/overlays';
import { Button, IconButton, TextField } from '../../../shared/components/ui/primitives';
import { toast } from '../../../shared/utils/toast';
import { displayError } from '../../../shared/services/errors';
import { otaChannelApi, type OtaChannel } from '../../../shared/services/otaChannelApi';
import { useApiResource } from '../../../shared/services/useApiResource';

function OtaDialog({ ota, nextOrder, onClose, onSaved }: { ota: OtaChannel | null; nextOrder: number; onClose: () => void; onSaved: () => void }) {
  const [name, setName] = useState(ota?.name ?? '');
  const [region, setRegion] = useState(ota?.region ?? '');
  const [sortOrder, setSortOrder] = useState(String(ota?.sortOrder ?? nextOrder));
  const [isActive, setIsActive] = useState(ota?.isActive ?? true);
  const [attempted, setAttempted] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const order = Number(sortOrder);
  const errors = {
    name: name.trim().length < 2 ? 'Enter the OTA name.' : undefined,
    sortOrder: !Number.isInteger(order) || order < 0 ? 'Use a whole number, 0 or more.' : undefined,
  };

  const save = async () => {
    setAttempted(true);
    if (errors.name || errors.sortOrder) return;
    setSaving(true);
    setError(null);
    try {
      const body = { name: name.trim(), region: region.trim(), isActive, sortOrder: order };
      if (ota) await otaChannelApi.update(ota.id, body);
      else await otaChannelApi.create(body);
      toast(ota ? 'OTA updated' : 'OTA added', { detail: `${body.name} ${isActive ? 'is offered to' : 'is hidden from'} every property.`, tone: 'success' });
      onSaved();
    } catch (cause) {
      setError(displayError(cause));
      setSaving(false);
    }
  };

  return (
    <Modal
      open
      onClose={onClose}
      title={ota ? `Edit ${ota.name}` : 'Add an OTA'}
      subtitle="Every property gets all the active OTAs."
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button
            variant="primary"
            onClick={() => void save()}
            disabled={saving}
            icon={saving ? <Lucide.Loader2 size={14} className="animate-spin" /> : <Lucide.Check size={14} />}
          >
            {saving ? 'Saving…' : ota ? 'Save changes' : 'Add OTA'}
          </Button>
        </>
      }
    >
      <div className="grid grid-cols-1 gap-x-4 gap-y-3.5 py-2 sm:grid-cols-2">
        <Field label="OTA name" required error={attempted ? errors.name : undefined} className="sm:col-span-2">
          <TextField autoFocus value={name} maxLength={60} onChange={(e) => setName(e.target.value)} autoComplete="off" placeholder="e.g. Booking.com" />
        </Field>
        <Field label="Region" hint="Shown under the name, e.g. Global or India.">
          <TextField value={region} maxLength={60} onChange={(e) => setRegion(e.target.value)} autoComplete="off" />
        </Field>
        <Field label="Position" error={attempted ? errors.sortOrder : undefined} hint="Lowest shows first.">
          <TextField inputMode="numeric" value={sortOrder} onChange={(e) => setSortOrder(e.target.value)} autoComplete="off" />
        </Field>
        <div className="flex items-center justify-between gap-3 rounded-xl border border-border p-3 sm:col-span-2">
          <span>
            <span className="block text-body font-semibold text-ink">Offered to every property</span>
            <span className="block text-label text-ink-secondary">Off hides it from every property.</span>
          </span>
          <Switch label="Offered to every property" checked={isActive} onChange={setIsActive} />
        </div>
        {error ? (
          <p role="alert" className="rounded-xl border border-danger-border bg-danger-bg p-3 text-label text-danger-text sm:col-span-2">
            {error}
          </p>
        ) : null}
      </div>
    </Modal>
  );
}

type Dialog = { kind: 'none' } | { kind: 'edit'; ota: OtaChannel | null } | { kind: 'delete'; ota: OtaChannel };

/** SUPER_ADMIN only: the OTAs every property gets. */
export function OtaChannelsAdmin() {
  const otas = useApiResource(() => otaChannelApi.listAll(), []);
  const [dialog, setDialog] = useState<Dialog>({ kind: 'none' });
  const [busy, setBusy] = useState<string | null>(null);
  const list = otas.data;

  const close = () => setDialog({ kind: 'none' });
  const saved = () => {
    close();
    otas.refresh();
  };

  const toggle = async (ota: OtaChannel, isActive: boolean) => {
    setBusy(ota.id);
    try {
      await otaChannelApi.update(ota.id, { isActive });
      toast(isActive ? 'OTA switched on' : 'OTA switched off', { detail: `${ota.name} is ${isActive ? 'offered to' : 'hidden from'} every property.`, tone: 'success' });
      otas.refresh();
    } catch (cause) {
      toast('Could not change the OTA', { detail: displayError(cause), tone: 'danger' });
    } finally {
      setBusy(null);
    }
  };

  const remove = async (ota: OtaChannel) => {
    setBusy(ota.id);
    try {
      await otaChannelApi.remove(ota.id);
      toast('OTA deleted', { detail: `${ota.name} was removed from the list.`, tone: 'success' });
      otas.refresh();
    } catch (cause) {
      toast('Could not delete the OTA', { detail: displayError(cause), tone: 'danger' });
    } finally {
      setBusy(null);
    }
  };

  return (
    <Card>
      <CardTitle
        title="OTA channels"
        subtitle="The booking channels every property gets. Switch one off to hide it everywhere."
        icon={Lucide.Share2}
        action={
          <Button variant="primary" onClick={() => setDialog({ kind: 'edit', ota: null })} icon={<Lucide.Plus size={14} />}>
            Add OTA
          </Button>
        }
      />

      {!list && otas.loading ? (
        <CardSkeleton lines={5} label="Loading OTAs" />
      ) : otas.error && !list ? (
        <p role="alert" className="py-6 text-center text-label text-danger-text">
          Could not load the OTAs: {otas.error}
        </p>
      ) : list && list.length === 0 ? (
        <div className="flex flex-col items-center gap-2 py-12 text-center">
          <Lucide.Share2 size={28} className="text-ink-muted" aria-hidden="true" />
          <p className="text-body font-semibold text-ink">No OTAs yet</p>
          <p className="text-label text-ink-secondary">Properties have no channels until at least one active OTA exists.</p>
        </div>
      ) : list ? (
        <div className={`mt-3 ${otas.loading ? 'opacity-60' : ''}`} aria-busy={otas.loading}>
          <TableContainer>
            <table className="pms-table w-full text-left">
              <thead>
                <tr>
                  <th>OTA</th>
                  <th>REGION</th>
                  <th>POSITION</th>
                  <th>OFFERED</th>
                  <th className="text-right">ACTION</th>
                </tr>
              </thead>
              <tbody>
                {list.map((ota) => (
                  <tr key={ota.id}>
                    <td>
                      <span className="flex items-center gap-2 text-label font-semibold text-ink">
                        {ota.name}
                        {!ota.isActive ? (
                          <Badge tone="neutral" size="sm">
                            Off
                          </Badge>
                        ) : null}
                      </span>
                    </td>
                    <td className="text-label text-ink-secondary">{ota.region ?? '—'}</td>
                    <td className="tnum text-label text-ink-secondary">{ota.sortOrder}</td>
                    <td>
                      <Switch label={`${ota.name} offered to every property`} checked={ota.isActive} disabled={busy === ota.id} onChange={(next) => void toggle(ota, next)} />
                    </td>
                    <td className="text-right">
                      <span className="inline-flex items-center justify-end gap-1.5">
                        <IconButton title={`Edit ${ota.name}`} aria-label={`Edit ${ota.name}`} onClick={() => setDialog({ kind: 'edit', ota })}>
                          <Lucide.Pencil size={14} />
                        </IconButton>
                        <IconButton title={`Delete ${ota.name}`} aria-label={`Delete ${ota.name}`} disabled={busy === ota.id} onClick={() => setDialog({ kind: 'delete', ota })}>
                          <Lucide.Trash2 size={14} />
                        </IconButton>
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </TableContainer>
        </div>
      ) : null}

      {dialog.kind === 'edit' ? <OtaDialog ota={dialog.ota} nextOrder={(list?.reduce((m, o) => Math.max(m, o.sortOrder), 0) ?? 0) + 1} onClose={close} onSaved={saved} /> : null}
      {dialog.kind === 'delete' ? (
        <ConfirmDialog
          open
          danger
          onClose={close}
          title={`Delete ${dialog.ota.name}?`}
          body="It is removed for every property for good. Switch it off instead if you only want to hide it."
          confirmLabel="Delete OTA"
          onConfirm={() => remove(dialog.ota)}
        />
      ) : null}
    </Card>
  );
}
