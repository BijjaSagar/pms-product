import { useState } from 'react';
import * as Lucide from 'lucide-react';
import { Modal } from '../../../components/overlays';
import { inputClass } from '../../../utils/styling';
import type { ChannelProvider } from './types';

interface Props {
  open: boolean;
  providers: ChannelProvider[];
  onClose: () => void;
  onConnect: (provider: ChannelProvider, propertyId: string) => void;
}

export function AddChannelDialog({ open, providers, onClose, onConnect }: Props) {
  const [providerId, setProviderId] = useState(providers[0]?.id ?? '');
  const [propertyId, setPropertyId] = useState('');
  const [clientId, setClientId] = useState('');
  const [secret, setSecret] = useState('');
  const [error, setError] = useState('');
  const provider = providers.find((item) => item.id === providerId);

  const submit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!provider) return setError('Choose a channel provider.');
    if (!propertyId.trim() || !clientId.trim() || !secret.trim()) return setError('Enter the property ID, client ID and API secret.');
    onConnect(provider, propertyId.trim());
    setProviderId(providers[0]?.id ?? '');
    setPropertyId('');
    setClientId('');
    setSecret('');
    setError('');
  };

  return (
    <Modal open={open} onClose={onClose} title="Connect a channel" subtitle="Add a channel connection to the local demo workspace." footer={(
      <><button type="button" onClick={onClose} className="pms-btn-ghost px-4 py-2 text-xs">Cancel</button><button type="submit" form="add-channel-form" className="pms-btn-primary px-4 py-2 text-xs"><Lucide.Link2 size={14} /> Connect channel</button></>
    )}>
      <form id="add-channel-form" onSubmit={submit} className="flex flex-col gap-3.5">
        {!providers.length ? (
          <div className="rounded-control border p-4 text-center text-sm text-ink-secondary" style={{ borderColor: 'var(--color-border)' }}>All available demo providers are already connected.</div>
        ) : <>
          <label className="flex flex-col gap-1.5 text-xs font-semibold text-ink-secondary">Channel provider
            <select value={providerId} onChange={(event) => setProviderId(event.target.value)} className={`${inputClass()} text-xs`}>
              {providers.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
            </select>
          </label>
          <label className="flex flex-col gap-1.5 text-xs font-semibold text-ink-secondary">Property ID on channel
            <input value={propertyId} onChange={(event) => setPropertyId(event.target.value)} className={`${inputClass()} text-xs`} placeholder="e.g. PROP-8849102" />
          </label>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="flex flex-col gap-1.5 text-xs font-semibold text-ink-secondary">API client ID
              <input value={clientId} onChange={(event) => setClientId(event.target.value)} className={`${inputClass()} text-xs`} placeholder="client_live_…" autoComplete="off" />
            </label>
            <label className="flex flex-col gap-1.5 text-xs font-semibold text-ink-secondary">API secret
              <input type="password" value={secret} onChange={(event) => setSecret(event.target.value)} className={`${inputClass()} text-xs`} placeholder="Enter secret" autoComplete="new-password" />
            </label>
          </div>
          <div className="flex items-start gap-2 rounded-control border p-3 text-[11px] leading-relaxed text-ink-secondary" style={{ borderColor: 'var(--color-info-border)', background: 'var(--color-info-bg)' }}>
            <Lucide.Info size={14} className="mt-0.5 flex-none text-info-text" />
            Credentials are used only to validate this demo form and are not stored or sent to a service.
          </div>
        </>}
        {error && <p className="text-xs font-medium text-danger-text" role="alert">{error}</p>}
      </form>
    </Modal>
  );
}
