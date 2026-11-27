import { request } from './http';
import { settingsFor } from './propertyAccess';
import { isServerProperty } from './serverProperty';
import { recordActivity } from './session';

/** A meal plan of a property, with the property's own names where set. */
export interface MealPlanDetails {
  /** 1-based position in the list. */
  displayOrder: number;
  /** The constant name, e.g. `EP`. */
  code: string;
  displayName: string;
  shortDisplayName: string;
}

export const mealPlanApi = {
  /** In display order. A server property's plans come from the server's meal_plans table. */
  list: async (propertyId: string): Promise<MealPlanDetails[]> =>
    isServerProperty(propertyId)
      ? request<MealPlanDetails[]>('/meal-plans')
      : structuredClone(settingsFor(propertyId).mealPlans),
  /** Only the names sent change. A server property's names are shared by every property. */
  update: async (propertyId: string, code: string, body: { displayName?: string; shortDisplayName?: string }): Promise<MealPlanDetails> => {
    if (isServerProperty(propertyId)) return request<MealPlanDetails>(`/meal-plans/${encodeURIComponent(code)}`, body, 'PATCH');
    const plan = settingsFor(propertyId).mealPlans.find((item) => item.code === code);
    if (!plan) throw new Error('Unknown meal plan.');
    Object.assign(plan, body);
    recordActivity('meal-plans', 'update', `Renamed the ${code} meal plan`, { propertyId });
    return structuredClone(plan);
  },
};
