import { useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import * as Lucide from 'lucide-react';
import { BrandCombobox, BrandField, BrandSelect, BrandStepper } from '../../../components/brand/BrandControls';
import { CARD, FIELD, FIELD_INVALID, HEADING } from '../../../components/brand/brandStyles';
import { MAX_FLOORS } from '../../../utils/floorPlan';
import { MAX_CODE_LENGTH, MAX_ROOMS } from './draft';
import type { PropertyDraft, PropertyErrors } from './draft';
import { COUNTRIES, CURRENCIES, currencyOfCountry, loadCities, statesOf } from './locations';

function Section({ icon: Icon, title, subtitle, children }: { icon: typeof Lucide.Building2; title: string; subtitle: string; children: ReactNode }) {
  return (
    <section className={CARD}>
      <header className="flex items-center gap-3 border-b border-border/70 px-5 py-4">
        <span className="flex h-9 w-9 flex-none items-center justify-center rounded-xl bg-primary/10 text-primary">
          <Icon size={17} aria-hidden="true" />
        </span>
        <div className="min-w-0">
          <h3 className={`text-[15px] font-semibold leading-tight tracking-[-0.02em] text-ink ${HEADING}`}>{title}</h3>
          <p className="text-[12px] text-ink-secondary">{subtitle}</p>
        </div>
      </header>
      <div className="p-5">{children}</div>
    </section>
  );
}

interface PropertyStepProps {
  value: PropertyDraft;
  onChange: (patch: Partial<PropertyDraft>) => void;
  /** Only passed once the user has tried to continue, so untouched fields do not shout. */
  errors: PropertyErrors;
}

const countryNames = COUNTRIES.map((c) => c.name);

/** Step 1: who and where the property is, its currency, and how many floors and rooms it has. */
export function PropertyStep({ value, onChange, errors }: PropertyStepProps) {
  const text = (error?: string) => (error ? FIELD_INVALID : FIELD);
  const states = useMemo(() => statesOf(value.country), [value.country]);
  const stateNames = useMemo(() => states.map((st) => st.name), [states]);
  // null while the city list is loading; [] when the data has no cities here, so the city is typed.
  const [loaded, setLoaded] = useState<{ key: string; cities: string[] } | null>(null);
  const cityKey = `${value.country}/${value.state}`;
  const needsState = states.length > 0;
  const canListCities = Boolean(value.country) && (!needsState || Boolean(value.state));

  useEffect(() => {
    if (!canListCities) return;
    let active = true;
    void loadCities(value.country, value.state)
      .catch(() => [] as string[])
      .then((cities) => {
        if (active) setLoaded({ key: cityKey, cities });
      });
    return () => {
      active = false;
    };
  }, [canListCities, cityKey, value.country, value.state]);

  const cities = loaded?.key === cityKey ? loaded.cities : null;
  const loadingCities = canListCities && cities === null;
  // A city saved earlier that is not in the list still shows, so editing never blanks it.
  const cityOptions = useMemo(() => (cities && value.city && !cities.includes(value.city) ? [value.city, ...cities] : cities), [cities, value.city]);

  const pickCountry = (country: string) => {
    if (country === value.country) return;
    // The currency follows the country; it can still be changed below.
    onChange({ country, state: '', city: '', currency: currencyOfCountry(country) });
  };
  return (
    <div className="flex flex-col gap-4">
      <Section icon={Lucide.Building2} title="Basic details" subtitle="How guests and your team will recognise the property">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-[minmax(0,1fr)_180px]">
          <BrandField label="Property name" error={errors.name}>
            <input
              className={text(errors.name)}
              value={value.name}
              maxLength={150}
              autoFocus
              placeholder="e.g. Seaside Grand Hotel"
              onChange={(e) => onChange({ name: e.target.value })}
            />
          </BrandField>
          <BrandField label="Abbreviation" hint={`Up to ${MAX_CODE_LENGTH} letters`} error={errors.code}>
            <input
              className={`${text(errors.code)} font-semibold uppercase tracking-wide`}
              value={value.code}
              maxLength={MAX_CODE_LENGTH}
              placeholder="SGH"
              onChange={(e) => onChange({ code: e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '') })}
            />
          </BrandField>
        </div>
      </Section>

      <Section icon={Lucide.MapPin} title="Location" subtitle="Where the property is situated">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <BrandField label="Country" error={errors.country}>
            <BrandCombobox
              ariaLabel="Country"
              invalid={!!errors.country}
              value={value.country}
              options={countryNames}
              placeholder="Select country"
              searchPlaceholder="Search countries"
              onChange={pickCountry}
            />
          </BrandField>
          <BrandField label="State" error={errors.state}>
            {needsState ? (
              <BrandCombobox
                ariaLabel="State"
                invalid={!!errors.state}
                value={value.state}
                options={stateNames}
                placeholder="Select state"
                searchPlaceholder="Search states"
                onChange={(state) => onChange({ state, city: '' })}
              />
            ) : (
              <input
                className={text(errors.state)}
                value={value.state}
                maxLength={100}
                disabled={!value.country}
                placeholder={value.country ? 'Not needed for this country' : 'Select a country first'}
                onChange={(e) => onChange({ state: e.target.value })}
              />
            )}
          </BrandField>
          <BrandField label="City" error={errors.city}>
            {cityOptions && cityOptions.length > 0 ? (
              <BrandCombobox
                ariaLabel="City"
                invalid={!!errors.city}
                value={value.city}
                options={cityOptions}
                placeholder="Select city"
                searchPlaceholder="Search cities"
                onChange={(city) => onChange({ city })}
              />
            ) : (
              <input
                className={text(errors.city)}
                value={value.city}
                maxLength={100}
                disabled={!canListCities || loadingCities}
                placeholder={loadingCities ? 'Loading cities…' : !value.country ? 'Select a country first' : needsState && !value.state ? 'Select a state first' : 'Type the city'}
                onChange={(e) => onChange({ city: e.target.value })}
              />
            )}
          </BrandField>
        </div>
      </Section>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <Section icon={Lucide.Wallet} title="Billing" subtitle="Currency used for rates and invoices">
          <BrandField label="Currency" error={errors.currency}>
            <BrandSelect invalid={!!errors.currency} value={value.currency} onChange={(e) => onChange({ currency: e.target.value })}>
              <option value="">Select currency</option>
              {CURRENCIES.map((c) => (
                <option key={c.code} value={c.code}>
                  {c.code} — {c.name}
                </option>
              ))}
            </BrandSelect>
          </BrandField>
        </Section>

        <Section icon={Lucide.Layers} title="Capacity" subtitle="You'll place each room on its floor in step 3">
          <div className="grid grid-cols-2 gap-4">
            <BrandField label="No. of floors">
              <BrandStepper label="No. of floors" value={value.floors} min={1} max={MAX_FLOORS} onChange={(floors) => onChange({ floors })} />
            </BrandField>
            <BrandField label="No. of rooms">
              <BrandStepper label="No. of rooms" value={value.rooms} min={1} max={MAX_ROOMS} onChange={(rooms) => onChange({ rooms })} />
            </BrandField>
          </div>
        </Section>
      </div>
    </div>
  );
}
