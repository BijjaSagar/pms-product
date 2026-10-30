import { useMemo } from 'react';
import * as Lucide from 'lucide-react';
import { ChannelLogo } from './ChannelLogo';
import type { Channel, ChannelPerformance } from './types';

interface Props {
  channels: Channel[];
  performance: ChannelPerformance[];
  channelFilter: string;
  onChannelFilterChange: (channelId: string) => void;
}

const money = (amount: number) => `₹${amount.toLocaleString('en-IN')}`;

export function RatesPanel({ channels, performance, channelFilter, onChannelFilterChange }: Props) {
  const totals = useMemo(() => performance.reduce((sum, item) => ({
    bookings: sum.bookings + item.bookings,
    roomNights: sum.roomNights + item.roomNights,
    revenue: sum.revenue + item.revenue,
  }), { bookings: 0, roomNights: 0, revenue: 0 }), [performance]);
  const rows = performance.filter((item) => channelFilter === 'all' || item.channelId === channelFilter);

  return (
    <section className="pms-card overflow-hidden" aria-labelledby="channel-performance-title">
      <div className="flex flex-col gap-3 border-b px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-5" style={{ borderColor: 'var(--color-border)' }}>
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-tr from-primary to-dark-accent text-white shadow-xs shadow-primary/20">
            <Lucide.TrendingUp size={18} strokeWidth={2.4} />
          </div>
          <div>
            <h2 id="channel-performance-title" className="text-sm font-bold text-ink tracking-tight">Channel Performance</h2>
            <p className="text-[11px] text-ink-muted mt-0.5">Booking contribution and channel revenue · last 30 days</p>
          </div>
        </div>
        <label className="flex items-center gap-2 text-xs font-medium text-ink-secondary"><span>Channel</span><select value={channelFilter} onChange={(event) => onChannelFilterChange(event.target.value)} className="pms-input min-h-[36px] text-xs"><option value="all">All channels</option>{channels.map((channel) => <option key={channel.id} value={channel.id}>{channel.name}</option>)}</select></label>
      </div>

      <div className="grid grid-cols-3 gap-2 border-b p-3 sm:gap-3 sm:p-4" style={{ borderColor: 'var(--color-divider)' }}>
        <div className="rounded-control p-3" style={{ background: 'var(--color-muted-surface)' }}><p className="text-[10px] font-semibold uppercase tracking-wider text-ink-muted">Bookings</p><p className="mt-1 text-lg font-bold text-ink tnum">{totals.bookings}</p></div>
        <div className="rounded-control p-3" style={{ background: 'var(--color-muted-surface)' }}><p className="text-[10px] font-semibold uppercase tracking-wider text-ink-muted">Room nights</p><p className="mt-1 text-lg font-bold text-ink tnum">{totals.roomNights}</p></div>
        <div className="rounded-control p-3" style={{ background: 'var(--color-muted-surface)' }}><p className="text-[10px] font-semibold uppercase tracking-wider text-ink-muted">Revenue</p><p className="mt-1 truncate text-lg font-bold text-ink tnum">{money(totals.revenue)}</p></div>
      </div>

      <div className="pms-table-scroll overflow-x-auto">
        <table className="pms-table min-w-[620px]">
          <thead><tr><th>Channel</th><th>Bookings</th><th>Room nights</th><th>Booking share</th><th className="text-right">Revenue</th></tr></thead>
          <tbody>
            {rows.map((row) => {
              const channel = channels.find((item) => item.id === row.channelId);
              const share = totals.bookings ? Math.round((row.bookings / totals.bookings) * 100) : 0;
              if (!channel) return null;
              return (
                <tr key={row.channelId}>
                  <td><div className="flex items-center gap-2.5"><ChannelLogo channel={channel} /><span className="font-semibold">{channel.name}</span></div></td>
                  <td className="tnum font-semibold">{row.bookings}</td>
                  <td className="tnum">{row.roomNights}</td>
                  <td className="min-w-[180px]"><div className="flex items-center gap-2"><span className="w-8 flex-none text-[11px] font-semibold tnum">{share}%</span><span className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted-surface"><span className="block h-full rounded-full bg-primary transition-all" style={{ width: `${share}%` }} /></span></div></td>
                  <td className="text-right font-semibold tnum">{money(row.revenue)}</td>
                </tr>
              );
            })}
            {rows.length === 0 && <tr><td colSpan={5} className="py-9 text-center text-xs text-ink-muted">No performance data for this channel.</td></tr>}
          </tbody>
        </table>
      </div>
      <div className="flex items-start gap-2 border-t px-4 py-3 text-[11px] text-ink-muted sm:px-5" style={{ borderColor: 'var(--color-divider)' }}><Lucide.Info size={13} className="mt-0.5 flex-none" /><span>Shares are calculated from the sample 30-day booking totals shown above.</span></div>
    </section>
  );
}
