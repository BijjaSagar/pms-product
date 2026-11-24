import * as Lucide from 'lucide-react';
import { Button } from '../../components/ui/primitives';
import { SetupWizard } from '../property-setup/setup-wizard/SetupWizard';
import { useAuth } from './AuthContext';

/**
 * Step two, for a new account: describe the property (details, room categories, floors and rooms) and
 * enter an activation key. A valid key activates the account, and reloading the session opens the hotel.
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
