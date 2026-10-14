import { useCallback, useState } from 'react';
import { PRESET_LIST } from '../theme/presets';
import { useTheme } from '../theme/useTheme';
import { Card, CardTitle } from '../components/ui';
import { Field, Tabs } from '../components/controls';
import { inputClass } from '../components/inputClass';
import { toast } from '../components/toastStore';
import { adminApi, propertyApi } from '../lib/api/pms';
import { useApiResource } from '../lib/api/useApiResource';
import { displayApiError } from '../lib/api/client';
import { useAuth } from '../features/auth/AuthContext';
import type { TaxRuleRow } from '../lib/api/pms';

export function Settings({ onOpenThemes }: { onOpenThemes: () => void }) {
  const { me, can } = useAuth();
  const loadSettings = useCallback(async () => {
    const [properties, taxRules] = await Promise.all([
      can('property.read') ? propertyApi.list() : Promise.resolve([]),
      can('invoice.read') ? adminApi.taxRules() : Promise.resolve([]),
    ]);
    return {
      property: properties.find((property) => property.id === me?.activePropertyId) ?? null,
      taxRules,
    };
  }, [can, me?.activePropertyId]);
  const resource = useApiResource(loadSettings);
  const [propertyOverrides, setPropertyOverrides] = useState<Partial<{ name: string; address: string; city: string; currency: string; timezone: string; checkIn: string; checkOut: string }>>({});
  const { preset, setPreset } = useTheme();
  const [tab, setTab] = useState<'property' | 'policies' | 'notifications' | 'appearance'>('property');
  const [taxOverride, setTaxOverride] = useState<number | null>(null);
  const [email, setEmail] = useState(true);
  const [sms, setSms] = useState(false);
  const [hkAlerts, setHkAlerts] = useState(true);

  const [saving, setSaving] = useState(false);
  const property = resource.data?.property;
  const propertyName = propertyOverrides.name ?? property?.name ?? '';
  const address = propertyOverrides.address ?? property?.addressLine1 ?? '';
  const city = propertyOverrides.city ?? property?.city ?? '';
  const currency = propertyOverrides.currency ?? property?.currencyCode ?? 'INR';
  const timezone = propertyOverrides.timezone ?? property?.timezone ?? 'Asia/Kolkata';
  const checkIn = propertyOverrides.checkIn ?? property?.checkInTime ?? '14:00';
  const checkOut = propertyOverrides.checkOut ?? property?.checkOutTime ?? '11:00';
  const activeTax = resource.data?.taxRules.find((rule) => rule.isActive);
  const tax = taxOverride ?? Number(activeTax?.ratePercent ?? 0);

  const saveProperty = async () => {
    if (!me?.activePropertyId) return;
    setSaving(true);
    try {
      await propertyApi.update(me.activePropertyId, { name: propertyName, addressLine1: address, city, currencyCode: currency, timezone, checkInTime: checkIn, checkOutTime: checkOut });
      resource.refresh();
      toast('Property settings saved', { detail: 'Supported property fields were updated.', tone: 'success' });
    } catch (error) { toast('Could not save property settings', { detail: displayApiError(error), tone: 'danger' }); }
    finally { setSaving(false); }
  };

  const saveTax = async () => {
    const current = resource.data?.taxRules.find((rule: TaxRuleRow) => rule.isActive);
    setSaving(true);
    try {
      if (current) await adminApi.updateTaxRule(current.id, { ratePercent: tax });
      else await adminApi.createTaxRule({ code: 'PROPERTY_TAX', name: 'Property tax', ratePercent: tax, appliesTo: 'ALL', isInclusive: false });
      resource.refresh();
      toast('Tax rule saved', { detail: `${tax}% tax rule updated.`, tone: 'success' });
    } catch (error) { toast('Could not save tax rule', { detail: displayApiError(error), tone: 'danger' }); }
    finally { setSaving(false); }
  };

  const saveOperations = async () => {
    if (!me?.activePropertyId) return;
    setSaving(true);
    try {
      await propertyApi.update(me.activePropertyId, { currencyCode: currency, timezone, checkInTime: checkIn, checkOutTime: checkOut });
      resource.refresh();
      toast('Operations settings saved', { detail: 'Currency, time zone, and stay times were updated.', tone: 'success' });
    } catch (error) { toast('Could not save operations settings', { detail: displayApiError(error), tone: 'danger' }); }
    finally { setSaving(false); }
  };

  const save = (what: string) => toast(`${what} is not configurable in the current backend`, { detail: 'This control remains local because no matching API endpoint exists.', tone: 'info' });

  return (
    <div className="flex flex-col gap-4">
      {resource.error ? <p role="alert" className="pms-helper">Could not load settings: {resource.error}</p> : null}
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
              <Field label="Property name"><input value={propertyName} onChange={(event) => setPropertyOverrides((old) => ({ ...old, name: event.target.value }))} className={inputClass()} aria-label="Property name" /></Field>
              <Field label="Tagline" hint="Not available in the backend"><input disabled className={inputClass()} aria-label="Tagline" /></Field>
              <div className="sm:col-span-2"><Field label="Address"><input value={address} onChange={(event) => setPropertyOverrides((old) => ({ ...old, address: event.target.value }))} className={inputClass()} aria-label="Address" /></Field></div>
              <Field label="City"><input value={city} onChange={(event) => setPropertyOverrides((old) => ({ ...old, city: event.target.value }))} className={inputClass()} aria-label="City" /></Field>
              <Field label="Contact details" hint="Phone and email are not stored by the backend"><input disabled value="Not configured" className={inputClass()} aria-label="Contact details" /></Field>
            </div>
            <button type="button" disabled={saving || !can('property.update')} className="pms-btn-primary mt-4 px-4 py-2.5 disabled:opacity-50" onClick={() => void saveProperty()}>Save property details</button>
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
              <Field label="Check-in time"><input type="time" value={checkIn} onChange={(event) => setPropertyOverrides((old) => ({ ...old, checkIn: event.target.value }))} className={inputClass('tnum')} /></Field>
              <Field label="Check-out time"><input type="time" value={checkOut} onChange={(event) => setPropertyOverrides((old) => ({ ...old, checkOut: event.target.value }))} className={inputClass('tnum')} /></Field>
              <Field label="Currency">
                <select value={currency} onChange={(event) => setPropertyOverrides((old) => ({ ...old, currency: event.target.value }))} className={inputClass()} aria-label="Currency">
                  {['USD', 'EUR', 'GBP', 'INR'].map((c) => <option key={c}>{c}</option>)}
                </select>
              </Field>
              <Field label="Time zone">
                <select value={timezone} onChange={(event) => setPropertyOverrides((old) => ({ ...old, timezone: event.target.value }))} className={inputClass()} aria-label="Time zone">
                  {[timezone, 'UTC', 'Asia/Kolkata', 'America/New_York', 'Europe/London'].filter((zone, index, list) => list.indexOf(zone) === index).map((zone) => <option key={zone}>{zone}</option>)}
                </select>
              </Field>
              <Field label="Tax rate (%)" hint="Updates the active backend tax rule">
                <input type="number" min={0} max={30} value={tax} onChange={(event) => setTaxOverride(Number(event.target.value))} className={inputClass('tnum')} />
              </Field>
              <Field label="Rooms / floors" hint="Structural — managed with room config">
                <input value="Managed in Room Inventory" readOnly aria-readonly className={inputClass()} style={{ background: 'var(--color-muted-surface)' }} />
              </Field>
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              <button type="button" disabled={saving || !can('property.update')} className="pms-btn-primary px-4 py-2.5 disabled:opacity-50" onClick={() => void saveOperations()}>Save operations</button>
              <button type="button" disabled={saving || !can('role.manage')} className="pms-btn-ghost px-4 py-2.5 disabled:opacity-50" onClick={() => void saveTax()}>Save tax rule</button>
            </div>
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
          <CardTitle title="Notifications" subtitle="Notification preferences are not exposed by the current backend API" />
          <p className="pms-helper mb-2">These preferences are display-only until notification storage and delivery are implemented.</p>
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
                 <input type="checkbox" checked={row.value} disabled onChange={(e) => row.set(e.target.checked)} className="h-5 w-5 accent-[var(--color-primary)]" />
              </label>
            </div>
          ))}
          <button type="button" disabled className="pms-btn-primary mt-4 px-4 py-2.5 opacity-50">Not available in backend</button>
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
                className="min-w-0 rounded-[10px] border p-2"
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
