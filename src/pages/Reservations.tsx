import { useCallback, useMemo, useState } from 'react';
import type { Reservation, ReservationStatus } from '../data/mock';
import { Avatar, Badge, Card, CardTitle } from '../components/ui';
import { reservationTone } from '../components/status';
import { FilterChip, Pagination, Tabs } from '../components/controls';
import { inputClass } from '../components/inputClass';
import { ConfirmDialog, Drawer } from '../components/overlays';
import { toast } from '../components/toastStore';
import type { NavTarget } from '../components/nav';
import { reservationApi, frontDeskApi } from '../lib/api/pms';
import { reservationFromApi } from '../lib/api/adapters';
import { useApiResource } from '../lib/api/useApiResource';
import { displayApiError } from '../lib/api/client';
import { formatCurrency } from '../lib/api/format';

const STATUS_FILTERS: ('All' | ReservationStatus)[] = ['All', 'Confirmed', 'Pending', 'Checked-in', 'Checked-out', 'Cancelled', 'No-show'];
const PAGE_SIZE = 6;
const DAYS = Array.from({ length: 7 }, (_, index) => {
  const date = new Date();
  date.setDate(date.getDate() + index);
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
});

type SortKey = 'checkIn' | 'guest' | 'amount';

function ReservationDrawer({ r, onClose, onStatus, onEdit, go }: { r: Reservation; onClose: () => void; onStatus: (id: string, s: ReservationStatus) => Promise<boolean>; onEdit: (id: string, patch: Record<string, unknown>) => Promise<boolean>; go: (target: NavTarget) => void }) {
  const [confirm, setConfirm] = useState<'cancel' | null>(null);
  const roomCharges = r.nightlyRate * r.nights;
  const tax = Number(r.taxAmount ?? 0);
  const computed = roomCharges + tax;
  const balance = r.total - r.paid;
  return (
    <>
      <div className="flex items-center gap-3">
        <Avatar name={r.guest} />
        <div className="flex-1">
          <p className="text-[15px] font-semibold" style={{ color: 'var(--color-ink)' }}>{r.guest}</p>
          <p className="tnum font-mono text-[12px]" style={{ color: 'var(--color-ink-secondary)' }}>{r.id} · {r.channel}</p>
        </div>
        <Badge tone={reservationTone(r.status)}>{r.status}</Badge>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-2 text-[13px]">
        {[
          ['Check-in', r.checkIn],
          ['Check-out', r.checkOut],
          ['Nights', `${r.nights}n`],
          ['Guests', `${r.adults} adult${r.adults === 1 ? '' : 's'}${r.children ? ` · ${r.children} child${r.children === 1 ? '' : 'ren'}` : ''}`],
          ['Room', r.room],
          ['Rate plan', r.ratePlan],
        ].map(([k, v]) => (
          <div key={k} className="rounded-[10px] border p-2.5" style={{ borderColor: 'var(--color-border)' }}>
            <p className="pms-helper">{k}</p>
            <p className="font-semibold" style={{ color: 'var(--color-ink)' }}>{v}</p>
          </div>
        ))}
      </div>

      <h4 className="pms-label mb-2 mt-5">Nightly breakdown</h4>
      <ul className="rounded-[10px] border text-[13px]" style={{ borderColor: 'var(--color-border)' }}>
        {Array.from({ length: r.nights }, (_, i) => (
          <li key={i} className="pms-summary-row border-b px-3.5 py-2 last:border-0" style={{ borderColor: 'var(--color-divider)' }}>
            <span style={{ color: 'var(--color-ink-secondary)' }}>Night {i + 1} · {r.roomType} @ {formatCurrency(r.nightlyRate, r.currencyCode)}</span>
            <span className="tnum font-semibold" style={{ color: 'var(--color-ink)' }}>{formatCurrency(r.nightlyRate, r.currencyCode)}</span>
          </li>
        ))}
        <li className="pms-summary-row px-3.5 py-2" style={{ background: 'var(--color-muted-surface)' }}>
          <span style={{ color: 'var(--color-ink-secondary)' }}>Taxes recorded on reservation</span>
          <span className="tnum font-semibold" style={{ color: 'var(--color-ink)' }}>{formatCurrency(tax, r.currencyCode)}</span>
        </li>
        <li className="pms-summary-row px-3.5 py-2 font-semibold">
          <span style={{ color: 'var(--color-ink)' }}>Total{Math.abs(computed - r.total) > 1 ? ' (incl. extras)' : ''}</span>
          <span className="tnum" style={{ color: 'var(--color-ink)' }}>{formatCurrency(r.total, r.currencyCode)}</span>
        </li>
        <li className="pms-summary-row px-3.5 py-2">
          <span style={{ color: 'var(--color-ink-secondary)' }}>Paid → balance due</span>
          <span className="tnum font-semibold" style={{ color: balance > 0 ? 'var(--color-danger-text)' : 'var(--color-success-text)' }}>
            {formatCurrency(r.paid, r.currencyCode)} → {formatCurrency(balance, r.currencyCode)}
          </span>
        </li>
      </ul>

      {r.specialRequests ? (
        <div className="mt-4 rounded-[10px] border p-3" style={{ borderColor: 'var(--color-border)', background: 'var(--color-muted-surface)' }}>
          <p className="pms-label">Special requests</p>
          <p className="mt-1 text-[13px]" style={{ color: 'var(--color-ink)' }}>{r.specialRequests}</p>
        </div>
      ) : null}
      {r.notes ? (
        <div className="mt-2 rounded-[10px] border p-3" style={{ borderColor: 'var(--color-border)' }}>
          <p className="pms-label">Internal notes</p>
          <p className="mt-1 text-[13px]" style={{ color: 'var(--color-ink-secondary)' }}>{r.notes}</p>
        </div>
      ) : null}

      <h4 className="pms-label mb-2 mt-5">Timeline</h4>
      <ol className="flex flex-col gap-2 border-l-2 pl-4" style={{ borderColor: 'var(--color-border)' }}>
        {['Booked via ' + r.channel, 'Guaranteed · ' + r.ratePlan, r.status === 'Cancelled' ? 'Cancelled — see notes' : r.status === 'No-show' ? 'Marked no-show — fee posted' : `Current status: ${r.status}`].map((t) => (
          <li key={t} className="text-[13px]" style={{ color: 'var(--color-ink-secondary)' }}>{t}</li>
        ))}
      </ol>

      <div className="mt-5 flex flex-wrap gap-2">
        {(r.status === 'Confirmed' || r.status === 'Pending') && (
          <button type="button" className="pms-btn-primary flex-1 px-3 py-2.5" onClick={() => { go({ view: 'check-in', query: r.id }); onClose(); }}>
            Check in
          </button>
        )}
        {r.status === 'Checked-in' && (
          <button type="button" className="pms-btn-primary flex-1 px-3 py-2.5" onClick={() => { go({ view: 'check-out' }); onClose(); }}>
            Open folio
          </button>
        )}
        {(r.status === 'Confirmed' || r.status === 'Pending') ? <button type="button" className="pms-btn-ghost flex-1 px-3 py-2.5" onClick={() => {
          const checkInDate = window.prompt('New check-in date (YYYY-MM-DD):', r.checkInIso);
          if (!checkInDate) return;
          const checkOutDate = window.prompt('New check-out date (YYYY-MM-DD):', r.checkOutIso);
          if (!checkOutDate) return;
          void onEdit(r.backendId ?? r.id, { checkInDate, checkOutDate }).then((ok) => { if (ok) { toast('Reservation updated', { detail: r.id, tone: 'success' }); onClose(); } });
        }}>
          Edit
        </button> : null}
        {r.status === 'Checked-in' ? <button type="button" className="pms-btn-ghost flex-1 px-3 py-2.5" onClick={() => go({ view: 'check-out' })}>Payments & checkout</button> : null}
        {(r.status === 'Confirmed' || r.status === 'Pending') && (
          <button type="button" className="pms-btn-ghost flex-1 px-3 py-2.5" style={{ color: 'var(--color-danger-text)' }} onClick={() => setConfirm('cancel')}>
            Cancel
          </button>
        )}
      </div>
      <ConfirmDialog
        open={confirm === 'cancel'}
        onClose={() => setConfirm(null)}
        onConfirm={() => { void onStatus(r.id, 'Cancelled').then((ok) => { if (ok) { toast('Reservation cancelled', { detail: r.id, tone: 'warning' }); onClose(); } }); }}
        title="Cancel reservation?"
        body={`${r.id} · ${r.guest} will be marked Cancelled.`}
        confirmLabel="Yes, cancel"
        danger
      />
    </>
  );
}

export function Reservations({ initialQuery = '', focusId, go }: { initialQuery?: string; focusId?: string; go: (t: NavTarget) => void }) {
  const loadRows = useCallback(async () => {
    const result = await reservationApi.list('', undefined, 1, 100);
    return result.data.map(reservationFromApi);
  }, []);
  const resource = useApiResource(loadRows);
  const rows = useMemo(() => resource.data ?? [], [resource.data]);
  const [q, setQ] = useState(initialQuery);
  const [status, setStatus] = useState<(typeof STATUS_FILTERS)[number]>('All');
  const [source, setSource] = useState('All');
  const [sort, setSort] = useState<SortKey>('checkIn');
  const [page, setPage] = useState(0);
  const [view, setView] = useState<'table' | 'calendar'>('table');
  const [openId, setOpenId] = useState<string | null>(focusId ?? null);

  const sources = useMemo(() => ['All', ...Array.from(new Set(rows.map((r) => r.channel)))], [rows]);
  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    const list = rows.filter(
      (r) =>
        (status === 'All' || r.status === status) &&
        (source === 'All' || r.channel === source) &&
        (!needle || r.guest.toLowerCase().includes(needle) || r.id.toLowerCase().includes(needle)),
    );
    return [...list].sort((a, b) =>
      sort === 'guest' ? a.guest.localeCompare(b.guest) : sort === 'amount' ? b.total - a.total : a.checkIn.localeCompare(b.checkIn),
    );
  }, [rows, q, status, source, sort]);

  const pages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, pages - 1);
  const slice = filtered.slice(safePage * PAGE_SIZE, safePage * PAGE_SIZE + PAGE_SIZE);
  const openRow = rows.find((r) => r.id === openId) ?? null;

  const setRowStatus = async (id: string, s: ReservationStatus): Promise<boolean> => {
    const row = rows.find((item) => item.id === id);
    if (!row?.backendId) return false;
    try {
      if (s === 'Checked-in') await frontDeskApi.checkIn(row.backendId);
      else if (s === 'Cancelled') await reservationApi.cancel(row.backendId, 'Cancelled from reservation screen');
      resource.refresh();
      return true;
    } catch (error) {
      toast('Reservation action failed', { detail: displayApiError(error), tone: 'danger' });
      return false;
    }
  };

  const amendReservation = async (id: string, patch: Record<string, unknown>): Promise<boolean> => {
    try { await reservationApi.update(id, patch); resource.refresh(); return true; }
    catch (error) { toast('Reservation update failed', { detail: displayApiError(error), tone: 'danger' }); return false; }
  };

  return (
    <div className="flex flex-col gap-4">
      {resource.error ? <p role="alert" className="pms-helper">Could not load reservations: {resource.error}</p> : null}
      <Card>
        <CardTitle
          title="Booking calendar"
          subtitle="Arrivals across the week"
          action={<button type="button" onClick={() => go({ view: 'new-reservation' })} className="pms-btn-primary px-3.5 py-2.5">+ New reservation</button>}
        />
        <div className="overflow-x-auto pb-1">
          <div className="grid min-w-[560px] grid-cols-7 gap-1.5" role="list" aria-label="Arrival days">
          {DAYS.map((d) => {
            const count = rows.filter((r) => r.checkIn === d).length;
            const active = d === DAYS[0];
            return (
              <div key={d} role="listitem" className="rounded-[10px] border px-1 py-2.5 text-center" style={{ borderColor: active ? 'var(--color-primary)' : 'var(--color-border)', background: active ? 'var(--color-hover-surface)' : 'var(--color-surface)' }}>
                <p className="text-[11.5px] font-semibold" style={{ color: 'var(--color-ink)' }}>{d}</p>
                <p className="tnum mt-0.5 text-[12px]" style={{ color: 'var(--color-ink-secondary)' }}>{count} arr.</p>
              </div>
            );
          })}
          </div>
        </div>
      </Card>

      <Card>
        <CardTitle
          title="Reservation list"
          subtitle={resource.loading ? 'Loading reservations…' : `${filtered.length} of ${rows.length} reservations`}
          action={
            <Tabs
              label="Layout"
              tabs={[{ id: 'table', label: 'Table' }, { id: 'calendar', label: 'Calendar' }]}
              active={view}
              onChange={setView}
            />
          }
        />
        <div className="mb-3 grid grid-cols-1 gap-2 md:grid-cols-4">
          <input value={q} onChange={(e) => { setQ(e.target.value); setPage(0); }} placeholder="Search guest or booking ID…" aria-label="Search reservations" className={inputClass()} />
          <select value={source} onChange={(e) => { setSource(e.target.value); setPage(0); }} aria-label="Filter by source" className={inputClass()}>
            {sources.map((s) => <option key={s}>{s}</option>)}
          </select>
          <select value={sort} onChange={(e) => setSort(e.target.value as SortKey)} aria-label="Sort reservations" className={inputClass()}>
            <option value="checkIn">Sort: check-in date</option>
            <option value="guest">Sort: guest name</option>
            <option value="amount">Sort: amount</option>
          </select>
          <button type="button" className="pms-btn-ghost px-3 py-2.5" onClick={() => { setQ(''); setStatus('All'); setSource('All'); setSort('checkIn'); setPage(0); }}>
            Clear filters
          </button>
        </div>
        <div className="mb-3 flex flex-wrap gap-1.5" role="group" aria-label="Filter by status">
          {STATUS_FILTERS.map((f) => (
            <FilterChip key={f} active={status === f} onClick={() => { setStatus(f); setPage(0); }}>{f}</FilterChip>
          ))}
        </div>

        {view === 'table' ? (
          <>
            <div className="overflow-x-auto">
              <table className="pms-table min-w-[840px]">
                <thead><tr><th>Reference</th><th>Guest</th><th>Room</th><th>Dates</th><th>Guests</th><th>Source</th><th>Status</th><th className="text-right">Total</th><th><span className="sr-only">Actions</span></th></tr></thead>
                <tbody>
                  {slice.map((r) => (
                    <tr key={r.id}>
                      <td className="tnum font-mono font-semibold">{r.id}</td>
                      <td className="font-medium">{r.guest}</td>
                      <td style={{ color: 'var(--color-ink-secondary)' }}>{r.room}</td>
                      <td className="tnum whitespace-nowrap" style={{ color: 'var(--color-ink-secondary)' }}>{r.checkIn} → {r.checkOut} · {r.nights}n</td>
                      <td className="tnum" style={{ color: 'var(--color-ink-secondary)' }}>{r.adults + r.children}</td>
                      <td style={{ color: 'var(--color-ink-secondary)' }}>{r.channel}</td>
                      <td><Badge tone={reservationTone(r.status)}>{r.status}</Badge></td>
                      <td className="tnum text-right font-semibold">{formatCurrency(r.total, r.currencyCode)}</td>
                      <td><button type="button" className="pms-btn-ghost px-3 py-1.5" onClick={() => setOpenId(r.id)} aria-label={`Open ${r.id}`}>Open</button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {slice.length === 0 ? <p className="pms-helper py-6 text-center">No reservations match these filters.</p> : null}
            </div>
            <div className="mt-3">
              <Pagination page={safePage} totalPages={pages} onChange={setPage} summary={`Page ${safePage + 1} of ${pages} · ${filtered.length} reservations`} />
            </div>
          </>
        ) : (
          <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
            {DAYS.map((d) => (
              <div key={d} className="rounded-[10px] border p-3" style={{ borderColor: 'var(--color-border)' }}>
                <p className="mb-2 text-[12px] font-semibold uppercase tracking-[0.08em]" style={{ color: 'var(--color-ink-secondary)' }}>{d}</p>
                {rows.filter((r) => r.checkIn === d || r.checkOut === d).map((r) => (
                  <button key={r.id} type="button" onClick={() => setOpenId(r.id)} className="mb-1.5 flex w-full items-center justify-between gap-2 rounded-[8px] border px-2.5 py-2 text-left" style={{ borderColor: 'var(--color-divider)', background: 'var(--color-muted-surface)' }}>
                    <span className="min-w-0">
                      <span className="block truncate text-[13px] font-semibold" style={{ color: 'var(--color-ink)' }}>{r.guest}</span>
                      <span className="tnum block text-[11.5px]" style={{ color: 'var(--color-ink-secondary)' }}>{r.id} · {r.checkIn === d ? 'arrives' : 'departs'} · {r.roomType}</span>
                    </span>
                    <Badge tone={reservationTone(r.status)}>{r.status}</Badge>
                  </button>
                ))}
                {rows.filter((r) => r.checkIn === d || r.checkOut === d).length === 0 ? <p className="pms-helper">No movement.</p> : null}
              </div>
            ))}
          </div>
        )}
      </Card>

      <Drawer open={openRow !== null} onClose={() => setOpenId(null)} title={openRow ? `Reservation ${openRow.id}` : ''} subtitle="Booking reference, stay, charges and actions">
        {openRow ? <ReservationDrawer r={openRow} onClose={() => setOpenId(null)} onStatus={setRowStatus} onEdit={amendReservation} go={go} /> : null}
      </Drawer>
    </div>
  );
}
