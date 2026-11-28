import { useState } from 'react';
import * as Lucide from 'lucide-react';
import { CardSkeleton } from '../../../shared/components/feedback/Skeleton';
import { Card, CardTitle, TableContainer } from '../../../shared/components/ui/display';
import { Button } from '../../../shared/components/ui/primitives';
import { SummaryStrip } from '../../../shared/components/ui/SummaryStrip';
import type { SummaryItem } from '../../../shared/components/ui/SummaryStrip';
import { useAuth } from '../../../shared/features/auth/AuthContext';
import { displayError } from '../../../shared/services/errors';
import { ownerApi } from '../../../shared/services/ownerApi';
import { platformApi, propertyDirectoryApi } from '../../../shared/services/platformApi';
import { useApiResource } from '../../../shared/services/useApiResource';
import { toast } from '../../../shared/utils/toast';
import type { ConsoleView } from '../../layout/consoleNav';

const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;

function Failure({ message }: { message: string }) {
  return (
    <p role="alert" className="py-6 text-center text-label text-danger-text">
      Could not load this: {message}
    </p>
  );
}

/** The Super Super Admin: the whole platform in six figures. */
function PlatformDashboard({ go }: { go: (view: ConsoleView) => void }) {
  const overview = useApiResource(() => platformApi.overview(), []);
  const data = overview.data;
  if (overview.error && !data) return <Failure message={overview.error} />;
  if (!data) return <CardSkeleton lines={4} label="Loading the platform" />;

  const items: SummaryItem[] = [
    { label: 'Relationship managers', value: String(data.relationshipManagers), hint: 'Active', icon: Lucide.UserCheck, tone: 'primary' },
    { label: 'Owners', value: String(data.owners), hint: data.owners === 0 ? 'None yet' : data.unassignedOwners > 0 ? `${data.unassignedOwners} without a manager` : 'All have a manager', icon: Lucide.Briefcase, tone: data.unassignedOwners > 0 ? 'warning' : data.owners === 0 ? 'neutral' : 'success' },
    { label: 'Properties', value: String(data.properties), hint: 'Across every owner', icon: Lucide.Building2, tone: 'info' },
    { label: 'Rooms', value: String(data.rooms), hint: 'Across every property', icon: Lucide.BedDouble, tone: 'neutral' },
    { label: 'Staff', value: String(data.staff), hint: `${data.signedIn} signed in now`, icon: Lucide.Users, tone: 'success' },
  ];
  return (
    <div className="flex flex-col gap-4">
      <SummaryStrip items={items} label="Platform at a glance" />
      <Card>
        <CardTitle title="Where to next" subtitle="You can look after any owner directly, without a manager." icon={Lucide.Compass} />
        <div className="mt-3 flex flex-wrap gap-2">
          <Button variant="secondary" onClick={() => go('managers')} icon={<Lucide.UserCheck size={14} />}>
            Relationship managers
          </Button>
          <Button variant="secondary" onClick={() => go('owners')} icon={<Lucide.Briefcase size={14} />}>
            Owners
          </Button>
          <Button variant="secondary" onClick={() => go('properties')} icon={<Lucide.Building2 size={14} />}>
            Properties
          </Button>
        </div>
      </Card>
    </div>
  );
}

/** A Relationship Manager: their owners and what those own. */
function ManagerDashboard({ go }: { go: (view: ConsoleView) => void }) {
  const owners = useApiResource(() => ownerApi.list(), []);
  const properties = useApiResource(() => propertyDirectoryApi.list(), []);
  const error = owners.error ?? properties.error;
  if (error && (!owners.data || !properties.data)) return <Failure message={error} />;
  if (!owners.data || !properties.data) return <CardSkeleton lines={4} label="Loading your owners" />;

  const items: SummaryItem[] = [
    { label: 'Your owners', value: String(owners.data.length), hint: `${owners.data.filter((o) => !o.isActive).length} switched off`, icon: Lucide.Briefcase, tone: 'primary' },
    { label: 'Properties', value: String(properties.data.length), hint: 'Owned by your owners', icon: Lucide.Building2, tone: 'info' },
    { label: 'Rooms', value: String(properties.data.reduce((sum, p) => sum + p.roomCount, 0)), hint: 'Across those properties', icon: Lucide.BedDouble, tone: 'neutral' },
    { label: 'Team members', value: String(properties.data.reduce((sum, p) => sum + p.staffCount, 0)), hint: 'Working at those properties', icon: Lucide.Users, tone: 'success' },
  ];
  return (
    <div className="flex flex-col gap-4">
      <SummaryStrip items={items} label="Your owners at a glance" columns="md:grid-cols-4" />
      <Card>
        <CardTitle title="Where to next" subtitle="You can open any of their properties and edit inside it." icon={Lucide.Compass} />
        <div className="mt-3 flex flex-wrap gap-2">
          <Button variant="secondary" onClick={() => go('owners')} icon={<Lucide.Briefcase size={14} />}>
            Owners
          </Button>
          <Button variant="secondary" onClick={() => go('properties')} icon={<Lucide.Building2 size={14} />}>
            Properties
          </Button>
        </div>
      </Card>
    </div>
  );
}

/** An owner: one view of today across all of the company's properties. */
function OwnerDashboard({ ownerId }: { ownerId: string }) {
  const { switchProperty } = useAuth();
  const overview = useApiResource(() => ownerApi.overview(ownerId), [ownerId]);
  const [opening, setOpening] = useState<string | null>(null);
  const data = overview.data;
  if (overview.error && !data) return <Failure message={overview.error} />;
  if (!data) return <CardSkeleton lines={5} label="Loading your properties" />;

  const { totals } = data;
  const items: SummaryItem[] = [
    { label: 'Properties', value: String(totals.properties), hint: plural(totals.rooms, 'room'), icon: Lucide.Building2, tone: 'primary' },
    { label: 'Occupancy today', value: `${totals.occupancyPercent}%`, hint: `${totals.occupiedRooms} of ${totals.rooms} rooms`, icon: Lucide.Gauge, tone: 'info' },
    { label: 'Arrivals today', value: String(totals.arrivals), hint: 'Still to check in', icon: Lucide.LogIn, tone: 'success' },
    { label: 'Departures today', value: String(totals.departures), hint: 'Still to check out', icon: Lucide.LogOut, tone: 'warning' },
    { label: 'In house', value: String(totals.inHouse), hint: 'Reservations checked in', icon: Lucide.BedDouble, tone: 'neutral' },
  ];

  const open = async (propertyId: string) => {
    setOpening(propertyId);
    try {
      await switchProperty(propertyId);
    } catch (cause) {
      toast('Could not open the property', { detail: displayError(cause), tone: 'danger' });
      setOpening(null);
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <SummaryStrip items={items} label="Your company today" />
      <Card>
        <CardTitle title="By property" subtitle={`Today, ${data.businessDate}. Open a property to work inside it.`} icon={Lucide.Building2} />
        {data.properties.length === 0 ? (
          <p className="py-8 text-center text-label text-ink-secondary">No properties yet. Add one from Properties.</p>
        ) : (
          <div className="mt-3">
            <TableContainer>
              <table className="pms-table w-full text-left">
                <thead>
                  <tr>
                    <th>PROPERTY</th>
                    <th>ROOMS</th>
                    <th>OCCUPIED</th>
                    <th>ARRIVALS</th>
                    <th>DEPARTURES</th>
                    <th>IN HOUSE</th>
                    <th className="text-right">ACTION</th>
                  </tr>
                </thead>
                <tbody>
                  {data.properties.map((p) => (
                    <tr key={p.id}>
                      <td>
                        <span className="block text-label font-semibold text-ink">{p.name}</span>
                        <span className="block text-micro text-ink-secondary">{[p.city, p.country].filter(Boolean).join(', ')}</span>
                      </td>
                      <td className="tnum text-label text-ink-secondary">{p.rooms}</td>
                      <td className="tnum text-label text-ink-secondary">
                        {p.occupiedRooms} ({p.occupancyPercent}%)
                      </td>
                      <td className="tnum text-label text-ink-secondary">{p.arrivals}</td>
                      <td className="tnum text-label text-ink-secondary">{p.departures}</td>
                      <td className="tnum text-label text-ink-secondary">{p.inHouse}</td>
                      <td className="text-right">
                        <Button variant="primary" disabled={opening === p.id} onClick={() => void open(p.id)} icon={<Lucide.ArrowUpRight size={13} />}>
                          Open
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </TableContainer>
          </div>
        )}
      </Card>
    </div>
  );
}

/** The dashboard for whoever is signed in to the console. */
export function ConsoleDashboard({ go }: { go: (view: ConsoleView) => void }) {
  const { me } = useAuth();
  if (me?.user.role === 'OWNER' && me.user.ownerId) return <OwnerDashboard ownerId={me.user.ownerId} />;
  if (me?.user.role === 'RM') return <ManagerDashboard go={go} />;
  return <PlatformDashboard go={go} />;
}
