import { useCallback, useMemo, type ReactNode } from 'react';
import { CardSkeleton } from '../../components/Skeleton';
import { store } from '../../data/store';
import { Button } from '../../components/primitives';
import { displayApiError } from '../../lib/api/client';
import { roomInventoryApi } from '../../lib/api/pms';
import { useApiResource } from '../../lib/api/useApiResource';
import { toast } from '../../utils/toast';
import { InventoryContext } from './inventoryContext';

/**
 * Loads the active property's real rooms (its floor plan, with the room, room type and rate each box
 * stands for) and puts them into the app's data store, so every screen sees the same rooms. Nothing
 * renders until the first load succeeds; after that `refresh` keeps the screens mounted.
 */
export function InventoryProvider({ propertyId, children }: { propertyId: string; children: ReactNode }) {
  const initial = useApiResource(async () => {
    store.hydrateInventory(await roomInventoryApi.get(propertyId));
    return true;
  }, [propertyId]);

  const refresh = useCallback(async () => {
    try {
      store.hydrateInventory(await roomInventoryApi.get(propertyId));
    } catch (error) {
      toast('Could not refresh rooms', { detail: displayApiError(error), tone: 'danger' });
    }
  }, [propertyId]);

  const value = useMemo(() => ({ refresh }), [refresh]);

  if (initial.error) {
    return (
      <main className="flex h-dvh items-center justify-center px-4" style={{ background: 'var(--color-page)', color: 'var(--color-ink)' }}>
        <section className="pms-card w-full max-w-[480px] p-5">
          <h1 className="pms-section-title">Could not load rooms</h1>
          <p className="pms-helper mt-1">{initial.error}</p>
          <Button variant="primary" className="mt-4" onClick={initial.refresh}>
            Try again
          </Button>
        </section>
      </main>
    );
  }

  if (initial.data === null) {
    return (
      <main className="flex h-dvh items-center justify-center" style={{ background: 'var(--color-page)', color: 'var(--color-ink)' }}>
        <div className="w-full max-w-md px-4"><CardSkeleton lines={4} label="Loading rooms" /></div>
      </main>
    );
  }

  return <InventoryContext.Provider value={value}>{children}</InventoryContext.Provider>;
}
