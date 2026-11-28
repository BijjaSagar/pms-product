import * as Lucide from 'lucide-react';
import { Card, CardTitle } from '../../../shared/components/ui/display';
import { useAuth } from '../../../shared/features/auth/AuthContext';
import { OwnerPeoplePanel } from './OwnerPeoplePanel';

/** An owner's own colleagues: everyone who can sign in for the company. */
export function PeoplePage() {
  const { me } = useAuth();
  const ownerId = me?.user.ownerId;
  return (
    <Card>
      <CardTitle title="People" subtitle="Everyone who can sign in for your company." icon={Lucide.Users} />
      <div className="mt-3">{ownerId ? <OwnerPeoplePanel ownerId={ownerId} /> : null}</div>
    </Card>
  );
}
