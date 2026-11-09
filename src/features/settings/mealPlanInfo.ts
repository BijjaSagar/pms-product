import type { MealPlanKey } from '../../lib/api/pms';

/** The meal plan codes and what each one includes, used by the room category screen. */
export const MEAL_PLANS: { key: MealPlanKey; description: string }[] = [
  { key: 'EP', description: 'Room only' },
  { key: 'CP', description: 'Room with breakfast' },
  { key: 'MAP', description: 'Breakfast and one main meal' },
  { key: 'AP', description: 'All meals' },
  { key: 'MAPAI', description: 'MAP, all inclusive' },
  { key: 'APAI', description: 'AP, all inclusive' },
];
