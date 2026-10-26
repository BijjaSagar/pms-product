import * as Lucide from 'lucide-react';
import type { SyncSettings } from './types';

interface Props {
  settings: SyncSettings;
  onChange: (key: keyof SyncSettings, value: boolean | string) => void;
}

const RULES: Array<{ key: keyof Pick<SyncSettings, 'availability' | 'rates' | 'restrictions' | 'minStay' | 'stopSell'>; label: string; detail: string; icon: Lucide.LucideIcon }> = [
  { key: 'availability', label: 'Availability', detail: 'Room inventory and allotments', icon: Lucide.BedDouble },
  { key: 'rates', label: 'Rates', detail: 'Base rates and rate-plan changes', icon: Lucide.Tag },
  { key: 'restrictions', label: 'Restrictions', detail: 'Closed-to-arrival and departure rules', icon: Lucide.LockKeyhole },
  { key: 'minStay', label: 'Minimum stay', detail: 'Minimum-night requirements', icon: Lucide.Moon },
  { key: 'stopSell', label: 'Stop sell', detail: 'Close dates to new channel bookings', icon: Lucide.Ban },
];

export function RestrictionsPanel({ settings, onChange }: Props) {
  return (
    <section className="pms-card overflow-hidden" aria-labelledby="sync-rules-title">
      <div className="flex items-center gap-2.5 border-b px-4 py-4 sm:px-5" style={{ borderColor: 'var(--color-border)' }}>
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-tr from-primary to-dark-accent text-white shadow-xs shadow-primary/20">
          <Lucide.Sliders size={18} strokeWidth={2.4} />
        </div>
        <div>
          <h2 id="sync-rules-title" className="text-sm font-bold text-ink tracking-tight">Sync Rules</h2>
          <p className="text-[11px] text-ink-muted mt-0.5">Choose which property changes are sent to connected channels</p>
        </div>
      </div>
      <div className="divide-y" style={{ borderColor: 'var(--color-divider)' }}>
        {RULES.map(({ key, label, detail, icon: Icon }) => (
          <div key={key} className="flex items-center justify-between gap-4 px-4 py-4 sm:px-5">
            <div className="flex min-w-0 items-center gap-3"><span className="flex h-9 w-9 flex-none items-center justify-center rounded-control bg-primary/10 text-primary"><Icon size={16} /></span><div className="min-w-0"><p className="text-xs font-semibold text-ink">{label}</p><p className="mt-0.5 text-[11px] text-ink-muted">{detail}</p></div></div>
            <label className="inline-flex flex-none items-center gap-2 text-[11px] font-semibold text-ink-secondary"><input type="checkbox" role="switch" checked={settings[key]} onChange={(event) => onChange(key, event.target.checked)} aria-label={`Sync ${label}`} className="h-4 w-4 accent-primary" />{settings[key] ? 'On' : 'Off'}</label>
          </div>
        ))}
      </div>
      <div className="border-t px-4 py-3 text-[11px] text-ink-muted sm:px-5" style={{ borderColor: 'var(--color-divider)' }}>Rules are saved locally in this demo. Paused channels will not receive updates.</div>
    </section>
  );
}
