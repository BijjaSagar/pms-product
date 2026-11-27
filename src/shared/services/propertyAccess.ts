import { blankSettings, propertySettings, type PropertySettings } from '../mocks/propertySettings';
import { propertiesOf, requireAccount } from './session';

/**
 * The property the signed-in user is working in. The auth provider sets it whenever the session loads or
 * changes, so data helpers that act on "the current property" do not need it passed to every call.
 */
let activePropertyId: string | null = null;

export function setActivePropertyId(id: string | null): void {
  activePropertyId = id;
}

/** The current property's id, or an error the screens can show when none is selected. */
export function requireActivePropertyId(): string {
  if (!activePropertyId) throw new Error('Select a property before continuing.');
  return activePropertyId;
}

/** The property record, refused unless the signed-in account may open it. */
export function requireProperty(propertyId: string) {
  const property = propertiesOf(requireAccount()).find((item) => item.id === propertyId);
  if (!property) throw new Error('You do not have access to this property.');
  return property;
}

/** The stored settings of a property the signed-in account may open. */
export function settingsFor(propertyId: string): PropertySettings {
  requireProperty(propertyId);
  let settings = propertySettings.get(propertyId);
  if (!settings) {
    settings = blankSettings(propertyId);
    propertySettings.set(propertyId, settings);
  }
  return settings;
}
