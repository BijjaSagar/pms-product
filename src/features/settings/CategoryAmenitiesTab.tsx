import { useCallback, useState } from 'react';
import * as Lucide from 'lucide-react';
import { categoryAmenitiesApi } from '../../lib/api/pms';
import type { SmokingPolicyKey } from '../../lib/api/pms';
import { useApiResource } from '../../lib/api/useApiResource';
import { displayApiError } from '../../lib/api/client';
import { toast } from '../../utils/toast';
import { Checkbox } from '../../components/primitives';
import { Card, CardTitle, TableContainer } from '../../components/ui';
import { RoomPicker } from './RoomPicker';
import { TableStateRows } from '../../components/Skeleton';

const SMOKING_POLICIES: { key: SmokingPolicyKey; name: string }[] = [
  { key: 'ALL_NON_SMOKING', name: 'All rooms non smoking' },
  { key: 'SMOKING_PERMITTED', name: 'Smoking permitted in rooms' },
];

/** The smoking policy and amenity table of one room. Keyed by room, so a new room starts clean. */
function RoomAmenities({ propertyId, roomId, canEdit }: { propertyId: string; roomId: string; canEdit: boolean }) {
  const load = useCallback(() => categoryAmenitiesApi.get(propertyId, roomId), [propertyId, roomId]);
  const resource = useApiResource(load);
  // Saved changes sit on top of what was loaded, so the long table never reloads.
  const [flags, setFlags] = useState<Record<string, boolean>>({});
  const [smoking, setSmoking] = useState<{ value: SmokingPolicyKey | null } | null>(null);
  const [busy, setBusy] = useState(false);

  const data = resource.data;
  // Rows per amenity type, for the merged Type cells.
  const typeCounts = new Map<string, number>();
  for (const amenity of data?.amenities ?? []) typeCounts.set(amenity.type, (typeCounts.get(amenity.type) ?? 0) + 1);
  const smokingPolicy = smoking ? smoking.value : (data?.smokingPolicy ?? null);
  const locked = !canEdit || busy;

  const save = async (request: () => Promise<void>) => {
    setBusy(true);
    try {
      await request();
    } catch (err) {
      toast('Could not save the change', { detail: displayApiError(err), tone: 'danger' });
    } finally {
      setBusy(false);
    }
  };

  const changeSmoking = (key: SmokingPolicyKey, checked: boolean) =>
    save(async () => {
      const next = checked ? key : null;
      await categoryAmenitiesApi.setSmokingPolicy(propertyId, roomId, next);
      setSmoking({ value: next });
    });

  const changeAmenity = (code: string, checked: boolean) =>
    save(async () => {
      await categoryAmenitiesApi.setAmenity(propertyId, roomId, code, checked);
      setFlags((prev) => ({ ...prev, [code]: checked }));
    });

  return (
    <>
      <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
        <span className="text-label font-bold text-ink">Smoking Policy</span>
        {SMOKING_POLICIES.map(({ key, name }) => (
          <label key={key} className="flex cursor-pointer items-center gap-2.5 text-label font-medium text-ink">
            <Checkbox
              type="checkbox"
              checked={smokingPolicy === key}
              disabled={locked || !data}
              onChange={(e) => void changeSmoking(key, e.target.checked)}
            />
            <span>{name}</span>
          </label>
        ))}
      </div>

      <Card>
        <CardTitle icon={Lucide.Sparkles} title="Category Amenities" subtitle="Amenities this room offers" />
        <div className="max-h-[60vh] overflow-y-auto">
          <TableContainer>
            <table className="pms-table w-full min-w-[520px] text-left">
              <thead>
                <tr>
                  <th>TYPE</th>
                  <th>NAME</th>
                  <th className="w-24">STATUS</th>
                </tr>
              </thead>
              <tbody>
                {data ? (
                  data.amenities.map((amenity, index) => {
                    const checked = flags[amenity.code] ?? amenity.isActive;
                    // The type is one merged cell spanning all rows of its group.
                    const firstOfType = index === 0 || data.amenities[index - 1]?.type !== amenity.type;
                    return (
                      <tr key={amenity.code} className="border-b border-divider last:border-b-0">
                        {firstOfType ? (
                          <td
                            rowSpan={typeCounts.get(amenity.type)}
                            className="border-r border-divider px-3 py-2.5 align-top text-label font-semibold text-ink-secondary"
                          >
                            {amenity.type}
                          </td>
                        ) : null}
                        <td className="py-2.5 text-label font-medium text-ink">{amenity.name}</td>
                        <td className="py-2.5">
                          <Checkbox
                            type="checkbox"
                            checked={checked}
                            disabled={locked}
                            aria-label={amenity.name}
                            onChange={(e) => void changeAmenity(amenity.code, e.target.checked)}
                          />
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <TableStateRows cols={3} loading={resource.loading} error={resource.error} empty="No records yet." />
                )}
              </tbody>
            </table>
          </TableContainer>
        </div>
      </Card>
    </>
  );
}

export function CategoryAmenitiesTab({ propertyId, canEdit }: { propertyId: string; canEdit: boolean }) {
  return (
    <RoomPicker propertyId={propertyId}>
      {(roomId) => <RoomAmenities key={roomId} propertyId={propertyId} roomId={roomId} canEdit={canEdit} />}
    </RoomPicker>
  );
}
