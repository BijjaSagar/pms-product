import { useMemo, useState } from 'react';
import { GUESTS, INVOICES, PAYMENTS, RESERVATIONS, formatMoney } from '../data/mock';
import type { BadgeTone } from '../components/status';
import type { Guest } from '../data/mock';
import { Avatar, Badge, Card, CardTitle } from '../components/ui';
import { paymentTone, reservationTone } from '../components/status';
import { FilterChip, Pagination, Tabs } from '../components/controls';
import { inputClass } from '../components/inputClass';
import { Field } from '../components/controls';
import { Modal } from '../components/overlays';
import { toast } from '../components/toastStore';
import type { NavTarget } from '../components/nav';

const PAGE_SIZE = 6;

function tierTone(tier: string): BadgeTone {
  if (tier === 'VIP') return 'warning';
  if (tier === 'Gold') return 'info';
  if (tier === 'Regular') return 'success';
  return 'neutral';
}

function GuestProfile({ g, onClose, go }: { g: Guest; onClose: () => void; go: (t: NavTarget) => void }) {
  const [tab, setTab] = useState<'overview' | 'stays' | 'payments' | 'notes'>('overview');
  const [editing, setEditing] = useState(false);
  const [phone, setPhone] = useState(g.phone);
  const [prefs, setPrefs] = useState(g.preferences.join(', '));
  const stays = RESERVATIONS.filter((r) => r.guestId === g.id);
  const pays = PAYMENTS.filter((p) => p.guest === g.name);
  const invs = INVOICES.filter((i) => i.guest === g.name);

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
        {[[String(g.stays), 'Stays'], [`$${formatMoney(g.spent)}`, 'Lifetime'], [`$${formatMoney(g.balance)}`, 'Balance']].map(([v, k]) => (
          <div key={k} className="rounded-[10px] border p-2.5" style={{ borderColor: 'var(--color-border)' }}>
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
              <div key={k} className="rounded-[10px] border p-3" style={{ borderColor: 'var(--color-border)' }}>
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
            {stays.length === 0 ? <p className="pms-helper">No stays on record.</p> : stays.map((r) => (
              <li key={r.id} className="flex items-center justify-between gap-2 rounded-[10px] border px-3 py-2.5" style={{ borderColor: 'var(--color-border)' }}>
                <span>
                  <span className="tnum block font-mono text-[12px]" style={{ color: 'var(--color-ink-secondary)' }}>{r.id}</span>
                  <span className="tnum block text-[13px]" style={{ color: 'var(--color-ink)' }}>{r.checkIn} → {r.checkOut} · {r.room}</span>
                </span>
                <Badge tone={reservationTone(r.status)}>{r.status}</Badge>
              </li>
            ))}
          </ul>
        )}
        {tab === 'payments' && (
          <ul className="flex flex-col gap-2">
            {pays.length === 0 ? <p className="pms-helper">No payments recorded.</p> : pays.map((p) => (
              <li key={p.ref} className="flex items-center justify-between gap-2 rounded-[10px] border px-3 py-2.5" style={{ borderColor: 'var(--color-border)' }}>
                <span className="tnum text-[13px]" style={{ color: 'var(--color-ink)' }}>{p.ref} · {p.method} · {p.date}</span>
                <span className="flex items-center gap-2">
                  <span className="tnum font-semibold" style={{ color: 'var(--color-ink)' }}>${formatMoney(p.amount)}</span>
                  <Badge tone={paymentTone(p.status)}>{p.status}</Badge>
                </span>
              </li>
            ))}
            {invs.length > 0 ? <p className="pms-helper tnum">{invs.length} invoice(s): {invs.map((i) => i.id).join(', ')}</p> : null}
          </ul>
        )}
        {tab === 'notes' && (
          <div className="rounded-[10px] border p-3" style={{ borderColor: 'var(--color-border)', background: 'var(--color-muted-surface)' }}>
            <p className="text-[13px]" style={{ color: 'var(--color-ink)' }}>{g.notes || 'No notes yet.'}</p>
            <p className="pms-helper mt-1">Communication history appears here in the connected build.</p>
          </div>
        )}
      </div>
      <div className="mt-4 flex flex-wrap gap-2">
        <button type="button" className="pms-btn-ghost flex-1 px-3 py-2.5" onClick={() => { if (editing) toast('Guest updated (demo)', { detail: 'Changes apply to this screen only.' }); setEditing((e) => !e); }}>
          {editing ? 'Save (demo)' : 'Edit guest'}
        </button>
        <button type="button" className="pms-btn-ghost flex-1 px-3 py-2.5" onClick={() => go({ view: 'new-reservation' })}>New reservation</button>
        <button type="button" className="pms-btn-primary flex-1 px-3 py-2.5" onClick={() => go({ view: 'folios' })}>View folio</button>
      </div>
      <button type="button" className="pms-btn-ghost mt-2 w-full px-3 py-2" onClick={onClose}>Back to directory</button>
    </div>
  );
}

export function Guests({ initialQuery = '', focusId, go }: { initialQuery?: string; focusId?: string; go: (t: NavTarget) => void }) {
  const [all, setAll] = useState<Guest[]>(GUESTS);
  const [q, setQ] = useState(initialQuery);
  const [tier, setTier] = useState('All');
  const [sort, setSort] = useState<'name' | 'stays' | 'spent'>('name');
  const [page, setPage] = useState(0);
  const [openId, setOpenId] = useState<string | null>(focusId ?? null);
  const [adding, setAdding] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');

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
    const g: Guest = { id: `G-${1031 + all.length}`, name: name.trim(), email: email.trim(), phone: phone.trim(), company: null, tier: 'New', category: 'Leisure', stays: 0, spent: 0, balance: 0, lastVisit: '—', preferences: [], notes: '' };
    setAll((p) => [...p, g]);
    setAdding(false);
    setName(''); setEmail(''); setPhone('');
    setOpenId(g.id);
    toast('Guest added (demo)', { detail: `${g.name} appears in this directory only.` });
  };

  if (openGuest) {
    return (
      <Card>
        <GuestProfile g={openGuest} onClose={() => setOpenId(null)} go={go} />
      </Card>
    );
  }

  return (
    <Card>
      <CardTitle
        title="Guest directory"
        subtitle={`${filtered.length} of ${all.length} guests · fictional sample data`}
        action={<button type="button" onClick={() => setAdding(true)} className="pms-btn-primary px-3.5 py-2.5">+ Add guest</button>}
      />
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
      <div className="overflow-x-auto">
        <table className="pms-table min-w-[760px]">
          <thead><tr><th>Guest</th><th>Contact</th><th>Company</th><th>Tier</th><th className="text-right">Stays</th><th className="text-right">Balance</th><th>Last visit</th><th><span className="sr-only">Open</span></th></tr></thead>
          <tbody>
            {slice.map((g) => (
              <tr key={g.id}>
                <td>
                  <span className="flex items-center gap-2.5">
                    <Avatar name={g.name} />
                    <span>
                      <span className="block font-semibold">{g.name}</span>
                      <span className="tnum block font-mono text-[11.5px]" style={{ color: 'var(--color-ink-muted)' }}>{g.id}</span>
                    </span>
                  </span>
                </td>
                <td style={{ color: 'var(--color-ink-secondary)' }}><span className="block">{g.email}</span><span className="tnum block text-[12px]">{g.phone}</span></td>
                <td style={{ color: 'var(--color-ink-secondary)' }}>{g.company ?? '—'}</td>
                <td><Badge tone={tierTone(g.tier)}>{g.tier}</Badge></td>
                <td className="tnum text-right">{g.stays}</td>
                <td className="tnum text-right font-semibold">${formatMoney(g.balance)}</td>
                <td style={{ color: 'var(--color-ink-secondary)' }}>{g.lastVisit}</td>
                <td><button type="button" className="pms-btn-ghost px-3 py-1.5" onClick={() => setOpenId(g.id)} aria-label={`Open ${g.name}`}>Details</button></td>
              </tr>
            ))}
          </tbody>
        </table>
        {slice.length === 0 ? <p className="pms-helper py-6 text-center">No guests match.</p> : null}
      </div>
      <div className="mt-3">
        <Pagination page={safe} totalPages={pages} onChange={setPage} summary={`Page ${safe + 1} of ${pages} · ${filtered.length} guests`} />
      </div>
      <Modal open={adding} onClose={() => setAdding(false)} title="Add guest" subtitle="Demo only — stored on this screen">
        <div className="flex flex-col gap-3">
          <Field label="Full name"><input value={name} onChange={(e) => setName(e.target.value)} placeholder="Jordan Miles" className={inputClass()} /></Field>
          <Field label="Email"><input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="jordan@mail.com" inputMode="email" className={inputClass()} /></Field>
          <Field label="Phone"><input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+1 555 010 2030" inputMode="tel" className={inputClass()} /></Field>
          <button type="button" className="pms-btn-primary px-4 py-2.5" onClick={addGuest}>Add guest</button>
        </div>
      </Modal>
    </Card>
  );
}
