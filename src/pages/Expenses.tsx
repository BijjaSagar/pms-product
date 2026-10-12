import { useMemo, useState } from 'react';
import { EXPENSES, formatMoney } from '../data/mock';
import type { Expense } from '../data/mock';
import { Badge, Card, CardTitle } from '../components/ui';
import type { BadgeTone } from '../components/status';
import { Field } from '../components/controls';
import { inputClass } from '../components/inputClass';
import { Modal } from '../components/overlays';
import { toast } from '../components/toastStore';

function expenseTone(s: Expense['status']): BadgeTone {
  if (s === 'Approved') return 'success';
  if (s === 'Pending') return 'warning';
  return 'danger';
}

export function Expenses() {
  const [rows, setRows] = useState<Expense[]>(EXPENSES);
  const [q, setQ] = useState('');
  const [adding, setAdding] = useState(false);
  const [category, setCategory] = useState('Housekeeping');
  const [vendor, setVendor] = useState('');
  const [amount, setAmount] = useState(100);
  const [notes, setNotes] = useState('');

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return rows.filter((e) => !needle || e.vendor.toLowerCase().includes(needle) || e.category.toLowerCase().includes(needle) || e.id.toLowerCase().includes(needle));
  }, [rows, q]);

  const totals = {
    approved: rows.filter((e) => e.status === 'Approved').reduce((s, e) => s + e.amount, 0),
    pending: rows.filter((e) => e.status === 'Pending').reduce((s, e) => s + e.amount, 0),
  };

  const add = () => {
    if (vendor.trim().length < 2 || amount <= 0) {
      toast('Check the form', { detail: 'Vendor and an amount above $0 are required.', tone: 'warning' });
      return;
    }
    setRows((prev) => [{ id: `EXP-${406 + prev.length}`, category, vendor: vendor.trim(), date: 'Oct 10', amount, status: 'Pending', notes: notes.trim() }, ...prev]);
    setAdding(false);
    setVendor(''); setAmount(100); setNotes('');
    toast('Expense submitted (demo)', { detail: 'Pending approval on this screen.' });
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        {[['Approved spend', `$${formatMoney(totals.approved)}`, 'This month'], ['Pending approval', `$${formatMoney(totals.pending)}`, 'Awaiting sign-off'], ['Records', String(rows.length), 'Demo ledger']].map(([k, v, h]) => (
          <section key={k} className="pms-card p-4">
            <p className="pms-label">{k}</p>
            <p className="pms-kpi-value tnum mt-1">{v}</p>
            <p className="pms-helper mt-1">{h}</p>
          </section>
        ))}
      </div>
      <Card>
        <CardTitle title="Expenses" subtitle={`${filtered.length} records`} action={<button type="button" onClick={() => setAdding(true)} className="pms-btn-primary px-3.5 py-2.5">+ Add expense</button>} />
        <div className="mb-3 grid grid-cols-1 gap-2 md:grid-cols-2">
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Vendor, category or ID…" aria-label="Search expenses" className={inputClass()} />
          <button type="button" className="pms-btn-ghost px-3 py-2.5" onClick={() => setQ('')}>Clear</button>
        </div>
        <div className="overflow-x-auto">
          <table className="pms-table min-w-[680px]">
            <thead><tr><th>ID</th><th>Category</th><th>Vendor</th><th>Date</th><th>Status</th><th className="text-right">Amount</th><th><span className="sr-only">Approve</span></th></tr></thead>
            <tbody>
              {filtered.map((e) => (
                <tr key={e.id}>
                  <td className="tnum font-mono font-semibold">{e.id}</td>
                  <td>{e.category}</td>
                  <td style={{ color: 'var(--color-ink-secondary)' }}>{e.vendor}<span className="block text-[12px]">{e.notes}</span></td>
                  <td style={{ color: 'var(--color-ink-secondary)' }}>{e.date}</td>
                  <td><Badge tone={expenseTone(e.status)}>{e.status}</Badge></td>
                  <td className="tnum text-right font-semibold">${formatMoney(e.amount)}</td>
                  <td>
                    {e.status === 'Pending' ? (
                      <span className="flex gap-1.5">
                        <button type="button" className="pms-btn-ghost px-2.5 py-1.5" onClick={() => { setRows((p) => p.map((x) => (x.id === e.id ? { ...x, status: 'Approved' } : x))); toast(`Approved ${e.id} (demo)`); }}>Approve</button>
                        <button type="button" className="px-2 py-1.5 text-[12px] font-semibold underline" style={{ color: 'var(--color-danger-text)' }} onClick={() => { setRows((p) => p.map((x) => (x.id === e.id ? { ...x, status: 'Rejected' } : x))); toast(`Rejected ${e.id} (demo)`, { tone: 'warning' }); }}>Reject</button>
                      </span>
                    ) : null}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {filtered.length === 0 ? <p className="pms-helper py-6 text-center">No expenses match.</p> : null}
        </div>
      </Card>
      <Modal open={adding} onClose={() => setAdding(false)} title="Add expense" subtitle="Demo only — pending on this screen">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Field label="Category">
            <select value={category} onChange={(e) => setCategory(e.target.value)} className={inputClass()}>
              {['Housekeeping', 'Maintenance', 'Food & Beverage', 'Utilities', 'Marketing', 'Payroll', 'Other'].map((c) => <option key={c}>{c}</option>)}
            </select>
          </Field>
          <Field label="Vendor"><input value={vendor} onChange={(e) => setVendor(e.target.value)} placeholder="Vendor name" className={inputClass()} /></Field>
          <Field label="Amount ($)"><input type="number" min={0} value={amount} onChange={(e) => setAmount(Number(e.target.value))} className={inputClass('tnum')} /></Field>
          <Field label="Notes"><input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Optional note" className={inputClass()} /></Field>
          <div className="flex gap-2 sm:col-span-2">
            <button type="button" className="pms-btn-ghost flex-1 px-4 py-2.5" onClick={() => setAdding(false)}>Cancel</button>
            <button type="button" className="pms-btn-primary flex-[2] px-4 py-2.5" onClick={add}>Submit (demo)</button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
