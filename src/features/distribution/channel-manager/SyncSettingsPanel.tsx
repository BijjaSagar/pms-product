import * as Lucide from 'lucide-react';
import { inputClass } from '../../../utils/styling';
import type { SyncSettings } from './types';

interface Props {
  settings: SyncSettings;
  expanded: boolean;
  onToggleExpanded: () => void;
  onChange: (key: keyof SyncSettings, value: boolean | string) => void;
  onSave: () => void;
}

const SYNC_OPTIONS: Array<{ key: keyof Pick<SyncSettings, 'availability' | 'rates' | 'restrictions' | 'minStay' | 'stopSell' | 'autoSync'>; label: string; detail: string; icon: Lucide.LucideIcon }> = [
  { key: 'availability', label: 'Availability', detail: 'Room inventory updates', icon: Lucide.BedDouble },
  { key: 'rates', label: 'Rates', detail: 'Rate and plan updates', icon: Lucide.Tag },
  { key: 'restrictions', label: 'Restrictions', detail: 'Arrival / departure rules', icon: Lucide.LockKeyhole },
  { key: 'minStay', label: 'Minimum stay', detail: 'Stay-length requirements', icon: Lucide.Moon },
  { key: 'stopSell', label: 'Stop sell', detail: 'Close dates for sale', icon: Lucide.Ban },
  { key: 'autoSync', label: 'Automatic sync', detail: 'Run every 15 minutes', icon: Lucide.RefreshCw },
];

export function SyncSettingsPanel({ settings, expanded, onToggleExpanded, onChange, onSave }: Props) {
  return (
    <section className="pms-card overflow-hidden" aria-labelledby="sync-settings-title">
      <button type="button" onClick={onToggleExpanded} aria-expanded={expanded} aria-controls="sync-settings-content" className="flex w-full items-center justify-between gap-3 p-4 text-left sm:p-5">
        <span className="flex min-w-0 items-center gap-3">
          <span className="flex h-9 w-9 flex-none items-center justify-center rounded-control bg-primary/10 text-primary"><Lucide.Settings2 size={17} /></span>
          <span className="min-w-0"><span id="sync-settings-title" className="block text-body font-bold text-ink">Global sync settings</span><span className="mt-0.5 block text-label text-ink-secondary">Choose which updates are distributed to your channels.</span></span>
        </span>
        <span className="flex flex-none items-center gap-2 text-label font-semibold text-ink-muted"><span className="hidden sm:inline">{settings.autoSync ? 'Auto-sync on' : 'Auto-sync paused'}</span><Lucide.ChevronDown size={16} className={`transition-transform ${expanded ? 'rotate-180' : ''}`} /></span>
      </button>
      {expanded && (
        <div id="sync-settings-content" className="border-t px-4 py-4 sm:px-5" style={{ borderColor: 'var(--color-divider)' }}>
          <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
            {SYNC_OPTIONS.map(({ key, label, detail, icon: Icon }) => (
              <label key={key} className="flex cursor-pointer items-center justify-between gap-3 rounded-control border p-3 transition-colors hover:bg-hover-surface" style={{ borderColor: 'var(--color-border)' }}>
                <span className="flex min-w-0 items-center gap-2.5"><Icon size={15} className="flex-none text-primary" /><span className="min-w-0"><span className="block text-label font-semibold text-ink">{label}</span><span className="mt-0.5 block text-micro text-ink-muted">{detail}</span></span></span>
                <input type="checkbox" role="switch" checked={settings[key]} onChange={(event) => onChange(key, event.target.checked)} aria-label={label} className="h-4 w-4 flex-none accent-primary" />
              </label>
            ))}
          </div>
          <div className="mt-3 grid gap-3 sm:grid-cols-[minmax(0,1fr)_180px]">
            <label className="flex flex-col gap-1.5 text-label font-semibold text-ink-secondary">Sync time zone
              <select value={settings.timeZone} onChange={(event) => onChange('timeZone', event.target.value)} className={`${inputClass()} text-label`}>
                <option value="Asia/Kolkata">(GMT+05:30) India Standard Time</option>
                <option value="UTC">(GMT+00:00) Coordinated Universal Time</option>
                <option value="Europe/Paris">(GMT+01:00) Central European Time</option>
                <option value="America/New_York">(GMT-05:00) Eastern Time</option>
                <option value="Asia/Singapore">(GMT+08:00) Singapore Time</option>
              </select>
            </label>
            <label className="flex flex-col gap-1.5 text-label font-semibold text-ink-secondary">Default markup (%)
              <input type="number" min={0} max={100} value={settings.defaultMarkup} onChange={(event) => onChange('defaultMarkup', event.target.value)} className={`${inputClass()} text-label`} />
            </label>
          </div>
          <div className="mt-4 flex flex-col gap-2 border-t pt-3 sm:flex-row sm:items-center sm:justify-between" style={{ borderColor: 'var(--color-divider)' }}>
            <p className="text-label text-ink-muted">Settings are stored in this demo session only.</p>
            <button type="button" onClick={onSave} className="pms-btn-primary min-h-[36px] px-3 py-1.5 text-label"><Lucide.Check size={14} /> Save settings</button>
          </div>
        </div>
      )}
    </section>
  );
}
