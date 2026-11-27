import { request } from './http';
import { settingsFor } from './propertyAccess';
import { isServerProperty } from './serverProperty';
import { recordActivity } from './session';

/** The general terms and conditions of one property. */
export interface PropertyTermsDetails {
  includeInclusions: boolean;
  inclusions: string | null;
  includeBookingTerms: boolean;
  bookingTerms: string | null;
  includeCheckInTerms: boolean;
  checkInTerms: string | null;
  /** Null until the terms have been saved once. */
  updatedAt: string | null;
}
export type PropertyTermsInput = Omit<PropertyTermsDetails, 'updatedAt'>;

const path = (propertyId: string) => `/properties/${propertyId}/terms`;

// A server property's terms are read from and saved to the server; the copy here serves the other screens.
export const propertyTermsApi = {
  get: async (propertyId: string) => {
    const { terms } = settingsFor(propertyId);
    if (isServerProperty(propertyId)) Object.assign(terms, await request<PropertyTermsDetails>(path(propertyId)));
    return { ...terms };
  },
  save: async (propertyId: string, body: Partial<PropertyTermsInput>) => {
    const saved = isServerProperty(propertyId)
      ? await request<PropertyTermsDetails>(path(propertyId), body, 'PATCH')
      : { ...body, updatedAt: new Date().toISOString() };
    const terms = Object.assign(settingsFor(propertyId).terms, saved);
    recordActivity('terms-inclusions', 'update', 'Saved the terms and inclusions', { propertyId });
    return { ...terms };
  },
};
