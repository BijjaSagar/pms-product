import { useCallback, useState } from 'react';
import * as Lucide from 'lucide-react';
import { propertyAmenitiesApi, type PropertyAmenitiesDetails } from '../../../../shared/services/propertyAmenitiesApi';
import { useApiResource } from '../../../../shared/services/useApiResource';
import { displayError } from '../../../../shared/services/errors';
import { toast } from '../../../../shared/utils/toast';
import { Badge, Card, CardTitle } from '../../../../shared/components/ui/display';
import { AmenityChecklist } from '../components/AmenityChecklist';
import { ReadOnlyNotice, SettingsHeader } from '../components/SettingsKit';

export function PropertyAmenitiesTab({ propertyId, canEdit }: { propertyId: string; canEdit: boolean }) {
  const load = useCallback(() => propertyAmenitiesApi.get(propertyId), [propertyId]);
  const resource = useApiResource(load);
  const [busy, setBusy] = useState(false);
  // What a save has returned; it wins over the first load until the next refresh.
  const [saved, setSaved] = useState<PropertyAmenitiesDetails | null>(null);
  const data = saved ?? resource.data;

  const save = async (request: () => Promise<PropertyAmenitiesDetails>) => {
    setBusy(true);
    try {
      setSaved(await request());
    } catch (err) {
      toast('Could not save the change', { detail: displayError(err), tone: 'danger' });
    } finally {
      setBusy(false);
    }
  };

  const locked = !canEdit || busy;
  const offered = data?.amenities.filter((a) => a.isActive).length ?? 0;

  return (
    <div className="flex flex-col gap-5">
      <SettingsHeader title="Property Amenities" description="The amenities that apply to the whole property" />
      {!canEdit ? <ReadOnlyNotice what="property amenities" /> : null}

      <Card>
        <CardTitle
          icon={Lucide.Star}
          title="Amenities"
          subtitle="Switch on what your property offers"
          badge={data ? <Badge tone="info" size="sm">{offered} offered</Badge> : undefined}
        />
        <AmenityChecklist
          items={data ? data.amenities.map(({ code, name, isActive }) => ({ code, name, active: isActive })) : null}
          loading={resource.loading}
          error={resource.error}
          disabled={locked}
          onToggle={(code, next) => void save(() => propertyAmenitiesApi.setAmenity(propertyId, code, next))}
        />
      </Card>
    </div>
  );
}
