import * as Lucide from 'lucide-react';
import type { BillingPreferences, BillingRoute } from './types';

interface Props {
  preferences: BillingPreferences;
  totalsByRoute: Record<string, number>;
  onChange: (updates: Partial<BillingPreferences>) => void;
}

const ROOM_ROUTES: Array<Exclude<BillingRoute, 'Default' | 'Direct Settlement'>> = ['To Guest', 'To Company', 'To Travel Agent'];
const EXTRA_ROUTES: Array<Exclude<BillingRoute, 'Default'>> = ['To Guest', 'To Company', 'To Travel Agent', 'Direct Settlement'];

export function BillingPreferencesSection({ preferences, totalsByRoute, onChange }: Props) {
  const needsCompany = preferences.billToCompany || preferences.roomBillTo === 'To Company' || preferences.extrasBillTo === 'To Company';
  return (
    <section className="bg-surface rounded-3xl border border-border/80 p-5 sm:p-6 shadow-xs flex flex-col gap-4">
      <div className="flex items-center gap-2.5 border-b border-divider pb-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-tr from-primary to-dark-accent text-white shadow-xs shadow-primary/20"><Lucide.Sliders size={17} /></div>
        <div><h2 className="text-sm font-bold text-ink tracking-tight">Billing Routing & Corporate Invoicing</h2><p className="text-[11px] text-ink-muted mt-0.5">Choose who pays for room charges and outlet add-ons.</p></div>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <label className="flex flex-col gap-1.5 text-[11px] font-bold uppercase tracking-wider text-ink-secondary">Room charges billed to
          <select value={preferences.roomBillTo} onChange={(event) => onChange({ roomBillTo: event.target.value as BillingPreferences['roomBillTo'], ...(event.target.value === 'To Company' ? { billToCompany: true } : {}) })} className="w-full rounded-xl border border-border bg-page/50 px-3 py-2 text-xs font-semibold normal-case text-ink focus:border-[var(--color-primary)] focus:outline-none">
            {ROOM_ROUTES.map((route) => <option key={route} value={route}>{route === 'To Guest' ? 'Guest master folio' : route === 'To Company' ? 'Company account' : 'Travel agent / OTA'}</option>)}
          </select>
        </label>
        <label className="flex flex-col gap-1.5 text-[11px] font-bold uppercase tracking-wider text-ink-secondary">Outlet add-ons billed to
          <select value={preferences.noPost ? 'Direct Settlement' : preferences.extrasBillTo} disabled={preferences.noPost} onChange={(event) => onChange({ extrasBillTo: event.target.value as BillingPreferences['extrasBillTo'], ...(event.target.value === 'To Company' ? { billToCompany: true } : {}) })} className="w-full rounded-xl border border-border bg-page/50 px-3 py-2 text-xs font-semibold normal-case text-ink focus:border-[var(--color-primary)] focus:outline-none disabled:bg-muted-surface">
            {EXTRA_ROUTES.map((route) => <option key={route} value={route}>{route === 'To Guest' ? 'Guest master folio' : route === 'To Company' ? 'Company account' : route === 'To Travel Agent' ? 'Travel agent / OTA' : 'Direct settlement'}</option>)}
          </select>
        </label>
      </div>

      <div className="flex flex-col gap-3 border-t border-divider pt-3 text-xs">
        <label className="inline-flex items-center gap-2 font-semibold text-ink"><input type="checkbox" checked={preferences.billToCompany} onChange={(event) => onChange(event.target.checked
          ? { billToCompany: true, roomBillTo: 'To Company', extrasBillTo: preferences.noPost ? 'Direct Settlement' : 'To Company' }
          : { billToCompany: false, roomBillTo: preferences.roomBillTo === 'To Company' ? 'To Guest' : preferences.roomBillTo, extrasBillTo: preferences.extrasBillTo === 'To Company' ? 'To Guest' : preferences.extrasBillTo })} className="h-4 w-4 rounded border-ink-disabled accent-[var(--color-primary)]" /><span>Use a corporate account for this booking</span></label>
        {needsCompany && <div className="grid grid-cols-1 gap-3 rounded-xl border border-border/80 bg-page/50 p-3 sm:grid-cols-2">
          <label className="flex flex-col gap-1 text-[10px] font-bold uppercase tracking-wider text-ink-secondary">Company name<input type="text" value={preferences.companyName} onChange={(event) => onChange({ companyName: event.target.value })} placeholder="Company or account name" className="rounded-lg border border-border bg-surface px-3 py-2 text-xs font-medium normal-case text-ink" /></label>
          <label className="flex flex-col gap-1 text-[10px] font-bold uppercase tracking-wider text-ink-secondary">Corporate GSTIN<input type="text" value={preferences.companyGst} onChange={(event) => onChange({ companyGst: event.target.value.toUpperCase() })} placeholder="GSTIN (optional)" className="rounded-lg border border-border bg-surface px-3 py-2 font-mono text-xs font-medium normal-case text-ink" /></label>
        </div>}
        <label className="inline-flex items-start gap-2 font-semibold text-ink"><input type="checkbox" checked={preferences.noPost} onChange={(event) => onChange({ noPost: event.target.checked, ...(event.target.checked ? { extrasBillTo: 'Direct Settlement' } : {}) })} className="mt-0.5 h-4 w-4 rounded border-ink-disabled accent-[var(--color-primary)]" /><span>No Post <span className="block text-[10px] font-normal text-ink-secondary">Outlet purchases must be settled directly and cannot be charged to a room.</span></span></label>
      </div>

      <div className="rounded-2xl border border-border/80 bg-page/60 p-3.5">
        <div className="mb-2 flex items-center gap-2 text-xs font-bold text-ink"><Lucide.ReceiptText size={14} className="text-[var(--color-primary)]" />Estimated billing split</div>
        <div className="flex flex-col gap-1.5 text-[11px]">
          {Object.entries(totalsByRoute).map(([route, amount]) => <div key={route} className="flex items-center justify-between gap-3 text-ink-secondary"><span>{route}</span><span className="font-mono font-semibold text-ink">₹{amount.toLocaleString('en-IN')}.00</span></div>)}
        </div>
      </div>
    </section>
  );
}
