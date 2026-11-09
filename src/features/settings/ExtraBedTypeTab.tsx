import { useCallback, useState } from 'react';
import * as Lucide from 'lucide-react';
import { roomExtraBedTypeApi } from '../../lib/api/pms';
import { useApiResource } from '../../lib/api/useApiResource';
import { displayApiError } from '../../lib/api/client';
import { toast } from '../../utils/toast';
import { Checkbox } from '../../components/primitives';
import { Card, CardTitle, TableContainer } from '../../components/ui';
import { RoomPicker } from './RoomPicker';
import { TableStateRows } from '../../components/Skeleton';

/** The extra bed table of one room. Keyed by room, so a new room starts clean. */
function RoomExtraBedTypes({ propertyId, roomId, canEdit }: { propertyId: string; roomId: string; canEdit: boolean }) {
  const load = useCallback(() => roomExtraBedTypeApi.list(propertyId, roomId), [propertyId, roomId]);
  const resource = useApiResource(load);
  // Saved changes sit on top of what was loaded, so the table never reloads.
  const [flags, setFlags] = useState<Record<string, boolean>>({});
  const [busy, setBusy] = useState(false);

  const change = async (code: string, checked: boolean) => {
    setBusy(true);
    try {
      await roomExtraBedTypeApi.update(propertyId, roomId, code, checked);
      setFlags((prev) => ({ ...prev, [code]: checked }));
    } catch (err) {
      toast('Could not save the change', { detail: displayApiError(err), tone: 'danger' });
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card className="w-full max-w-md">
      <CardTitle icon={Lucide.BedSingle} title="Categories Extra Bed Type" subtitle="Bed types this room accepts as an extra bed" />
      <TableContainer>
        <table className="pms-table w-full text-left">
          <thead>
            <tr>
              <th>NAME</th>
              <th className="w-24">STATUS</th>
            </tr>
          </thead>
          <tbody>
            {resource.data ? (
              resource.data.map((bedType) => (
                <tr key={bedType.code} className="border-b border-divider last:border-b-0">
                  <td className="py-1.5 text-label font-medium text-ink">{bedType.name}</td>
                  <td className="py-1.5">
                    <Checkbox
                      type="checkbox"
                      checked={flags[bedType.code] ?? bedType.isActive}
                      disabled={!canEdit || busy}
                      aria-label={bedType.name}
                      onChange={(e) => void change(bedType.code, e.target.checked)}
                    />
                  </td>
                </tr>
              ))
            ) : (
              <TableStateRows cols={2} loading={resource.loading} error={resource.error} empty="No records yet." />
            )}
          </tbody>
        </table>
      </TableContainer>
    </Card>
  );
}

export function ExtraBedTypeTab({ propertyId, canEdit }: { propertyId: string; canEdit: boolean }) {
  return (
    <RoomPicker propertyId={propertyId}>
      {(roomId) => <RoomExtraBedTypes key={roomId} propertyId={propertyId} roomId={roomId} canEdit={canEdit} />}
    </RoomPicker>
  );
}
