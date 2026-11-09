import { useCallback, useState } from 'react';
import * as Lucide from 'lucide-react';
import { propertyAmenitiesApi } from '../../lib/api/pms';
import type { PropertyAmenitiesDetails } from '../../lib/api/pms';
import { useApiResource } from '../../lib/api/useApiResource';
import { displayApiError } from '../../lib/api/client';
import { toast } from '../../utils/toast';
import { CardSkeleton } from '../../components/Skeleton';
import { Badge, Card, CardTitle } from '../../components/ui';
import { AmenityChecklist } from './AmenityChecklist';
import { ReadOnlyNotice, SettingsHeader } from './SettingsKit';
import { SmokingPolicyPicker } from './SmokingPolicyPicker';

/** "FREE_INTERNET" -> "Free Internet". */
const amenityName = (code: string) =>
  code
    .toLowerCase()
    .split('_')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');

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
      toast('Could not save the change', { detail: displayApiError(err), tone: 'danger' });
    } finally {
      setBusy(false);
    }
  };

  const locked = !canEdit || busy;
  const offered = data?.amenities.filter((a) => a.isActive).length ?? 0;

  return (
    <div className="flex flex-col gap-5">
      <SettingsHeader title="Property Amenities" description="The policy and amenities that apply to the whole property" />
      {!canEdit ? <ReadOnlyNotice what="property amenities" /> : null}

      <Card>
        <CardTitle icon={Lucide.CigaretteOff} title="Smoking Policy" subtitle="Choose the policy that applies to your rooms" />
        {data ? (
          <SmokingPolicyPicker
            value={data.smokingPolicy}
            disabled={locked}
            onChange={(next) => void save(() => propertyAmenitiesApi.setSmokingPolicy(propertyId, next))}
          />
        ) : (
          <CardSkeleton lines={2} label="Loading smoking policy" />
        )}
      </Card>

      <Card>
        <CardTitle
          icon={Lucide.Star}
          title="Amenities"
          subtitle="Switch on what your property offers"
          badge={data ? <Badge tone="info" size="sm">{offered} offered</Badge> : undefined}
        />
        <AmenityChecklist
          items={data ? data.amenities.map(({ code, isActive }) => ({ code, name: amenityName(code), active: isActive })) : null}
          loading={resource.loading}
          error={resource.error}
          disabled={locked}
          onToggle={(code, next) => void save(() => propertyAmenitiesApi.setAmenity(propertyId, code, next))}
        />
      </Card>
    </div>
  );
}
