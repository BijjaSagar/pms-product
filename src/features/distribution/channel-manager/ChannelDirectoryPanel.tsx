import { useMemo, useState } from 'react';
import * as Lucide from 'lucide-react';
import { ChannelLogo } from './ChannelLogo';
import type { Channel } from './types';

interface Props {
  channels: Channel[];
  selectedChannelId: string;
  syncingChannelIds: string[];
  globalSyncing: boolean;
  onSelect: (channelId: string) => void;
  onSync: (channel: Channel) => void;
  onReconnect: (channel: Channel) => void;
}

const STATUS_LABEL: Record<Channel['status'], string> = {
  connected: 'Connected',
  error: 'Needs attention',
  paused: 'Paused',
};

export function ChannelDirectoryPanel({ channels, selectedChannelId, syncingChannelIds, globalSyncing, onSelect, onSync, onReconnect }: Props) {
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | Channel['status']>('all');
  const filtered = useMemo(() => channels.filter((channel) => {
    const matchesQuery = `${channel.name} ${channel.code}`.toLowerCase().includes(query.trim().toLowerCase());
    return matchesQuery && (statusFilter === 'all' || channel.status === statusFilter);
  }), [channels, query, statusFilter]);

  return (
    <section className="pms-card min-w-0 overflow-hidden" aria-labelledby="channel-directory-title">
      <div className="flex flex-col gap-3 border-b p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5" style={{ borderColor: 'var(--color-border)' }}>
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-tr from-indigo-500 to-violet-600 text-white shadow-xs shadow-indigo-500/20">
            <Lucide.Network size={17} strokeWidth={2.4} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 id="channel-directory-title" className="text-sm font-bold text-slate-900 tracking-tight">Channel Connections</h2>
              <span className="flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-0.5 text-[10px] font-bold text-emerald-700 border border-emerald-200/60">
                <span className="relative flex h-1.5 w-1.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500"></span>
                </span>
                Live Feed
              </span>
            </div>
            <p className="text-[11px] text-slate-400 mt-0.5">Monitor health and run a channel sync.</p>
          </div>
        </div>
        <div className="flex gap-2">
          <label className="relative min-w-0 flex-1 sm:w-40 sm:flex-none">
            <span className="sr-only">Search channels</span>
            <Lucide.Search size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-muted" />
            <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search channels" className="pms-input min-h-[36px] w-full pl-8 pr-2 text-xs" />
          </label>
          <label>
            <span className="sr-only">Filter channels by status</span>
            <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value as typeof statusFilter)} className="pms-input min-h-[36px] max-w-[130px] px-2 text-xs">
              <option value="all">All statuses</option><option value="connected">Connected</option><option value="error">Needs attention</option><option value="paused">Paused</option>
            </select>
          </label>
        </div>
      </div>

      <div className="pms-table-scroll overflow-x-auto">
        <table className="pms-table min-w-[720px]">
          <thead><tr><th>Channel</th><th>Connection</th><th>Active rooms</th><th>Bookings MTD</th><th>Sync success</th><th>Last sync</th><th className="text-right">Action</th></tr></thead>
          <tbody>
            {filtered.map((channel) => {
              const selected = channel.id === selectedChannelId;
              const syncing = globalSyncing || syncingChannelIds.includes(channel.id);
              const statusStyle = channel.status === 'connected'
                ? { color: 'var(--color-success-text)', background: 'var(--color-success-bg)', borderColor: 'var(--color-success-border)' }
                : channel.status === 'error'
                  ? { color: 'var(--color-danger-text)', background: 'var(--color-danger-bg)', borderColor: 'var(--color-danger-border)' }
                  : { color: 'var(--color-ink-secondary)', background: 'var(--color-muted-surface)', borderColor: 'var(--color-border)' };
              return (
                <tr key={channel.id} className={selected ? 'bg-primary/[0.04]' : undefined}>
                  <td>
                    <button type="button" onClick={() => onSelect(channel.id)} className="flex items-center gap-2.5 text-left" aria-pressed={selected}>
                      <ChannelLogo channel={channel} />
                      <span className="min-w-0"><span className="block truncate font-semibold text-ink">{channel.name}</span><span className="mt-0.5 block text-[10px] uppercase tracking-wider text-ink-muted">{channel.code}</span></span>
                    </button>
                  </td>
                  <td><span className="inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-semibold" style={statusStyle}><span className={`h-1.5 w-1.5 rounded-full ${channel.status === 'connected' ? 'bg-emerald-500' : channel.status === 'error' ? 'bg-rose-500' : 'bg-slate-400'}`} />{STATUS_LABEL[channel.status]}</span></td>
                  <td className="tnum font-medium">{channel.activeRooms}</td>
                  <td className="tnum font-medium">{channel.bookingsMtd}</td>
                  <td>
                    <div className="flex items-center gap-2"><span className="tnum w-9 font-semibold">{channel.syncSuccess}%</span><span className="h-1.5 w-16 overflow-hidden rounded-full bg-muted-surface"><span className="block h-full rounded-full bg-primary" style={{ width: `${channel.syncSuccess}%` }} /></span></div>
                  </td>
                  <td className={`whitespace-nowrap text-xs ${channel.status === 'error' ? 'font-semibold text-danger-text' : 'text-ink-secondary'}`}>{channel.lastSync}</td>
                  <td>
                    <div className="flex justify-end">
                      {channel.status === 'error' ? (
                        <button type="button" onClick={() => onReconnect(channel)} className="pms-btn-primary min-h-[32px] px-2.5 py-1 text-[11px]">Reconnect</button>
                      ) : (
                        <button type="button" onClick={() => onSync(channel)} disabled={channel.status === 'paused' || syncing} className="pms-btn-ghost min-h-[32px] px-2.5 py-1 text-[11px] disabled:opacity-50"><Lucide.RefreshCw size={12} className={syncing ? 'animate-spin' : ''} />{syncing ? 'Syncing' : 'Sync'}</button>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
            {filtered.length === 0 && <tr><td colSpan={7} className="py-9 text-center text-sm text-ink-muted">No channels match these filters.</td></tr>}
          </tbody>
        </table>
      </div>
      <div className="flex justify-between border-t px-4 py-3 text-[11px] text-ink-muted sm:px-5" style={{ borderColor: 'var(--color-divider)' }}>
        <span>{filtered.length} of {channels.length} channels</span><span>Select a row to view details</span>
      </div>
    </section>
  );
}
