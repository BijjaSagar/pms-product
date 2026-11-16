import { useState } from 'react';
import * as Lucide from 'lucide-react';
import { BrandShell } from '../../components/brand/BrandShell';
import { BUTTON_PLAIN } from '../../components/brand/brandStyles';
import { displayApiError } from '../../lib/api/client';
import { propertyApi } from '../../lib/api/pms';
import { useApiResource } from '../../lib/api/useApiResource';
import { toast } from '../../utils/toast';
import { useAuth } from '../auth/AuthContext';
import { PropertiesPage } from './PropertiesPage';
import { SetupWizard } from './setup-wizard/SetupWizard';

type View = { kind: 'list' } | { kind: 'setup' };

/**
 * Shown after sign-in when no property is active. Only an ADMIN can get here (a
 * STAFF user is bound to one property): they pick a property, which opens it
 * directly, or set up a new one. With no properties at all they go straight to setup.
 */
export function PropertyPickerPage() {
  const { me, switchProperty, logout } = useAuth();
  const list = useApiResource(() => propertyApi.list(), []);
  const [view, setView] = useState<View>({ kind: 'list' });

  const canAdd = me?.user.propertyMemberships[0]?.role.key !== 'staff';

  const open = async (propertyId: string) => {
    try {
      await switchProperty(propertyId);
    } catch (cause) {
      toast('Could not open the property', { detail: displayApiError(cause), tone: 'danger' });
    }
  };

  const signOut = (
    <button type="button" className={`${BUTTON_PLAIN} !h-10`} onClick={() => void logout()}>
      <Lucide.LogOut size={15} aria-hidden="true" /> Sign out
    </button>
  );

  if (list.error) {
    return (
      <BrandShell>
        <div className="mb-6 flex justify-end">{signOut}</div>
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
        <div className="mb-6 flex justify-end">{signOut}</div>
        <p className="text-[14px] text-ink-secondary" role="status">Loading your properties…</p>
      </BrandShell>
    );
  }

  const properties = list.data.filter((p) => p.isActive);

  if (view.kind === 'setup' || properties.length === 0) {
    const exit =
      properties.length > 0 ? (
        <button type="button" className={`${BUTTON_PLAIN} !h-10`} onClick={() => setView({ kind: 'list' })}>
          Exit setup
        </button>
      ) : (
        signOut
      );
    return (
      <SetupWizard
        exitAction={exit}
        onDone={(id) => void open(id)}
      />
    );
  }

  return <PropertiesPage properties={properties} canAdd={canAdd} onAdd={() => setView({ kind: 'setup' })} onOpen={(id) => void open(id)} />;
}
