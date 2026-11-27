import { useEffect, useMemo, useState } from 'react';
import type { ComponentType, ReactNode } from 'react';
import { BrandCombobox } from './BrandControls';
import { COUNTRIES, loadCities, statesOf } from '../../utils/locations';

interface Location {
  country: string;
  state: string;
  city: string;
}

const countryNames = COUNTRIES.map((c) => c.name);

/**
 * Country, State and City, each narrowing the next. Renders the three fields only, so the caller lays
 * them out, and wraps each in the caller's own labelled-field component.
 */
export function LocationFields({
  value,
  onChange,
  errors = {},
  field: Field,
  inputClassName,
}: {
  value: Location;
  /** Choosing a country or state also clears what depended on it. */
  onChange: (patch: Partial<Location>) => void;
  errors?: Partial<Location>;
  field: ComponentType<{ label: string; error?: string; children: ReactNode }>;
  /** Style of the text inputs used when there is no list to choose from. */
  inputClassName: string;
}) {
  const text = (error?: string) => (error ? `${inputClassName} !border-danger-text` : inputClassName);
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

  return (
    <>
      <Field label="Country" error={errors.country}>
        <BrandCombobox
          ariaLabel="Country"
          invalid={!!errors.country}
          value={value.country}
          options={countryNames}
          placeholder="Select country"
          searchPlaceholder="Search countries"
          onChange={(country) => {
            if (country !== value.country) onChange({ country, state: '', city: '' });
          }}
        />
      </Field>
      <Field label="State" error={errors.state}>
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
      </Field>
      <Field label="City" error={errors.city}>
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
      </Field>
    </>
  );
}
