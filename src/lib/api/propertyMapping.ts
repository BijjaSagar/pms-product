import type { PropertyRow } from './pms';

/* The property shape pms-backend returns, and its conversion to the row the settings screen reads. */

export interface BackendProperty {
  id: string;
  code: string;
  name: string;
  legalName: string | null;
  timezone: string;
  currency: string;
  businessDate: string;
  checkInTime: string | null;
  checkOutTime: string | null;
  noShowCutoffTime: string | null;
  holdMinutes: number | null;
  overbookingEnabled: boolean;
  approvalThreshold: string | null;
  address: { line1?: string; city?: string; state?: string; country?: string; postalCode?: string } | null;
  taxIdentifiers: { gstin?: string; stateCode?: string } | null;
}

export function propertyRowFromBackend(property: BackendProperty): PropertyRow {
  return {
    id: property.id,
    code: property.code,
    name: property.name,
    legalName: property.legalName,
    slug: property.code,
    timezone: property.timezone,
    currencyCode: property.currency,
    countryCode: property.address?.country,
    businessDate: property.businessDate,
    checkInTime: property.checkInTime ?? undefined,
    checkOutTime: property.checkOutTime ?? undefined,
    noShowCutoffTime: property.noShowCutoffTime,
    holdMinutes: property.holdMinutes,
    overbookingEnabled: property.overbookingEnabled,
    approvalThreshold: property.approvalThreshold,
    addressLine1: property.address?.line1 ?? null,
    city: property.address?.city ?? null,
    state: property.address?.state ?? null,
    postalCode: property.address?.postalCode ?? null,
    gstin: property.taxIdentifiers?.gstin ?? null,
    stateCode: property.taxIdentifiers?.stateCode ?? null,
  };
}

/**
 * The backend's PATCH body for the fields the settings screen edits. The address is sent
 * whole, so a change to one line does not clear the others.
 */
export function propertyPatchFromFields(current: BackendProperty, fields: Record<string, unknown>): Record<string, unknown> {
  const body: Record<string, unknown> = {};
  const set = (key: string, value: unknown) => {
    if (value !== undefined) body[key] = value;
  };
  set('name', fields.name);
  set('legalName', fields.legalName);
  set('timezone', fields.timezone);
  set('currency', fields.currencyCode);
  set('checkInTime', fields.checkInTime);
  set('checkOutTime', fields.checkOutTime);
  set('holdMinutes', fields.holdMinutes);
  set('approvalThreshold', fields.approvalThreshold);
  if (fields.gstin !== undefined) body.taxIdentifiers = { gstin: fields.gstin, stateCode: current.taxIdentifiers?.stateCode };
  const addressTouched = ['addressLine1', 'city', 'state', 'postalCode', 'countryCode'].some((key) => fields[key] !== undefined);
  if (addressTouched) {
    body.address = {
      line1: (fields.addressLine1 as string | undefined) ?? current.address?.line1,
      city: (fields.city as string | undefined) ?? current.address?.city,
      state: (fields.state as string | undefined) ?? current.address?.state,
      postalCode: (fields.postalCode as string | undefined) ?? current.address?.postalCode,
      country: (fields.countryCode as string | undefined) ?? current.address?.country,
    };
  }
  return body;
}

/* The time zones the settings screen offers, by the label it shows and the zone the backend stores. */
const TIME_ZONES: Array<{ label: string; zone: string }> = [
  { label: '(GMT+05:30) India Standard Time', zone: 'Asia/Kolkata' },
  { label: '(GMT+00:00) UTC', zone: 'UTC' },
  { label: '(GMT-05:00) Eastern Time', zone: 'America/New_York' },
  { label: '(GMT+01:00) Central European Time', zone: 'Europe/Berlin' },
  { label: '(GMT+08:00) Singapore Time', zone: 'Asia/Singapore' },
];

/** The screen label for a stored zone. A zone it does not offer is shown as stored. */
export function zoneLabelOf(zone: string): string {
  return TIME_ZONES.find((item) => item.zone === zone)?.label ?? zone;
}

/** The stored zone for a label the screen offers. */
export function zoneOf(label: string): string {
  return TIME_ZONES.find((item) => item.label === label)?.zone ?? label;
}

/** A clock time typed as "2:30 PM" or "14:30", as the 24-hour "14:30" the backend stores. Null if it is not a time. */
export function clockTo24(text: string): string | null {
  const match = text.trim().match(/^(\d{1,2}):(\d{2})\s*(AM|PM)?$/i);
  if (!match) return null;
  let hours = Number(match[1]);
  const minutes = Number(match[2]);
  const meridiem = match[3]?.toUpperCase();
  if (meridiem === 'PM' && hours < 12) hours += 12;
  if (meridiem === 'AM' && hours === 12) hours = 0;
  if (hours > 23 || minutes > 59) return null;
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
}

/** A stored 24-hour time as the screen shows it, such as "02:30 PM". */
export function clockDisplay(hhmm: string): string {
  const [hours, minutes] = hhmm.split(':').map(Number);
  const meridiem = hours >= 12 ? 'PM' : 'AM';
  const hour12 = hours % 12 === 0 ? 12 : hours % 12;
  return `${String(hour12).padStart(2, '0')}:${String(minutes).padStart(2, '0')} ${meridiem}`;
}
