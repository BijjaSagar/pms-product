import { Button, SelectField } from '../../../components/primitives';
import * as Lucide from 'lucide-react';
import { formatStayDates } from './data';
import { ChannelLogo } from './ChannelLogo';
import type { Channel, ChannelBooking } from './types';

interface Props {
  channels: Channel[];
  bookings: ChannelBooking[];
  channelFilter: string;
  onChannelFilterChange: (channelId: string) => void;
  onViewAll: () => void;
}

const CAMPAIGNS = [
  { name: 'Advance Purchase', detail: '15% off · Book 14+ days ahead', channelCount: 5, status: 'Active' },
  { name: 'Member Rate', detail: '10% loyalty discount · All room types', channelCount: 6, status: 'Active' },
  { name: 'Weekend Escape', detail: 'Breakfast included · Fri–Sun stays', channelCount: 3, status: 'Scheduled' },
];

export function PromotionsPanel({ channels, bookings, channelFilter, onChannelFilterChange, onViewAll }: Props) {
  const visibleBookings = bookings.filter((booking) => channelFilter === 'all' || booking.channelId === channelFilter);
  return (
    <div className="grid gap-4 xl:grid-cols-[minmax(0,1.25fr)_minmax(300px,0.75fr)]">
      <section className="pms-card overflow-hidden" aria-labelledby="recent-channel-bookings-title">
        <div className="flex flex-col gap-3 border-b px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-5" style={{ borderColor: 'var(--color-border)' }}>
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-tr from-primary to-dark-accent text-white shadow-xs shadow-primary/20">
              <Lucide.CalendarCheck size={18} strokeWidth={2.4} />
            </div>
            <div>
              <h2 id="recent-channel-bookings-title" className="text-body font-bold text-ink tracking-tight">Recent Channel Bookings</h2>
              <p className="text-label text-ink-muted mt-0.5">Latest reservations received from connected OTAs</p>
            </div>
          </div>
          <div className="flex gap-2"><label><span className="sr-only">Filter bookings by channel</span><SelectField value={channelFilter} onChange={(event) => onChannelFilterChange(event.target.value)} ><option value="all">All channels</option>{channels.map((channel) => <option key={channel.id} value={channel.id}>{channel.name}</option>)}</SelectField></label><Button variant="secondary" type="button" onClick={onViewAll} >View all</Button></div>
        </div>
        <div className="pms-table-scroll overflow-x-auto">
          <table className="pms-table min-w-[620px]">
            <thead><tr><th>Channel</th><th>Booking</th><th>Guest</th><th>Room</th><th>Stay dates</th><th>Status</th></tr></thead>
            <tbody>
              {visibleBookings.map((booking) => {
                const channel = channels.find((item) => item.id === booking.channelId);
                return <tr key={booking.id}><td><div className="flex items-center gap-2"><ChannelLogo channel={channel ?? { name: booking.channelId, logoBg: 'var(--color-primary)', logoText: '•' }} /><span className="font-medium">{channel?.name ?? booking.channelId}</span></div></td><td className="font-mono text-label">{booking.id}</td><td className="font-semibold">{booking.guestName}</td><td>{booking.roomType}</td><td className="whitespace-nowrap">{formatStayDates(booking.checkIn, booking.checkOut)}</td><td><span className={`rounded-full px-2 py-1 text-micro font-semibold ${booking.status === 'Confirmed' ? 'bg-success-bg text-success-text' : booking.status === 'Pending' ? 'bg-warning-bg text-warning-text' : 'bg-muted-surface text-ink-secondary'}`}>{booking.status}</span></td></tr>;
              })}
              {visibleBookings.length === 0 && <tr><td colSpan={6} className="py-9 text-center text-label text-ink-muted">No bookings for this channel.</td></tr>}
            </tbody>
          </table>
        </div>
      </section>

      <section className="pms-card overflow-hidden" aria-labelledby="channel-promotions-title">
        <div className="flex items-center gap-2.5 border-b px-4 py-4 sm:px-5" style={{ borderColor: 'var(--color-border)' }}>
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-tr from-warning-text to-warning-border text-white shadow-xs shadow-warning-text/20">
            <Lucide.Sparkles size={18} strokeWidth={2.4} />
          </div>
          <div>
            <h2 id="channel-promotions-title" className="text-body font-bold text-ink tracking-tight">Promotions</h2>
            <p className="text-label text-ink-muted mt-0.5">Rate offers currently configured for distribution</p>
          </div>
        </div>
        <div className="divide-y" style={{ borderColor: 'var(--color-divider)' }}>
          {CAMPAIGNS.map((campaign) => <article key={campaign.name} className="flex items-start justify-between gap-3 px-4 py-4 sm:px-5"><div className="flex min-w-0 gap-3"><span className="flex h-9 w-9 flex-none items-center justify-center rounded-control bg-primary/10 text-primary"><Lucide.Sparkles size={16} /></span><div className="min-w-0"><h3 className="truncate text-label font-semibold text-ink">{campaign.name}</h3><p className="mt-1 text-label text-ink-muted">{campaign.detail}</p><p className="mt-1.5 text-micro text-ink-secondary">{campaign.channelCount} channel{campaign.channelCount === 1 ? '' : 's'}</p></div></div><span className={`flex-none rounded-full px-2 py-1 text-micro font-semibold ${campaign.status === 'Active' ? 'bg-success-bg text-success-text' : 'bg-info-bg text-info-text'}`}>{campaign.status}</span></article>)}
        </div>
        <div className="border-t px-4 py-3 text-label text-ink-muted sm:px-5" style={{ borderColor: 'var(--color-divider)' }}>Promotion setup is sample data in this demo.</div>
      </section>
    </div>
  );
}
