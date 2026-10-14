import { useState } from 'react';
import { RATE_PLANS, formatMoney } from '../data/mock';
import type { RatePlan } from '../data/mock';
import { Badge, Card, CardTitle } from '../components/ui';
import { Field } from '../components/controls';
import { inputClass } from '../components/inputClass';
import { Modal } from '../components/overlays';
import { toast } from '../components/toastStore';

const OCT = Array.from({ length: 14 }, (_, i) => 10 + i);

export function Rates() {
  const [plans, setPlans] = useState<RatePlan[]>(RATE_PLANS);
  const [editing, setEditing] = useState<RatePlan | null>(null);

  const save = () => {
    if (!editing) return;
    if (editing.standard <= 0 || editing.minStay < 1) {
      toast('Check the form', { detail: 'Standard rate above $0 and min stay of 1+ required.', tone: 'warning' });
      return;
    }
    setPlans((prev) => prev.map((p) => (p.id === editing.id ? editing : p)));
    setEditing(null);
    toast('Rate plan updated (demo)', { detail: 'Local screen update only.' });
  };

  return (
    <div className="flex flex-col gap-4">
      <p role="note" className="pms-helper">Rate plans and nightly rate calendar have no backend API yet. This section is a local demo and does not change booking prices.</p>
      <Card>
        <CardTitle title="Rate plans" subtitle={`${plans.filter((p) => p.active).length} active plans`} />
        <div className="overflow-x-auto">
          <table className="pms-table min-w-[860px]">
            <thead><tr><th>Plan</th><th>Applies to</th><th className="text-right">Standard</th><th className="text-right">Weekend</th><th className="text-right">Seasonal</th><th>Min stay</th><th>Meals</th><th>Status</th><th><span className="sr-only">Edit</span></th></tr></thead>
            <tbody>
              {plans.map((p) => (
                <tr key={p.id}>
                  <td>
                    <span className="block font-semibold">{p.name}</span>
                    <span className="block max-w-[240px] truncate text-[12px]" style={{ color: 'var(--color-ink-secondary)' }}>{p.cancellation} · {p.validFrom} → {p.validTo}</span>
                  </td>
                  <td style={{ color: 'var(--color-ink-secondary)' }}>{p.roomType}</td>
                  <td className="tnum text-right font-semibold">${formatMoney(p.standard)}</td>
                  <td className="tnum text-right">${formatMoney(p.weekend)}</td>
                  <td className="tnum text-right">${formatMoney(p.seasonal)}</td>
                  <td className="tnum">{p.minStay}n</td>
                  <td style={{ color: 'var(--color-ink-secondary)' }}>{p.meals}</td>
                  <td><Badge tone={p.active ? 'success' : 'neutral'}>{p.active ? 'Active' : 'Inactive'}</Badge></td>
                  <td><button type="button" className="pms-btn-ghost px-3 py-1.5" onClick={() => setEditing({ ...p })} aria-label={`Edit ${p.name}`}>Edit</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <Card>
        <CardTitle title="October rate calendar" subtitle="Best-available standard rate · demo figures" />
        <div className="overflow-x-auto">
          <div className="grid min-w-[640px] grid-cols-7 gap-1.5" role="grid" aria-label="October rate calendar">
            {OCT.map((d) => {
              const weekend = d % 7 === 0 || d % 7 === 1;
              const rate = weekend ? 214 : 186;
              return (
                <div key={d} role="gridcell" className="rounded-[10px] border p-2.5 text-center" style={{ borderColor: d === 10 ? 'var(--color-primary)' : 'var(--color-border)', background: d === 10 ? 'var(--color-hover-surface)' : 'var(--color-surface)' }}>
                  <p className="text-[11.5px] font-semibold" style={{ color: 'var(--color-ink)' }}>Oct {d}</p>
                  <p className="tnum mt-0.5 text-[14px] font-semibold" style={{ color: 'var(--color-ink)' }}>${rate}</p>
                  <p className="text-[10.5px]" style={{ color: 'var(--color-ink-muted)' }}>{weekend ? 'Weekend' : 'Standard'}</p>
                </div>
              );
            })}
          </div>
        </div>
        <p className="pms-helper mt-2">Seasonal uplift ($249) applies Dec 20 – Jan 05 in the connected build.</p>
      </Card>

      <Modal open={editing !== null} onClose={() => setEditing(null)} title={editing ? `Edit ${editing.name}` : ''} subtitle="Demo only — stored on this screen" wide>
        {editing ? (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Field label="Plan name"><input value={editing.name} onChange={(e) => setEditing({ ...editing, name: e.target.value })} className={inputClass()} /></Field>
            <Field label="Applies to"><input value={editing.roomType} onChange={(e) => setEditing({ ...editing, roomType: e.target.value })} className={inputClass()} /></Field>
            <Field label="Standard rate ($)"><input type="number" min={0} value={editing.standard} onChange={(e) => setEditing({ ...editing, standard: Number(e.target.value) })} className={inputClass('tnum')} /></Field>
            <Field label="Weekend rate ($)"><input type="number" min={0} value={editing.weekend} onChange={(e) => setEditing({ ...editing, weekend: Number(e.target.value) })} className={inputClass('tnum')} /></Field>
            <Field label="Seasonal rate ($)"><input type="number" min={0} value={editing.seasonal} onChange={(e) => setEditing({ ...editing, seasonal: Number(e.target.value) })} className={inputClass('tnum')} /></Field>
            <Field label="Minimum stay (nights)"><input type="number" min={1} value={editing.minStay} onChange={(e) => setEditing({ ...editing, minStay: Number(e.target.value) })} className={inputClass('tnum')} /></Field>
            <Field label="Meals"><input value={editing.meals} onChange={(e) => setEditing({ ...editing, meals: e.target.value })} className={inputClass()} /></Field>
            <Field label="Status">
              <select value={editing.active ? 'active' : 'inactive'} onChange={(e) => setEditing({ ...editing, active: e.target.value === 'active' })} className={inputClass()}>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </Field>
            <div className="sm:col-span-2"><Field label="Cancellation terms"><input value={editing.cancellation} onChange={(e) => setEditing({ ...editing, cancellation: e.target.value })} className={inputClass()} /></Field></div>
            <div className="flex gap-2 sm:col-span-2">
              <button type="button" className="pms-btn-ghost flex-1 px-4 py-2.5" onClick={() => setEditing(null)}>Cancel</button>
              <button type="button" className="pms-btn-primary flex-[2] px-4 py-2.5" onClick={save}>Save plan</button>
            </div>
          </div>
        ) : null}
      </Modal>
    </div>
  );
}
