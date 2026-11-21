import type { SubscriptionPlan } from '../../../lib/api/pms';

/** Formats a monthly price in its currency: ₹2,499 or ₹999.50, never ₹2,499.00. */
export function formatPlanPrice(amount: number, currency: string): string {
  try {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency,
      minimumFractionDigits: Number.isInteger(amount) ? 0 : 2,
      maximumFractionDigits: 2,
    }).format(amount);
  } catch {
    return `${currency} ${amount}`;
  }
}

/** A plan as the wizard shows it: the API's plan with the price already formatted. */
export interface Plan {
  id: string;
  name: string;
  tagline: string;
  /** Monthly price, already formatted. */
  price: string;
  otaLimit: number;
  features: string[];
  popular?: boolean;
}

export const toWizardPlan = (plan: SubscriptionPlan): Plan => ({
  id: plan.id,
  name: plan.name,
  tagline: plan.tagline ?? '',
  price: formatPlanPrice(plan.priceMonthly, plan.currency),
  otaLimit: plan.otaLimit,
  features: plan.features,
  ...(plan.isPopular ? { popular: true } : {}),
});
