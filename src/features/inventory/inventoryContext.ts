import { createContext, useContext } from 'react';

interface InventoryContextValue {
  /** Reloads the property's rooms into the app after they were changed (floor plan, rooms, room types). */
  refresh: () => Promise<void>;
}

export const InventoryContext = createContext<InventoryContextValue | null>(null);

export function useInventory(): InventoryContextValue {
  const value = useContext(InventoryContext);
  if (!value) throw new Error('useInventory must be used inside <InventoryProvider>.');
  return value;
}
