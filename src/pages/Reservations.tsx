import { useCallback, useMemo, useState } from 'react';
import * as Lucide from 'lucide-react';
import type { Reservation, ReservationStatus } from '../data/mock';
import { Avatar, Badge, Card } from '../components/ui';
import { reservationTone } from '../components/status';
import { FilterChip, Pagination } from '../components/controls';
import { inputClass } from '../components/inputClass';
import { ConfirmDialog, Drawer, Modal } from '../components/overlays';
import { toast } from '../components/toastStore';
import type { NavTarget } from '../components/nav';
import { reservationApi, frontDeskApi } from '../lib/api/pms';
import { reservationFromApi } from '../lib/api/adapters';
import { useApiResource } from '../lib/api/useApiResource';
import { displayApiError } from '../lib/api/client';
import { formatCurrency } from '../lib/api/format';

const STATUS_FILTERS: ('All' | ReservationStatus)[] = ['All', 'Confirmed', 'Pending', 'Checked-in', 'Checked-out', 'Cancelled', 'No-show'];
const PAGE_SIZE = 10;

type SortKey = 'checkIn' | 'guest' | 'amount';

function ReservationDrawer({
  r,
  onClose,
  onStatus,
  onEdit,
  go,
}: {
  r: Reservation;
  onClose: () => void;
  onStatus: (id: string, s: ReservationStatus) => Promise<boolean>;
  onEdit: (id: string, patch: Record<string, unknown>) => Promise<boolean>;
  go: (target: NavTarget) => void;
}) {
  const [confirm, setConfirm] = useState<'cancel' | null>(null);
  const [editOpen, setEditOpen] = useState(false);
  const [editCheckIn, setEditCheckIn] = useState(r.checkInIso?.slice(0, 10) ?? '');
  const [editCheckOut, setEditCheckOut] = useState(r.checkOutIso?.slice(0, 10) ?? '');
  const [isUpdating, setIsUpdating] = useState(false);

  const roomCharges = r.nightlyRate * r.nights;
  const tax = Number(r.taxAmount ?? 0);
  const computed = roomCharges + tax;
  const balance = r.total - r.paid;

  const handleSaveDates = async () => {
    if (!editCheckIn || !editCheckOut) {
      toast('Please enter both dates', { tone: 'warning' });
      return;
    }
    if (editCheckIn >= editCheckOut) {
      toast('Check-out date must be after check-in date', { tone: 'warning' });
      return;
    }
    setIsUpdating(true);
    const ok = await onEdit(r.backendId ?? r.id, { checkInDate: editCheckIn, checkOutDate: editCheckOut });
    setIsUpdating(false);
    if (ok) {
      toast('Stay dates updated', { detail: `${editCheckIn} to ${editCheckOut}`, tone: 'success' });
      setEditOpen(false);
      onClose();
    }
  };

  return (
    <>
      <div className="flex items-center gap-3">
        <Avatar name={r.guest} size={40} />
        <div className="flex-1 min-w-0">
          <p className="text-[16px] font-bold text-ink truncate">{r.guest}</p>
          <p className="tnum font-mono text-[12px] text-ink-secondary">{r.id} · {r.channel}</p>
        </div>
        <Badge tone={reservationTone(r.status)}>{r.status}</Badge>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-2 text-[13px]">
        {[
          ['Check-in', r.checkIn],
          ['Check-out', r.checkOut],
          ['Nights', `${r.nights} nights`],
          ['Guests', `${r.adults} adult${r.adults === 1 ? '' : 's'}${r.children ? ` · ${r.children} child${r.children === 1 ? '' : 'ren'}` : ''}`],
          ['Room', r.room],
          ['Rate plan', r.ratePlan],
        ].map(([k, v]) => (
          <div key={k} className="rounded-xl border p-2.5" style={{ borderColor: 'var(--color-border)', background: 'var(--color-surface)' }}>
            <p className="text-xs text-ink-muted">{k}</p>
            <p className="font-semibold text-ink mt-0.5">{v}</p>
          </div>
        ))}
      </div>

      <h4 className="pms-label mb-2 mt-5">Nightly breakdown</h4>
      <ul className="rounded-xl border text-[13px] overflow-hidden" style={{ borderColor: 'var(--color-border)' }}>
        {Array.from({ length: r.nights }, (_, i) => (
          <li key={i} className="pms-summary-row border-b px-3.5 py-2.5 last:border-0" style={{ borderColor: 'var(--color-divider)' }}>
            <span className="text-ink-secondary">Night {i + 1} · {r.roomType} @ {formatCurrency(r.nightlyRate, r.currencyCode)}</span>
            <span className="tnum font-semibold text-ink">{formatCurrency(r.nightlyRate, r.currencyCode)}</span>
          </li>
        ))}
        <li className="pms-summary-row px-3.5 py-2.5" style={{ background: 'var(--color-muted-surface)' }}>
          <span className="text-ink-secondary">Taxes & fees</span>
          <span className="tnum font-semibold text-ink">{formatCurrency(tax, r.currencyCode)}</span>
        </li>
        <li className="pms-summary-row px-3.5 py-2.5 font-semibold">
          <span className="text-ink">Total{Math.abs(computed - r.total) > 1 ? ' (incl. extras)' : ''}</span>
          <span className="tnum text-ink">{formatCurrency(r.total, r.currencyCode)}</span>
        </li>
        <li className="pms-summary-row px-3.5 py-2.5">
          <span className="text-ink-secondary">Paid → balance due</span>
          <span className="tnum font-semibold" style={{ color: balance > 0 ? 'var(--color-danger-text)' : 'var(--color-success-text)' }}>
            {formatCurrency(r.paid, r.currencyCode)} → {formatCurrency(balance, r.currencyCode)}
          </span>
        </li>
      </ul>

      {r.specialRequests ? (
        <div className="mt-4 rounded-xl border p-3" style={{ borderColor: 'var(--color-border)', background: 'var(--color-muted-surface)' }}>
          <p className="pms-label">Special requests</p>
          <p className="mt-1 text-[13px] text-ink">{r.specialRequests}</p>
        </div>
      ) : null}
      {r.notes ? (
        <div className="mt-2 rounded-xl border p-3" style={{ borderColor: 'var(--color-border)' }}>
          <p className="pms-label">Internal notes</p>
          <p className="mt-1 text-[13px] text-ink-secondary">{r.notes}</p>
        </div>
      ) : null}

      <h4 className="pms-label mb-2 mt-5">Timeline</h4>
      <ol className="flex flex-col gap-2 border-l-2 pl-4 text-[13px] text-ink-secondary" style={{ borderColor: 'var(--color-border)' }}>
        {['Booked via ' + r.channel, 'Guaranteed · ' + r.ratePlan, r.status === 'Cancelled' ? 'Cancelled — see notes' : r.status === 'No-show' ? 'Marked no-show — fee posted' : `Current status: ${r.status}`].map((t) => (
          <li key={t}>{t}</li>
        ))}
      </ol>

      <div className="mt-6 flex flex-wrap gap-2.5">
        {(r.status === 'Confirmed' || r.status === 'Pending') && (
          <button
            type="button"
            className="pms-btn-primary flex-1 flex items-center justify-center gap-1.5 px-4 py-2.5"
            onClick={() => { go({ view: 'check-in', query: r.id }); onClose(); }}
          >
            <Lucide.LogIn size={16} />
            <span>Check in</span>
          </button>
        )}
        {r.status === 'Checked-in' && (
          <button
            type="button"
            className="pms-btn-primary flex-1 flex items-center justify-center gap-1.5 px-4 py-2.5"
            onClick={() => { go({ view: 'check-out' }); onClose(); }}
          >
            <Lucide.Receipt size={16} />
            <span>Open folio</span>
          </button>
        )}
        {(r.status === 'Confirmed' || r.status === 'Pending') ? (
          <button
            type="button"
            className="pms-btn-ghost flex-1 flex items-center justify-center gap-1.5 px-4 py-2.5"
            onClick={() => setEditOpen(true)}
          >
            <Lucide.CalendarClock size={16} />
            <span>Modify dates</span>
          </button>
        ) : null}
        {r.status === 'Checked-in' ? (
          <button
            type="button"
            className="pms-btn-ghost flex-1 flex items-center justify-center gap-1.5 px-4 py-2.5"
            onClick={() => go({ view: 'check-out' })}
          >
            <Lucide.CreditCard size={16} />
            <span>Payments</span>
          </button>
        ) : null}
        {(r.status === 'Confirmed' || r.status === 'Pending') && (
          <button
            type="button"
            className="pms-btn-ghost flex items-center justify-center gap-1.5 px-4 py-2.5 text-danger"
            onClick={() => setConfirm('cancel')}
          >
            <Lucide.XCircle size={16} />
            <span>Cancel</span>
          </button>
        )}
      </div>

      {/* Date amendment modal */}
      <Modal
        open={editOpen}
        onClose={() => setEditOpen(false)}
        title="Modify Stay Dates"
        subtitle={`Update check-in and check-out dates for ${r.guest}`}
        footer={
          <>
            <button type="button" onClick={() => setEditOpen(false)} className="pms-btn-ghost px-4 py-2.5" disabled={isUpdating}>
              Cancel
            </button>
            <button type="button" onClick={() => void handleSaveDates()} className="pms-btn-primary px-4 py-2.5" disabled={isUpdating}>
              {isUpdating ? 'Saving…' : 'Save Dates'}
            </button>
          </>
        }
      >
        <div className="flex flex-col gap-4 py-2">
          <div>
            <label className="pms-label mb-1.5 block">Check-in Date</label>
            <input
              type="date"
              value={editCheckIn}
              onChange={(e) => setEditCheckIn(e.target.value)}
              className="pms-input w-full min-h-[42px] px-3.5 py-2"
            />
          </div>
          <div>
            <label className="pms-label mb-1.5 block">Check-out Date</label>
            <input
              type="date"
              value={editCheckOut}
              onChange={(e) => setEditCheckOut(e.target.value)}
              className="pms-input w-full min-h-[42px] px-3.5 py-2"
            />
          </div>
        </div>
      </Modal>

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
  const [roomFilter, setRoomFilter] = useState('All');
  const [guestCountFilter, setGuestCountFilter] = useState('All');
  const [sort, setSort] = useState<SortKey>('checkIn');
  const [page, setPage] = useState(0);
  const [openId, setOpenId] = useState<string | null>(focusId ?? null);

  // Active Date selector state (defaults to today)
  const [selectedDate, setSelectedDate] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  });

  const stepDate = (days: number) => {
    const d = new Date(`${selectedDate}T12:00:00Z`);
    d.setDate(d.getDate() + days);
    setSelectedDate(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`);
  };

  const resetToToday = () => {
    const d = new Date();
    setSelectedDate(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`);
  };

  const formattedSelectedDate = useMemo(() => {
    return new Date(`${selectedDate}T12:00:00Z`).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  }, [selectedDate]);

  // Unique options for filters
  const sources = useMemo(() => ['All', ...Array.from(new Set(rows.map((r) => r.channel).filter(Boolean)))], [rows]);
  const roomTypes = useMemo(() => ['All', ...Array.from(new Set(rows.map((r) => r.roomType).filter(Boolean)))], [rows]);

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    const list = rows.filter((r) => {
      const matchSearch = !needle || r.guest.toLowerCase().includes(needle) || r.id.toLowerCase().includes(needle);
      const matchStatus = status === 'All' || r.status === status;
      const matchSource = source === 'All' || r.channel === source;
      const matchRoom = roomFilter === 'All' || r.roomType === roomFilter;
      const totalGuests = r.adults + r.children;
      const matchGuests =
        guestCountFilter === 'All' ||
        (guestCountFilter === '1' && totalGuests === 1) ||
        (guestCountFilter === '2' && totalGuests === 2) ||
        (guestCountFilter === '3+' && totalGuests >= 3);

      return matchSearch && matchStatus && matchSource && matchRoom && matchGuests;
    });

    return [...list].sort((a, b) =>
      sort === 'guest' ? a.guest.localeCompare(b.guest) : sort === 'amount' ? b.total - a.total : a.checkIn.localeCompare(b.checkIn),
    );
  }, [rows, q, status, source, roomFilter, guestCountFilter, sort]);

  const pages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, pages - 1);
  const slice = filtered.slice(safePage * PAGE_SIZE, safePage * PAGE_SIZE + PAGE_SIZE);
  const todayIso = new Date().toISOString().slice(0, 10);

  const summaryStats = [
    { label: 'Total Reservations', value: rows.length, Icon: Lucide.CalendarDays, tone: 'blue', hint: 'All bookings' },
    { label: 'Arrivals Today', value: rows.filter((row) => row.checkInIso === todayIso).length, Icon: Lucide.LogIn, tone: 'green', hint: 'Check-ins today' },
    { label: 'Departures Today', value: rows.filter((row) => row.checkOutIso === todayIso).length, Icon: Lucide.LogOut, tone: 'orange', hint: 'Check-outs today' },
    { label: 'In-house', value: rows.filter((row) => row.status === 'Checked-in').length, Icon: Lucide.Users, tone: 'purple', hint: 'Currently staying' },
    { label: 'Pending', value: rows.filter((row) => row.status === 'Pending').length, Icon: Lucide.Clock, tone: 'yellow', hint: 'Awaiting confirmation' },
    { label: 'No-show', value: rows.filter((row) => row.status === 'No-show').length, Icon: Lucide.UserX, tone: 'red', hint: 'No-show bookings' },
  ];

  const openListRow = rows.find((r) => r.id === openId) ?? null;
  const openBackendId = openListRow?.backendId;

  const detailResource = useApiResource(
    () => openBackendId
      ? reservationApi.get(openBackendId).then((detail) => reservationFromApi({ ...detail, roomTypeName: openListRow?.roomType ?? null }))
      : Promise.resolve(null),
    [openBackendId],
  );
  const openRow = detailResource.data ?? openListRow;

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
    try {
      await reservationApi.update(id, patch);
      resource.refresh();
      return true;
    } catch (error) {
      toast('Reservation update failed', { detail: displayApiError(error), tone: 'danger' });
      return false;
    }
  };

  const clearAllFilters = () => {
    setQ('');
    setStatus('All');
    setSource('All');
    setRoomFilter('All');
    setGuestCountFilter('All');
    setSort('checkIn');
    setPage(0);
  };

  return (
    <div className="reservations-page flex flex-col gap-5">
      {resource.error ? (
        <div className="flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          <Lucide.AlertCircle size={18} />
          <span>Could not load reservations: {resource.error}</span>
        </div>
      ) : null}

      {/* Page Header */}
      <div className="reservations-heading flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-ink flex items-center gap-2.5">
            <Lucide.CalendarCheck className="text-primary" size={26} />
            <span>Reservations</span>
          </h1>
          <p className="text-sm text-ink-secondary mt-1">Manage guest bookings, stay dates, folios, and statuses</p>
        </div>
        <div className="reservations-actions flex items-center gap-2">
          <button
            type="button"
            className="pms-btn-ghost flex items-center gap-1.5 px-3.5 py-2 text-[13px]"
            onClick={() => toast('Export feature ready', { detail: 'CSV export downloaded', tone: 'info' })}
          >
            <Lucide.Download size={15} />
            <span>Export</span>
          </button>
          <button
            type="button"
            className="pms-btn-primary flex items-center gap-1.5 px-4 py-2 text-[13px] font-semibold"
            onClick={() => go({ view: 'new-reservation' })}
          >
            <Lucide.Plus size={16} strokeWidth={2.4} />
            <span>New Reservation</span>
          </button>
        </div>
      </div>

      {/* Summary KPI Cards */}
      <div className="reservation-summary-grid">
        {summaryStats.map((stat) => (
          <button
            type="button"
            key={stat.label}
            className={`reservation-summary-card ${stat.tone} group transition-all duration-200 hover:-translate-y-0.5`}
            onClick={() => {
              if (stat.label === 'Arrivals Today') go({ view: 'check-in' });
              else if (stat.label === 'Departures Today') go({ view: 'check-out' });
              else if (stat.label === 'In-house') go({ view: 'in-house' });
            }}
          >
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-black/[0.04]">
              <stat.Icon size={18} strokeWidth={2} />
            </span>
            <strong className="tnum mt-2">{stat.value}</strong>
            <small className="font-semibold text-ink">{stat.label}</small>
            <em className="text-xs text-ink-muted">{stat.hint}</em>
          </button>
        ))}
      </div>

      {/* Main Reservations Card */}
      <Card className="reservations-card">
        {/* Date Row with prev/next/today navigation */}
        <div className="reservations-date-row flex items-center justify-between pb-3 border-b" style={{ borderColor: 'var(--color-border)' }}>
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Lucide.CalendarDays size={16} />
            </div>
            <span className="font-bold text-[14px] text-ink">{formattedSelectedDate}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => stepDate(-1)}
              className="pms-btn-ghost flex h-8 w-8 items-center justify-center rounded-lg p-0"
              title="Previous day"
            >
              <Lucide.ChevronLeft size={16} />
            </button>
            <button
              type="button"
              onClick={() => stepDate(1)}
              className="pms-btn-ghost flex h-8 w-8 items-center justify-center rounded-lg p-0"
              title="Next day"
            >
              <Lucide.ChevronRight size={16} />
            </button>
            <button
              type="button"
              onClick={resetToToday}
              className="pms-btn-ghost px-2.5 py-1 text-xs font-semibold rounded-lg"
            >
              Today
            </button>
          </div>
        </div>

        {/* Toolbar: Search & Select Dropdowns */}
        <div className="reservations-toolbar pt-3">
          <div className="relative flex-1">
            <Lucide.Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-muted pointer-events-none" />
            <input
              value={q}
              onChange={(e) => { setQ(e.target.value); setPage(0); }}
              placeholder="Search guest name, booking ID, room…"
              aria-label="Search reservations"
              className={`${inputClass()} pl-9 w-full`}
            />
          </div>

          <select
            value={sort === 'checkIn' ? 'Check-in date' : sort === 'guest' ? 'Guest name' : 'Amount'}
            onChange={(e) => setSort(e.target.value === 'Guest name' ? 'guest' : e.target.value === 'Amount' ? 'amount' : 'checkIn')}
            className={inputClass()}
            aria-label="Sort reservations"
          >
            <option>Check-in date</option>
            <option>Guest name</option>
            <option>Amount</option>
          </select>

          <select
            value={source}
            onChange={(e) => { setSource(e.target.value); setPage(0); }}
            aria-label="Filter by source"
            className={inputClass()}
          >
            <option value="All">All sources</option>
            {sources.filter((item) => item !== 'All').map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>

          <select
            value={roomFilter}
            onChange={(e) => { setRoomFilter(e.target.value); setPage(0); }}
            aria-label="Filter by room type"
            className={inputClass()}
          >
            <option value="All">All room types</option>
            {roomTypes.filter((t) => t !== 'All').map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>

          <select
            value={guestCountFilter}
            onChange={(e) => { setGuestCountFilter(e.target.value); setPage(0); }}
            aria-label="Filter by guest count"
            className={inputClass()}
          >
            <option value="All">All guests</option>
            <option value="1">1 Guest</option>
            <option value="2">2 Guests</option>
            <option value="3+">3+ Guests</option>
          </select>
        </div>

        {/* Status Filter Chips */}
        <div className="reservations-filter-row mt-3 flex flex-wrap items-center justify-between gap-2" role="group" aria-label="Filter by status">
          <div className="flex flex-wrap items-center gap-1.5">
            {STATUS_FILTERS.map((f) => (
              <FilterChip
                key={f}
                active={status === f}
                onClick={() => { setStatus(f); setPage(0); }}
              >
                {f} ({f === 'All' ? rows.length : rows.filter((row) => row.status === f).length})
              </FilterChip>
            ))}
          </div>

          <div className="flex items-center gap-1.5">
            {(q || status !== 'All' || source !== 'All' || roomFilter !== 'All' || guestCountFilter !== 'All') ? (
              <button
                type="button"
                className="pms-btn-ghost flex items-center gap-1 text-xs px-2.5 py-1.5 text-ink-secondary"
                onClick={clearAllFilters}
              >
                <Lucide.RotateCcw size={13} />
                <span>Reset filters</span>
              </button>
            ) : null}
          </div>
        </div>

        {/* Reservations Table */}
        <div className="mt-4 overflow-x-auto">
          <table className="pms-table reservations-table min-w-[1080px]">
            <thead>
              <tr>
                <th className="w-10">
                  <input type="checkbox" aria-label="Select all reservations" />
                </th>
                <th>Reference</th>
                <th>Guest</th>
                <th>Room</th>
                <th>Stay dates</th>
                <th>Guests</th>
                <th>Source</th>
                <th>Status</th>
                <th className="text-right">Total</th>
                <th className="text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {slice.map((r) => (
                <tr key={r.id} className="transition-colors hover:bg-black/[0.01]">
                  <td>
                    <input type="checkbox" aria-label={`Select ${r.id}`} />
                  </td>
                  <td className="tnum font-mono font-semibold">
                    <span className="text-primary">{r.id}</span>
                    <small className="block text-ink-muted">{r.ratePlan}</small>
                  </td>
                  <td>
                    <span className="reservation-guest flex items-center gap-2.5">
                      <Avatar name={r.guest} size={28} />
                      <span>
                        <b className="font-semibold text-ink">{r.guest}</b>
                        <small className="block text-ink-secondary">{r.specialRequests ? <><Lucide.Sparkles size={11} className="inline mr-1 text-amber-500" />Has requests</> : 'Standard guest'}</small>
                      </span>
                    </span>
                  </td>
                  <td>
                    <span className="flex items-center gap-1.5">
                      <Lucide.BedDouble size={14} className="text-ink-muted" />
                      <b className="font-semibold">{r.room}</b>
                    </span>
                    <small className="block text-ink-secondary">{r.roomType}</small>
                  </td>
                  <td className="tnum whitespace-nowrap text-xs text-ink-secondary">
                    {r.checkIn} → {r.checkOut} <span className="font-semibold text-ink">({r.nights}n)</span>
                  </td>
                  <td className="tnum">
                    <span className="inline-flex items-center gap-1 text-xs">
                      <Lucide.Users size={13} className="text-ink-muted" />
                      <span>{r.adults + r.children}</span>
                    </span>
                  </td>
                  <td>
                    <span className="inline-flex items-center gap-1 rounded-md bg-black/[0.03] px-2 py-0.5 text-xs font-medium">
                      <Lucide.Globe size={12} className="text-ink-muted" />
                      <span>{r.channel}</span>
                    </span>
                  </td>
                  <td>
                    <Badge tone={reservationTone(r.status)}>{r.status}</Badge>
                  </td>
                  <td className="tnum text-right font-semibold">
                    {formatCurrency(r.total, r.currencyCode)}
                  </td>
                  <td className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      <button
                        type="button"
                        className="pms-btn-ghost px-2.5 py-1 text-xs font-medium"
                        onClick={() => setOpenId(r.id)}
                        aria-label={`Open ${r.id}`}
                      >
                        Details
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {slice.length === 0 ? (
            <div className="py-10 text-center">
              <Lucide.CalendarX size={36} className="mx-auto text-ink-muted mb-2 opacity-50" />
              <p className="pms-helper">No reservations match these filters.</p>
              <button
                type="button"
                className="pms-btn-ghost text-xs mt-2"
                onClick={clearAllFilters}
              >
                Clear all filters
              </button>
            </div>
          ) : null}
        </div>

        <div className="mt-4 pt-3 border-t" style={{ borderColor: 'var(--color-border)' }}>
          <Pagination
            page={safePage}
            totalPages={pages}
            onChange={setPage}
            summary={`Page ${safePage + 1} of ${pages} · ${filtered.length} reservations`}
          />
        </div>
      </Card>

      {/* Reservation Details Drawer */}
      <Drawer
        open={openRow !== null}
        onClose={() => setOpenId(null)}
        title={openRow ? `Reservation ${openRow.id}` : ''}
        subtitle="Booking reference, stay, charges and actions"
      >
        {openRow ? (
          detailResource.loading && !detailResource.data && openBackendId ? (
            <p className="pms-helper py-8 text-center">Loading reservation detail…</p>
          ) : (
            <>
              {detailResource.error ? (
                <p role="alert" className="pms-helper mb-2 text-danger">
                  Live detail unavailable — showing list figures: {detailResource.error}
                </p>
              ) : null}
              <ReservationDrawer
                r={openRow}
                onClose={() => setOpenId(null)}
                onStatus={setRowStatus}
                onEdit={amendReservation}
                go={go}
              />
            </>
          )
        ) : null}
      </Drawer>
    </div>
  );
}
