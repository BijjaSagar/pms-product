import type { ApprovalStatus } from './authApi';
import { request } from './http';

/** What a new account sends for its property: the details, the room categories, and the rooms on each floor. */
export interface OnboardingSubmission {
  /** The server makes the property code; the abbreviation is what the person typed. */
  property: { name: string; abbreviation: string; city: string; state?: string; country: string; defaultCurrency: string; numberOfFloors: number; totalRooms: number };
  categories: Array<{ name: string }>;
  activationKey: string;
  /** Floors that have rooms; each room names its category, in position order (the first on floor 1 is 101). */
  floors: Array<{ floor: number; rooms: Array<{ category: string }> }>;
}

/** Step two of sign-up. Allowed once, for an account that is still PENDING_SETUP. A valid key activates the account. */
export const onboardingApi = {
  submit: (body: OnboardingSubmission) => request<{ approvalStatus: ApprovalStatus; propertyId: string }>('/onboarding', body),
};
