import { useCallback, useState } from 'react';
import * as Lucide from 'lucide-react';
import { categoryAmenitiesApi } from '../../../../shared/services/categoryAmenitiesApi';
import { useApiResource } from '../../../../shared/services/useApiResource';
import { displayError } from '../../../../shared/services/errors';
import { toast } from '../../../../shared/utils/toast';
import { Badge, Card, CardTitle } from '../../../../shared/components/ui/display';
import { AmenityChecklist } from '../components/AmenityChecklist';
import { RoomPicker } from '../components/RoomPicker';
import { ReadOnlyNotice, SettingsHeader } from '../components/SettingsKit';

/** The amenities of one room. Keyed by room, so a new room starts clean. */
function RoomAmenities({ propertyId, roomId, canEdit }: { propertyId: string; roomId: string; canEdit: boolean }) {
  const load = useCallback(() => categoryAmenitiesApi.get(propertyId, roomId), [propertyId, roomId]);
  const resource = useApiResource(load);
  // Saved changes sit on top of what was loaded, so the long list never reloads.
  const [flags, setFlags] = useState<Record<string, boolean>>({});
  const [busy, setBusy] = useState(false);

  const data = resource.data;
  const locked = !canEdit || busy;

  const save = async (request: () => Promise<void>) => {
    setBusy(true);
    try {
      await request();
    } catch (err) {
      toast('Could not save the change', { detail: displayError(err), tone: 'danger' });
    } finally {
      setBusy(false);
    }
  };

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
      <SettingsHeader title="Category Amenities" description="Amenities, one room category at a time" />
      {!canEdit ? <ReadOnlyNotice what="category amenities" /> : null}
      <RoomPicker propertyId={propertyId}>
        {(roomId) => <RoomAmenities key={roomId} propertyId={propertyId} roomId={roomId} canEdit={canEdit} />}
      </RoomPicker>
    </div>
  );
}
