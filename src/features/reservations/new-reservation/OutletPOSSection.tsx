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
    <section className="min-w-0 bg-surface rounded-3xl border border-border/80 p-5 sm:p-6 shadow-xs flex flex-col gap-4">
      <div className="flex flex-col gap-3 border-b border-divider pb-3 2xl:flex-row 2xl:items-center 2xl:justify-between">
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-tr from-warning-text to-warning-border text-white shadow-xs shadow-warning-text/20"><Lucide.Receipt size={17} /></div>
          <div><h2 className="text-[14px] md:max-[1023px]:text-[13px] lg:max-[1439px]:text-[12px] min-[1440px]:text-[13px] font-bold text-ink-secondary tracking-tight">Outlet & Point of Sale Charges</h2><p className="text-[12px] md:max-[1023px]:text-[11px] lg:max-[1439px]:text-[11px] min-[1440px]:text-[12px] text-ink-muted mt-0.5">Pre-assign restaurant, bar, spa, laundry or transport charges to this booking.</p></div>
        </div>
        <span className="rounded-full bg-muted-surface px-2.5 py-1 text-[10px] md:max-[1023px]:text-[10px] lg:max-[1439px]:text-[10px] min-[1440px]:text-[10px] font-bold text-ink-secondary">{addons.length} item(s) · ₹{addonTotal.toLocaleString('en-IN')}</span>
      </div>

      {noPost && <div className="flex items-start gap-2 rounded-xl border border-warning-border bg-warning-bg p-3 text-[12px] md:max-[1023px]:text-[11px] lg:max-[1439px]:text-[11px] min-[1440px]:text-[12px] leading-relaxed text-warning-text" role="status"><Lucide.Info size={14} className="mt-0.5 flex-none" /><span><strong>No Post is enabled.</strong> Add-ons are marked for direct settlement and won’t be routed to a room folio.</span></div>}

      <div>
        <div className="mb-3 flex items-center justify-between gap-2"><h3 className="text-[14px] md:max-[1023px]:text-[13px] lg:max-[1439px]:text-[12px] min-[1440px]:text-[13px] font-bold text-ink">Available services</h3><span className="text-[10px] md:max-[1023px]:text-[10px] lg:max-[1439px]:text-[10px] min-[1440px]:text-[10px] text-ink-muted">Demo outlet catalog</span></div>
        <div className="mb-3 flex gap-1.5 overflow-x-auto pb-1" role="group" aria-label="Filter POS catalog by outlet">
          {[{ id: 'all', label: 'All outlets' }, ...outlets.map((id) => ({ id, label: outletNames.get(id) ?? id }))].map((outlet) => (
            <button key={outlet.id} type="button" onClick={() => setActiveOutlet(outlet.id)} aria-pressed={activeOutlet === outlet.id} className={`min-h-[32px] flex-none rounded-full border px-3 text-[12px] md:max-[1023px]:text-[11px] lg:max-[1439px]:text-[11px] min-[1440px]:text-[12px] font-semibold transition-colors ${activeOutlet === outlet.id ? 'border-[var(--color-primary)] bg-[var(--color-primary)] text-white' : 'border-border bg-surface text-ink-secondary hover:bg-page'}`}>{outlet.label}</button>
          ))}
        </div>
        <div className="grid gap-2 sm:grid-cols-2 2xl:grid-cols-3">
          {visibleCatalog.map((item) => (
            <article key={item.id} className="flex items-center justify-between gap-3 rounded-xl border border-border/80 bg-page/50 p-3">
              <div className="flex min-w-0 items-center gap-2.5"><span className="flex h-8 w-8 flex-none items-center justify-center rounded-lg bg-surface text-[var(--color-primary)] shadow-xs"><Lucide.Utensils size={15} /></span><div className="min-w-0"><p className="truncate text-[12px] md:max-[1023px]:text-[11px] lg:max-[1439px]:text-[11px] min-[1440px]:text-[12px] font-bold text-ink">{item.name}</p><p className="mt-0.5 truncate text-[10px] md:max-[1023px]:text-[10px] lg:max-[1439px]:text-[10px] min-[1440px]:text-[10px] text-ink-secondary">{item.outletName} · {item.description}</p><p className="mt-1 text-[12px] md:max-[1023px]:text-[11px] lg:max-[1439px]:text-[11px] min-[1440px]:text-[12px] font-semibold text-ink">₹{item.unitPrice.toLocaleString('en-IN')}</p></div></div>
              <button type="button" onClick={() => onAdd(item)} aria-label={`Add ${item.name}`} className="flex h-8 w-8 flex-none items-center justify-center rounded-lg border border-border bg-surface text-[var(--color-primary)] transition-colors hover:bg-primary/5"><Lucide.Plus size={15} /></button>
            </article>
          ))}
        </div>
      </div>

      <div className="border-t border-divider pt-3">
        <div className="mb-2 flex items-center justify-between"><h3 className="text-[14px] md:max-[1023px]:text-[13px] lg:max-[1439px]:text-[12px] min-[1440px]:text-[13px] font-bold text-ink">Booking add-ons</h3><span className="text-[10px] md:max-[1023px]:text-[10px] lg:max-[1439px]:text-[10px] min-[1440px]:text-[10px] text-ink-muted">Not posted until check-in</span></div>
        {addons.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border bg-page/40 p-6 text-center"><Lucide.PackageOpen size={22} className="mx-auto text-ink-muted" /><p className="mt-2 text-[12px] md:max-[1023px]:text-[11px] lg:max-[1439px]:text-[11px] min-[1440px]:text-[12px] font-semibold text-ink">No add-ons selected</p><p className="mt-1 text-[12px] md:max-[1023px]:text-[11px] lg:max-[1439px]:text-[11px] min-[1440px]:text-[12px] text-ink-secondary">Choose a service above to add it to this booking.</p></div>
        ) : (
          <div className="flex flex-col divide-y divide-divider">
            {addons.map((addon) => (
              <div key={addon.id} className="grid grid-cols-1 items-center gap-2 py-3 sm:grid-cols-2 2xl:grid-cols-[minmax(0,1fr)_130px_115px_90px_32px]">
                <div className="min-w-0 sm:col-span-2 2xl:col-span-1"><p className="truncate text-[12px] md:max-[1023px]:text-[11px] lg:max-[1439px]:text-[11px] min-[1440px]:text-[12px] font-semibold text-ink">{addon.name}</p><p className="mt-0.5 text-[10px] md:max-[1023px]:text-[10px] lg:max-[1439px]:text-[10px] min-[1440px]:text-[10px] text-ink-secondary">{addon.outletName} · ₹{addon.unitPrice.toLocaleString('en-IN')} each</p></div>
                <label className="flex flex-col gap-1 text-[10px] md:max-[1023px]:text-[10px] lg:max-[1439px]:text-[10px] min-[1440px]:text-[10px] font-bold uppercase text-ink-secondary">Room
                  <select value={addon.roomRequirementId} onChange={(event) => onUpdate(addon.id, { roomRequirementId: event.target.value })} className="rounded-lg border border-border bg-surface text-[12px] md:max-[1023px]:text-[11px] lg:max-[1439px]:text-[11px] min-[1440px]:text-[12px] font-medium normal-case text-ink min-h-[34px] md:min-h-[32px] px-2.5 py-1">
                    {requirements.map((room) => <option key={room.id} value={room.id}>Room {room.roomIndex} · {room.category}</option>)}
                  </select>
                </label>
                <label className="flex flex-col gap-1 text-[10px] md:max-[1023px]:text-[10px] lg:max-[1439px]:text-[10px] min-[1440px]:text-[10px] font-bold uppercase text-ink-secondary">Billing route
                  <select value={noPost ? 'Direct Settlement' : addon.billingRoute === 'Default' ? defaultBillingRoute : addon.billingRoute} disabled={noPost} onChange={(event) => onUpdate(addon.id, { billingRoute: event.target.value as OutletAddonLine['billingRoute'] })} className="rounded-lg border border-border bg-surface text-[12px] md:max-[1023px]:text-[11px] lg:max-[1439px]:text-[11px] min-[1440px]:text-[12px] font-medium normal-case text-ink disabled:bg-muted-surface min-h-[34px] md:min-h-[32px] px-2.5 py-1">
                    <option value="To Guest">Guest</option><option value="To Company">Company</option><option value="To Travel Agent">Travel agent</option><option value="Direct Settlement">Direct settlement</option>
                  </select>
                </label>
                <label className="flex flex-col gap-1 text-[10px] md:max-[1023px]:text-[10px] lg:max-[1439px]:text-[10px] min-[1440px]:text-[10px] font-bold uppercase text-ink-secondary">Qty
                  <input type="number" min={1} max={99} value={addon.quantity} onChange={(event) => onUpdate(addon.id, { quantity: Math.max(1, Number(event.target.value) || 1) })} className="rounded-lg border border-border bg-surface text-center text-[12px] md:max-[1023px]:text-[11px] lg:max-[1439px]:text-[11px] min-[1440px]:text-[12px] font-semibold text-ink min-h-[34px] md:min-h-[32px] px-2.5 py-1" />
                </label>
                <button type="button" onClick={() => onRemove(addon.id)} aria-label={`Remove ${addon.name}`} className="flex h-8 w-8 items-center justify-center rounded-lg text-ink-muted hover:bg-danger-bg hover:text-danger-text"><Lucide.Trash2 size={14} /></button>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
