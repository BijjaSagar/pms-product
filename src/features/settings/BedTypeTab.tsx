import { useCallback, useState } from 'react';
import * as Lucide from 'lucide-react';
import { roomBedTypeApi } from '../../lib/api/pms';
import type { RoomBedTypeDetails } from '../../lib/api/pms';
import { useApiResource } from '../../lib/api/useApiResource';
import { displayApiError } from '../../lib/api/client';
import { toast } from '../../utils/toast';
import { Checkbox, TextField } from '../../components/primitives';
import { Card, CardTitle, TableContainer } from '../../components/ui';
import { RoomPicker } from './RoomPicker';
import { TableStateRows } from '../../components/Skeleton';

const MAX_BEDS = 50;

/** The bed type table of one room. Keyed by room, so a new room starts clean. */
function RoomBedTypes({ propertyId, roomId, canEdit }: { propertyId: string; roomId: string; canEdit: boolean }) {
  const load = useCallback(() => roomBedTypeApi.list(propertyId, roomId), [propertyId, roomId]);
  const resource = useApiResource(load);
  // Saved changes sit on top of what was loaded, so the table never reloads.
  const [saved, setSaved] = useState<Record<string, RoomBedTypeDetails>>({});
  // What is typed in the No. of Beds boxes, until it is saved.
  const [typed, setTyped] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);

  const locked = !canEdit || busy;

  const save = async (code: string, body: { isActive?: boolean; beds?: number }) => {
    setBusy(true);
    try {
      const updated = await roomBedTypeApi.update(propertyId, roomId, code, body);
      setSaved((prev) => ({ ...prev, [code]: updated }));
      setTyped((prev) => {
        const { [code]: _done, ...rest } = prev;
        return rest;
      });
    } catch (err) {
      toast('Could not save the change', { detail: displayApiError(err), tone: 'danger' });
    } finally {
      setBusy(false);
    }
  };

  /** Saves the typed number of beds when the box loses focus. */
  const commitBeds = (bedType: RoomBedTypeDetails) => {
    const text = typed[bedType.code];
    if (text === undefined) return;
    const beds = Number(text);
    if (text.trim() === '' || !Number.isInteger(beds) || beds < 1 || beds > MAX_BEDS) {
      toast('Check the number of beds', { detail: `Use a whole number from 1 to ${MAX_BEDS}.`, tone: 'warning' });
      setTyped((prev) => {
        const { [bedType.code]: _reset, ...rest } = prev;
        return rest;
      });
      return;
    }
    if (beds !== bedType.beds) void save(bedType.code, { beds });
  };

  return (
    <Card className="w-full max-w-2xl">
      <CardTitle icon={Lucide.BedDouble} title="Categories Bed Type" subtitle="Bed types this room offers and how many beds of each" />
      <TableContainer>
        <table className="pms-table w-full text-left">
          <thead>
            <tr>
              <th className="w-32">DISPLAY ORDER</th>
              <th>NAME</th>
              <th className="w-24">STATUS</th>
              <th className="w-32">NO. OF BEDS</th>
            </tr>
          </thead>
          <tbody>
            {resource.data ? (
              resource.data.map((loaded) => {
                const bedType = saved[loaded.code] ?? loaded;
                return (
                  <tr key={bedType.code} className="border-b border-divider last:border-b-0">
                    <td className="py-1.5 text-label text-ink-secondary">{bedType.displayOrder}</td>
                    <td className="py-1.5 text-label font-medium text-ink">{bedType.name}</td>
                    <td className="py-1.5">
                      <Checkbox
                        type="checkbox"
                        checked={bedType.isActive}
                        disabled={locked}
                        aria-label={bedType.name}
                        onChange={(e) => void save(bedType.code, { isActive: e.target.checked })}
                      />
                    </td>
                    <td className="py-1.5">
                      <TextField
                        type="number"
                        min={1}
                        max={MAX_BEDS}
                        value={typed[bedType.code] ?? String(bedType.beds)}
                        disabled={locked}
                        aria-label={`Number of ${bedType.name}s`}
                        className="w-20"
                        onChange={(e) => setTyped((prev) => ({ ...prev, [bedType.code]: e.target.value }))}
                        onBlur={() => commitBeds(bedType)}
                      />
                    </td>
                  </tr>
                );
              })
            ) : (
              <TableStateRows cols={4} loading={resource.loading} error={resource.error} empty="No records yet." />
            )}
          </tbody>
        </table>
      </TableContainer>
    </Card>
  );
}

export function BedTypeTab({ propertyId, canEdit }: { propertyId: string; canEdit: boolean }) {
  return (
    <RoomPicker propertyId={propertyId}>
      {(roomId) => <RoomBedTypes key={roomId} propertyId={propertyId} roomId={roomId} canEdit={canEdit} />}
    </RoomPicker>
  );
}
