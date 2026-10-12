import { useState } from 'react';
import { PRESET_LIST } from '../theme/presets';
import { useTheme } from '../theme/useTheme';
import { PROPERTY } from '../data/mock';
import { Card, CardTitle } from '../components/ui';
import { Field, Tabs } from '../components/controls';
import { inputClass } from '../components/inputClass';
import { toast } from '../components/toastStore';

export function Settings({ onOpenThemes }: { onOpenThemes: () => void }) {
  const { preset, setPreset } = useTheme();
  const [tab, setTab] = useState<'property' | 'policies' | 'notifications' | 'appearance'>('property');
  const [tax, setTax] = useState<number>(PROPERTY.taxRate);
  const [checkIn, setCheckIn] = useState<string>(PROPERTY.checkInTime);
  const [checkOut, setCheckOut] = useState<string>(PROPERTY.checkOutTime);
  const [email, setEmail] = useState(true);
  const [sms, setSms] = useState(false);
  const [hkAlerts, setHkAlerts] = useState(true);

  const save = (what: string) => toast(`${what} saved (demo)`, { detail: 'Local demo change — backend configuration applies in the full build.' });

  return (
    <div className="flex flex-col gap-4">
      <Tabs
        label="Settings sections"
        tabs={[
          { id: 'property', label: 'Property' },
          { id: 'policies', label: 'Policies & Tax' },
          { id: 'notifications', label: 'Notifications' },
          { id: 'appearance', label: 'Appearance' },
        ]}
        active={tab}
        onChange={setTab}
      />

      {tab === 'property' && (
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
          <Card>
            <CardTitle title="Property information" subtitle="Public details shown on folios and invoices" />
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <Field label="Property name"><input defaultValue={PROPERTY.name} className={inputClass()} aria-label="Property name" /></Field>
              <Field label="Tagline"><input defaultValue={PROPERTY.tagline} className={inputClass()} aria-label="Tagline" /></Field>
              <div className="sm:col-span-2"><Field label="Address"><input defaultValue={PROPERTY.address} className={inputClass()} aria-label="Address" /></Field></div>
              <Field label="Phone"><input defaultValue={PROPERTY.phone} inputMode="tel" className={inputClass()} aria-label="Phone" /></Field>
              <Field label="Email"><input defaultValue={PROPERTY.email} inputMode="email" className={inputClass()} aria-label="Email" /></Field>
            </div>
            <button type="button" className="pms-btn-primary mt-4 px-4 py-2.5" onClick={() => save('Property details')}>Save (demo)</button>
          </Card>
          <Card>
            <CardTitle title="Invoice details" subtitle="Footer blocks for printed bills" />
            <div className="grid grid-cols-1 gap-3">
              <Field label="Invoice prefix" hint="Folio numbers, receipts and invoices"><input defaultValue="INV-" className={inputClass('font-mono')} aria-label="Invoice prefix" /></Field>
              <Field label="Payment terms"><input defaultValue="Due on receipt. Thank you for staying with us." className={inputClass()} aria-label="Payment terms" /></Field>
              <Field label="Tax registration"><input defaultValue="TAX-REG-0042 (placeholder)" className={inputClass()} aria-label="Tax registration" /></Field>
            </div>
            <button type="button" className="pms-btn-primary mt-4 px-4 py-2.5" onClick={() => save('Invoice details')}>Save (demo)</button>
          </Card>
        </div>
      )}

      {tab === 'policies' && (
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
          <Card>
            <CardTitle title="Operations" subtitle="Times, currency and tax" />
            <div className="grid grid-cols-2 gap-3">
              <Field label="Check-in time"><input type="time" value={checkIn} onChange={(e) => setCheckIn(e.target.value)} className={inputClass('tnum')} /></Field>
              <Field label="Check-out time"><input type="time" value={checkOut} onChange={(e) => setCheckOut(e.target.value)} className={inputClass('tnum')} /></Field>
              <Field label="Currency">
                <select defaultValue="USD" className={inputClass()} aria-label="Currency">
                  {['USD', 'EUR', 'GBP', 'INR'].map((c) => <option key={c}>{c}</option>)}
                </select>
              </Field>
              <Field label="Time zone">
                <select defaultValue={PROPERTY.timezone} className={inputClass()} aria-label="Time zone">
                  {['UTC−5', 'UTC+0', 'UTC+1', 'UTC+5:30'].map((z) => <option key={z}>{z}</option>)}
                </select>
              </Field>
              <Field label="Tax rate (%)" hint="Applied in demo price math">
                <input type="number" min={0} max={30} value={tax} onChange={(e) => setTax(Number(e.target.value))} className={inputClass('tnum')} />
              </Field>
              <Field label="Rooms / floors" hint="Structural — managed with room config">
                <input defaultValue={`${PROPERTY.rooms} rooms · ${PROPERTY.floors} floors`} readOnly aria-readonly className={inputClass()} style={{ background: 'var(--color-muted-surface)' }} />
              </Field>
            </div>
            <button type="button" className="pms-btn-primary mt-4 px-4 py-2.5" onClick={() => save('Operations')}>Save (demo)</button>
          </Card>
          <Card>
            <CardTitle title="Booking & cancellation policies" subtitle="Guest-facing terms" />
            <div className="grid grid-cols-1 gap-3">
              <Field label="Cancellation policy"><input defaultValue="Free cancellation until 48h before arrival; first night charged after." className={inputClass()} aria-label="Cancellation policy" /></Field>
              <Field label="No-show policy"><input defaultValue="First night charged to the card on file." className={inputClass()} aria-label="No-show policy" /></Field>
              <Field label="Child policy"><input defaultValue="Under 6 stay free; extra bed $25/night." className={inputClass()} aria-label="Child policy" /></Field>
            </div>
            <button type="button" className="pms-btn-primary mt-4 px-4 py-2.5" onClick={() => save('Policies')}>Save (demo)</button>
          </Card>
        </div>
      )}

      {tab === 'notifications' && (
        <Card>
          <CardTitle title="Notifications" subtitle="Arrival, payment and maintenance alerts" />
          {[
            { label: 'Email digest at 07:00', hint: 'Occupancy, arrivals and revenue summary', value: email, set: setEmail },
            { label: 'SMS for overdue folios', hint: 'Instant text when a folio goes overdue', value: sms, set: setSms },
            { label: 'Housekeeping escalations', hint: 'Overdue tasks and inspection requests', value: hkAlerts, set: setHkAlerts },
          ].map((row) => (
            <div key={row.label} className="flex items-center justify-between gap-3 border-b py-3 last:border-0" style={{ borderColor: 'var(--color-divider)' }}>
              <div>
                <p className="text-[13.5px] font-medium" style={{ color: 'var(--color-ink)' }}>{row.label}</p>
                <p className="pms-helper">{row.hint}</p>
              </div>
              <label className="flex cursor-pointer items-center gap-2">
                <span className="sr-only">{row.label}</span>
                <input type="checkbox" checked={row.value} onChange={(e) => row.set(e.target.checked)} className="h-5 w-5 accent-[var(--color-primary)]" />
              </label>
            </div>
          ))}
          <button type="button" className="pms-btn-primary mt-4 px-4 py-2.5" onClick={() => save('Notification preferences')}>Save (demo)</button>
        </Card>
      )}

      {tab === 'appearance' && (
        <Card>
          <CardTitle title="Appearance" subtitle="Theme applies to every page instantly" />
          <div className="grid grid-cols-3 gap-2" role="radiogroup" aria-label="Quick preset">
            {PRESET_LIST.map((p) => (
              <button
                key={p.id}
                type="button"
                role="radio"
                aria-checked={preset === p.id}
                title={p.name}
                onClick={() => setPreset(p.id)}
                className="rounded-[10px] border p-2"
                style={{
                  borderColor: preset === p.id ? 'var(--color-primary)' : 'var(--color-border)',
                  background: preset === p.id ? 'var(--color-hover-surface)' : 'var(--color-surface)',
                  boxShadow: preset === p.id ? '0 0 0 1px var(--color-primary)' : 'none',
                }}
              >
                <span className="flex gap-1" aria-hidden="true">
                  {p.swatch.slice(0, 4).map((c) => (
                    <span key={c} className="h-4 flex-1 rounded-full" style={{ background: c }} />
                  ))}
                </span>
                <span className="mt-1.5 block truncate text-left text-[11px] font-semibold" style={{ color: 'var(--color-ink)' }}>
                  {preset === p.id ? '✓ ' : ''}
                  {p.name.split(' ')[0]} {p.name.split(' ')[1] ?? ''}
                </span>
              </button>
            ))}
          </div>
          <button type="button" onClick={onOpenThemes} className="pms-btn-primary mt-4 w-full px-4 py-2.5">
            Open full theme customizer
          </button>
        </Card>
      )}
    </div>
  );
}
