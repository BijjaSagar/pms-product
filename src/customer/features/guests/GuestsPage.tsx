import { useCallback, useEffect, useState } from 'react';
import { PanelLoadState, TableSkeletonRows } from '../../../shared/components/feedback/Skeleton';
import * as Lucide from 'lucide-react';
import type { BadgeTone } from '../../../shared/utils/status';
import { Avatar, Badge, Card, CardTitle, TableContainer, TableActionBtn } from '../../../shared/components/ui/display';
import { Pagination, Tabs } from '../../../shared/components/ui/controls';
import { inputClass } from '../../../shared/utils/styling';
import { toast } from '../../../shared/utils/toast';
import type { NavTarget } from '../../../shared/config/navigation';
import { guestDirectoryApi, type GuestDirectoryRow } from '../../../shared/services/guestApi';
import { propertyApi } from '../../../shared/services/propertyApi';
import { useApiResource } from '../../../shared/services/useApiResource';
import { displayError } from '../../../shared/services/errors';
import { formatCurrency } from '../../../shared/utils/currency';
import { Button } from '../../../shared/components/ui/primitives';
import { useAuth } from '../../../shared/features/auth/AuthContext';

const PAGE_SIZE = 6;
type Sort = 'name' | 'stays' | 'spent' | 'recent';

function tierTone(tier: string): BadgeTone {
  if (tier === 'VIP') return 'warning';
  if (tier === 'Gold') return 'info';
  if (tier === 'Regular') return 'success';
  return 'neutral';
}

function statusTone(status: string): BadgeTone {
  if (status === 'CONFIRMED') return 'success';
  if (status === 'CHECKED_IN') return 'info';
  if (status === 'CANCELLED' || status === 'NO_SHOW') return 'danger';
  return 'neutral';
}

const statusLabel = (status: string) => status.charAt(0) + status.slice(1).toLowerCase().replace('_', ' ');

/** "2026-10-14" -> "14 Oct 2026"; a guest who never stayed has no date. */
const formatDay = (iso: string | null) =>
  iso ? new Date(`${iso}T00:00:00`).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '—';

/** The reservations of one guest, loaded when the Stays tab opens. */
function StaysList({ propertyId, guestId, currency }: { propertyId: string; guestId: string; currency: string }) {
  const load = useCallback(() => guestDirectoryApi.stays(propertyId, guestId), [propertyId, guestId]);
  const resource = useApiResource(load, [propertyId, guestId]);
  if (resource.error) return <p role="alert" className="py-2 text-label text-danger-text">Could not load stays: {resource.error}</p>;
  if (!resource.data) return <PanelLoadState label="Loading stays" lines={3} />;
  if (resource.data.length === 0) return <p className="py-2 text-label text-ink-secondary">No reservations for this guest yet.</p>;
  return (
    <ul className="flex flex-col gap-2">
      {resource.data.map((stay) => (
        <li key={stay.id} className="flex flex-wrap items-center justify-between gap-2 rounded-control border border-border p-3">
          <div className="min-w-0">
            <p className="flex flex-wrap items-center gap-2">
              <span className="font-mono text-label font-semibold text-ink">{stay.bookingCode}</span>
              <Badge tone={statusTone(stay.status)} size="sm">{statusLabel(stay.status)}</Badge>
            </p>
            <p className="text-label text-ink-secondary">
              {formatDay(stay.checkInDate)} – {formatDay(stay.checkOutDate)} · {stay.nights} {stay.nights === 1 ? 'night' : 'nights'}
              {stay.rooms ? ` · ${stay.rooms}` : ''}
            </p>
          </div>
          <div className="text-right">
            <p className="tnum text-body font-bold text-ink">{formatCurrency(Number(stay.totalAmount), stay.currencyCode || currency)}</p>
            <p className="tnum text-label text-ink-secondary">Paid {formatCurrency(Number(stay.paidAmount), stay.currencyCode || currency)}</p>
          </div>
        </li>
      ))}
    </ul>
  );
}

/** The advance payments recorded on one guest's reservations. */
function PaymentsList({ propertyId, guestId }: { propertyId: string; guestId: string }) {
  const load = useCallback(() => guestDirectoryApi.payments(propertyId, guestId), [propertyId, guestId]);
  const resource = useApiResource(load, [propertyId, guestId]);
  if (resource.error) return <p role="alert" className="py-2 text-label text-danger-text">Could not load payments: {resource.error}</p>;
  if (!resource.data) return <PanelLoadState label="Loading payments" lines={3} />;
  if (resource.data.length === 0) return <p className="py-2 text-label text-ink-secondary">No payments recorded for this guest.</p>;
  return (
    <ul className="flex flex-col gap-2">
      {resource.data.map((payment, index) => (
        <li key={`${payment.reservationId}-${index}`} className="flex flex-wrap items-center justify-between gap-2 rounded-control border border-border p-3">
          <div className="min-w-0">
            <p className="font-mono text-label font-semibold text-ink">{payment.bookingCode}</p>
            <p className="text-label text-ink-secondary">
              {payment.method}
              {payment.reference ? ` · ${payment.reference}` : ''} · {formatDay(payment.recordedAt.slice(0, 10))}
            </p>
          </div>
          <p className="tnum text-body font-bold text-ink">{formatCurrency(Number(payment.amount), payment.currencyCode)}</p>
        </li>
      ))}
    </ul>
  );
}

function GuestProfile({
  g,
  propertyId,
  currency,
  onClose,
  go,
  onSave,
}: {
  g: GuestDirectoryRow;
  propertyId: string;
  currency: string;
  onClose: () => void;
  go: (t: NavTarget) => void;
  onSave: (patch: Record<string, unknown>) => Promise<void>;
}) {
  const [tab, setTab] = useState<'overview' | 'stays' | 'payments' | 'notes'>('overview');
  const [editing, setEditing] = useState(false);
  const [phone, setPhone] = useState(g.phone ?? '');
  const [prefs, setPrefs] = useState(g.preferences ?? '');
  const money = (value: string) => (Number(value) > 0 ? formatCurrency(Number(value), currency) : '—');

  return (
    <div>
      <div className="flex items-center gap-3">
        <Avatar name={g.name} />
        <div className="min-w-0 flex-1">
          <p className="truncate text-body font-semibold text-ink">{g.name}</p>
          <p className="truncate text-label text-ink-secondary">{g.companyName ?? g.email ?? 'No company or email on file'}</p>
        </div>
        <Badge tone={tierTone(g.tier)}>{g.tier}</Badge>
      </div>
      <div className="mt-3 grid grid-cols-1 gap-2 text-center xs:grid-cols-3">
        {[[String(g.stayCount), 'Stays'], [money(g.lifetimeSpend), 'Lifetime'], [money(g.outstandingBalance), 'Balance']].map(([v, k]) => (
          <div key={k} className="min-w-0 rounded-control border p-2.5 sm:p-3 border-border">
            <p className="tnum truncate text-title font-bold text-ink">{v}</p>
            <p className="text-label text-ink-secondary mt-0.5">{k}</p>
          </div>
        ))}
      </div>
      <div className="mt-3 overflow-x-auto">
        <Tabs label="Guest sections" tabs={[{ id: 'overview', label: 'Overview' }, { id: 'stays', label: 'Stays' }, { id: 'payments', label: 'Payments' }, { id: 'notes', label: 'Notes' }]} active={tab} onChange={setTab} />
      </div>
      <div className="mt-3 text-body">
        {tab === 'overview' && (
          <dl className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {[['Email', g.email ?? '—'], ['Phone', editing ? '' : (phone || '—')], ['Company', g.companyName ?? '—'], ['Last stay', formatDay(g.lastStayAt)], ['Preferences', editing ? '' : (prefs || '—')]].map(([k, v]) => (
              <div key={k} className="min-w-0 rounded-control border p-3 border-border">
                <dt className="text-label font-medium text-ink-secondary mb-1">{k}</dt>
                <dd className="break-words text-body font-semibold text-ink">
                  {editing && (k === 'Phone' || k === 'Preferences') ? (
                    <input value={k === 'Phone' ? phone : prefs} onChange={(e) => (k === 'Phone' ? setPhone(e.target.value) : setPrefs(e.target.value))} className={inputClass()} aria-label={k} />
                  ) : v}
                </dd>
              </div>
            ))}
          </dl>
        )}
        {tab === 'stays' && <StaysList propertyId={propertyId} guestId={g.id} currency={currency} />}
        {tab === 'payments' && <PaymentsList propertyId={propertyId} guestId={g.id} />}
        {tab === 'notes' && (
          <div className="rounded-control border p-3 border-border bg-muted-surface">
            <p className="text-body text-ink">{g.internalNotes || 'No notes yet.'}</p>
          </div>
        )}
      </div>
      <div className="mt-4 flex flex-col gap-2 sm:flex-row">
        <Button variant="secondary" type="button" className="sm:flex-1" onClick={() => {
          if (!editing) { setEditing(true); return; }
          void onSave({ phone, preferences: prefs }).then(() => setEditing(false)).catch(() => undefined);
        }}>
          {editing ? 'Save guest' : 'Edit guest'}
        </Button>
        <Button variant="secondary" type="button" className="sm:flex-1" onClick={() => go({ view: 'new-reservation' })}>New reservation</Button>
        <Button variant="primary" type="button" className="sm:flex-1" onClick={() => go({ view: 'folios' })}>View folio</Button>
      </div>
      <Button variant="secondary" type="button" className="mt-2 w-full" onClick={onClose}>Back to directory</Button>
    </div>
  );
}

export function Guests({ initialQuery = '', focusId, go }: { initialQuery?: string; focusId?: string; go: (t: NavTarget) => void }) {
  const { me } = useAuth();
  const propertyId = me?.activePropertyId ?? null;

  const [q, setQ] = useState(initialQuery);
  const [search, setSearch] = useState(initialQuery);
  const [sort, setSort] = useState<Sort>('name');
  const [page, setPage] = useState(0);
  const [openId, setOpenId] = useState<string | null>(focusId ?? null);

  // The search runs on the data layer, so wait for a pause in typing before asking.
  useEffect(() => {
    const timer = window.setTimeout(() => setSearch(q.trim()), 300);
    return () => window.clearTimeout(timer);
  }, [q]);

  const loadList = useCallback(
    async () =>
      propertyId
        ? guestDirectoryApi.list(propertyId, { search: search || undefined, sort, page: page + 1, pageSize: PAGE_SIZE })
        : { data: [], total: 0, page: 1, pageSize: PAGE_SIZE },
    [propertyId, search, sort, page],
  );
  const list = useApiResource(loadList, [propertyId, search, sort, page]);
  const rows = list.data?.data ?? [];
  const total = list.data?.total ?? 0;

  // Money in the directory is in the currency of the property.
  const loadCurrency = useCallback(
    async () => (propertyId ? (await propertyApi.get(propertyId).catch(() => null))?.defaultCurrency ?? null : null),
    [propertyId],
  );
  const currency = useApiResource(loadCurrency, [propertyId]).data ?? 'INR';

  const loadProfile = useCallback(
    () => (propertyId && openId ? guestDirectoryApi.get(propertyId, openId) : Promise.resolve(null)),
    [propertyId, openId],
  );
  const profileResource = useApiResource(loadProfile, [propertyId, openId]);
  const profile = profileResource.data;

  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const safe = Math.min(page, pages - 1);
  const noFilters = !search;

  if (openId && propertyId) {
    if (profileResource.error) {
      return (
        <Card>
          <p role="alert" className="text-label text-danger-text">Could not load this guest: {profileResource.error}</p>
          <Button variant="secondary" type="button" className="mt-3 w-full" onClick={() => setOpenId(null)}>Back to directory</Button>
        </Card>
      );
    }
    if (!profile) return <PanelLoadState label="Loading guest profile" />;
    return (
      <Card className="mx-auto w-full max-w-3xl">
        <GuestProfile g={profile} propertyId={propertyId} currency={currency} onClose={() => setOpenId(null)} go={go} onSave={async (patch) => {
          try {
            await guestDirectoryApi.update(propertyId, profile.id, patch);
            profileResource.refresh();
            list.refresh();
            toast('Guest saved', { detail: 'Guest profile updated.', tone: 'success' });
          } catch (error) {
            toast('Could not update guest', { detail: displayError(error), tone: 'danger' });
            throw error;
          }
        }} />
      </Card>
    );
  }

  return (
    <div className="pms-page">
      <Card>
        <CardTitle
          icon={Lucide.Contact2}
          iconBg="bg-gradient-to-tr from-primary to-dark-accent text-white shadow-xs shadow-primary/20"
          title="Guest Directory"
        />
        {list.error ? <p role="alert" className="pms-helper">Could not load guests: {list.error}</p> : null}
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <input value={q} onChange={(e) => { setQ(e.target.value); setPage(0); }} placeholder="Search guests…" aria-label="Search guests" className={inputClass('text-label w-full sm:w-56')} />
          <select value={sort} onChange={(e) => { setSort(e.target.value as Sort); setPage(0); }} aria-label="Sort guests" className={inputClass('text-label w-full sm:w-auto')}>
            <option value="name">Sort: name</option>
            <option value="stays">Sort: most stays</option>
            <option value="spent">Sort: lifetime value</option>
            <option value="recent">Sort: latest stay</option>
          </select>
          <Button variant="secondary" type="button" className="w-full sm:w-auto" onClick={() => { setQ(''); setSearch(''); setSort('name'); setPage(0); }}>Clear</Button>
        </div>

        {/* Phones: one card per guest, so nothing scrolls sideways */}
        <ul className="flex flex-col gap-2 md:hidden">
          {rows.map((g) => (
            <li key={g.id}>
              <button
                type="button"
                onClick={() => setOpenId(g.id)}
                aria-label={`View details for ${g.name}`}
                className="flex w-full cursor-pointer items-start gap-3 rounded-control border border-border bg-surface p-3 text-left transition-colors hover:bg-page focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)]"
              >
                <Avatar name={g.name} size={36} />
                <span className="min-w-0 flex-1">
                  <span className="flex items-center justify-between gap-2">
                    <span className="truncate text-body font-semibold text-ink">{g.name}</span>
                    <Badge tone={tierTone(g.tier)} size="sm">{g.tier}</Badge>
                  </span>
                  <span className="block truncate text-label text-ink-secondary">{g.email ?? '—'}</span>
                  <span className="tnum block text-label text-ink-secondary">{g.phone ?? '—'}</span>
                  {g.companyName ? <span className="block truncate text-label text-ink">{g.companyName}</span> : null}
                  <span className="mt-1 block text-label text-ink-secondary">
                    {g.stayCount} {g.stayCount === 1 ? 'stay' : 'stays'} · Last stay {formatDay(g.lastStayAt)}
                  </span>
                </span>
              </button>
            </li>
          ))}
        </ul>
        {list.loading ? <div className="md:hidden"><PanelLoadState label="Loading guests" lines={4} /></div> : null}

        {/* Tablet and up: table; company and last stay appear from 1024px */}
        <div className="hidden md:block">
          <TableContainer>
            <table className="pms-table">
              <thead>
                <tr>
                  <th className="w-12 text-center text-label font-semibold">#</th>
                  <th className="text-label font-semibold">GUEST NAME</th>
                  <th className="text-label font-semibold">CONTACT</th>
                  <th className="hidden text-label font-semibold lg:table-cell">COMPANY</th>
                  <th className="text-label font-semibold">TIER</th>
                  <th className="text-right text-label font-semibold">STAYS</th>
                  <th className="hidden text-label font-semibold lg:table-cell">LAST STAY</th>
                  <th className="text-right text-label font-semibold">ACTIONS</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((g, idx) => (
                  <tr key={g.id}>
                    <td className="text-center font-medium text-ink-secondary text-label">{safe * PAGE_SIZE + idx + 1}</td>
                    <td>
                      <div className="flex items-center gap-3">
                        <Avatar name={g.name} size={36} />
                        <div className="min-w-0">
                          <span className="block truncate font-semibold text-ink text-label">{g.name}</span>
                          <span className="block text-label text-ink-secondary">{g.bookingCount} {g.bookingCount === 1 ? 'booking' : 'bookings'}</span>
                        </div>
                      </div>
                    </td>
                    <td className="max-w-[16rem]">
                      <span className="block truncate text-ink text-label">{g.email ?? '—'}</span>
                      <span className="tnum block text-label text-ink-secondary">{g.phone ?? '—'}</span>
                    </td>
                    <td className="hidden lg:table-cell"><span className="text-ink text-label">{g.companyName ?? '—'}</span></td>
                    <td><Badge tone={tierTone(g.tier)}>{g.tier}</Badge></td>
                    <td className="tnum text-right font-medium text-ink text-label">{g.stayCount}</td>
                    <td className="hidden lg:table-cell"><span className="text-ink-secondary text-label">{formatDay(g.lastStayAt)}</span></td>
                    <td className="text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <TableActionBtn icon={Lucide.Eye} title={`View details for ${g.name}`} onClick={() => setOpenId(g.id)} />
                      </div>
                    </td>
                  </tr>
                ))}
                {list.loading ? <TableSkeletonRows cols={8} /> : null}
              </tbody>
            </table>
          </TableContainer>
        </div>

        {!list.loading && !list.error && rows.length === 0 ? (
          <p className="pms-helper py-8 text-center text-label text-ink-secondary">
            {!propertyId ? 'Choose a property to see its guests.' : noFilters ? 'No guests yet. Add the first one.' : 'No guests match.'}
          </p>
        ) : null}
        <div className="mt-4 pt-1">
          <Pagination
            page={safe}
            totalPages={pages}
            onChange={setPage}
            summary={`Showing ${total > 0 ? safe * PAGE_SIZE + 1 : 0} to ${Math.min((safe + 1) * PAGE_SIZE, total)} of ${total} guests`}
          />
        </div>
      </Card>
    </div>
  );
}
