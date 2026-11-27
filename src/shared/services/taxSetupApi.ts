import { requireActivePropertyId, settingsFor } from './propertyAccess';
import { recordActivity, requirePropertyAdmin } from './session';

export interface TaxCategoryRow { id: string; name: string; description: string }
export type TaxComponentCode = 'CGST' | 'SGST';
export type TaxAppliedOn = 'ROOM_TARIFF' | 'TOTAL_AMOUNT';
export type TaxValueType = 'PERCENTAGE' | 'FIXED';
/** One amount band of a tax component: amounts from `from` to `to` are taxed at `value`. */
export interface TaxSlab { id: string; from: string; to: string; valueType: TaxValueType; value: string }
export interface TaxComponent { code: TaxComponentCode; appliedOn: TaxAppliedOn; slabs: TaxSlab[] }
export interface TaxSetupRuleRow {
  id: string; name: string; description: string; startDate: string; endDate: string;
  categoryId: string; components: TaxComponent[];
}
/** A rule as it is saved: the slabs' ids belong to the data layer, so they are not sent. */
export type TaxSetupRuleInput = Omit<TaxSetupRuleRow, 'id'>;
/** How tax is worked out: recomputed here under the composite supply concept, or taken as the OTA sent it. */
export type TaxComputation = 'COMPOSITE_SUPPLY' | 'OTA_VOUCHER';
export interface TaxGeneralSettings {
  computation: TaxComputation;
  sacRoomCode: string;
  enableSacCodes: boolean;
  applyRoomSlabOnMeals: boolean;
  applyRoomSlabOnExtraBed: boolean;
  showPropertyGstNo: boolean;
}

const current = () => settingsFor(requireActivePropertyId());

/** Changing tax setup is for a super admin or the property's ADMIN. */
function changing(summary: string) {
  requirePropertyAdmin(requireActivePropertyId());
  const settings = current();
  recordActivity('tax-setup', 'update', summary, { propertyId: requireActivePropertyId() });
  return settings;
}

const money = (value: string) => (Number(value) || 0).toFixed(2);

/** A rule as it is stored: slabs get ids and amounts two decimals. */
const toStoredRule = (id: string, rule: TaxSetupRuleInput): TaxSetupRuleRow => ({
  ...rule,
  id,
  components: rule.components.map((component) => ({
    ...component,
    slabs: component.slabs.map((slab) => ({
      id: globalThis.crypto.randomUUID(),
      from: money(slab.from),
      to: money(slab.to),
      valueType: slab.valueType,
      value: money(slab.value),
    })),
  })),
});

function indexOfId(rows: Array<{ id: string }>, id: string): number {
  const index = rows.findIndex((row) => row.id === id);
  if (index < 0) throw new Error('This entry no longer exists.');
  return index;
}

/** Tax categories, rules and general settings of the active property. */
export const taxSetupApi = {
  categories: async () => structuredClone(current().taxCategories),
  createCategory: async (body: { name: string; description: string }) => {
    const category = { ...body, id: globalThis.crypto.randomUUID() };
    changing('Added a tax category').taxCategories.push(category);
    return { ...category };
  },
  updateCategory: async (id: string, body: { name: string; description: string }) => {
    const rows = changing('Updated a tax category').taxCategories;
    return { ...Object.assign(rows[indexOfId(rows, id)], body) };
  },
  deleteCategory: async (id: string) => {
    const settings = changing('Deleted a tax category');
    if (settings.taxRules.some((rule) => rule.categoryId === id)) {
      throw new Error('A tax rule uses this category. Delete the rule first.');
    }
    settings.taxCategories.splice(indexOfId(settings.taxCategories, id), 1);
  },
  rules: async () => structuredClone(current().taxRules),
  createRule: async (body: TaxSetupRuleInput) => {
    const rule = toStoredRule(globalThis.crypto.randomUUID(), body);
    changing('Added a tax rule').taxRules.push(rule);
    return structuredClone(rule);
  },
  updateRule: async (id: string, body: TaxSetupRuleInput) => {
    const rows = changing('Updated a tax rule').taxRules;
    const index = indexOfId(rows, id);
    rows[index] = toStoredRule(id, body);
    return structuredClone(rows[index]);
  },
  deleteRule: async (id: string) => {
    const rows = changing('Deleted a tax rule').taxRules;
    rows.splice(indexOfId(rows, id), 1);
  },
  generalSettings: async () => ({ ...current().taxSettings }),
  saveGeneralSettings: async (body: TaxGeneralSettings) => {
    changing('Saved the tax settings').taxSettings = { ...body };
    return { ...body };
  },
};
