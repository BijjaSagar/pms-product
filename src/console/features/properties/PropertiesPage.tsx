import { useState } from 'react';
import * as Lucide from 'lucide-react';
import { CardSkeleton } from '../../../shared/components/feedback/Skeleton';
import { Field } from '../../../shared/components/ui/controls';
import { Card, CardTitle, TableContainer } from '../../../shared/components/ui/display';
import { Modal } from '../../../shared/components/ui/overlays';
import { Button, SelectField } from '../../../shared/components/ui/primitives';
import { useAuth } from '../../../shared/features/auth/AuthContext';
import { StaffPanel } from '../../../shared/features/staff/StaffPanel';
import { displayError } from '../../../shared/services/errors';
import { ownerApi } from '../../../shared/services/ownerApi';
import type { PropertySummary } from '../../../shared/services/ownerApi';
import { propertyDirectoryApi } from '../../../shared/services/platformApi';
import { useApiResource } from '../../../shared/services/useApiResource';
import { toast } from '../../../shared/utils/toast';

const place = (p: PropertySummary) => [p.city, p.state, p.country].filter(Boolean).join(', ');
const day = (iso: string) => new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });

/** The Super Super Admin and Relationship Managers add a property for one of their owners, so they pick which. */
function ChooseOwnerDialog({ onClose, onChosen }: { onClose: () => void; onChosen: (ownerId: string) => void }) {
  const owners = useApiResource(() => ownerApi.list(), []);
  const [ownerId, setOwnerId] = useState('');
  const active = (owners.data ?? []).filter((o) => o.isActive);

  return (
    <Modal
      open
      onClose={onClose}
      title="Add a property"
      subtitle="Which owner company is it for?"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="primary" disabled={!ownerId} onClick={() => onChosen(ownerId)} icon={<Lucide.ArrowRight size={14} />}>
            Continue
          </Button>
        </>
      }
    >
      <div className="py-2">
        {owners.error ? (
          <p role="alert" className="rounded-xl border border-danger-border bg-danger-bg p-3 text-label text-danger-text">
            Could not load the owners: {owners.error}
          </p>
        ) : (
          <Field label="Owner company" required hint={owners.data && active.length === 0 ? 'Add an owner first; properties belong to an owner.' : undefined}>
            <SelectField value={ownerId} onChange={(e) => setOwnerId(e.target.value)} disabled={!owners.data}>
              <option value="">Choose an owner…</option>
              {active.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.name}
                </option>
              ))}
            </SelectField>
          </Field>
        )}
      </div>
    </Modal>
  );
}

/** Every property the signed-in person reaches. "Open" works inside one; "Team" manages its people and roles. */
export function PropertiesPage({ onAddProperty }: { onAddProperty: (ownerId: string) => void }) {
  const { me, switchProperty } = useAuth();
  const properties = useApiResource(() => propertyDirectoryApi.list(), []);
  const [choosing, setChoosing] = useState(false);
  const [team, setTeam] = useState<PropertySummary | null>(null);
  const [opening, setOpening] = useState<string | null>(null);
  const list = properties.data;
  // An owner's person adds to their own company; everyone above chooses an owner first.
  const ownOwnerId = me?.user.role === 'OWNER' ? me.user.ownerId : null;
  const showOwner = ownOwnerId === null;

  const open = async (property: PropertySummary) => {
    setOpening(property.id);
    try {
      await switchProperty(property.id);
    } catch (cause) {
      toast('Could not open the property', { detail: displayError(cause), tone: 'danger' });
      setOpening(null);
    }
  };

  return (
    <Card>
      <CardTitle
        title="Properties"
        subtitle="Open a property to work inside it, or manage who works there."
        icon={Lucide.Building2}
        action={
          <Button variant="primary" onClick={() => (ownOwnerId ? onAddProperty(ownOwnerId) : setChoosing(true))} icon={<Lucide.Plus size={14} />}>
            Add property
          </Button>
        }
      />

      {!list && properties.loading ? (
        <CardSkeleton lines={5} label="Loading properties" />
      ) : properties.error && !list ? (
        <p role="alert" className="py-6 text-center text-label text-danger-text">
          Could not load the properties: {properties.error}
        </p>
      ) : list && list.length === 0 ? (
        <div className="flex flex-col items-center gap-2 py-12 text-center">
          <Lucide.Building2 size={28} className="text-ink-muted" aria-hidden="true" />
          <p className="text-body font-semibold text-ink">No properties yet</p>
          <p className="text-label text-ink-secondary">Add the first property to start taking bookings.</p>
        </div>
      ) : list ? (
        <div className={`mt-3 ${properties.loading ? 'opacity-60' : ''}`} aria-busy={properties.loading}>
          <TableContainer>
            <table className="pms-table w-full text-left">
              <thead>
                <tr>
                  <th>PROPERTY</th>
                  {showOwner ? <th>OWNER</th> : null}
                  <th>LOCATION</th>
                  <th>ROOMS</th>
                  <th>TEAM</th>
                  <th>ADDED</th>
                  <th className="text-right">ACTION</th>
                </tr>
              </thead>
              <tbody>
                {list.map((property) => (
                  <tr key={property.id}>
                    <td>
                      <span className="block text-label font-semibold text-ink">{property.name}</span>
                      <span className="block text-micro text-ink-secondary">{property.code}</span>
                    </td>
                    {showOwner ? <td className="text-label text-ink-secondary">{property.ownerName}</td> : null}
                    <td className="text-label text-ink-secondary">{place(property)}</td>
                    <td className="tnum text-label text-ink-secondary">{property.roomCount}</td>
                    <td className="tnum text-label text-ink-secondary">{property.staffCount}</td>
                    <td className="text-label text-ink-secondary">{day(property.createdAt)}</td>
                    <td className="text-right">
                      <span className="inline-flex items-center justify-end gap-1.5">
                        <Button variant="secondary" onClick={() => setTeam(property)} icon={<Lucide.Users size={13} />}>
                          Team
                        </Button>
                        <Button variant="primary" disabled={opening === property.id} onClick={() => void open(property)} icon={<Lucide.ArrowUpRight size={13} />}>
                          Open
                        </Button>
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </TableContainer>
        </div>
      ) : null}

      {choosing ? (
        <ChooseOwnerDialog
          onClose={() => setChoosing(false)}
          onChosen={(ownerId) => {
            setChoosing(false);
            onAddProperty(ownerId);
          }}
        />
      ) : null}
      {team ? (
        <Modal
          open
          xl
          onClose={() => {
            setTeam(null);
            properties.refresh();
          }}
          title={`${team.name} · team`}
          subtitle="The people who work here and their department roles."
          footer={
            <Button
              variant="primary"
              onClick={() => {
                setTeam(null);
                properties.refresh();
              }}
            >
              Done
            </Button>
          }
        >
          <div className="py-2">
            <StaffPanel propertyId={team.id} />
          </div>
        </Modal>
      ) : null}
    </Card>
  );
}
