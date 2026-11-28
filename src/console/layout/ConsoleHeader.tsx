import { useState } from 'react';
import * as Lucide from 'lucide-react';
import { ProfileMenu } from '../../shared/components/layout/ProfileMenu';
import { useDismiss } from '../../shared/hooks/useDismiss';
import { IconButton } from '../../shared/components/ui/primitives';
import { displayError } from '../../shared/services/errors';
import { toast } from '../../shared/utils/toast';
import { ChangePasswordDialog } from '../../shared/features/auth/ChangePasswordDialog';
import { useAuth } from '../../shared/features/auth/AuthContext';
import { CONSOLE_NAMES } from './consoleNav';
import type { UserRoleKey } from '../../shared/services/authApi';

/** The console's top bar: the screen title and the signed-in person's account menu. */
export function ConsoleHeader({
  role,
  title,
  onMenu,
  onOpenThemes,
}: {
  role: Exclude<UserRoleKey, 'STAFF'>;
  title: string;
  onMenu: () => void;
  onOpenThemes: () => void;
}) {
  const { me, logout } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const [passwordOpen, setPasswordOpen] = useState(false);
  const close = () => setMenuOpen(false);
  const dismissRef = useDismiss(close);

  return (
    <>
      <header
        className="relative z-30 flex-none border-b border-border backdrop-blur-xl"
        style={{ background: 'color-mix(in srgb, var(--color-surface) 88%, transparent)', boxShadow: 'var(--shadow-sm)' }}
      >
        <div className="flex h-16 w-full items-center justify-between gap-3 px-4 sm:px-6 lg:px-8">
          <div className="flex min-w-0 items-center gap-3">
            <IconButton onClick={onMenu} aria-label="Open menu" className="flex-none lg:hidden">
              <Lucide.Menu size={20} />
            </IconButton>
            <h1 className="truncate text-title font-bold tracking-tight text-ink">{title}</h1>
          </div>

          <ProfileMenu
            open={menuOpen}
            onToggle={() => setMenuOpen((open) => !open)}
            containerRef={menuOpen ? dismissRef : undefined}
            fullName={me?.user.fullName ?? CONSOLE_NAMES[role].role}
            email={me?.user.email ?? null}
            roleName={CONSOLE_NAMES[role].role}
            propertyName={null}
            otherProperties={[]}
            onThemes={() => {
              close();
              onOpenThemes();
            }}
            onChangePassword={() => {
              close();
              setPasswordOpen(true);
            }}
            onSwitchProperty={close}
            onSignOut={() => {
              close();
              void logout().catch((error: unknown) => toast('Sign out failed', { detail: displayError(error), tone: 'danger' }));
            }}
          />
        </div>
      </header>

      <ChangePasswordDialog open={passwordOpen} onClose={() => setPasswordOpen(false)} />
    </>
  );
}
