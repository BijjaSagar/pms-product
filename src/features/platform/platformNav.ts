import * as Lucide from 'lucide-react';

/** The screens of the platform console. `new-property` is the setup wizard, reached from Properties. */
export type PlatformView = 'overview' | 'properties' | 'users' | 'plans' | 'otas' | 'activity' | 'new-property';

export interface PlatformNavItem {
  id: Exclude<PlatformView, 'new-property'>;
  label: string;
  hint: string;
  icon: Lucide.LucideIcon;
}

export const PLATFORM_NAV: PlatformNavItem[] = [
  { id: 'overview', label: 'Dashboard', hint: 'Platform at a glance', icon: Lucide.LayoutDashboard },
  { id: 'properties', label: 'Properties', hint: 'Every hotel & its team', icon: Lucide.Building2 },
  { id: 'users', label: 'Users', hint: 'Accounts & property access', icon: Lucide.Users },
  { id: 'plans', label: 'Plans', hint: 'Subscription plans for sign-ups', icon: Lucide.BadgeDollarSign },
  { id: 'otas', label: 'OTA channels', hint: 'Channels sign-ups can pick', icon: Lucide.Share2 },
  { id: 'activity', label: 'Activity log', hint: 'Who changed what, per property', icon: Lucide.History },
];

export function platformTitle(view: PlatformView): string {
  return view === 'new-property' ? 'New property' : (PLATFORM_NAV.find((item) => item.id === view)?.label ?? 'Dashboard');
}
