import { useState } from 'react';
import * as Lucide from 'lucide-react';
import { Badge, Card, CardTitle, TableContainer } from '../../../shared/components/ui/display';
import { Field, FilterChip, Pagination } from '../../../shared/components/ui/controls';
import { CardSkeleton } from '../../../shared/components/feedback/Skeleton';
import { ConfirmDialog, Modal } from '../../../shared/components/ui/overlays';
import { Button, IconButton, TextField } from '../../../shared/components/ui/primitives';
import { toast } from '../../../shared/utils/toast';
import { displayError } from '../../../shared/services/errors';
import { activationKeyApi, type ActivationKey } from '../../../shared/services/activationKeyApi';
import { useApiResource } from '../../../shared/services/useApiResource';

const PAGE_SIZE = 10;
const MAX_COUNT = 50;

type StatusFilter = 'all' | ActivationKey['status'];
const FILTERS: { id: StatusFilter; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'unused', label: 'Unused' },
  { id: 'used', label: 'Used' },
  { id: 'revoked', label: 'Revoked' },
];
const STATUS_TONE = { unused: 'success', used: 'neutral', revoked: 'danger' } as const;
const STATUS_LABEL = { unused: 'Unused', used: 'Used', revoked: 'Revoked' } as const;

const formatDate = (iso: string) => new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });

async function copyText(text: string, what: string) {
  try {
    await navigator.clipboard.writeText(text);
    toast('Copied', { detail: what, tone: 'success' });
  } catch {
    toast('Could not copy', { detail: 'Select the key and copy it by hand.', tone: 'warning' });
  }
}

function GenerateDialog({ onClose, onCreated }: { onClose: () => void; onCreated: (keys: ActivationKey[]) => void }) {
  const [count, setCount] = useState('1');
  const [note, setNote] = useState('');
  const [attempted, setAttempted] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const n = Number(count);
  const countError = !Number.isInteger(n) || n < 1 || n > MAX_COUNT ? `Use a whole number from 1 to ${MAX_COUNT}.` : undefined;

  const generate = async () => {
    setAttempted(true);
    if (countError) return;
    setSaving(true);
    setError(null);
    try {
      const keys = await activationKeyApi.create({ count: n, ...(note.trim() ? { note: note.trim() } : {}) });
      onCreated(keys);
    } catch (cause) {
      setError(displayError(cause));
      setSaving(false);
    }
  };

  return (
    <Modal
      open
      onClose={onClose}
      title="Generate activation keys"
      subtitle="Each key works once and activates one new property."
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button
            variant="primary"
            onClick={() => void generate()}
            disabled={saving}
            icon={saving ? <Lucide.Loader2 size={14} className="animate-spin" /> : <Lucide.KeyRound size={14} />}
          >
            {saving ? 'Generating…' : 'Generate'}
          </Button>
        </>
      }
    >
      <div className="grid grid-cols-1 gap-x-4 gap-y-3.5 py-2 sm:grid-cols-2">
        <Field label="How many" required error={attempted ? countError : undefined}>
          <TextField autoFocus inputMode="numeric" value={count} onChange={(e) => setCount(e.target.value)} autoComplete="off" />
        </Field>
        <Field label="Note" hint="Who the keys are for. Shown in the list.">
          <TextField value={note} maxLength={200} onChange={(e) => setNote(e.target.value)} autoComplete="off" placeholder="e.g. Grand Plaza" />
        </Field>
        {error ? (
          <p role="alert" className="rounded-xl border border-danger-border bg-danger-bg p-3 text-label text-danger-text sm:col-span-2">
            {error}
          </p>
        ) : null}
      </div>
    </Modal>
  );
}

/** SUPER_ADMIN only: issue single-use keys that activate a new customer's property, and see which were used. */
export function ActivationKeysAdmin() {
  const [status, setStatus] = useState<StatusFilter>('all');
  const [page, setPage] = useState(0);
  const [generating, setGenerating] = useState(false);
  const [revoking, setRevoking] = useState<ActivationKey | null>(null);

  const keys = useApiResource(
    () => activationKeyApi.list({ status: status === 'all' ? undefined : status, page: page + 1, pageSize: PAGE_SIZE }),
    [status, page],
  );
  const result = keys.data;
  const totalPages = Math.max(1, Math.ceil((result?.total ?? 0) / PAGE_SIZE));

  const revoke = async (key: ActivationKey) => {
    try {
      await activationKeyApi.revoke(key.id);
      toast('Key revoked', { detail: `${key.code} can no longer be used.`, tone: 'success' });
      keys.refresh();
    } catch (cause) {
      toast('Could not revoke the key', { detail: displayError(cause), tone: 'danger' });
    }
  };

  return (
    <Card>
      <CardTitle
        title="Activation keys"
        subtitle="A new customer enters a key at the end of setup, and that activates their property."
        icon={Lucide.KeyRound}
        action={
          <Button variant="primary" onClick={() => setGenerating(true)} icon={<Lucide.Plus size={14} />}>
            Generate keys
          </Button>
        }
      />

      <div className="mt-3 flex flex-wrap gap-2" role="group" aria-label="Filter by status">
        {FILTERS.map((chip) => (
          <FilterChip
            key={chip.id}
            active={status === chip.id}
            onClick={() => {
              setStatus(chip.id);
              setPage(0);
            }}
          >
            {chip.label}
          </FilterChip>
        ))}
      </div>

      {!result && keys.loading ? (
        <CardSkeleton lines={5} label="Loading keys" />
      ) : keys.error && !result ? (
        <p role="alert" className="py-6 text-center text-label text-danger-text">
          Could not load the keys: {keys.error}
        </p>
      ) : result && result.data.length === 0 ? (
        <div className="flex flex-col items-center gap-2 py-12 text-center">
          <Lucide.KeyRound size={28} className="text-ink-muted" aria-hidden="true" />
          <p className="text-body font-semibold text-ink">{status === 'all' ? 'No keys yet' : `No ${status} keys`}</p>
          <p className="text-label text-ink-secondary">{status === 'all' ? 'Generate a key to hand to a new customer.' : 'Try another filter.'}</p>
        </div>
      ) : result ? (
        <div className={`mt-3 ${keys.loading ? 'opacity-60' : ''}`} aria-busy={keys.loading}>
          <TableContainer>
            <table className="pms-table w-full text-left">
              <thead>
                <tr>
                  <th>KEY</th>
                  <th>STATUS</th>
                  <th>NOTE</th>
                  <th>CREATED</th>
                  <th>USED BY</th>
                  <th className="text-right">ACTION</th>
                </tr>
              </thead>
              <tbody>
                {result.data.map((key) => (
                  <tr key={key.id}>
                    <td>
                      <span className="flex items-center gap-2">
                        <code className="tnum text-label font-semibold tracking-[0.06em] text-ink">{key.code}</code>
                        <IconButton title={`Copy ${key.code}`} aria-label={`Copy ${key.code}`} onClick={() => void copyText(key.code, 'The key is on your clipboard.')}>
                          <Lucide.Copy size={14} />
                        </IconButton>
                      </span>
                    </td>
                    <td>
                      <Badge tone={STATUS_TONE[key.status]} size="sm" dot>
                        {STATUS_LABEL[key.status]}
                      </Badge>
                    </td>
                    <td className="text-label text-ink-secondary">{key.note ?? '—'}</td>
                    <td className="tnum text-label text-ink-secondary">{formatDate(key.createdAt)}</td>
                    <td className="text-label text-ink-secondary">
                      {key.usedByProperty ? (
                        <span className="text-ink">
                          {key.usedByProperty.name} <span className="text-ink-muted">({key.usedByProperty.code})</span>
                        </span>
                      ) : key.usedAt ? (
                        'Property removed'
                      ) : (
                        '—'
                      )}
                    </td>
                    <td className="text-right">
                      {key.status === 'unused' ? (
                        <Button variant="secondary" onClick={() => setRevoking(key)} icon={<Lucide.Ban size={13} />}>
                          Revoke
                        </Button>
                      ) : null}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </TableContainer>
          <div className="mt-4">
            <Pagination
              page={Math.min(page, totalPages - 1)}
              totalPages={totalPages}
              onChange={setPage}
              summary={`Showing ${page * PAGE_SIZE + 1} to ${Math.min((page + 1) * PAGE_SIZE, result.total)} of ${result.total} keys`}
            />
          </div>
        </div>
      ) : null}

      {generating ? (
        <GenerateDialog
          onClose={() => setGenerating(false)}
          onCreated={(created) => {
            setGenerating(false);
            setStatus('all');
            setPage(0);
            keys.refresh();
            toast(created.length === 1 ? 'Key generated' : `${created.length} keys generated`, { detail: 'Copy them from the list.', tone: 'success' });
          }}
        />
      ) : null}
      {revoking ? (
        <ConfirmDialog
          open
          danger
          onClose={() => setRevoking(null)}
          title="Revoke this key?"
          body={`${revoking.code} will stop working. Anyone who has it will be told it is not valid.`}
          confirmLabel="Revoke key"
          onConfirm={() => revoke(revoking)}
        />
      ) : null}
    </Card>
  );
}
