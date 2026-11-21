import * as Lucide from 'lucide-react';
import { Button } from '../../components/primitives';
import { SetupWizard } from '../property-setup/setup-wizard/SetupWizard';
import { useAuth } from './AuthContext';

/**
 * Step two of three, for a new account: describe the property (details, room categories, floors and
 * rooms). Finishing sends it for approval, and the account then moves to the waiting page.
 */
export function RegistrationSetupPage() {
  const { logout, reload } = useAuth();

  return (
    <SetupWizard
      mode="registration"
      exitAction={
        <Button variant="ghost" icon={<Lucide.LogOut size={14} />} onClick={() => void logout()}>
          Sign out
        </Button>
      }
      onDone={() => void reload()}
    />
  );
}
