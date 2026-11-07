import { useCallback, useState } from 'react';
import * as Lucide from 'lucide-react';
import { propertyAmenitiesApi } from '../../lib/api/pms';
import type { PropertyAmenitiesDetails, SmokingPolicyKey } from '../../lib/api/pms';
import { useApiResource } from '../../lib/api/useApiResource';
import { displayApiError } from '../../lib/api/client';
import { toast } from '../../utils/toast';
import { Checkbox } from '../../components/primitives';
import { Card, CardTitle, TableContainer } from '../../components/ui';

const SMOKING_POLICIES: { key: SmokingPolicyKey; name: string }[] = [
  { key: 'ALL_NON_SMOKING', name: 'All rooms non smoking' },
  { key: 'SMOKING_PERMITTED', name: 'Smoking permitted in rooms' },
];

/** "FREE_INTERNET" -> "Free Internet". */
const amenityName = (code: string) =>
  code
    .toLowerCase()
    .split('_')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');

/** A status cell: just the checkbox. */
function StatusCell({
  active,
  disabled,
  label,
  onChange,
}: {
  active: boolean;
  disabled: boolean;
  label: string;
  onChange: (next: boolean) => void;
}) {
  return <Checkbox type="checkbox" checked={active} disabled={disabled} aria-label={label} onChange={(e) => onChange(e.target.checked)} />;
}

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

  const emptyText = resource.error ?? (resource.loading ? 'Loading…' : 'Nothing to show.');
  const locked = !canEdit || busy;

  return (
    <div className="grid grid-cols-1 gap-5 xl:grid-cols-2 xl:items-start">
      <Card>
        <CardTitle icon={Lucide.CigaretteOff} title="Smoking Policy" subtitle="Choose the policy that applies to your rooms" />
        <TableContainer>
          <table className="pms-table w-full text-left">
            <thead>
              <tr>
                <th>NAME</th>
                <th>STATUS</th>
              </tr>
            </thead>
            <tbody>
              {data
                ? SMOKING_POLICIES.map(({ key, name }) => (
                    <tr key={key} className="border-b border-divider last:border-b-0">
                      <td className="py-3 text-label font-medium text-ink">{name}</td>
                      <td className="py-3">
                        <StatusCell
                          active={data.smokingPolicy === key}
                          disabled={locked}
                          label={name}
                          onChange={(next) => void save(() => propertyAmenitiesApi.setSmokingPolicy(propertyId, next ? key : null))}
                        />
                      </td>
                    </tr>
                  ))
                : (
                  <tr>
                    <td colSpan={2} className="py-8 text-center text-label text-ink-muted">
                      {emptyText}
                    </td>
                  </tr>
                )}
            </tbody>
          </table>
        </TableContainer>
      </Card>

      <Card>
        <CardTitle icon={Lucide.Star} title="Property Amenities" subtitle="Amenities your property offers" />
        <TableContainer>
          <table className="pms-table w-full text-left">
            <thead>
              <tr>
                <th>NAME</th>
                <th>STATUS</th>
              </tr>
            </thead>
            <tbody>
              {data ? (
                data.amenities.map(({ code, isActive }) => (
                  <tr key={code} className="border-b border-divider last:border-b-0">
                    <td className="py-3 text-label font-medium text-ink">{amenityName(code)}</td>
                    <td className="py-3">
                      <StatusCell
                        active={isActive}
                        disabled={locked}
                        label={amenityName(code)}
                        onChange={(next) => void save(() => propertyAmenitiesApi.setAmenity(propertyId, code, next))}
                      />
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={2} className="py-8 text-center text-label text-ink-muted">
                    {emptyText}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </TableContainer>
      </Card>
    </div>
  );
}
