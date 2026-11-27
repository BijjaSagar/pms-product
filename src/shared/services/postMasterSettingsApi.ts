import { settingsFor } from './propertyAccess';
import { recordActivity } from './session';

/** Limits on post master (PM) reservations. */
export interface PostMasterSettingsDetails {
  /** Most PM reservations that can be open at once. */
  maxOpenPmReservations: number;
  /** Most gross amount open across all PM reservations. */
  pmOpenTotalGrossAmount: number;
  maxRooms: number;
  maxNights: number;
  maxRoomNights: number;
  maxReservationGrossAmount: number;
}

export const postMasterSettingsApi = {
  get: async (propertyId: string) => ({ ...settingsFor(propertyId).postMaster }),
  /** Only the fields sent change. */
  update: async (propertyId: string, body: Partial<PostMasterSettingsDetails>) => {
    const settings = Object.assign(settingsFor(propertyId).postMaster, body);
    recordActivity('post-master-settings', 'update', 'Changed the post master limits', { propertyId });
    return { ...settings };
  },
};
