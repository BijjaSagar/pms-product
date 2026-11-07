import { useCallback, useState } from 'react';
import * as Lucide from 'lucide-react';
import { useAuth } from '../../features/auth/AuthContext';
import { propertyApi, adminApi } from '../../lib/api/pms';
import { useApiResource } from '../../lib/api/useApiResource';
import { toast } from '../../utils/toast';
import { displayApiError } from '../../lib/api/client';
import { Button, Checkbox, TextField } from '../../components/primitives';
import { PropertyDetailsTab } from './PropertyDetailsTab';
import { CancellationTab } from './CancellationTab';
import { BedTypeTab } from './BedTypeTab';
import { BrandingTab } from './BrandingTab';
import { CategoryAmenitiesTab } from './CategoryAmenitiesTab';
import { ExtraBedTypeTab } from './ExtraBedTypeTab';
import { GrcSettingsTab } from './GrcSettingsTab';
import { HouseKeepingTab } from './HouseKeepingTab';
import { MealPlansTab } from './MealPlansTab';
import { PostMasterSettingsTab } from './PostMasterSettingsTab';
import { PropertyAmenitiesTab } from './PropertyAmenitiesTab';
import { ReservationSettingsTab } from './ReservationSettingsTab';
import { RoomSetup2Tab } from './RoomSetup2Tab';
import { TermsInclusionsTab } from './TermsInclusionsTab';
import { RoomSettingsTab } from './room-settings/RoomSettingsTab';

type SettingsTab =
  | 'general'
  | 'terms-inclusions'
  | 'terms-cancellations'
  | 'room-settings'
  | 'room-setup-2'
  | 'rooms-rates'
  | 'property-amenities'
  | 'category-amenities'
  | 'bed-type'
  | 'extra-bed-type'
  | 'branding'
  | 'policies'
  | 'meal-plans'
  | 'payment-terms'
  | 'grc-settings'
  | 'currency-settings'
  | 'reservation-settings'
  | 'post-master-settings'
  | 'house-keeping'
  | 'taxes'
  | 'guests'
  | 'integrations'
  | 'notifications'
  | 'advanced';

/** Tabs that have no screen yet; they show a placeholder card. */
const PLACEHOLDER_TABS: SettingsTab[] = [
  'payment-terms',
  'currency-settings',
  'guests',
  'integrations',
  'notifications',
  'advanced',
];

export function Settings({
  onOpenThemes,
  initialTab = 'general',
}: {
  onOpenThemes?: () => void;
  initialTab?: SettingsTab;
}) {
  const { me, can, reload } = useAuth();
  const activePropertyId = me?.activePropertyId;
  // The backend only lets administrators change property details, so everyone
  // else gets the General tab read-only instead of a Save that would be refused.
  const canEditProperty =
    me?.user.propertyMemberships.find((m) => m.propertyId === me.activePropertyId)?.role.key === 'admin';

  // Load active property & taxes
  const loadSettings = useCallback(async () => {
    const [property, taxRules] = await Promise.all([
      can('property.read') && activePropertyId ? propertyApi.get(activePropertyId) : Promise.resolve(null),
      can('invoice.read') ? adminApi.taxRules() : Promise.resolve([]),
    ]);
    return { property, taxRules };
  }, [can, activePropertyId]);

  const resource = useApiResource(loadSettings);
  const property = resource.data?.property;
  const currencyCode = property?.defaultCurrency ?? 'INR';

  const [activeTab, setActiveTab] = useState<SettingsTab>(
    initialTab === 'rooms-rates' ? 'room-settings' : initialTab
  );
  const [saving, setSaving] = useState(false);

  // Active Tax rule
  const activeTax = resource.data?.taxRules.find((rule) => rule.isActive);
  const [taxRate, setTaxRate] = useState<number>(Number(activeTax?.ratePercent ?? 12));

  const NAV_GROUPS: {
    title: string;
    items: { id: SettingsTab; label: string; icon: Lucide.LucideIcon }[];
  }[] = [
    {
      title: 'Property Settings',
      items: [
        { id: 'general', label: 'Property Details', icon: Lucide.Building2 },
        { id: 'terms-inclusions', label: 'Terms and Inclusions', icon: Lucide.ListChecks },
        { id: 'terms-cancellations', label: 'Cancellation', icon: Lucide.CalendarX },
        { id: 'room-settings', label: 'Room Setup', icon: Lucide.Layers },
        { id: 'room-setup-2', label: 'Room Setup 2', icon: Lucide.ListOrdered },
        { id: 'property-amenities', label: 'Property Amenities', icon: Lucide.Star },
        { id: 'category-amenities', label: 'Category Amenities', icon: Lucide.Tags },
        { id: 'bed-type', label: 'Bed Type', icon: Lucide.BedDouble },
        { id: 'extra-bed-type', label: 'Extra Bed Type', icon: Lucide.BedSingle },
        { id: 'branding', label: 'Branding', icon: Lucide.Palette },
        { id: 'policies', label: 'Policies', icon: Lucide.FileText },
        { id: 'meal-plans', label: 'Meal Plans', icon: Lucide.Utensils },
        { id: 'payment-terms', label: 'Payment Terms', icon: Lucide.CreditCard },
        { id: 'grc-settings', label: 'GRC Settings', icon: Lucide.ClipboardList },
        { id: 'currency-settings', label: 'Currency Settings', icon: Lucide.Coins },
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
      title: 'Other Settings',
      items: [
        { id: 'taxes', label: 'Taxes & Fees', icon: Lucide.Receipt },
        { id: 'guests', label: 'Guest Settings', icon: Lucide.Users },
        { id: 'integrations', label: 'Integrations', icon: Lucide.Boxes },
        { id: 'notifications', label: 'Notifications', icon: Lucide.Bell },
        { id: 'advanced', label: 'Advanced', icon: Lucide.SlidersHorizontal },
      ],
    },
  ];
  const activeLabel = NAV_GROUPS.flatMap((g) => g.items).find((i) => i.id === activeTab)?.label ?? '';

  return (
    <div className="flex flex-col gap-4 pms-animate-fade-in pb-8">
      <div className="flex flex-col lg:flex-row lg:items-start gap-5">
      {/* ================= SETTINGS SIDEBAR ================= */}
      <aside
        className="w-full flex-none rounded-2xl border p-3 shadow-sm lg:w-[268px]"
        style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}
      >
        <nav aria-label="Settings" className="flex flex-col gap-4">
          {NAV_GROUPS.map((group) => (
            <div key={group.title}>
              <p className="px-3 pb-1.5 text-micro font-bold uppercase tracking-[0.14em] text-ink-muted">
                {group.title}
              </p>
              <ul className="flex flex-col gap-0.5">
                {group.items.map((t) => {
                  const isActive = activeTab === t.id;
                  const Icon = t.icon;
                  return (
                    <li key={t.id}>
                      <button
                        type="button"
                        onClick={() => setActiveTab(t.id)}
                        aria-current={isActive ? 'page' : undefined}
                        className="relative flex w-full cursor-pointer items-center gap-3 rounded-lg px-3 py-2 text-left text-body transition-colors hover:bg-muted-surface"
                        style={{
                          background: isActive
                            ? 'color-mix(in srgb, var(--color-primary) 10%, var(--color-surface))'
                            : undefined,
                          color: isActive ? 'var(--color-primary)' : 'var(--color-ink-secondary)',
                          fontWeight: isActive ? 650 : 500,
                        }}
                      >
                        {isActive && (
                          <span
                            className="absolute left-0 top-1.5 bottom-1.5 w-[3px] rounded-r-full"
                            style={{ background: 'var(--color-primary)' }}
                          />
                        )}
                        <Icon
                          size={16}
                          strokeWidth={isActive ? 2.3 : 1.9}
                          className="flex-none"
                          style={{ color: isActive ? 'var(--color-primary)' : 'var(--color-ink-muted)' }}
                        />
                        <span className="min-w-0 flex-1 truncate">{t.label}</span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </nav>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col gap-4">

      {/* ================= PROPERTY DETAILS TAB ================= */}
      {activeTab === 'general' &&
        (property ? (
          <PropertyDetailsTab
            key={property.id}
            property={property}
            canEdit={canEditProperty}
            onSaved={async () => {
              resource.refresh();
              await reload();
            }}
          />
        ) : (
          <div className="rounded-2xl border p-8 text-center text-body text-ink-secondary shadow-sm" style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}>
            {resource.loading ? 'Loading property…' : 'No property is selected.'}
          </div>
        ))}

      {/* ================= TERMS AND INCLUSIONS TAB ================= */}
      {activeTab === 'terms-inclusions' &&
        (activePropertyId ? (
          <TermsInclusionsTab key={activePropertyId} propertyId={activePropertyId} canEdit={canEditProperty} />
        ) : (
          <div className="rounded-2xl border p-8 text-center text-body text-ink-secondary shadow-sm" style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}>
            No property is selected.
          </div>
        ))}

      {/* ================= CANCELLATION TAB ================= */}
      {activeTab === 'terms-cancellations' &&
        (activePropertyId ? (
          <CancellationTab key={activePropertyId} propertyId={activePropertyId} canEdit={canEditProperty} />
        ) : (
          <div className="rounded-2xl border p-8 text-center text-body text-ink-secondary shadow-sm" style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}>
            No property is selected.
          </div>
        ))}

      {/* ================= POLICIES TAB ================= */}
      {activeTab === 'policies' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="rounded-2xl border p-5 sm:p-6 shadow-sm" style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}>
            <h2 className="text-body font-semibold text-ink mb-1">Booking & Cancellation Policies</h2>
            <p className="text-label text-ink-secondary mb-4">Guest-facing terms applied on confirmed bookings</p>
            <div className="flex flex-col gap-3">
              <div>
                <label className="block text-label font-medium text-ink mb-1.5">Cancellation Policy</label>
                <TextField
                  defaultValue="Free cancellation until 48h before arrival; first night charged thereafter."
                  className="w-full"
                  style={{ borderColor: 'var(--color-border)' }}
                />
              </div>
              <div>
                <label className="block text-label font-medium text-ink mb-1.5">No-show Policy</label>
                <TextField
                  defaultValue="First night charged to the primary payment method on file."
                  className="w-full"
                  style={{ borderColor: 'var(--color-border)' }}
                />
              </div>
              <div>
                <label className="block text-label font-medium text-ink mb-1.5">Child & Extra Bed Policy</label>
                <TextField
                  defaultValue="Children under 6 stay complimentary using existing bedding."
                  className="w-full"
                  style={{ borderColor: 'var(--color-border)' }}
                />
              </div>
              <Button variant="primary"
                type="button"
                onClick={() => toast('Policies saved', { tone: 'success' })}
                className="mt-2 w-fit"
              >
                Save Policies
              </Button>
            </div>
          </div>

          <div className="rounded-2xl border p-5 sm:p-6 shadow-sm" style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}>
            <h2 className="text-body font-semibold text-ink mb-1">Stay Rules & Check-in Requirements</h2>
            <p className="text-label text-ink-secondary mb-4">Standard hospitality verification procedures</p>
            <div className="flex flex-col gap-3">
              <div className="flex items-center justify-between border-b pb-3" style={{ borderColor: 'var(--color-border-subtle)' }}>
                <div>
                  <p className="text-body font-semibold text-ink">Mandatory Government ID on Check-in</p>
                  <p className="text-label text-ink-secondary">Passport, driving license, or national identity card</p>
                </div>
                <Checkbox type="checkbox" defaultChecked />
              </div>
              <div className="flex items-center justify-between border-b pb-3" style={{ borderColor: 'var(--color-border-subtle)' }}>
                <div>
                  <p className="text-body font-semibold text-ink">Security Deposit Guarantee</p>
                  <p className="text-label text-ink-secondary">Pre-authorization hold of 20% on incidentals</p>
                </div>
                <Checkbox type="checkbox" defaultChecked />
              </div>
              <div className="flex items-center justify-between" style={{ borderColor: 'var(--color-border-subtle)' }}>
                <div>
                  <p className="text-body font-semibold text-ink">Minimum Check-in Age (18+)</p>
                  <p className="text-label text-ink-secondary">Primary guest must be 18 years or older</p>
                </div>
                <Checkbox type="checkbox" defaultChecked />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ================= TAXES & FEES TAB ================= */}
      {activeTab === 'taxes' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="rounded-2xl border p-5 sm:p-6 shadow-sm" style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}>
            <h2 className="text-body font-semibold text-ink mb-1">Active Tax Rules</h2>
            <p className="text-label text-ink-secondary mb-4">Taxes applied dynamically to folios and invoices</p>
            <div className="flex flex-col gap-3">
              <div>
                <label className="block text-label font-medium text-ink mb-1.5">Tax Rate (%)</label>
                <div className="flex items-center gap-2">
                  <TextField
                    type="number"
                    min={0}
                    max={40}
                    value={taxRate}
                    onChange={(e) => setTaxRate(Number(e.target.value))}
                    className="w-32"
                    style={{ borderColor: 'var(--color-border)' }}
                  />
                  <span className="text-label font-semibold text-ink-secondary">% GST / VAT</span>
                </div>
              </div>
              <Button variant="primary"
                type="button"
                disabled={saving || !can('role.manage')}
                onClick={async () => {
                  setSaving(true);
                  try {
                    if (activeTax) await adminApi.updateTaxRule(activeTax.id, { ratePercent: taxRate });
                    else await adminApi.createTaxRule({ code: 'PROPERTY_TAX', name: 'Property tax', ratePercent: taxRate, appliesTo: 'ALL', isInclusive: false });
                    resource.refresh();
                    toast(`Tax rule updated to ${taxRate}%`, { tone: 'success' });
                  } catch (err) {
                    toast('Could not update tax rule', { detail: displayApiError(err), tone: 'danger' });
                  } finally {
                    setSaving(false);
                  }
                }}
                className="w-fit disabled:opacity-50"
              >
                Save Tax Rule
              </Button>
            </div>
          </div>

          <div className="rounded-2xl border p-5 sm:p-6 shadow-sm" style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}>
            <h2 className="text-body font-semibold text-ink mb-1">Invoice Details & Legal Header</h2>
            <p className="text-label text-ink-secondary mb-4">Printed information on guest folios & receipts</p>
            <div className="flex flex-col gap-3">
              <div>
                <label className="block text-label font-medium text-ink mb-1.5">Invoice Prefix</label>
                <TextField defaultValue="INV-2026-" className="w-full font-mono" style={{ borderColor: 'var(--color-border)' }} />
              </div>
              <div>
                <label className="block text-label font-medium text-ink mb-1.5">Tax Registration / GSTIN</label>
                <TextField defaultValue="27AAAAA0000A1Z5" className="w-full font-mono" style={{ borderColor: 'var(--color-border)' }} />
              </div>
              <Button variant="primary"
                type="button"
                onClick={() => toast('Invoice details saved', { tone: 'success' })}
                className="w-fit"
              >
                Save Invoice Details
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ================= BRANDING TAB ================= */}
      {activeTab === 'branding' &&
        (activePropertyId ? (
          <BrandingTab key={activePropertyId} propertyId={activePropertyId} canEdit={canEditProperty} onOpenThemes={onOpenThemes} />
        ) : (
          <div className="rounded-2xl border p-8 text-center text-body text-ink-secondary shadow-sm" style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}>
            No property is selected.
          </div>
        ))}

      {/* ================= ROOM SETTINGS TAB ================= */}
      {activeTab === 'room-settings' && (
        <RoomSettingsTab currencyCode={currencyCode} />
      )}

      {/* ================= ROOM SETUP 2 TAB ================= */}
      {activeTab === 'room-setup-2' &&
        (activePropertyId ? (
          <RoomSetup2Tab key={activePropertyId} propertyId={activePropertyId} canEdit={canEditProperty} />
        ) : (
          <div className="rounded-2xl border p-8 text-center text-body text-ink-secondary shadow-sm" style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}>
            No property is selected.
          </div>
        ))}

      {/* ================= PROPERTY AMENITIES TAB ================= */}
      {activeTab === 'property-amenities' &&
        (activePropertyId ? (
          <PropertyAmenitiesTab key={activePropertyId} propertyId={activePropertyId} canEdit={canEditProperty} />
        ) : (
          <div className="rounded-2xl border p-8 text-center text-body text-ink-secondary shadow-sm" style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}>
            No property is selected.
          </div>
        ))}

      {/* ================= CATEGORY AMENITIES TAB ================= */}
      {activeTab === 'category-amenities' &&
        (activePropertyId ? (
          <CategoryAmenitiesTab key={activePropertyId} propertyId={activePropertyId} canEdit={canEditProperty} />
        ) : (
          <div className="rounded-2xl border p-8 text-center text-body text-ink-secondary shadow-sm" style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}>
            No property is selected.
          </div>
        ))}

      {/* ================= BED TYPE TAB ================= */}
      {activeTab === 'bed-type' &&
        (activePropertyId ? (
          <BedTypeTab key={activePropertyId} propertyId={activePropertyId} canEdit={canEditProperty} />
        ) : (
          <div className="rounded-2xl border p-8 text-center text-body text-ink-secondary shadow-sm" style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}>
            No property is selected.
          </div>
        ))}

      {/* ================= EXTRA BED TYPE TAB ================= */}
      {activeTab === 'extra-bed-type' &&
        (activePropertyId ? (
          <ExtraBedTypeTab key={activePropertyId} propertyId={activePropertyId} canEdit={canEditProperty} />
        ) : (
          <div className="rounded-2xl border p-8 text-center text-body text-ink-secondary shadow-sm" style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}>
            No property is selected.
          </div>
        ))}

      {/* ================= MEAL PLANS TAB ================= */}
      {activeTab === 'meal-plans' &&
        (activePropertyId ? (
          <MealPlansTab key={activePropertyId} propertyId={activePropertyId} canEdit={canEditProperty} />
        ) : (
          <div className="rounded-2xl border p-8 text-center text-body text-ink-secondary shadow-sm" style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}>
            No property is selected.
          </div>
        ))}

      {/* ================= GRC SETTINGS TAB ================= */}
      {activeTab === 'grc-settings' &&
        (activePropertyId ? (
          <GrcSettingsTab key={activePropertyId} propertyId={activePropertyId} canEdit={canEditProperty} />
        ) : (
          <div className="rounded-2xl border p-8 text-center text-body text-ink-secondary shadow-sm" style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}>
            No property is selected.
          </div>
        ))}

      {/* ================= RESERVATION SETTINGS TAB ================= */}
      {activeTab === 'reservation-settings' &&
        (activePropertyId ? (
          <ReservationSettingsTab key={activePropertyId} propertyId={activePropertyId} canEdit={canEditProperty} />
        ) : (
          <div className="rounded-2xl border p-8 text-center text-body text-ink-secondary shadow-sm" style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}>
            No property is selected.
          </div>
        ))}

      {/* ================= POST MASTER SETTINGS TAB ================= */}
      {activeTab === 'post-master-settings' &&
        (activePropertyId ? (
          <PostMasterSettingsTab key={activePropertyId} propertyId={activePropertyId} canEdit={canEditProperty} />
        ) : (
          <div className="rounded-2xl border p-8 text-center text-body text-ink-secondary shadow-sm" style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}>
            No property is selected.
          </div>
        ))}

      {/* ================= HOUSE KEEPING TAB ================= */}
      {activeTab === 'house-keeping' &&
        (activePropertyId ? (
          <HouseKeepingTab key={activePropertyId} propertyId={activePropertyId} canEdit={canEditProperty} />
        ) : (
          <div className="rounded-2xl border p-8 text-center text-body text-ink-secondary shadow-sm" style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}>
            No property is selected.
          </div>
        ))}

      {/* ================= OTHER TABS (FALLBACK / PLACEHOLDER CARDS) ================= */}
      {PLACEHOLDER_TABS.includes(activeTab) && (
        <div className="rounded-2xl border p-8 shadow-sm text-center" style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}>
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary mb-3">
            <Lucide.Sliders size={26} />
          </div>
          <h2 className="text-body font-semibold text-ink">{activeLabel}</h2>
          <p className="text-body text-ink-secondary max-w-md mx-auto mt-1 mb-5">
            Manage your hotel's {activeLabel.toLowerCase()} here. This section is coming soon.
          </p>
          <Button variant="primary"
            type="button"
            onClick={() => setActiveTab('general')}
          >
            Back to General Settings
          </Button>
        </div>
      )}
      </div>
      </div>
    </div>
  );
}
