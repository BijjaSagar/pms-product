import * as Lucide from 'lucide-react';
import { Card, CardTitle } from '../../../../shared/components/ui/display';
import { StaffPanel } from '../../../../shared/features/staff/StaffPanel';

/** Who works at this property and their department roles. The server decides who may change them. */
export function StaffTab({ propertyId }: { propertyId: string }) {
  return (
    <Card>
      <CardTitle title="Team & roles" subtitle="Property Admin, Front Office, Housekeeping, Laundry & Linen, POS & Kitchen, Accounts / Revenue." icon={Lucide.Users} />
      <div className="mt-3">
        <StaffPanel propertyId={propertyId} />
      </div>
    </Card>
  );
}
