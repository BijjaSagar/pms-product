import { request } from './http';
import { settingsFor } from './propertyAccess';
import type { SmokingPolicyKey } from './roomListingApi';
import { isServerProperty } from './serverProperty';
import { recordActivity } from './session';

/** The guest-facing policies and arrival checks of one property. */
export interface PropertyPolicyDetails {
  cancellationPolicy: string | null;
  noShowPolicy: string | null;
  childExtraBedPolicy: string | null;
  requireGovernmentId: boolean;
  requireSecurityDeposit: boolean;
  enforceMinimumAge: boolean;
  /** Null until one is chosen. */
  smokingPolicy: SmokingPolicyKey | null;
  /** Null until the policies have been saved once. */
  updatedAt: string | null;
}
export type PropertyPolicyInput = Omit<PropertyPolicyDetails, 'updatedAt'>;

const path = (propertyId: string) => `/properties/${propertyId}/policy`;

// A server property's policies are read from and saved to the server; the copy here serves the other screens.
export const propertyPolicyApi = {
  get: async (propertyId: string) => {
    const { policy } = settingsFor(propertyId);
    if (isServerProperty(propertyId)) Object.assign(policy, await request<PropertyPolicyDetails>(path(propertyId)));
    return { ...policy };
  },
  save: async (propertyId: string, body: Partial<PropertyPolicyInput>) => {
    const saved = isServerProperty(propertyId)
      ? await request<PropertyPolicyDetails>(path(propertyId), body, 'PATCH')
      : { ...body, updatedAt: new Date().toISOString() };
    const policy = Object.assign(settingsFor(propertyId).policy, saved);
    recordActivity('policies', 'update', 'Saved the policies', { propertyId });
    return { ...policy };
  },
};
