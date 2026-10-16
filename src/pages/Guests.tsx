import { useCallback, useMemo, useState } from 'react';
import * as Lucide from 'lucide-react';
import type { BadgeTone } from '../components/status';
import type { Guest } from '../data/mock';
import { Avatar, Badge, Card, CardTitle, TableContainer, TableActionBtn } from '../components/ui';
import { FilterChip, Pagination, Tabs } from '../components/controls';
import { inputClass } from '../components/inputClass';
import { Field } from '../components/controls';
import { Modal } from '../components/overlays';
import { toast } from '../components/toastStore';
import type { NavTarget } from '../components/nav';
import { guestApi } from '../lib/api/pms';
import { guestFromApi } from '../lib/api/adapters';
import { useApiResource } from '../lib/api/useApiResource';
import { displayApiError } from '../lib/api/client';
import { formatCurrency } from '../lib/api/format';

const PAGE_SIZE = 6;

function tierTone(tier: string): BadgeTone {
  if (tier === 'VIP') return 'warning';
  if (tier === 'Gold') return 'info';
  if (tier === 'Regular') return 'success';
  return 'neutral';
}

function GuestProfile({ g, onClose, go, onSave }: { g: Guest; onClose: () => void; go: (t: NavTarget) => void; onSave: (patch: Record<string, unknown>) => Promise<void> }) {
  const [tab, setTab] = useState<'overview' | 'stays' | 'payments' | 'notes'>('overview');
  const [editing, setEditing] = useState(false);
  const [phone, setPhone] = useState(g.phone);
  const [prefs, setPrefs] = useState(g.preferences.join(', '));

  return (
    <div>
      <div className="flex flex-wrap items-center gap-3">
        <Avatar name={g.name} />
        <div className="min-w-0 flex-1">
          <p className="text-[16px] font-semibold" style={{ color: 'var(--color-ink)' }}>{g.name}</p>
          <p className="tnum font-mono text-[12px]" style={{ color: 'var(--color-ink-secondary)' }}>{g.id} · {g.category}</p>
        </div>
        <Badge tone={tierTone(g.tier)}>{g.tier}</Badge>
      </div>
      <div className="mt-3 grid grid-cols-3 gap-2 text-center">
        {[[String(g.stays), 'Stays'], [g.spent > 0 ? formatCurrency(g.spent, 'INR') : '—', 'Lifetime'], [g.balance > 0 ? formatCurrency(g.balance, 'INR') : '—', 'Balance']].map(([v, k]) => (
          <div key={k} className="rounded-control border p-2.5" style={{ borderColor: 'var(--color-border)' }}>
            <p className="tnum text-[16px] font-semibold" style={{ color: 'var(--color-ink)' }}>{v}</p>
            <p className="pms-helper">{k}</p>
          </div>
        ))}
      </div>
      <div className="mt-3">
        <Tabs label="Guest sections" tabs={[{ id: 'overview', label: 'Overview' }, { id: 'stays', label: 'Stays' }, { id: 'payments', label: 'Payments' }, { id: 'notes', label: 'Notes' }]} active={tab} onChange={setTab} />
      </div>
      <div className="mt-3 text-[13.5px]">
        {tab === 'overview' && (
          <dl className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {[['Email', g.email], ['Phone', editing ? '' : phone], ['Company', g.company ?? '—'], ['Last visit', g.lastVisit], ['Preferences', editing ? '' : (prefs || '—')]].map(([k, v]) => (
              <div key={k} className="rounded-control border p-3" style={{ borderColor: 'var(--color-border)' }}>
                <dt className="pms-helper">{k}</dt>
                <dd className="font-semibold" style={{ color: 'var(--color-ink)' }}>
                  {editing && (k === 'Phone' || k === 'Preferences') ? (
                    <input value={k === 'Phone' ? phone : prefs} onChange={(e) => (k === 'Phone' ? setPhone(e.target.value) : setPrefs(e.target.value))} className={inputClass()} aria-label={k} />
                  ) : v}
                </dd>
              </div>
            ))}
          </dl>
        )}
        {tab === 'stays' && (
          <ul className="flex flex-col gap-2">
            <p className="pms-helper">{g.stays ? `${g.stays} stay(s) on record; stay details are not included in the guest endpoint.` : 'No stays on record.'}</p>
          </ul>
        )}
        {tab === 'payments' && (
          <ul className="flex flex-col gap-2">
            <p className="pms-helper">Guest-specific payment and invoice history is not exposed by the current API.</p>
          </ul>
        )}
        {tab === 'notes' && (
          <div className="rounded-control border p-3" style={{ borderColor: 'var(--color-border)', background: 'var(--color-muted-surface)' }}>
            <p className="text-[13px]" style={{ color: 'var(--color-ink)' }}>{g.notes || 'No notes yet.'}</p>
            <p className="pms-helper mt-1">Communication history appears here in the connected build.</p>
          </div>
        )}
      </div>
      <div className="mt-4 flex flex-wrap gap-2">
        <button type="button" className="pms-btn-ghost flex-1 px-3 py-2.5" onClick={() => {
          if (!editing) { setEditing(true); return; }
          void onSave({ phone, preferences: prefs }).then(() => setEditing(false)).catch(() => undefined);
        }}>
          {editing ? 'Save guest' : 'Edit guest'}
        </button>
        <button type="button" className="pms-btn-ghost flex-1 px-3 py-2.5" onClick={() => go({ view: 'new-reservation' })}>New reservation</button>
        <button type="button" className="pms-btn-primary flex-1 px-3 py-2.5" onClick={() => go({ view: 'folios' })}>View folio</button>
      </div>
      <button type="button" className="pms-btn-ghost mt-2 w-full px-3 py-2" onClick={onClose}>Back to directory</button>
    </div>
  );
}

export function Guests({ initialQuery = '', focusId, go }: { initialQuery?: string; focusId?: string; go: (t: NavTarget) => void }) {
  const loadGuests = useCallback(async () => (await guestApi.list('', 1, 100)).data.map(guestFromApi), []);
  const resource = useApiResource(loadGuests);
  const all = useMemo(() => resource.data ?? [], [resource.data]);
  const [q, setQ] = useState(initialQuery);
  const [tier, setTier] = useState('All');
  const [sort, setSort] = useState<'name' | 'stays' | 'spent'>('name');
  const [page, setPage] = useState(0);
  const [openId, setOpenId] = useState<string | null>(focusId ?? null);
  const [adding, setAdding] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const loadProfile = useCallback(() => openId ? guestApi.get(openId).then(guestFromApi) : Promise.resolve(null), [openId]);
  const profileResource = useApiResource(loadProfile, [openId]);
  const profile = profileResource.data;

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return [...all]
      .filter((g) => (tier === 'All' || g.tier === tier) && (!needle || g.name.toLowerCase().includes(needle) || g.id.toLowerCase().includes(needle) || g.phone.includes(needle)))
      .sort((a, b) => (sort === 'name' ? a.name.localeCompare(b.name) : sort === 'stays' ? b.stays - a.stays : b.spent - a.spent));
  }, [all, q, tier, sort]);

  const pages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safe = Math.min(page, pages - 1);
  const slice = filtered.slice(safe * PAGE_SIZE, safe * PAGE_SIZE + PAGE_SIZE);
  const openGuest = all.find((g) => g.id === openId) ?? null;

  const addGuest = () => {
    if (name.trim().length < 2 || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email.trim()) || phone.trim().length < 6) {
      toast('Check the form', { detail: 'Name, valid email and phone are required.', tone: 'warning' });
      return;
    }
    const parts = name.trim().split(/\s+/);
    void guestApi.create({ firstName: parts[0], lastName: parts.slice(1).join(' ') || 'Guest', email: email.trim(), phone: phone.trim() })
      .then((created) => {
        const guest = guestFromApi(created);
        setAdding(false);
        setName(''); setEmail(''); setPhone('');
        setOpenId(guest.id);
        resource.refresh();
        toast('Guest added', { detail: `${guest.name} was saved.`, tone: 'success' });
      })
      .catch((error: unknown) => toast('Could not add guest', { detail: displayApiError(error), tone: 'danger' }));
  };

  if (openGuest && !profile && profileResource.loading) {
    return <Card><p className="pms-helper">Loading guest profile…</p></Card>;
  }

  if (openGuest && profile) {
    return (
      <Card>
        <GuestProfile g={profile} onClose={() => setOpenId(null)} go={go} onSave={async (patch) => {
          try {
            const updated = await guestApi.update(openGuest.id, patch);
            void updated;
            profileResource.refresh();
            resource.refresh();
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
    <div className="flex flex-col gap-3.5">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-ink flex items-center gap-2.5">
            <Lucide.Users className="text-primary" size={26} />
            <span>Guest Profiles & Directory</span>
          </h1>
          <p className="mt-1 text-sm text-ink-secondary">
            Guest history, VIP tiers, contact preferences, and stay profiles
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => resource.refresh()}
            className="pms-btn-ghost flex items-center gap-1.5 text-xs font-semibold px-3 py-2 rounded-xl border border-border"
            title="Refresh directory"
          >
            <Lucide.RefreshCw size={14} className={resource.loading ? 'animate-spin' : ''} />
            <span>Refresh</span>
          </button>
          <button
            type="button"
            onClick={() => setAdding(true)}
            className="pms-btn-primary flex items-center gap-1.5 px-3.5 py-2 text-[13px] font-bold rounded-xl"
          >
            <Lucide.Plus size={16} strokeWidth={2.4} />
            <span>Add Guest</span>
          </button>
        </div>
      </div>

      <Card>
        <CardTitle
          title="Guest Directory"
          subtitle={resource.loading ? 'Loading guest directory…' : `${filtered.length} of ${all.length} guests`}
        />
      {resource.error ? <p role="alert" className="pms-helper">Could not load guests: {resource.error}</p> : null}
      <div className="mb-3 grid grid-cols-1 gap-2 md:grid-cols-4">
        <input value={q} onChange={(e) => { setQ(e.target.value); setPage(0); }} placeholder="Name, ID or phone…" aria-label="Search guests" className={inputClass()} />
        <select value={sort} onChange={(e) => setSort(e.target.value as never)} aria-label="Sort guests" className={inputClass()}>
          <option value="name">Sort: name</option>
          <option value="stays">Sort: most stays</option>
          <option value="spent">Sort: lifetime value</option>
        </select>
        <div className="flex flex-wrap items-center gap-1.5" role="group" aria-label="Filter by tier">
          {['All', 'VIP', 'Gold', 'Regular', 'New'].map((t) => (
            <FilterChip key={t} active={tier === t} onClick={() => { setTier(t); setPage(0); }}>{t}</FilterChip>
          ))}
        </div>
        <button type="button" className="pms-btn-ghost px-3 py-2.5" onClick={() => { setQ(''); setTier('All'); setSort('name'); setPage(0); }}>Clear</button>
      </div>
      <TableContainer>
        <table className="pms-table min-w-[760px]">
          <thead>
            <tr>
              <th className="w-12 text-center">#</th>
              <th>GUEST NAME</th>
              <th>CONTACT</th>
              <th>COMPANY</th>
              <th>TIER</th>
              <th className="text-right">STAYS</th>
              <th className="text-right">BALANCE</th>
              <th>LAST VISIT</th>
              <th className="text-right">ACTIONS</th>
            </tr>
          </thead>
          <tbody>
            {slice.map((g, idx) => (
              <tr key={g.id}>
                <td className="text-center font-medium text-slate-400 text-xs">
                  {safe * PAGE_SIZE + idx + 1}
                </td>
                <td>
                  <div className="flex items-center gap-3">
                    <Avatar name={g.name} size={36} />
                    <div>
                      <span className="block font-semibold text-slate-900 text-sm">{g.name}</span>
                      <span className="tnum block font-mono text-[11px] text-slate-400">{g.id}</span>
                    </div>
                  </div>
                </td>
                <td>
                  <span className="block text-slate-700 text-sm">{g.email}</span>
                  <span className="tnum block text-[12px] text-slate-400">{g.phone}</span>
                </td>
                <td>
                  <span className="text-slate-600 text-sm">{g.company ?? '—'}</span>
                </td>
                <td>
                  <Badge tone={tierTone(g.tier)}>{g.tier}</Badge>
                </td>
                <td className="tnum text-right font-medium text-slate-700 text-sm">
                  {g.stays}
                </td>
                <td className="tnum text-right font-bold text-slate-900 text-sm">
                  {g.balance > 0 ? formatCurrency(g.balance, 'INR') : '—'}
                </td>
                <td>
                  <span className="text-slate-500 text-sm">{g.lastVisit}</span>
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
          </tbody>
        </table>
        {slice.length === 0 ? <p className="pms-helper py-8 text-center text-slate-400">No guests match.</p> : null}
      </TableContainer>
      <div className="mt-4 pt-1">
        <Pagination
          page={safe}
          totalPages={pages}
          onChange={setPage}
          summary={`Showing ${filtered.length > 0 ? safe * PAGE_SIZE + 1 : 0} to ${Math.min((safe + 1) * PAGE_SIZE, filtered.length)} of ${filtered.length} guests`}
        />
      </div>
      <Modal open={adding} onClose={() => setAdding(false)} title="Add guest" subtitle="Saved to the guest directory">
        <div className="flex flex-col gap-3">
          <Field label="Full name"><input value={name} onChange={(e) => setName(e.target.value)} placeholder="Jordan Miles" className={inputClass()} /></Field>
          <Field label="Email"><input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="jordan@mail.com" inputMode="email" className={inputClass()} /></Field>
          <Field label="Phone"><input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+1 555 010 2030" inputMode="tel" className={inputClass()} /></Field>
          <button type="button" className="pms-btn-primary px-4 py-2.5" onClick={addGuest}>Add guest</button>
        </div>
      </Modal>
    </Card>
    </div>
  );
}
