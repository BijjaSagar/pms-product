import * as Lucide from 'lucide-react';
import type { BillingPreferences } from './types';

interface Props {
  preferences: BillingPreferences;
  totalsByRoute: Record<string, number>;
  onChange: (updates: Partial<BillingPreferences>) => void;
}

const BILLING_ROUTES = ['To Guest', 'To Company'] as const;

export function BillingPreferencesSection({ preferences, totalsByRoute, onChange }: Props) {
  const needsCompany = preferences.billToCompany || preferences.roomBillTo === 'To Company' || preferences.extrasBillTo === 'To Company';
  return (
    <section className="min-w-0 bg-surface rounded-3xl border border-border/80 p-5 sm:p-6 shadow-xs flex flex-col gap-4">
      <div className="flex items-center gap-2.5 border-b border-divider pb-3">
        <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-tr from-primary to-dark-accent text-white font-bold text-[12px] md:max-[1023px]:text-[11px] lg:max-[1439px]:text-[11px] min-[1440px]:text-[12px] shadow-xs shadow-primary/20">3</span>
        <h2 className="text-[14px] md:max-[1023px]:text-[13px] lg:max-[1439px]:text-[12px] min-[1440px]:text-[13px] font-bold text-ink-secondary tracking-tight">Billing Preferences</h2>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-3">
          <label className="flex flex-col gap-1.5 text-[12px] md:max-[1023px]:text-[11px] lg:max-[1439px]:text-[11px] min-[1440px]:text-[12px] font-bold tracking-wider text-ink">Room bill
            <select value={preferences.roomBillTo} onChange={(event) => {
              const roomBillTo = event.target.value as BillingPreferences['roomBillTo'];
              onChange({ roomBillTo, billToCompany: roomBillTo === 'To Company' || preferences.extrasBillTo === 'To Company' });
            }} className="w-full rounded-xl border border-border bg-page/50 font-semibold text-[12px] md:max-[1023px]:text-[11px] lg:max-[1439px]:text-[11px] min-[1440px]:text-[12px] text-ink-secondary transition-all cursor-pointer min-h-[34px] md:min-h-[32px] px-2.5 py-1">
              {BILLING_ROUTES.map((route) => <option key={route} value={route}>{route}</option>)}
            </select>
          </label>
          <label className="inline-flex items-center gap-2 text-[12px] md:max-[1023px]:text-[11px] lg:max-[1439px]:text-[11px] min-[1440px]:text-[12px] font-semibold text-ink"><input type="checkbox" checked={preferences.roomBillTo === 'To Company'} onChange={(event) => {
            const roomBillTo = event.target.checked ? 'To Company' : 'To Guest';
            onChange({ roomBillTo, billToCompany: event.target.checked || preferences.extrasBillTo === 'To Company' });
          }} className="h-4 w-4 rounded border-ink-disabled accent-[var(--color-primary)]" /><span>Bill to Guest Company</span></label>
          <label className="inline-flex items-center gap-2 text-[12px] md:max-[1023px]:text-[11px] lg:max-[1439px]:text-[11px] min-[1440px]:text-[12px] font-semibold text-ink"><input type="checkbox" checked={preferences.noPost} onChange={(event) => onChange({ noPost: event.target.checked })} className="h-4 w-4 rounded border-ink-disabled accent-[var(--color-primary)]" /><span>No Post</span></label>
        </div>
        <div className="flex flex-col gap-3">
          <label className="flex flex-col gap-1.5 text-[12px] md:max-[1023px]:text-[11px] lg:max-[1439px]:text-[11px] min-[1440px]:text-[12px] font-bold tracking-wider text-ink">Extras
            <select value={preferences.extrasBillTo} onChange={(event) => {
              const extrasBillTo = event.target.value as BillingPreferences['extrasBillTo'];
              onChange({ extrasBillTo, billToCompany: extrasBillTo === 'To Company' || preferences.roomBillTo === 'To Company' });
            }} className="w-full rounded-xl border border-border bg-page/50 font-semibold text-[12px] md:max-[1023px]:text-[11px] lg:max-[1439px]:text-[11px] min-[1440px]:text-[12px] text-ink-secondary transition-all cursor-pointer min-h-[34px] md:min-h-[32px] px-2.5 py-1">
              {BILLING_ROUTES.map((route) => <option key={route} value={route}>{route}</option>)}
            </select>
          </label>
          <label className="inline-flex items-center gap-2 text-[12px] md:max-[1023px]:text-[11px] lg:max-[1439px]:text-[11px] min-[1440px]:text-[12px] font-semibold text-ink"><input type="checkbox" checked={preferences.extrasBillTo === 'To Company'} onChange={(event) => {
            const extrasBillTo = event.target.checked ? 'To Company' : 'To Guest';
            onChange({ extrasBillTo, billToCompany: event.target.checked || preferences.roomBillTo === 'To Company' });
          }} className="h-4 w-4 rounded border-ink-disabled accent-[var(--color-primary)]" /><span>Bill to Guest Company</span></label>
        </div>
      </div>

      {needsCompany && <div className="grid grid-cols-1 gap-3 rounded-xl border border-border/80 bg-page/50 p-3 sm:grid-cols-2">
          <label className="flex flex-col gap-1 text-[10px] md:max-[1023px]:text-[10px] lg:max-[1439px]:text-[10px] min-[1440px]:text-[10px] font-bold uppercase tracking-wider text-ink-secondary">Company name<input type="text" value={preferences.companyName} onChange={(event) => onChange({ companyName: event.target.value })} placeholder="Company or account name" className="rounded-lg border border-border bg-surface text-[12px] md:max-[1023px]:text-[11px] lg:max-[1439px]:text-[11px] min-[1440px]:text-[12px] font-medium normal-case text-ink min-h-[34px] md:min-h-[32px] px-2.5 py-1" /></label>
          <label className="flex flex-col gap-1 text-[10px] md:max-[1023px]:text-[10px] lg:max-[1439px]:text-[10px] min-[1440px]:text-[10px] font-bold uppercase tracking-wider text-ink-secondary">Corporate GSTIN<input type="text" value={preferences.companyGst} onChange={(event) => onChange({ companyGst: event.target.value.toUpperCase() })} placeholder="GSTIN (optional)" className="rounded-lg border border-border bg-surface font-mono text-[12px] md:max-[1023px]:text-[11px] lg:max-[1439px]:text-[11px] min-[1440px]:text-[12px] font-medium normal-case text-ink min-h-[34px] md:min-h-[32px] px-2.5 py-1" /></label>
      </div>}

      <div className="rounded-2xl border border-border/80 bg-page/60 p-3.5">
        <div className="mb-2 flex items-center gap-2 text-[12px] md:max-[1023px]:text-[11px] lg:max-[1439px]:text-[11px] min-[1440px]:text-[12px] font-bold text-ink"><Lucide.ReceiptText size={14} className="text-[var(--color-primary)]" />Estimated billing split</div>
        <div className="flex flex-col gap-1.5 text-[12px] md:max-[1023px]:text-[11px] lg:max-[1439px]:text-[11px] min-[1440px]:text-[12px]">
          {Object.entries(totalsByRoute).map(([route, amount]) => <div key={route} className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 text-ink-secondary"><span className="min-w-0 flex-1">{route}</span><span className="shrink-0 text-right font-mono font-semibold text-ink">₹{amount.toLocaleString('en-IN')}.00</span></div>)}
        </div>
      </div>
    </section>
  );
}
