import Country from 'country-state-city/lib/country';
import State from 'country-state-city/lib/state';
import type { ICountry, IState } from 'country-state-city';

/**
 * Every country, its states and cities, and the currency each country uses. Countries and states are
 * small and load with the screen that uses them; the city list is large (about 8 MB), so it is fetched only when a
 * state is chosen.
 */

export const COUNTRIES: ICountry[] = [...Country.getAllCountries()].sort((a, b) => a.name.localeCompare(b.name));

const findCountry = (name: string): ICountry | undefined => COUNTRIES.find((c) => c.name === name);

/** The states or regions of a country, by name; empty for the countries the data has none for. */
export const statesOf = (countryName: string): IState[] => {
  const country = findCountry(countryName);
  return country ? State.getStatesOfCountry(country.isoCode) : [];
};

const cityCache = new Map<string, string[]>();

/**
 * City names of a state (or of the whole country when it has no states), sorted and without repeats.
 * Empty when the data has none, in which case the person types the city.
 */
export async function loadCities(countryName: string, stateName: string): Promise<string[]> {
  const country = findCountry(countryName);
  if (!country) return [];
  const states = statesOf(countryName);
  const state = states.find((s) => s.name === stateName);
  if (states.length > 0 && !state) return [];

  const key = `${country.isoCode}/${state?.isoCode ?? ''}`;
  const cached = cityCache.get(key);
  if (cached) return cached;

  const { default: City } = await import('country-state-city/lib/city');
  const cities = state ? City.getCitiesOfState(country.isoCode, state.isoCode) : City.getCitiesOfCountry(country.isoCode);
  const names = [...new Set((cities ?? []).map((c) => c.name))].sort((a, b) => a.localeCompare(b));
  cityCache.set(key, names);
  return names;
}

export interface CurrencyOption {
  code: string;
  name: string;
}

const currencyNames = new Intl.DisplayNames(['en'], { type: 'currency' });

/** Codes the browser lists but the API's ISO 4217 check refuses, so they are not offered. */
const NOT_ACCEPTED = new Set(['CUC', 'HRK', 'XCG', 'ZWG']);

/** Every ISO 4217 currency the browser knows and the API accepts, with its English name, by code. */
export const CURRENCIES: CurrencyOption[] = Intl.supportedValuesOf('currency')
  .filter((code) => !NOT_ACCEPTED.has(code))
  .map((code) => ({
  code,
    name: currencyNames.of(code) ?? code,
  }));

const KNOWN_CURRENCIES = new Set(CURRENCIES.map((c) => c.code));

/** The country data still lists four retired codes; these are their current replacements. */
const RENAMED_CURRENCIES: Record<string, string> = { MRO: 'MRU', STD: 'STN', VEF: 'VES', HRK: 'EUR' };

/** The currency a country uses, or '' when the data has none (Antarctica) so the person chooses. */
export const currencyOfCountry = (countryName: string): string => {
  const listed = findCountry(countryName)?.currency ?? '';
  const code = RENAMED_CURRENCIES[listed] ?? listed;
  return KNOWN_CURRENCIES.has(code) ? code : '';
};
