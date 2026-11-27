import { request } from './http';
import { settingsFor } from './propertyAccess';
import { isServerProperty } from './serverProperty';
import { recordActivity } from './session';

/** A cancellation rule of one property. */
export interface CancellationRuleDetails {
  id: string;
  propertyId: string;
  /** First check-in date the rule applies to; the data layer returns a date-time at midnight UTC. */
  startDate: string;
  /** Last check-in date the rule applies to. */
  endDate: string;
  /** The penalty applies to a cancellation made this many days or fewer before check-in. */
  daysFromCheckin: number;
  /** Decimal string, e.g. "50.00". */
  penaltyPercent: string;
}
export interface CancellationRuleInput {
  /** "YYYY-MM-DD". */
  startDate: string;
  /** "YYYY-MM-DD". */
  endDate: string;
  daysFromCheckin: number;
  penaltyPercent: number;
}

const midnight = (date: string) => `${date.slice(0, 10)}T00:00:00.000Z`;

/** Only the fields sent, in the form they are stored. */
const toStored = (body: Partial<CancellationRuleInput>): Partial<CancellationRuleDetails> => ({
  ...(body.startDate !== undefined ? { startDate: midnight(body.startDate) } : {}),
  ...(body.endDate !== undefined ? { endDate: midnight(body.endDate) } : {}),
  ...(body.daysFromCheckin !== undefined ? { daysFromCheckin: body.daysFromCheckin } : {}),
  ...(body.penaltyPercent !== undefined ? { penaltyPercent: body.penaltyPercent.toFixed(2) } : {}),
});

const path = (propertyId: string) => `/properties/${propertyId}/cancellation-rules`;

// A server property's rules are read from and saved to the server; the copy here serves the other screens.
export const cancellationRuleApi = {
  list: async (propertyId: string) => {
    const settings = settingsFor(propertyId);
    if (isServerProperty(propertyId)) settings.cancellationRules = await request<CancellationRuleDetails[]>(path(propertyId));
    return structuredClone(settings.cancellationRules);
  },
  create: async (propertyId: string, body: CancellationRuleInput) => {
    const rule = isServerProperty(propertyId)
      ? await request<CancellationRuleDetails>(path(propertyId), body)
      : ({ ...toStored(body), id: globalThis.crypto.randomUUID(), propertyId } as CancellationRuleDetails);
    settingsFor(propertyId).cancellationRules.push(rule);
    recordActivity('cancellation-rules', 'create', 'Added a cancellation rule', { propertyId, resourceId: rule.id });
    return { ...rule };
  },
  update: async (propertyId: string, id: string, body: Partial<CancellationRuleInput>) => {
    const rule = settingsFor(propertyId).cancellationRules.find((item) => item.id === id);
    if (!rule) throw new Error('This rule no longer exists.');
    Object.assign(rule, isServerProperty(propertyId)
      ? await request<CancellationRuleDetails>(`${path(propertyId)}/${id}`, body, 'PATCH')
      : toStored(body));
    recordActivity('cancellation-rules', 'update', 'Updated a cancellation rule', { propertyId, resourceId: id });
    return { ...rule };
  },
};
