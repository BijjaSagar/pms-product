import { settingsFor } from './propertyAccess';
import { recordActivity } from './session';

export type HousekeepingPermissionKey = 'NONE' | 'CLEAN' | 'DIRTY' | 'TO_BE_INSPECTED' | 'INSPECTED' | 'UNDER_MAINTENANCE';
/** A housekeeping status of one property. */
export interface HousekeepingStatusDetails {
  id: string;
  propertyId: string;
  name: string;
  /** "#rrggbb". */
  color: string;
  displayOrder: number;
  abbreviation: string;
  description: string | null;
  /** Which users may set the status: NONE, or only users who may mark rooms with the named status. */
  permissionRequired: HousekeepingPermissionKey;
  /** The status a room gets on check-in; one status per property. */
  checkinDefault: boolean;
  checkoutDefault: boolean;
  roomChangeDefault: boolean;
  availableForParkingLot: boolean;
  allowCheckin: boolean;
  checkinHardStop: boolean;
}
export type HousekeepingStatusInput = Omit<HousekeepingStatusDetails, 'id' | 'propertyId' | 'displayOrder'>;

const DEFAULT_FLAGS = ['checkinDefault', 'checkoutDefault', 'roomChangeDefault'] as const;

/** Each default belongs to one status per property, so setting it here clears it everywhere else. */
function claimDefaults(statuses: HousekeepingStatusDetails[], owner: HousekeepingStatusDetails) {
  for (const flag of DEFAULT_FLAGS) {
    if (owner[flag]) statuses.forEach((status) => { if (status !== owner) status[flag] = false; });
  }
}

function requireStatus(propertyId: string, id: string) {
  const status = settingsFor(propertyId).housekeepingStatuses.find((item) => item.id === id);
  if (!status) throw new Error('This status no longer exists.');
  return status;
}

export const housekeepingStatusApi = {
  list: async (propertyId: string) => structuredClone(settingsFor(propertyId).housekeepingStatuses),
  create: async (propertyId: string, body: HousekeepingStatusInput) => {
    const statuses = settingsFor(propertyId).housekeepingStatuses;
    const status = {
      ...body,
      id: globalThis.crypto.randomUUID(),
      propertyId,
      displayOrder: Math.max(0, ...statuses.map((s) => s.displayOrder)) + 1,
    };
    statuses.push(status);
    claimDefaults(statuses, status);
    recordActivity('housekeeping-statuses', 'create', `Added the status ${status.name}`, { propertyId, resourceId: status.id });
    return { ...status };
  },
  update: async (propertyId: string, id: string, body: Partial<HousekeepingStatusInput>) => {
    const status = Object.assign(requireStatus(propertyId, id), body);
    claimDefaults(settingsFor(propertyId).housekeepingStatuses, status);
    recordActivity('housekeeping-statuses', 'update', `Updated the status ${status.name}`, { propertyId, resourceId: id });
    return { ...status };
  },
  remove: async (propertyId: string, id: string) => {
    const statuses = settingsFor(propertyId).housekeepingStatuses;
    const status = requireStatus(propertyId, id);
    statuses.splice(statuses.indexOf(status), 1);
    recordActivity('housekeeping-statuses', 'delete', `Deleted the status ${status.name}`, { propertyId, resourceId: id });
  },
};
