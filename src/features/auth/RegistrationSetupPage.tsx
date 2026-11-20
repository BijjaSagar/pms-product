import * as Lucide from 'lucide-react';
import { Button } from '../../components/primitives';
import { SetupWizard } from '../property-setup/setup-wizard/SetupWizard';
import { useAuth } from './AuthContext';

/**
 * Step two of three, for a new account: describe the property (details, room categories, floors and
 * rooms). Finishing sends it for approval, and the account then moves to the waiting page.
 */
export function RegistrationSetupPage() {
  const { me, logout, reload } = useAuth();
  const firstName = me?.user.fullName.trim().split(/\s+/)[0] ?? '';

  return (
    <SetupWizard
      mode="registration"
      intro={
        <p className="mb-3 flex items-start gap-2 rounded-2xl border border-border bg-page px-4 py-2.5 text-[13px] text-ink-secondary">
          <Lucide.Info size={15} className="mt-px flex-none" aria-hidden="true" />
          <span>
            Welcome{firstName ? `, ${firstName}` : ''}. Tell us about your property. When you finish, our team reviews it and you can start using TriponX
            as soon as it is approved.
          </span>
        </p>
      }
      exitAction={
        <Button variant="ghost" icon={<Lucide.LogOut size={14} />} onClick={() => void logout()}>
          Sign out
        </Button>
      }
      onDone={() => void reload()}
    />
  );
}
