import { useCallback, useEffect, useState } from 'react';
import { PanelLoadState, TableSkeletonRows } from '../../components/Skeleton';
import * as Lucide from 'lucide-react';
import type { BadgeTone } from '../../utils/status';
import { Avatar, Badge, Card, CardTitle, TableContainer, TableActionBtn } from '../../components/ui';
import { FilterChip, Pagination, Tabs } from '../../components/controls';
import { inputClass } from '../../utils/styling';
import { Field } from '../../components/controls';
import { Modal } from '../../components/overlays';
import { toast } from '../../utils/toast';
import type { NavTarget } from '../../config/navigation';
import { guestDirectoryApi, propertyApi } from '../../lib/api/pms';
import type { GuestDirectoryRow } from '../../lib/api/pms';
import { useApiResource } from '../../lib/api/useApiResource';
import { displayApiError } from '../../lib/api/client';
import { formatCurrency } from '../../utils/currency';
import { Button } from '../../components/primitives';
import { useAuth } from '../auth/AuthContext';

const PAGE_SIZE = 6;
const TIERS = ['VIP', 'Gold', 'Regular', 'New'] as const;
type TierFilter = 'All' | (typeof TIERS)[number];
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
      <div className="flex flex-wrap items-center gap-3">
        <Avatar name={g.name} />
        <div className="min-w-0 flex-1">
          <p className="text-body font-semibold text-ink">{g.name}</p>
          <p className="text-label text-ink-secondary">{g.companyName ?? g.email ?? 'No company or email on file'}</p>
        </div>
        <Badge tone={tierTone(g.tier)}>{g.tier}</Badge>
      </div>
      <div className="mt-3 grid grid-cols-1 gap-2 text-center xs:grid-cols-3">
        {[[String(g.stayCount), 'Stays'], [money(g.lifetimeSpend), 'Lifetime'], [money(g.outstandingBalance), 'Balance']].map(([v, k]) => (
          <div key={k} className="rounded-control border p-2.5 sm:p-3 border-border">
            <p className="tnum text-title font-bold text-ink">{v}</p>
            <p className="text-label text-ink-secondary mt-0.5">{k}</p>
          </div>
        ))}
      </div>
      <div className="mt-3">
        <Tabs label="Guest sections" tabs={[{ id: 'overview', label: 'Overview' }, { id: 'stays', label: 'Stays' }, { id: 'payments', label: 'Payments' }, { id: 'notes', label: 'Notes' }]} active={tab} onChange={setTab} />
      </div>
      <div className="mt-3 text-body">
        {tab === 'overview' && (
          <dl className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {[['Email', g.email ?? '—'], ['Phone', editing ? '' : (phone || '—')], ['Company', g.companyName ?? '—'], ['Last stay', formatDay(g.lastStayAt)], ['Preferences', editing ? '' : (prefs || '—')]].map(([k, v]) => (
              <div key={k} className="rounded-control border p-3 border-border">
                <dt className="text-label font-medium text-ink-secondary mb-1">{k}</dt>
                <dd className="text-body font-semibold text-ink">
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
      <div className="mt-4 flex flex-wrap gap-2">
        <Button variant="secondary" type="button" className="flex-1" onClick={() => {
          if (!editing) { setEditing(true); return; }
          void onSave({ phone, preferences: prefs }).then(() => setEditing(false)).catch(() => undefined);
        }}>
          {editing ? 'Save guest' : 'Edit guest'}
        </Button>
        <Button variant="secondary" type="button" className="flex-1" onClick={() => go({ view: 'new-reservation' })}>New reservation</Button>
        <Button variant="primary" type="button" className="flex-1" onClick={() => go({ view: 'folios' })}>View folio</Button>
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
  const [tier, setTier] = useState<TierFilter>('All');
  const [sort, setSort] = useState<Sort>('name');
  const [page, setPage] = useState(0);
  const [openId, setOpenId] = useState<string | null>(focusId ?? null);
  const [adding, setAdding] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');

  // The search runs on the server, so wait for a pause in typing before asking.
  useEffect(() => {
    const timer = window.setTimeout(() => setSearch(q.trim()), 300);
    return () => window.clearTimeout(timer);
  }, [q]);

  const loadList = useCallback(
    async () =>
      propertyId
        ? guestDirectoryApi.list(propertyId, { search: search || undefined, tier: tier === 'All' ? undefined : tier, sort, page: page + 1, pageSize: PAGE_SIZE })
        : { data: [], total: 0, page: 1, pageSize: PAGE_SIZE },
    [propertyId, search, tier, sort, page],
  );
  const list = useApiResource(loadList, [propertyId, search, tier, sort, page]);
  const rows = list.data?.data ?? [];
  const total = list.data?.total ?? 0;

  const loadSummary = useCallback(
    async () => (propertyId ? guestDirectoryApi.summary(propertyId) : null),
    [propertyId],
  );
  const summary = useApiResource(loadSummary, [propertyId]);

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
  const noFilters = !search && tier === 'All';

  const addGuest = () => {
    if (!propertyId) return;
    if (name.trim().length < 2 || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email.trim()) || phone.trim().length < 6) {
      toast('Check the form', { detail: 'Name, valid email and phone are required.', tone: 'warning' });
      return;
    }
    const parts = name.trim().split(/\s+/);
    void guestDirectoryApi.create(propertyId, { firstName: parts[0], lastName: parts.slice(1).join(' '), email: email.trim(), phone: phone.trim() })
      .then((created) => {
        setAdding(false);
        setName(''); setEmail(''); setPhone('');
        setOpenId(created.id);
        list.refresh();
        summary.refresh();
        toast('Guest added', { detail: `${created.name} was saved.`, tone: 'success' });
      })
      .catch((error: unknown) => toast('Could not add guest', { detail: displayApiError(error), tone: 'danger' }));
  };

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
      <Card>
        <GuestProfile g={profile} propertyId={propertyId} currency={currency} onClose={() => setOpenId(null)} go={go} onSave={async (patch) => {
          try {
            await guestDirectoryApi.update(propertyId, profile.id, patch);
            profileResource.refresh();
            list.refresh();
            toast('Guest saved', { detail: 'Guest profile updated.', tone: 'success' });
          } catch (error) {
            toast('Could not update guest', { detail: displayApiError(error), tone: 'danger' });
            throw error;
          }
        }} />
      </Card>
    );
  }

  return (
    <div className="pms-page">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-start gap-3">


        </div>
        <div className="flex items-center gap-2">
          <Button variant="secondary"
            type="button"
            onClick={() => { list.refresh(); summary.refresh(); }}
            className="flex items-center gap-1.5 cursor-pointer transition-colors"
            title="Refresh directory"
          >
            <Lucide.RefreshCw size={13} className={list.loading ? 'animate-spin' : ''} />
            <span>Refresh</span>
          </Button>
          <Button variant="primary"
            type="button"
            onClick={() => setAdding(true)}
            disabled={!propertyId}
            className="flex items-center gap-1.5 cursor-pointer transition-all"
          >
            <Lucide.Plus size={15} strokeWidth={2.4} />
            <span>Add Guest</span>
          </Button>
        </div>
      </div>

      <Card>
        <CardTitle
          icon={Lucide.Contact2}
          iconBg="bg-gradient-to-tr from-primary to-dark-accent text-white shadow-xs shadow-primary/20"
          title="Guest Directory"
          subtitle={list.loading ? 'Loading guest directory…' : `${total} ${noFilters ? 'guests' : total === 1 ? 'match' : 'matches'}`}
          badge={
            <span className="flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-micro font-bold text-primary border border-primary/30">
              {summary.data?.total ?? 0} Profiles
            </span>
          }
        />
        {list.error ? <p role="alert" className="pms-helper">Could not load guests: {list.error}</p> : null}
        <div className="mb-3 grid grid-cols-1 gap-2 md:grid-cols-4">
          <input value={q} onChange={(e) => { setQ(e.target.value); setPage(0); }} placeholder="Name, phone, email or company…" aria-label="Search guests" className={inputClass('text-label')} />
          <select value={sort} onChange={(e) => { setSort(e.target.value as Sort); setPage(0); }} aria-label="Sort guests" className={inputClass('text-label')}>
            <option value="name">Sort: name</option>
            <option value="stays">Sort: most stays</option>
            <option value="spent">Sort: lifetime value</option>
            <option value="recent">Sort: latest stay</option>
          </select>
          <div className="flex flex-wrap items-center gap-1.5" role="group" aria-label="Filter by tier">
            {(['All', ...TIERS] as const).map((t) => (
              <FilterChip key={t} active={tier === t} onClick={() => { setTier(t); setPage(0); }}>
                {t}{summary.data ? ` · ${t === 'All' ? summary.data.total : summary.data.byTier[t]}` : ''}
              </FilterChip>
            ))}
          </div>
          <Button variant="secondary" type="button" onClick={() => { setQ(''); setSearch(''); setTier('All'); setSort('name'); setPage(0); }}>Clear</Button>
        </div>
        <TableContainer>
          <table className="pms-table min-w-[760px]">
            <thead>
              <tr>
                <th className="w-12 text-center text-label font-semibold">#</th>
                <th className="text-label font-semibold">GUEST NAME</th>
                <th className="text-label font-semibold">CONTACT</th>
                <th className="text-label font-semibold">COMPANY</th>
                <th className="text-label font-semibold">TIER</th>
                <th className="text-right text-label font-semibold">STAYS</th>
                <th className="text-label font-semibold">LAST STAY</th>
                <th className="text-right text-label font-semibold">ACTIONS</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((g, idx) => (
                <tr key={g.id}>
                  <td className="text-center font-medium text-ink-secondary text-label">
                    {safe * PAGE_SIZE + idx + 1}
                  </td>
                  <td>
                    <div className="flex items-center gap-3">
                      <Avatar name={g.name} size={36} />
                      <div>
                        <span className="block font-semibold text-ink text-label">{g.name}</span>
                        <span className="block text-label text-ink-secondary">{g.bookingCount} {g.bookingCount === 1 ? 'booking' : 'bookings'}</span>
                      </div>
                    </div>
                  </td>
                  <td>
                    <span className="block text-ink text-label">{g.email ?? '—'}</span>
                    <span className="tnum block text-label text-ink-secondary">{g.phone ?? '—'}</span>
                  </td>
                  <td>
                    <span className="text-ink text-label">{g.companyName ?? '—'}</span>
                  </td>
                  <td>
                    <Badge tone={tierTone(g.tier)}>{g.tier}</Badge>
                  </td>
                  <td className="tnum text-right font-medium text-ink text-label">
                    {g.stayCount}
                  </td>
                  <td>
                    <span className="text-ink-secondary text-label">{formatDay(g.lastStayAt)}</span>
                  </td>
                  <td className="text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      <TableActionBtn
                        icon={Lucide.Eye}
                        title={`View details for ${g.name}`}
                        onClick={() => setOpenId(g.id)}
                      />
                    </div>
                  </td>
                </tr>
              ))}
              {list.loading ? <TableSkeletonRows cols={8} /> : null}
            </tbody>
          </table>
          {!list.loading && !list.error && rows.length === 0 ? (
            <p className="pms-helper py-8 text-center text-label text-ink-secondary">
              {!propertyId ? 'Choose a property to see its guests.' : noFilters ? 'No guests yet. Add the first one.' : 'No guests match.'}
            </p>
          ) : null}
        </TableContainer>
        <div className="mt-4 pt-1">
          <Pagination
            page={safe}
            totalPages={pages}
            onChange={setPage}
            summary={`Showing ${total > 0 ? safe * PAGE_SIZE + 1 : 0} to ${Math.min((safe + 1) * PAGE_SIZE, total)} of ${total} guests`}
          />
        </div>
        <Modal open={adding} onClose={() => setAdding(false)} title="Add guest" subtitle="Saved to the guest directory">
          <div className="flex flex-col gap-3">
            <Field label="Full name"><input value={name} onChange={(e) => setName(e.target.value)} placeholder="Full name" className={inputClass('text-body')} /></Field>
            <Field label="Email"><input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="name@example.com" inputMode="email" className={inputClass('text-body')} /></Field>
            <Field label="Phone"><input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="Phone number" inputMode="tel" className={inputClass('text-body')} /></Field>
            <Button variant="primary" type="button" onClick={addGuest}>Add guest</Button>
          </div>
        </Modal>
      </Card>
    </div>
  );
}
