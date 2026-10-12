import { useMemo, useState } from 'react';
import { RESERVATIONS } from '../data/mock';
import { Avatar, Badge, Card, CardTitle } from '../components/ui';
import { reservationTone } from '../components/status';
import { Tabs } from '../components/controls';

export function ArrivalsReport() {
  const [day, setDay] = useState<'Oct 10' | 'Oct 11' | 'Oct 12'>('Oct 10');
  const arrivals = useMemo(() => RESERVATIONS.filter((r) => r.checkIn === day && !['Cancelled', 'No-show'].includes(r.status)), [day]);
  const departures = useMemo(() => RESERVATIONS.filter((r) => r.checkOut === day && !['Cancelled', 'No-show'].includes(r.status)), [day]);
  const vips = arrivals.filter((r) => r.guest === 'Amelia Hart');

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {[['Arrivals', String(arrivals.length)], ['Departures', String(departures.length)], ['Net change', `+${arrivals.length - departures.length}`], ['VIP watch', String(vips.length)]].map(([k, v]) => (
          <section key={k} className="pms-card p-4">
            <p className="pms-label">{k}</p>
            <p className="pms-kpi-value tnum mt-1">{v}</p>
          </section>
        ))}
      </div>
      <Card>
        <CardTitle
          title="Movement"
          subtitle="Demo manifest — day switcher updates locally"
          action={<Tabs label="Day" tabs={[{ id: 'Oct 10', label: 'Oct 10' }, { id: 'Oct 11', label: 'Oct 11' }, { id: 'Oct 12', label: 'Oct 12' }]} active={day} onChange={setDay} />}
        />
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <div>
            <p className="pms-label mb-2">Arrivals ({arrivals.length})</p>
            <ul className="flex flex-col gap-2">
              {arrivals.length === 0 ? <p className="pms-helper">No arrivals.</p> : arrivals.map((r) => (
                <li key={r.id} className="flex items-center gap-3 rounded-[10px] border p-3" style={{ borderColor: 'var(--color-border)' }}>
                  <Avatar name={r.guest} />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[13.5px] font-semibold" style={{ color: 'var(--color-ink)' }}>{r.guest}</span>
                    <span className="tnum block text-[12px]" style={{ color: 'var(--color-ink-secondary)' }}>{r.id} · {r.roomType} · {r.nights}n</span>
                  </span>
                  <Badge tone={reservationTone(r.status)}>{r.status}</Badge>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <p className="pms-label mb-2">Departures ({departures.length})</p>
            <ul className="flex flex-col gap-2">
              {departures.length === 0 ? <p className="pms-helper">No departures.</p> : departures.map((r) => (
                <li key={r.id} className="flex items-center gap-3 rounded-[10px] border p-3" style={{ borderColor: 'var(--color-border)' }}>
                  <Avatar name={r.guest} />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[13.5px] font-semibold" style={{ color: 'var(--color-ink)' }}>{r.guest}</span>
                    <span className="tnum block text-[12px]" style={{ color: 'var(--color-ink-secondary)' }}>{r.id} · {r.room}</span>
                  </span>
                  <Badge tone={reservationTone(r.status)}>{r.status}</Badge>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </Card>
    </div>
  );
}
