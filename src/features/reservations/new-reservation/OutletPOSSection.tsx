import { useMemo, useState } from 'react';
import * as Lucide from 'lucide-react';
import type { OutletAddonLine, OutletCatalogItem, RoomRequirement } from './types';

interface Props {
  requirements: RoomRequirement[];
  addons: OutletAddonLine[];
  catalog: OutletCatalogItem[];
  noPost: boolean;
  defaultBillingRoute: OutletAddonLine['billingRoute'];
  onAdd: (item: OutletCatalogItem) => void;
  onUpdate: (id: string, updates: Partial<OutletAddonLine>) => void;
  onRemove: (id: string) => void;
}

export function OutletPOSSection({ requirements, addons, catalog, noPost, defaultBillingRoute, onAdd, onUpdate, onRemove }: Props) {
  const [activeOutlet, setActiveOutlet] = useState('all');
  const outlets = useMemo(() => Array.from(new Set(catalog.map((item) => item.outletId))), [catalog]);
  const outletNames = useMemo(() => new Map(catalog.map((item) => [item.outletId, item.outletName])), [catalog]);
  const visibleCatalog = catalog.filter((item) => activeOutlet === 'all' || item.outletId === activeOutlet);
  const addonTotal = addons.reduce((sum, addon) => sum + addon.unitPrice * addon.quantity, 0);

  return (
    <section className="bg-white rounded-3xl border border-slate-200/80 p-5 sm:p-6 shadow-xs flex flex-col gap-4">
      <div className="flex flex-col gap-3 border-b border-slate-100 pb-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-amber-50 text-amber-600"><Lucide.Receipt size={16} /></div>
          <div><h2 className="text-sm font-bold text-slate-900">Outlet & Point of Sale Charges</h2><p className="text-[11px] text-slate-500">Pre-assign restaurant, bar, spa, laundry or transport charges to this booking.</p></div>
        </div>
        <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-bold text-slate-600">{addons.length} item(s) · ₹{addonTotal.toLocaleString('en-IN')}</span>
      </div>

      {noPost && <div className="flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 p-3 text-[11px] leading-relaxed text-amber-800" role="status"><Lucide.Info size={14} className="mt-0.5 flex-none" /><span><strong>No Post is enabled.</strong> Add-ons are marked for direct settlement and won’t be routed to a room folio.</span></div>}

      <div>
        <div className="mb-3 flex items-center justify-between gap-2"><h3 className="text-xs font-bold text-slate-800">Available services</h3><span className="text-[10px] text-slate-400">Demo outlet catalog</span></div>
        <div className="mb-3 flex gap-1.5 overflow-x-auto pb-1" role="group" aria-label="Filter POS catalog by outlet">
          {[{ id: 'all', label: 'All outlets' }, ...outlets.map((id) => ({ id, label: outletNames.get(id) ?? id }))].map((outlet) => (
            <button key={outlet.id} type="button" onClick={() => setActiveOutlet(outlet.id)} aria-pressed={activeOutlet === outlet.id} className={`min-h-[32px] flex-none rounded-full border px-3 text-[11px] font-semibold transition-colors ${activeOutlet === outlet.id ? 'border-[var(--color-primary)] bg-[var(--color-primary)] text-white' : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'}`}>{outlet.label}</button>
          ))}
        </div>
        <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
          {visibleCatalog.map((item) => (
            <article key={item.id} className="flex items-center justify-between gap-3 rounded-xl border border-slate-200/80 bg-slate-50/50 p-3">
              <div className="flex min-w-0 items-center gap-2.5"><span className="flex h-8 w-8 flex-none items-center justify-center rounded-lg bg-white text-[var(--color-primary)] shadow-xs"><Lucide.Utensils size={15} /></span><div className="min-w-0"><p className="truncate text-xs font-bold text-slate-900">{item.name}</p><p className="mt-0.5 truncate text-[10px] text-slate-500">{item.outletName} · {item.description}</p><p className="mt-1 text-[11px] font-semibold text-slate-700">₹{item.unitPrice.toLocaleString('en-IN')}</p></div></div>
              <button type="button" onClick={() => onAdd(item)} aria-label={`Add ${item.name}`} className="flex h-8 w-8 flex-none items-center justify-center rounded-lg border border-slate-200 bg-white text-[var(--color-primary)] transition-colors hover:bg-primary/5"><Lucide.Plus size={15} /></button>
            </article>
          ))}
        </div>
      </div>

      <div className="border-t border-slate-100 pt-3">
        <div className="mb-2 flex items-center justify-between"><h3 className="text-xs font-bold text-slate-800">Booking add-ons</h3><span className="text-[10px] text-slate-400">Not posted until check-in</span></div>
        {addons.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50/40 p-6 text-center"><Lucide.PackageOpen size={22} className="mx-auto text-slate-400" /><p className="mt-2 text-xs font-semibold text-slate-700">No add-ons selected</p><p className="mt-1 text-[11px] text-slate-500">Choose a service above to add it to this booking.</p></div>
        ) : (
          <div className="flex flex-col divide-y divide-slate-100">
            {addons.map((addon) => (
              <div key={addon.id} className="grid grid-cols-1 items-center gap-2 py-3 sm:grid-cols-[minmax(0,1fr)_130px_115px_90px_32px]">
                <div className="min-w-0"><p className="truncate text-xs font-semibold text-slate-900">{addon.name}</p><p className="mt-0.5 text-[10px] text-slate-500">{addon.outletName} · ₹{addon.unitPrice.toLocaleString('en-IN')} each</p></div>
                <label className="flex flex-col gap-1 text-[9px] font-bold uppercase text-slate-500 sm:text-[9px]">Room
                  <select value={addon.roomRequirementId} onChange={(event) => onUpdate(addon.id, { roomRequirementId: event.target.value })} className="rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-xs font-medium normal-case text-slate-800">
                    {requirements.map((room) => <option key={room.id} value={room.id}>Room {room.roomIndex} · {room.category}</option>)}
                  </select>
                </label>
                <label className="flex flex-col gap-1 text-[9px] font-bold uppercase text-slate-500">Billing route
                  <select value={noPost ? 'Direct Settlement' : addon.billingRoute === 'Default' ? defaultBillingRoute : addon.billingRoute} disabled={noPost} onChange={(event) => onUpdate(addon.id, { billingRoute: event.target.value as OutletAddonLine['billingRoute'] })} className="rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-xs font-medium normal-case text-slate-800 disabled:bg-slate-100">
                    <option value="To Guest">Guest</option><option value="To Company">Company</option><option value="To Travel Agent">Travel agent</option><option value="Direct Settlement">Direct settlement</option>
                  </select>
                </label>
                <label className="flex flex-col gap-1 text-[9px] font-bold uppercase text-slate-500">Qty
                  <input type="number" min={1} max={99} value={addon.quantity} onChange={(event) => onUpdate(addon.id, { quantity: Math.max(1, Number(event.target.value) || 1) })} className="rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-center text-xs font-semibold text-slate-800" />
                </label>
                <button type="button" onClick={() => onRemove(addon.id)} aria-label={`Remove ${addon.name}`} className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-rose-50 hover:text-rose-600"><Lucide.Trash2 size={14} /></button>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
