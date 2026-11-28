import { useCallback, useMemo, useState } from 'react';
import type { ComponentType } from 'react';
import * as Lucide from 'lucide-react';
import { PanelLoadState } from '../../../shared/components/feedback/Skeleton';
import { useAuth } from '../../../shared/features/auth/AuthContext';
import { propertyApi } from '../../../shared/services/propertyApi';
import { useApiResource } from '../../../shared/services/useApiResource';
import { CancellationTab } from './tabs/CancellationTab';
import { CategoryAmenitiesTab } from './tabs/CategoryAmenitiesTab';
import { HouseKeepingTab } from './tabs/HouseKeepingTab';
import { MealPlansTab } from './tabs/MealPlansTab';
import { PoliciesTab } from './tabs/PoliciesTab';
import { PostMasterSettingsTab } from './tabs/PostMasterSettingsTab';
import { PropertyAmenitiesTab } from './tabs/PropertyAmenitiesTab';
import { PropertyDetailsTab } from './tabs/PropertyDetailsTab';
import { ReservationSettingsTab } from './tabs/ReservationSettingsTab';
import { RoomSetup2Tab } from './tabs/RoomSetup2Tab';
import { StaffTab } from './tabs/StaffTab';
import { ComingSoon, NoPropertyState } from './components/SettingsKit';
import { SectionNav } from '../../../shared/components/ui/SectionNav';
import type { NavGroup } from '../../../shared/components/ui/SectionNav';
import { TaxCategoryTab } from './tabs/TaxCategoryTab';
import { TaxGeneralSettingTab } from './tabs/TaxGeneralSettingTab';
import { TaxRuleTab } from './tabs/TaxRuleTab';
import { TermsInclusionsTab } from './tabs/TermsInclusionsTab';

type SettingsTab =
  | 'general'
  | 'terms-inclusions'
  | 'terms-cancellations'
  | 'room-setup-2'
  | 'property-amenities'
  | 'category-amenities'
  | 'policies'
  | 'meal-plans'
  | 'payment-terms'
  | 'staff'
  | 'reservation-settings'
  | 'post-master-settings'
  | 'house-keeping'
  | 'tax-category'
  | 'tax-rule'
  | 'general-tax-setting';

const BASE_NAV_GROUPS: NavGroup<SettingsTab>[] = [
  {
    title: 'Property Settings',
    items: [
      { id: 'general', label: 'Property Details', icon: Lucide.Building2 },
      { id: 'terms-inclusions', label: 'Terms and Inclusions', icon: Lucide.ListChecks },
      { id: 'terms-cancellations', label: 'Cancellation', icon: Lucide.CalendarX },
      { id: 'room-setup-2', label: 'Room Setup', icon: Lucide.Layers },
      { id: 'property-amenities', label: 'Property Amenities', icon: Lucide.Star },
      { id: 'category-amenities', label: 'Category Amenities', icon: Lucide.Tags },
      { id: 'policies', label: 'Policies', icon: Lucide.FileText },
      { id: 'meal-plans', label: 'Meal Plans', icon: Lucide.Utensils },
      { id: 'payment-terms', label: 'Payment Terms', icon: Lucide.CreditCard },
    ],
  },
  {
    title: 'Booking Settings',
    items: [
      { id: 'reservation-settings', label: 'Reservation Settings', icon: Lucide.CalendarCheck },
      { id: 'post-master-settings', label: 'Post Master Settings', icon: Lucide.Wallet },
      { id: 'house-keeping', label: 'House Keeping', icon: Lucide.SprayCan },
    ],
  },
  {
    title: 'Tax Setup',
    items: [
      { id: 'tax-category', label: 'Tax Category', icon: Lucide.Percent },
      { id: 'tax-rule', label: 'Tax Rule', icon: Lucide.Scale },
      { id: 'general-tax-setting', label: 'General Tax Setting', icon: Lucide.Settings2 },
    ],
  },
];

/** Shown only to people allowed to see staff (`staff.read`). */
const PEOPLE_GROUP: NavGroup<SettingsTab> = {
  title: 'People',
  items: [{ id: 'staff', label: 'Team & Roles', icon: Lucide.Users }],
};

/** Tabs that have no screen yet; they show a placeholder card. */
const PLACEHOLDER_TABS: SettingsTab[] = ['payment-terms'];

/** Screens that only need the active property and whether the user may change it. */
const PROPERTY_SCREENS: Partial<Record<SettingsTab, ComponentType<{ propertyId: string; canEdit: boolean }>>> = {
  'terms-inclusions': TermsInclusionsTab,
  policies: PoliciesTab,
  'terms-cancellations': CancellationTab,
  'room-setup-2': RoomSetup2Tab,
  'property-amenities': PropertyAmenitiesTab,
  'category-amenities': CategoryAmenitiesTab,
  'meal-plans': MealPlansTab,
  'reservation-settings': ReservationSettingsTab,
  'post-master-settings': PostMasterSettingsTab,
  'house-keeping': HouseKeepingTab,
  staff: StaffTab,
};

export function Settings({ initialTab = 'general' }: { initialTab?: SettingsTab }) {
  const { me, can, reload } = useAuth();
  const activePropertyId = me?.activePropertyId;
  // The server only lets people holding `settings.update` (a Property Admin, or anyone above the property in
  // the chain) make changes, so everyone else gets the screens read-only instead of a Save that would be refused.
  const canEditProperty = can('settings.update');
  const navGroups = useMemo(() => (can('staff.read') ? [...BASE_NAV_GROUPS, PEOPLE_GROUP] : BASE_NAV_GROUPS), [can]);

  // The property record feeds only the Property Details tab; the other tabs load their own data.
  const loadProperty = useCallback(
    () => (can('property.read') && activePropertyId ? propertyApi.get(activePropertyId) : Promise.resolve(null)),
    [can, activePropertyId],
  );
  const propertyResource = useApiResource(loadProperty);
  const property = propertyResource.data;

  const [activeTab, setActiveTab] = useState<SettingsTab>(initialTab);
  const activeGroup = navGroups.find((g) => g.items.some((i) => i.id === activeTab));
  const activeItem = activeGroup?.items.find((i) => i.id === activeTab);

  const renderScreen = () => {
    if (PLACEHOLDER_TABS.includes(activeTab)) {
      return <ComingSoon title={activeItem?.label ?? 'Settings'} onBack={() => setActiveTab('general')} />;
    }
    if (activeTab === 'tax-category') return <TaxCategoryTab canManage={canEditProperty} />;
    if (activeTab === 'tax-rule') return <TaxRuleTab canManage={canEditProperty} />;
    if (activeTab === 'general-tax-setting') return <TaxGeneralSettingTab canManage={canEditProperty} />;
    if (activeTab === 'general') {
      if (property) {
        return (
          <PropertyDetailsTab
            key={property.id}
            property={property}
            canEdit={canEditProperty}
            onSaved={async () => {
              propertyResource.refresh();
              await reload();
            }}
          />
        );
      }
      return propertyResource.loading ? <PanelLoadState label="Loading property" /> : <NoPropertyState />;
    }
    if (!activePropertyId) return <NoPropertyState />;
    const Screen = PROPERTY_SCREENS[activeTab];
    return Screen ? <Screen key={activePropertyId} propertyId={activePropertyId} canEdit={canEditProperty} /> : null;
  };

  return (
    <div className="pms-page pms-animate-fade-in">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:gap-5">
        <SectionNav label="Settings" searchLabel="Find a setting" groups={navGroups} active={activeTab} onSelect={setActiveTab} />

        <div className="flex min-w-0 flex-1 flex-col gap-4">
          <nav aria-label="Breadcrumb" className="hidden items-center gap-1.5 text-label text-ink-muted lg:flex">
            <span>Settings</span>
            <Lucide.ChevronRight size={12} aria-hidden="true" />
            <span>{activeGroup?.title}</span>
            <Lucide.ChevronRight size={12} aria-hidden="true" />
            <span className="font-semibold text-ink-secondary" aria-current="page">
              {activeItem?.label}
            </span>
          </nav>
          {renderScreen()}
        </div>
      </div>
    </div>
  );
}
