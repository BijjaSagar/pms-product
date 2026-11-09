import { useState } from 'react';
import * as Lucide from 'lucide-react';
import { propertyApi } from '../../lib/api/pms';
import type { PropertyDetails, PropertyUpdate } from '../../lib/api/pms';
import { displayApiError } from '../../lib/api/client';
import { toast } from '../../utils/toast';
import { SelectField, TextField } from '../../components/primitives';
import { Field, FilterChip } from '../../components/controls';
import { Badge } from '../../components/ui';
import { FormSection, ReadOnlyNotice, SettingsHeader, ToggleRow, UnsavedBar } from './SettingsKit';

interface PropertyForm {
  name: string;
  code: string;
  propertyGroup: string;
  locationCode: string;
  googleAnalyticsTag: string;
  metaPixel: string;
  addressLine1: string;
  addressLine2: string;
  postalCode: string;
  country: string;
  state: string;
  city: string;
  primaryPhone: string;
  secondaryPhone: string;
  defaultCurrency: string;
  checkoutToleranceValue: string;
  language: string;
  locationMapUrl: string;
  latitude: string;
  longitude: string;
  propertySegment: string;
  starRating: string;
  taxType: string;
  gstn: string;
  tripAdvisorListingName: string;
  tripAdvisorPropertyId: string;
  googleListingName: string;
  trivagoListingName: string;
  propertyLegalName: string;
  corporateAddress: string;
  ignoreDecimalInBillSettlement: boolean;
  autoConfirmBookings: boolean;
}

type StringKey = { [K in keyof PropertyForm]: PropertyForm[K] extends string ? K : never }[keyof PropertyForm];
type BooleanKey = { [K in keyof PropertyForm]: PropertyForm[K] extends boolean ? K : never }[keyof PropertyForm];

interface Option {
  value: string;
  label: string;
}

const CURRENCY_OPTIONS: Option[] = [
  { value: 'INR', label: 'INR - Indian Rupee (₹)' },
  { value: 'USD', label: 'USD - US Dollar ($)' },
  { value: 'EUR', label: 'EUR - Euro (€)' },
  { value: 'GBP', label: 'GBP - British Pound (£)' },
  { value: 'AED', label: 'AED - UAE Dirham' },
];

const LANGUAGE_OPTIONS: Option[] = [
  { value: 'en', label: 'English' },
  { value: 'hi', label: 'Hindi' },
  { value: 'fr', label: 'French' },
  { value: 'de', label: 'German' },
  { value: 'es', label: 'Spanish' },
  { value: 'ar', label: 'Arabic' },
];

const SEGMENT_OPTIONS: Option[] = ['Budget', 'Economy', 'Midscale', 'Upscale', 'Luxury', 'Resort'].map((v) => ({
  value: v,
  label: v,
}));

const TAX_TYPE_OPTIONS: Option[] = ['GST', 'VAT', 'Service Tax', 'None'].map((v) => ({ value: v, label: v }));

const STAR_OPTIONS: Option[] = [1, 2, 3, 4, 5].map((n) => ({
  value: String(n),
  label: `${n} Star${n === 1 ? '' : 's'}`,
}));

const toForm = (p: PropertyDetails): PropertyForm => ({
  name: p.name,
  code: p.code,
  propertyGroup: p.propertyGroup ?? '',
  locationCode: p.locationCode ?? '',
  googleAnalyticsTag: p.googleAnalyticsTag ?? '',
  metaPixel: p.metaPixel ?? '',
  addressLine1: p.addressLine1 ?? '',
  addressLine2: p.addressLine2 ?? '',
  postalCode: p.postalCode ?? '',
  country: p.country,
  state: p.state ?? '',
  city: p.city,
  primaryPhone: p.primaryPhone ?? '',
  secondaryPhone: p.secondaryPhone ?? '',
  defaultCurrency: p.defaultCurrency,
  checkoutToleranceValue: p.checkoutToleranceValue?.toString() ?? '',
  language: p.language ?? '',
  locationMapUrl: p.locationMapUrl ?? '',
  latitude: p.latitude?.toString() ?? '',
  longitude: p.longitude?.toString() ?? '',
  propertySegment: p.propertySegment ?? '',
  starRating: p.starRating?.toString() ?? '',
  taxType: p.taxType ?? '',
  gstn: p.gstn ?? '',
  tripAdvisorListingName: p.tripAdvisorListingName ?? '',
  tripAdvisorPropertyId: p.tripAdvisorPropertyId ?? '',
  googleListingName: p.googleListingName ?? '',
  trivagoListingName: p.trivagoListingName ?? '',
  propertyLegalName: p.propertyLegalName ?? '',
  corporateAddress: p.corporateAddress ?? '',
  ignoreDecimalInBillSettlement: p.ignoreDecimalInBillSettlement,
  autoConfirmBookings: p.autoConfirmBookings,
});

/** The sections of the form, in order, for the jump links. */
const SECTIONS = [
  { id: 'pd-basic', label: 'Basic' },
  { id: 'pd-address', label: 'Address' },
  { id: 'pd-contact', label: 'Contact' },
  { id: 'pd-billing', label: 'Billing' },
  { id: 'pd-listings', label: 'Listings' },
] as const;

const jumpTo = (id: string) => {
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  document.getElementById(id)?.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' });
};

/** Blank optional fields are sent as null so they are cleared on the server. */
const optional = (value: string) => (value.trim() === '' ? null : value.trim());

/** Blank -> null; otherwise the number, or NaN when it is not one. */
const optionalNumber = (value: string) => (value.trim() === '' ? null : Number(value));

export function PropertyDetailsTab({
  property,
  canEdit,
  onSaved,
}: {
  property: PropertyDetails;
  canEdit: boolean;
  /** Called after a successful save so the header and other screens refresh. */
  onSaved: () => Promise<void>;
}) {
  const [form, setForm] = useState<PropertyForm>(() => toForm(property));
  // What the server holds; the form is "dirty" while it differs from this.
  const [baseline, setBaseline] = useState<PropertyForm>(() => toForm(property));
  const [saving, setSaving] = useState(false);
  const dirty = JSON.stringify(form) !== JSON.stringify(baseline);

  const setText = (key: StringKey, value: string) => setForm((prev) => ({ ...prev, [key]: value }));
  const setFlag = (key: BooleanKey, value: boolean) => setForm((prev) => ({ ...prev, [key]: value }));

  const text = (
    key: StringKey,
    label: string,
    opts: { required?: boolean; wide?: boolean; type?: string; placeholder?: string; upper?: boolean } = {},
  ) => (
    <Field label={label} required={opts.required} className={opts.wide ? 'sm:col-span-2' : ''}>
      <TextField
        type={opts.type ?? 'text'}
        value={form[key]}
        placeholder={opts.placeholder}
        onChange={(e) => setText(key, opts.upper ? e.target.value.toUpperCase() : e.target.value)}
        className={opts.upper ? 'uppercase' : ''}
      />
    </Field>
  );

  const select = (key: StringKey, label: string, options: Option[], opts: { required?: boolean; empty?: string } = {}) => {
    const current = form[key];
    // A stored value outside the list still shows up as the selection.
    const all = current && !options.some((o) => o.value === current) ? [{ value: current, label: current }, ...options] : options;
    return (
      <Field label={label} required={opts.required}>
        <SelectField value={current} onChange={(e) => setText(key, e.target.value)}>
          {opts.empty ? <option value="">{opts.empty}</option> : null}
          {all.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </SelectField>
      </Field>
    );
  };

  const flag = (key: BooleanKey, label: string, description: string) => (
    <ToggleRow
      label={label}
      description={description}
      checked={form[key]}
      onChange={(checked) => setFlag(key, checked)}
      className="sm:col-span-2"
    />
  );

  const handleSave = async () => {
    const required: [string, string][] = [
      [form.name, 'Name'],
      [form.code, 'Abbreviation'],
      [form.city, 'City'],
      [form.country, 'Country'],
      [form.defaultCurrency, 'Currency'],
    ];
    const missing = required.find(([value]) => value.trim() === '');
    if (missing) {
      toast(`${missing[1]} is required`, { tone: 'warning' });
      return;
    }
    const tolerance = optionalNumber(form.checkoutToleranceValue);
    if (tolerance !== null && (!Number.isInteger(tolerance) || tolerance < 0)) {
      toast('Check the checkout tolerance', { detail: 'Use a whole number of minutes, 0 or more.', tone: 'warning' });
      return;
    }
    const latitude = optionalNumber(form.latitude);
    if (latitude !== null && !(latitude >= -90 && latitude <= 90)) {
      toast('Check the latitude', { detail: 'Use a number between -90 and 90.', tone: 'warning' });
      return;
    }
    const longitude = optionalNumber(form.longitude);
    if (longitude !== null && !(longitude >= -180 && longitude <= 180)) {
      toast('Check the longitude', { detail: 'Use a number between -180 and 180.', tone: 'warning' });
      return;
    }
    if (form.gstn.trim() !== '' && !/^[0-9A-Za-z]{15}$/.test(form.gstn.trim())) {
      toast('Check the GSTN', { detail: 'It has 15 letters or digits.', tone: 'warning' });
      return;
    }

    const body: PropertyUpdate = {
      name: form.name.trim(),
      code: form.code.trim(),
      propertyGroup: optional(form.propertyGroup),
      locationCode: optional(form.locationCode),
      googleAnalyticsTag: optional(form.googleAnalyticsTag),
      metaPixel: optional(form.metaPixel),
      addressLine1: optional(form.addressLine1),
      addressLine2: optional(form.addressLine2),
      postalCode: optional(form.postalCode),
      country: form.country.trim(),
      state: optional(form.state),
      city: form.city.trim(),
      primaryPhone: optional(form.primaryPhone),
      secondaryPhone: optional(form.secondaryPhone),
      defaultCurrency: form.defaultCurrency,
      ignoreDecimalInBillSettlement: form.ignoreDecimalInBillSettlement,
      checkoutToleranceValue: tolerance,
      language: optional(form.language),
      locationMapUrl: optional(form.locationMapUrl),
      latitude,
      longitude,
      propertySegment: optional(form.propertySegment),
      starRating: optionalNumber(form.starRating),
      taxType: optional(form.taxType),
      gstn: optional(form.gstn),
      tripAdvisorListingName: optional(form.tripAdvisorListingName),
      tripAdvisorPropertyId: optional(form.tripAdvisorPropertyId),
      googleListingName: optional(form.googleListingName),
      trivagoListingName: optional(form.trivagoListingName),
      propertyLegalName: optional(form.propertyLegalName),
      corporateAddress: optional(form.corporateAddress),
      autoConfirmBookings: form.autoConfirmBookings,
    };

    setSaving(true);
    try {
      const saved = await propertyApi.update(property.id, body);
      // Show what the server stored (it upper-cases the code and GSTN).
      const next = toForm(saved);
      setForm(next);
      setBaseline(next);
      await onSaved();
      toast('Settings saved successfully', { tone: 'success' });
    } catch (err) {
      toast('Could not save settings', { detail: displayApiError(err), tone: 'danger' });
    } finally {
      setSaving(false);
    }
  };

  return (
    // A disabled fieldset disables every input, select and checkbox inside it.
    <fieldset disabled={!canEdit} className="m-0 min-w-0 border-0 p-0">
      <div className="flex flex-col gap-5">
        <SettingsHeader title="Property Details" description="Identity, address, billing and listing details" />
        {!canEdit ? <ReadOnlyNotice what="property details" /> : null}

        {/* Who this property is, as the form currently reads. */}
        <div className="pms-card flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
          <div className="flex min-w-0 items-center gap-3.5">
            <div className="flex h-12 w-12 flex-none items-center justify-center rounded-xl bg-gradient-to-tr from-primary to-dark-accent text-primary-foreground shadow-xs shadow-primary/20">
              <Lucide.Building2 size={22} aria-hidden="true" />
            </div>
            <div className="min-w-0">
              <p className="truncate text-disp2 font-bold leading-tight text-ink">{form.name.trim() || 'Unnamed property'}</p>
              <p className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-label text-ink-secondary">
                {form.code.trim() ? <Badge tone="neutral" size="sm">{form.code.trim()}</Badge> : null}
                <span className="truncate">{[form.city.trim(), form.country.trim()].filter(Boolean).join(', ') || 'No location yet'}</span>
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-1.5">
            {form.starRating ? <Badge tone="warning" size="sm">{form.starRating} ★</Badge> : null}
            {form.propertySegment ? <Badge tone="info" size="sm">{form.propertySegment}</Badge> : null}
            <Badge tone="neutral" size="sm">{form.defaultCurrency}</Badge>
          </div>
        </div>

        <nav aria-label="Jump to a section" className="pms-chip-row gap-2">
          {SECTIONS.map((section) => (
            <FilterChip key={section.id} active={false} onClick={() => jumpTo(section.id)}>
              {section.label}
            </FilterChip>
          ))}
        </nav>

        <div className="grid grid-cols-1 gap-5 xl:grid-cols-2 xl:items-start">
          <FormSection id="pd-basic" icon={Lucide.Building2} title="Basic Information" subtitle="Core details about your property">
            {text('name', 'Name', { required: true, wide: true })}
            {text('propertyGroup', 'Property Group')}
            {text('code', 'Abbreviation', { required: true, upper: true })}
            {text('locationCode', 'Location Code')}
            {text('propertyLegalName', 'Property Legal Name')}
            {select('propertySegment', 'Property Segment', SEGMENT_OPTIONS, { empty: 'Select segment' })}
            {select('starRating', 'Star Rating', STAR_OPTIONS, { empty: 'Unrated' })}
            {select('language', 'Language', LANGUAGE_OPTIONS, { empty: 'Select language' })}
          </FormSection>

          <FormSection id="pd-address" icon={Lucide.MapPin} title="Address & Location" subtitle="Where guests find you">
            {text('addressLine1', 'Address Line 1', { wide: true })}
            {text('addressLine2', 'Address Line 2', { wide: true })}
            {text('city', 'City', { required: true })}
            {text('state', 'State / Province')}
            {text('country', 'Country', { required: true })}
            {text('postalCode', 'Postal Code')}
            {text('locationMapUrl', 'Location Map URL', { wide: true, placeholder: 'https://maps.google.com/...' })}
            {text('latitude', 'Latitude', { type: 'number', placeholder: '18.9441' })}
            {text('longitude', 'Longitude', { type: 'number', placeholder: '72.8236' })}
            {text('corporateAddress', 'Corporate Address', { wide: true })}
          </FormSection>

          <FormSection id="pd-contact" icon={Lucide.Phone} title="Contact" subtitle="Phone numbers for guests">
            {text('primaryPhone', 'Primary Phone Number')}
            {text('secondaryPhone', 'Secondary Phone Number')}
          </FormSection>

          <FormSection id="pd-billing" icon={Lucide.Receipt} title="Billing & Operations" subtitle="Currency, tax and booking behaviour">
            {select('defaultCurrency', 'Currency', CURRENCY_OPTIONS, { required: true })}
            {text('checkoutToleranceValue', 'Checkout Tolerance (minutes)', { type: 'number' })}
            {select('taxType', 'Tax Type', TAX_TYPE_OPTIONS, { empty: 'Select tax type' })}
            {text('gstn', 'GSTN', { upper: true })}
            {flag('ignoreDecimalInBillSettlement', 'Ignore decimal places in bill settlement', 'Bills are settled in whole amounts')}
            {flag('autoConfirmBookings', 'Auto confirm bookings', 'New bookings are confirmed without a manual step')}
          </FormSection>

          <div className="xl:col-span-2">
            <FormSection id="pd-listings" icon={Lucide.Globe} title="Marketing & Listings" subtitle="Tracking tags and OTA listing names">
              {text('googleAnalyticsTag', 'Google Analytics Tag')}
              {text('metaPixel', 'Meta Pixel')}
              {text('tripAdvisorListingName', 'Trip Advisor Listing Name')}
              {text('tripAdvisorPropertyId', 'Trip Advisor Property Id')}
              {text('googleListingName', 'Google Listing Name')}
              {text('trivagoListingName', 'Trivago Listing Name')}
            </FormSection>
          </div>
        </div>

        {canEdit ? (
          <UnsavedBar dirty={dirty} saving={saving} onSave={() => void handleSave()} onDiscard={() => setForm(baseline)} />
        ) : null}
      </div>
    </fieldset>
  );
}
