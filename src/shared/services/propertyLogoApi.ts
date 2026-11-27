import { request, requestBlob, uploadFile } from './http';
import type { PropertyDetails } from './propertyApi';
import { settingsFor } from './propertyAccess';
import { isServerProperty } from './serverProperty';
import { recordActivity } from './session';

/** Whether a property has a logo, and a value that changes with it so a cached picture refreshes. */
export interface LogoStatus {
  hasLogo: boolean;
  logoUpdatedAt: string | null;
}

const path = (propertyId: string) => `/properties/${propertyId}/logo`;

const changed = (propertyId: string, summary: string) => recordActivity('property-logo', 'update', summary, { propertyId });

/**
 * What this session last saw for a server property's logo. The property record the screen loaded does not change
 * when the logo does, so a remount would otherwise show the old state.
 */
const known = new Map<string, LogoStatus>();

/** A server property's logo is kept on the server; a demo property's stays in memory. */
export const propertyLogoApi = {
  /** From the property just loaded, so no extra request is needed. */
  status: (property: PropertyDetails): LogoStatus => {
    if (isServerProperty(property.id)) {
      return known.get(property.id) ?? { hasLogo: property.hasLogo === true, logoUpdatedAt: property.logoUpdatedAt ?? null };
    }
    const { logo } = settingsFor(property.id);
    return { hasLogo: logo !== null, logoUpdatedAt: logo?.updatedAt ?? null };
  },
  upload: async (propertyId: string, file: File): Promise<LogoStatus> => {
    if (isServerProperty(propertyId)) {
      const saved = await uploadFile<LogoStatus>(path(propertyId), file);
      known.set(propertyId, saved);
      return saved;
    }
    const logo = { file, updatedAt: new Date().toISOString() };
    settingsFor(propertyId).logo = logo;
    changed(propertyId, 'Uploaded a logo');
    return { hasLogo: true, logoUpdatedAt: logo.updatedAt };
  },
  remove: async (propertyId: string): Promise<void> => {
    if (isServerProperty(propertyId)) {
      await request<void>(path(propertyId), undefined, 'DELETE');
      known.set(propertyId, { hasLogo: false, logoUpdatedAt: null });
      return;
    }
    settingsFor(propertyId).logo = null;
    changed(propertyId, 'Deleted the logo');
  },
  image: async (propertyId: string): Promise<Blob> => {
    if (isServerProperty(propertyId)) return requestBlob(path(propertyId));
    const { logo } = settingsFor(propertyId);
    if (!logo) throw new Error('This property has no logo.');
    return logo.file;
  },
};
