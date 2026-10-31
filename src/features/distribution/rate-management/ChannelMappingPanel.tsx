import { Button } from '../../../components/primitives';
import * as Lucide from 'lucide-react';
import type { DistributionChannel, RatePlan } from './types';

interface Props {
  channels: DistributionChannel[];
  connectedChannelIds: string[];
  plans: RatePlan[];
  onToggle: (channelId: string) => void;
  onSync: (channel: DistributionChannel) => void;
}

export function ChannelMappingPanel({ channels, connectedChannelIds, plans, onToggle, onSync }: Props) {
  return (
    <section className="pms-card overflow-hidden" aria-labelledby="channel-mapping-title">
      <div className="flex flex-col gap-3 border-b px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-5" style={{ borderColor: 'var(--color-border)' }}>
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-tr from-primary to-dark-accent text-primary-foreground shadow-xs shadow-primary/20">
            <Lucide.Globe size={18} strokeWidth={2.4} />
          </div>
          <div>
            <h2 id="channel-mapping-title" className="text-body font-bold text-ink tracking-tight">Channel Mapping</h2>
            <p className="text-label text-ink-muted mt-0.5">Control distribution and review which rate plans are available on each channel</p>
          </div>
        </div>
        <span className="inline-flex items-center gap-2 rounded-full bg-success-bg px-3 py-1.5 text-label font-semibold text-success-text">
          <span className="h-1.5 w-1.5 rounded-full bg-success-text" />{connectedChannelIds.length} of {channels.length} channels connected
        </span>
      </div>

      <div className="divide-y" style={{ borderColor: 'var(--color-divider)' }}>
        {channels.map((channel) => {
          const connected = connectedChannelIds.includes(channel.id);
          const mappedCount = plans.filter((plan) => plan.channels.includes(channel.id)).length;
          return (
            <article key={channel.id} className="flex flex-col gap-3 px-4 py-4 sm:flex-row sm:items-center sm:gap-5 sm:px-5">
              <div className="flex min-w-0 flex-1 items-center gap-3">
                {/* palette-allow: Booking.com yellow brand contrast check */}
                <span className="flex h-10 w-10 flex-none items-center justify-center rounded-control text-body font-extrabold shadow-xs" style={{ color: channel.color === '#FFCC00' ? 'var(--color-ink)' : 'var(--color-primary-foreground)', background: channel.color }} aria-hidden="true">{channel.abbreviation}</span>
                <div className="min-w-0">
                  <h3 className="truncate text-body font-semibold text-ink">{channel.name}</h3>
                  <p className="mt-0.5 truncate text-label text-ink-muted">{channel.description}</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3 text-label sm:min-w-[230px]">
                <div><p className="text-micro font-semibold uppercase tracking-wider text-ink-muted">Mapped plans</p><p className="mt-1 font-semibold text-ink">{connected ? `${mappedCount} rate plans` : 'Not synced'}</p></div>
                <div><p className="text-micro font-semibold uppercase tracking-wider text-ink-muted">Last sync</p><p className="mt-1 font-semibold text-ink">{connected ? channel.lastSync : '—'}</p></div>
              </div>
              <div className="flex items-center justify-between gap-3 sm:min-w-[200px] sm:justify-end">
                <label className="inline-flex cursor-pointer items-center gap-2 text-label font-semibold text-ink-secondary">
                  <input type="checkbox" role="switch" checked={connected} onChange={() => onToggle(channel.id)} aria-label={`${connected ? 'Disconnect' : 'Connect'} ${channel.name}`} className="h-4 w-4 accent-primary" />
                  {connected ? 'Connected' : 'Paused'}
                </label>
                <Button variant="secondary" type="button" onClick={() => onSync(channel)} disabled={!connected} className="disabled:opacity-50">
                  <Lucide.RefreshCw size={13} /> Sync
                </Button>
              </div>
            </article>
          );
        })}
      </div>
      <div className="flex items-start gap-2 border-t px-4 py-3 text-label text-ink-muted sm:px-5" style={{ borderColor: 'var(--color-divider)' }}>
        <Lucide.Info size={14} className="mt-0.5 flex-none text-info-text" />
        <p>Channel connections and sync times are sample data in this demo. Turning a channel off removes it from rate-plan distribution.</p>
      </div>
    </section>
  );
}
