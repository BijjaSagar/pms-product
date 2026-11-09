import { useCallback, useState } from 'react';
import * as Lucide from 'lucide-react';
import { categoryAmenitiesApi } from '../../lib/api/pms';
import type { SmokingPolicyKey } from '../../lib/api/pms';
import { useApiResource } from '../../lib/api/useApiResource';
import { displayApiError } from '../../lib/api/client';
import { toast } from '../../utils/toast';
import { CardSkeleton } from '../../components/Skeleton';
import { Badge, Card, CardTitle } from '../../components/ui';
import { AmenityChecklist } from './AmenityChecklist';
import { RoomPicker } from './RoomPicker';
import { ReadOnlyNotice, SettingsHeader } from './SettingsKit';
import { SmokingPolicyPicker } from './SmokingPolicyPicker';

/** The smoking policy and amenities of one room. Keyed by room, so a new room starts clean. */
function RoomAmenities({ propertyId, roomId, canEdit }: { propertyId: string; roomId: string; canEdit: boolean }) {
  const load = useCallback(() => categoryAmenitiesApi.get(propertyId, roomId), [propertyId, roomId]);
  const resource = useApiResource(load);
  // Saved changes sit on top of what was loaded, so the long list never reloads.
  const [flags, setFlags] = useState<Record<string, boolean>>({});
  const [smoking, setSmoking] = useState<{ value: SmokingPolicyKey | null } | null>(null);
  const [busy, setBusy] = useState(false);

  const data = resource.data;
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

  const changeSmoking = (next: SmokingPolicyKey | null) =>
    save(async () => {
      await categoryAmenitiesApi.setSmokingPolicy(propertyId, roomId, next);
      setSmoking({ value: next });
    });

  const changeAmenity = (code: string, checked: boolean) =>
    save(async () => {
      await categoryAmenitiesApi.setAmenity(propertyId, roomId, code, checked);
      setFlags((prev) => ({ ...prev, [code]: checked }));
    });

  const items = data
    ? data.amenities.map((a) => ({ code: a.code, name: a.name, group: a.type, active: flags[a.code] ?? a.isActive }))
    : null;
  const offered = items?.filter((i) => i.active).length ?? 0;

  return (
    <>
      <Card>
        <CardTitle icon={Lucide.CigaretteOff} title="Smoking Policy" subtitle="The policy for this category" />
        {data ? (
          <SmokingPolicyPicker value={smokingPolicy} disabled={locked} onChange={(next) => void changeSmoking(next)} />
        ) : (
          <CardSkeleton lines={2} label="Loading smoking policy" />
        )}
      </Card>

      <Card>
        <CardTitle
          icon={Lucide.Sparkles}
          title="Amenities"
          subtitle="Switch on what this category offers"
          badge={items ? <Badge tone="info" size="sm">{offered} offered</Badge> : undefined}
        />
        <AmenityChecklist
          items={items}
          loading={resource.loading}
          error={resource.error}
          disabled={locked}
          onToggle={(code, next) => void changeAmenity(code, next)}
        />
      </Card>
    </>
  );
}

export function CategoryAmenitiesTab({ propertyId, canEdit }: { propertyId: string; canEdit: boolean }) {
  return (
    <div className="flex flex-col gap-5">
      <SettingsHeader title="Category Amenities" description="Amenities and smoking policy, one room category at a time" />
      {!canEdit ? <ReadOnlyNotice what="category amenities" /> : null}
      <RoomPicker propertyId={propertyId}>
        {(roomId) => <RoomAmenities key={roomId} propertyId={propertyId} roomId={roomId} canEdit={canEdit} />}
      </RoomPicker>
    </div>
  );
}
