import { useState } from 'react';
import { displayApiError } from '../../../lib/api/client';
import { toast } from '../../../utils/toast';

/* Runs one save and reports it. Resolves true when the save went through. */
export type RunSave = (what: string, save: () => Promise<unknown>) => Promise<boolean>;

/* One save state for the whole tab, so a reload after a save happens once, in one place. */
export function useRoomSave(onSaved: () => void): { saving: boolean; run: RunSave } {
  const [saving, setSaving] = useState(false);

  const run: RunSave = async (what, save) => {
    setSaving(true);
    try {
      await save();
      toast(`${what} saved`, { tone: 'success' });
      onSaved();
      return true;
    } catch (error) {
      toast(`Could not save ${what.toLowerCase()}`, { detail: displayApiError(error), tone: 'danger' });
      return false;
    } finally {
      setSaving(false);
    }
  };

  return { saving, run };
}
