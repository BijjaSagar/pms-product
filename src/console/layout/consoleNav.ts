import * as Lucide from 'lucide-react';
import type { UserRoleKey } from '../../shared/services/authApi';

/** The screens of the console. `new-property` is the setup wizard, reached from Properties. */
export type ConsoleView = 'overview' | 'managers' | 'owners' | 'properties' | 'people' | 'audit' | 'otas' | 'activity' | 'new-property';

export interface ConsoleNavItem {
  id: Exclude<ConsoleView, 'new-property'>;
  label: string;
  hint: string;
  icon: Lucide.LucideIcon;
}

const ITEMS: Record<ConsoleNavItem['id'], ConsoleNavItem> = {
  overview: { id: 'overview', label: 'Dashboard', hint: 'At a glance', icon: Lucide.LayoutDashboard },
  managers: { id: 'managers', label: 'Relationship managers', hint: 'Who looks after which owners', icon: Lucide.UserCheck },
  owners: { id: 'owners', label: 'Owners', hint: 'Companies and their people', icon: Lucide.Briefcase },
  properties: { id: 'properties', label: 'Properties', hint: 'Hotels, resorts and their teams', icon: Lucide.Building2 },
  people: { id: 'people', label: 'People', hint: 'Who can sign in for your company', icon: Lucide.Users },
  audit: { id: 'audit', label: 'Audit trail', hint: 'Who created or changed what', icon: Lucide.History },
  otas: { id: 'otas', label: 'OTA channels', hint: 'Channels every property gets', icon: Lucide.Share2 },
  activity: { id: 'activity', label: 'Session changes', hint: 'Edits made in this browser', icon: Lucide.ListChecks },
};

/** What each level of the chain sees: the platform owner everything, a manager their owners, an owner their company. */
const VIEWS: Record<Exclude<UserRoleKey, 'STAFF'>, ConsoleNavItem['id'][]> = {
  SUPER_ADMIN: ['overview', 'managers', 'owners', 'properties', 'audit', 'otas', 'activity'],
  RM: ['overview', 'owners', 'properties', 'audit'],
  OWNER: ['overview', 'properties', 'people', 'audit'],
};

export const consoleNav = (role: Exclude<UserRoleKey, 'STAFF'>): ConsoleNavItem[] => VIEWS[role].map((id) => ITEMS[id]);

/** The console's own name on screen, per level. */
export const CONSOLE_NAMES: Record<Exclude<UserRoleKey, 'STAFF'>, { console: string; role: string }> = {
  SUPER_ADMIN: { console: 'Platform console', role: 'Super Super Admin' },
  RM: { console: 'Manager console', role: 'Relationship Manager' },
  OWNER: { console: 'Owner console', role: 'Owner' },
};

export function consoleTitle(role: Exclude<UserRoleKey, 'STAFF'>, view: ConsoleView): string {
  return view === 'new-property' ? 'Add a property' : (consoleNav(role).find((item) => item.id === view)?.label ?? 'Dashboard');
}
