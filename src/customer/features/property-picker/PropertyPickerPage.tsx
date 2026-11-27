import * as Lucide from 'lucide-react';
import { BrandShell } from '../../../shared/components/brand/BrandShell';
import { Button } from '../../../shared/components/ui/primitives';
import { displayError } from '../../../shared/services/errors';
import { propertyApi } from '../../../shared/services/propertyApi';
import { useApiResource } from '../../../shared/services/useApiResource';
import { toast } from '../../../shared/utils/toast';
import { useAuth } from '../../../shared/features/auth/AuthContext';
import { PropertiesPage } from './PropertiesPage';

/**
 * Shown after sign-in to a STAFF user with several properties and none open yet. They pick one, which
 * opens it directly. (A super admin starts in the platform console instead, which also sets up new
 * properties.)
 */
export function PropertyPickerPage() {
  const { switchProperty, logout } = useAuth();
  const list = useApiResource(() => propertyApi.list(), []);

  const open = async (propertyId: string) => {
    try {
      await switchProperty(propertyId);
    } catch (cause) {
      toast('Could not open the property', { detail: displayError(cause), tone: 'danger' });
    }
  };

  if (list.error) {
    return (
      <BrandShell>
        <div role="alert" className="flex flex-wrap items-center gap-3 rounded-2xl border border-danger-border bg-danger-bg px-4 py-3 text-[14px] text-danger-text">
          <Lucide.AlertCircle size={16} aria-hidden="true" /> {list.error}
          <button type="button" className="font-semibold underline" onClick={list.refresh}>
            Try again
          </button>
        </div>
      </BrandShell>
    );
  }

  if (!list.data) {
    return (
      <BrandShell>
        <p className="text-[14px] text-ink-secondary" role="status">Loading your properties…</p>
      </BrandShell>
    );
  }

  const properties = list.data.filter((p) => p.isActive);

  if (properties.length === 0) {
    return (
      <BrandShell>
        <div className="flex flex-col items-start gap-3">
          <p className="text-[15px] text-ink-secondary" role="status">
            None of your properties is active right now. Contact an administrator.
          </p>
          <Button variant="ghost" icon={<Lucide.LogOut size={14} />} onClick={() => void logout()}>
            Sign out
          </Button>
        </div>
      </BrandShell>
    );
  }

  return <PropertiesPage properties={properties} onSignOut={() => void logout()} onOpen={(id) => void open(id)} />;
}
