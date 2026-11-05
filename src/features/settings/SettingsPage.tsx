import { useCallback, useState } from 'react';
import * as Lucide from 'lucide-react';
import { useAuth } from '../../features/auth/AuthContext';
import { propertyApi, adminApi } from '../../lib/api/pms';
import type { PropertyDetails, PropertyTypeKey } from '../../lib/api/pms';
import { useApiResource } from '../../lib/api/useApiResource';
import { toast } from '../../utils/toast';
import { to12Hour, to24Hour } from '../../utils/time';
import { displayApiError } from '../../lib/api/client';
import { useTheme } from '../../theme/useTheme';
import { PRESET_LIST } from '../../theme/presets';
import { Button, Checkbox, IconButton, SelectField, TextArea, TextField } from '../../components/primitives';
import { RoomSettingsTab } from './room-settings/RoomSettingsTab';

type SettingsTab =
  | 'general'
  | 'policies'
  | 'room-settings'
  | 'rooms-rates'
  | 'taxes'
  | 'guests'
  | 'integrations'
  | 'branding'
  | 'notifications'
  | 'advanced';

/** Property Type options that exist on the backend; "Boutique Hotel" has no equivalent yet. */
const PROPERTY_TYPE_LABELS: Record<PropertyTypeKey, string> = {
  HOTEL: 'Hotel',
  RESORT: 'Resort',
  VILLA: 'Villa',
  MOTEL: 'Motel',
  APARTMENT: 'Apartment',
};

const CURRENCY_OPTIONS = [
  'INR - Indian Rupee (₹)',
  'USD - US Dollar ($)',
  'EUR - Euro (€)',
  'GBP - British Pound (£)',
  'AED - UAE Dirham (AED)',
];

/** The option label for an ISO code, e.g. "INR" -> "INR - Indian Rupee (₹)". */
const currencyLabel = (code: string): string =>
  CURRENCY_OPTIONS.find((option) => option.startsWith(`${code} `)) ?? code;

interface AmenityItem {
  id: string;
  label: string;
  checked: boolean;
}

export function Settings({
  onOpenThemes,
  initialTab = 'general',
}: {
  onOpenThemes?: () => void;
  initialTab?: SettingsTab;
}) {
  const { me, can, reload } = useAuth();
  const activePropertyId = me?.activePropertyId;
  const { preset, setPreset } = useTheme();
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

  // Basic Information State
  const [propertyName, setPropertyName] = useState('The Grand Horizon Hotel');
  const [propertyCode, setPropertyCode] = useState('TGH');
  const [propertyType, setPropertyType] = useState('Hotel');
  const [addressLine1, setAddressLine1] = useState('123 Beach Road');
  const [city, setCity] = useState('Mumbai');
  const [stateProvince, setStateProvince] = useState('Maharashtra');
  const [country, setCountry] = useState('India');
  const [postalCode, setPostalCode] = useState('400020');
  const [phone, setPhone] = useState('+91 22 1234 5678');
  const [email, setEmail] = useState('info@grandhorizon.in');
  const [website, setWebsite] = useState('https://www.grandhorizon.in');

  // Contact Information State
  const [frontDeskPhone, setFrontDeskPhone] = useState('+91 22 1234 5678');
  const [reservationsEmail, setReservationsEmail] = useState('reservations@grandhorizon.in');
  const [generalEmail, setGeneralEmail] = useState('info@grandhorizon.in');
  const [emergencyPhone, setEmergencyPhone] = useState('+91 98765 43210');

  // Operational Settings State
  const [timeZone, setTimeZone] = useState('(GMT+05:30) India Standard Time');
  const [dateFormat, setDateFormat] = useState('DD/MM/YYYY');
  const [checkInTime, setCheckInTime] = useState('02:00 PM');
  const [checkOutTime, setCheckOutTime] = useState('12:00 PM');
  const [currency, setCurrency] = useState('INR - Indian Rupee (₹)');
  const [floors, setFloors] = useState('5');
  const [totalRooms, setTotalRooms] = useState('50');

  // Property Description State
  const [description, setDescription] = useState(
    'The Grand Horizon Hotel is a premium 4-star hotel located in the heart of Mumbai, offering modern amenities, elegant rooms, and exceptional hospitality. Experience comfort, convenience, and luxury with stunning city and sea views.'
  );

  // Amenities & Facilities State
  const [amenities, setAmenities] = useState<AmenityItem[]>([
    { id: 'wifi', label: 'Free WiFi', checked: true },
    { id: 'pool', label: 'Swimming Pool', checked: true },
    { id: 'restaurant', label: 'Restaurant', checked: true },
    { id: 'fitness', label: 'Fitness Center', checked: true },
    { id: 'spa', label: 'Spa & Wellness', checked: true },
    { id: 'bar', label: 'Bar/Lounge', checked: true },
    { id: 'business', label: 'Business Center', checked: true },
    { id: 'parking', label: 'Parking', checked: true },
    { id: 'airport', label: 'Airport Transfer', checked: false },
    { id: 'frontdesk', label: '24/7 Front Desk', checked: true },
    { id: 'roomservice', label: 'Room Service', checked: true },
    { id: 'pets', label: 'Pet Friendly', checked: false },
  ]);

  // Fill the form from the property. Fields the backend has no value for show
  // empty rather than a sample value. Time zone, date format and amenities are
  // not stored on the backend yet, so they keep their local defaults.
  const applyProperty = (p: PropertyDetails) => {
    setPropertyName(p.name);
    setPropertyCode(p.code);
    setPropertyType(PROPERTY_TYPE_LABELS[p.type]);
    setAddressLine1(p.address ?? '');
    setCity(p.city);
    setStateProvince(p.state ?? '');
    setCountry(p.country);
    setPostalCode(p.postalCode ?? '');
    setPhone(p.phone ?? '');
    setEmail(p.email ?? '');
    setWebsite(p.website ?? '');
    setFrontDeskPhone(p.frontDeskPhone ?? '');
    setReservationsEmail(p.reservationsEmail ?? '');
    setGeneralEmail(p.generalEmail ?? '');
    setEmergencyPhone(p.emergencyContact ?? '');
    setCheckInTime(to12Hour(p.checkInTime));
    setCheckOutTime(to12Hour(p.checkOutTime));
    setCurrency(currencyLabel(p.defaultCurrency));
    setFloors(p.numberOfFloors?.toString() ?? '');
    setTotalRooms(p.totalRooms?.toString() ?? '');
    setDescription(p.description ?? '');
  };

  // Sync initial API data when loaded
  const [hasInitialized, setHasInitialized] = useState(false);
  if (property && !hasInitialized) {
    applyProperty(property);
    setHasInitialized(true);
  }

  // Active Tax rule
  const activeTax = resource.data?.taxRules.find((rule) => rule.isActive);
  const [taxRate, setTaxRate] = useState<number>(Number(activeTax?.ratePercent ?? 12));

  // One save for the whole General tab; only the backend-wired fields are persisted.
  const handleSaveAll = async () => {
    if (!me?.activePropertyId) {
      toast('Settings saved locally', { tone: 'success' });
      return;
    }
    const type = (Object.keys(PROPERTY_TYPE_LABELS) as PropertyTypeKey[]).find(
      (key) => PROPERTY_TYPE_LABELS[key] === propertyType,
    );
    if (!type) {
      toast('Property type not supported yet', {
        detail: `"${propertyType}" cannot be saved. Choose Hotel, Resort, Villa, Motel or Apartment.`,
        tone: 'warning',
      });
      return;
    }
    const checkIn = to24Hour(checkInTime);
    const checkOut = to24Hour(checkOutTime);
    if (!checkIn || !checkOut) {
      toast('Check the check-in and check-out times', {
        detail: 'Use a time like 02:00 PM or 14:00.',
        tone: 'warning',
      });
      return;
    }
    const counts = [floors, totalRooms].map((value) => (value.trim() === '' ? null : Number(value)));
    if (counts.some((count) => count !== null && !Number.isInteger(count))) {
      toast('Check the number of floors and total rooms', { detail: 'Use whole numbers.', tone: 'warning' });
      return;
    }
    // Blank optional fields are sent as null so they are cleared on the server.
    const optional = (value: string) => (value.trim() === '' ? null : value.trim());

    setSaving(true);
    try {
      const saved = await propertyApi.update(me.activePropertyId, {
        name: propertyName,
        code: propertyCode,
        type,
        description: optional(description),
        address: optional(addressLine1),
        city,
        state: optional(stateProvince),
        country,
        postalCode: optional(postalCode),
        phone: optional(phone),
        frontDeskPhone: optional(frontDeskPhone),
        emergencyContact: optional(emergencyPhone),
        email: optional(email),
        generalEmail: optional(generalEmail),
        reservationsEmail: optional(reservationsEmail),
        website: optional(website),
        checkInTime: checkIn,
        checkOutTime: checkOut,
        defaultCurrency: currency.split(' ')[0] ?? currency,
        numberOfFloors: counts[0] ?? null,
        totalRooms: counts[1] ?? null,
      });
      // Show what the server stored (it upper-cases the code, lower-cases emails),
      // and refresh the header and other screens that show the property.
      applyProperty(saved);
      resource.refresh();
      await reload();
      toast('Settings saved successfully', { tone: 'success' });
    } catch (err) {
      toast('Could not save settings', { detail: displayApiError(err), tone: 'danger' });
    } finally {
      setSaving(false);
    }
  };

  const toggleAmenity = (id: string) => {
    setAmenities((prev) =>
      prev.map((item) => (item.id === id ? { ...item, checked: !item.checked } : item))
    );
  };

  const addCustomAmenity = () => {
    const name = window.prompt('Enter amenity or facility name:');
    if (!name?.trim()) return;
    const newId = 'custom_' + Date.now();
    setAmenities((prev) => [...prev, { id: newId, label: name.trim(), checked: true }]);
    toast(`Added "${name.trim()}" to amenities`, { tone: 'success' });
  };

  const TABS_CONFIG: { id: SettingsTab; label: string; icon: Lucide.LucideIcon }[] = [
    { id: 'general', label: 'General', icon: Lucide.Settings },
    { id: 'policies', label: 'Policies', icon: Lucide.FileText },
    { id: 'room-settings', label: 'Room Settings', icon: Lucide.Layers },
    { id: 'taxes', label: 'Taxes & Fees', icon: Lucide.Receipt },
    { id: 'guests', label: 'Guest Settings', icon: Lucide.Users },
    { id: 'integrations', label: 'Integrations', icon: Lucide.Boxes },
    { id: 'branding', label: 'Branding', icon: Lucide.Palette },
    { id: 'notifications', label: 'Notifications', icon: Lucide.Bell },
    { id: 'advanced', label: 'Advanced', icon: Lucide.SlidersHorizontal },
  ];

  return (
    <div className="flex flex-col gap-4 pms-animate-fade-in pb-8">
      {/* ================= PAGE HEADER ================= */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 flex-none items-center justify-center rounded-xl bg-gradient-to-tr from-primary to-dark-accent text-primary-foreground shadow-xs shadow-primary/20 mt-0.5">
            <Lucide.Settings size={20} strokeWidth={2.4} />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-disp3 font-bold tracking-tight text-ink leading-tight">
                Property Settings
              </h1>
              <span className="flex items-center gap-1.5 rounded-full bg-success-bg px-2.5 py-0.5 text-micro font-bold text-success-text border border-success-border/60">
                <span className="relative flex h-1.5 w-1.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-success-text opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-success-text"></span>
                </span>
                Active Config
              </span>
            </div>
            <p className="text-label text-ink-secondary mt-1">
              Manage your hotel information, policies, configurations and system preferences
            </p>
          </div>
        </div>
        {activeTab === 'general' && (
          <Button variant="primary"
            type="button"
            onClick={() => void handleSaveAll()}
            disabled={saving || !canEditProperty}
            title={canEditProperty ? undefined : 'Only administrators can change property details'}
            className="w-fit disabled:opacity-50"
          >
            Save Changes
          </Button>
        )}
      </div>

      {/* ================= HORIZONTAL TABS BAR ================= */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 border-b" style={{ borderColor: 'var(--color-border)' }}>
        {TABS_CONFIG.map((t) => {
          const isActive = activeTab === t.id;
          const Icon = t.icon;
          return (
            <Button variant="secondary"
              key={t.id}
              type="button"
              onClick={() => setActiveTab(t.id)}
              className={`flex items-center gap-2 whitespace-nowrap transition-all ${
 isActive
 ? 'text-white shadow-sm'
 : 'text-ink-secondary hover:text-ink hover:bg-ink/[0.03]'
 }`}
              style={{
                background: isActive ? 'var(--color-primary)' : 'transparent',
                border: isActive
                  ? '1px solid var(--color-primary)'
                  : '1px solid transparent',
              }}
            >
              <Icon size={16} strokeWidth={isActive ? 2.4 : 1.9} />
              <span>{t.label}</span>
            </Button>
          );
        })}
      </div>

      {/* ================= GENERAL TAB CONTENT (MATCHING SCREENSHOT 1:1) ================= */}
      {activeTab === 'general' && (
        // A disabled fieldset disables every input, select, textarea and button inside it.
        <fieldset
          disabled={!canEditProperty}
          title={canEditProperty ? undefined : 'Only administrators can change property details'}
          className="m-0 min-w-0 border-0 p-0"
        >
        <div className="flex flex-col gap-5">
          {/* ================= TOP SECTION: Basic Information (2/3) + Logo & Images (1/3) ================= */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
            {/* CARD 1: Basic Information */}
            <div
              className="lg:col-span-2 rounded-2xl border p-5 sm:p-6 shadow-sm flex flex-col justify-between"
              style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}
            >
              <div>
                <div className="flex items-center justify-between pb-3.5 mb-3.5 border-b border-divider">
                  <div className="flex items-center gap-2.5">
                    <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-tr from-primary to-dark-accent text-white shadow-xs shadow-primary/20">
                      <Lucide.Building2 size={17} strokeWidth={2.4} />
                    </div>
                    <div>
                      <h2 className="text-body font-bold text-ink tracking-tight">Basic Information</h2>
                      <p className="text-label text-ink-muted mt-0.5">Core details about your property</p>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                  {/* Property Name */}
                  <div className="sm:col-span-2">
                    <label className="block text-label font-medium text-ink mb-1.5">
                      Property Name <span className="text-danger-text">*</span>
                    </label>
                    <TextField
                      type="text"
                      value={propertyName}
                      onChange={(e) => setPropertyName(e.target.value)}
                      className="w-full focus:outline-none focus:ring-2"
                      style={{ borderColor: 'var(--color-border)', background: 'var(--color-surface)' }}
                    />
                  </div>

                  {/* Property Code */}
                  <div>
                    <label className="block text-label font-medium text-ink mb-1.5">
                      Property Code <span className="text-danger-text">*</span>
                    </label>
                    <TextField
                      type="text"
                      value={propertyCode}
                      onChange={(e) => setPropertyCode(e.target.value.toUpperCase())}
                      className="w-full focus:outline-none focus:ring-2 uppercase"
                      style={{ borderColor: 'var(--color-border)', background: 'var(--color-surface)' }}
                    />
                  </div>

                  {/* Property Type */}
                  <div>
                    <label className="block text-label font-medium text-ink mb-1.5">
                      Property Type
                    </label>
                    <SelectField
                      value={propertyType}
                      onChange={(e) => setPropertyType(e.target.value)}
                      className="w-full focus:outline-none focus:ring-2"
                      style={{ borderColor: 'var(--color-border)', background: 'var(--color-surface)' }}
                    >
                      <option>Hotel</option>
                      <option>Resort</option>
                      <option>Boutique Hotel</option>
                      <option>Motel</option>
                      <option>Villa</option>
                      <option>Apartment</option>
                    </SelectField>
                  </div>

                  {/* Address Line 1 */}
                  <div className="sm:col-span-2 lg:col-span-4">
                    <label className="block text-label font-medium text-ink mb-1.5">
                      Address Line 1
                    </label>
                    <TextField
                      type="text"
                      value={addressLine1}
                      onChange={(e) => setAddressLine1(e.target.value)}
                      className="w-full focus:outline-none focus:ring-2"
                      style={{ borderColor: 'var(--color-border)', background: 'var(--color-surface)' }}
                    />
                  </div>

                  {/* City, State, Country, Postal Code */}
                  <div>
                    <label className="block text-label font-medium text-ink mb-1.5">City</label>
                    <TextField
                      type="text"
                      value={city}
                      onChange={(e) => setCity(e.target.value)}
                      className="w-full focus:outline-none focus:ring-2"
                      style={{ borderColor: 'var(--color-border)', background: 'var(--color-surface)' }}
                    />
                  </div>

                  <div>
                    <label className="block text-label font-medium text-ink mb-1.5">State / Province</label>
                    <TextField
                      type="text"
                      value={stateProvince}
                      onChange={(e) => setStateProvince(e.target.value)}
                      className="w-full focus:outline-none focus:ring-2"
                      style={{ borderColor: 'var(--color-border)', background: 'var(--color-surface)' }}
                    />
                  </div>

                  <div>
                    <label className="block text-label font-medium text-ink mb-1.5">Country</label>
                    <TextField
                      type="text"
                      value={country}
                      onChange={(e) => setCountry(e.target.value)}
                      className="w-full focus:outline-none focus:ring-2"
                      style={{ borderColor: 'var(--color-border)', background: 'var(--color-surface)' }}
                    />
                  </div>

                  <div>
                    <label className="block text-label font-medium text-ink mb-1.5">Postal Code</label>
                    <TextField
                      type="text"
                      value={postalCode}
                      onChange={(e) => setPostalCode(e.target.value)}
                      className="w-full focus:outline-none focus:ring-2"
                      style={{ borderColor: 'var(--color-border)', background: 'var(--color-surface)' }}
                    />
                  </div>

                  {/* Phone, Email, Website */}
                  <div className="sm:col-span-2 lg:col-span-4 grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
                    <div>
                      <label className="block text-label font-medium text-ink mb-1.5">Phone Number</label>
                      <div className="relative">
                        <Lucide.Phone size={15} className="absolute left-3.5 top-3 text-ink-muted" />
                        <TextField
                          type="text"
                          value={phone}
                          onChange={(e) => setPhone(e.target.value)}
                          className="w-full focus:outline-none focus:ring-2 pl-9 pr-3.5"
                          style={{ borderColor: 'var(--color-border)', background: 'var(--color-surface)' }}
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-label font-medium text-ink mb-1.5">Email Address</label>
                      <div className="relative">
                        <Lucide.Mail size={15} className="absolute left-3.5 top-3 text-ink-muted" />
                        <TextField
                          type="email"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          className="w-full focus:outline-none focus:ring-2 pl-9 pr-3.5"
                          style={{ borderColor: 'var(--color-border)', background: 'var(--color-surface)' }}
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-label font-medium text-ink mb-1.5">Website</label>
                      <div className="relative">
                        <Lucide.Globe size={15} className="absolute left-3.5 top-3 text-ink-muted" />
                        <TextField
                          type="text"
                          value={website}
                          onChange={(e) => setWebsite(e.target.value)}
                          className="w-full focus:outline-none focus:ring-2 pl-9 pr-3.5"
                          style={{ borderColor: 'var(--color-border)', background: 'var(--color-surface)' }}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* CARD 2: Property Logo & Images */}
            <div
              className="rounded-2xl border p-5 sm:p-6 shadow-sm flex flex-col justify-between"
              style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}
            >
              <div>
                <div className="flex items-center justify-between pb-3.5 mb-3.5 border-b border-divider">
                  <div className="flex items-center gap-2.5">
                    <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-tr from-primary to-dark-accent text-white shadow-xs shadow-primary/20">
                      <Lucide.Image size={17} strokeWidth={2.4} />
                    </div>
                    <div>
                      <h2 className="text-body font-bold text-ink tracking-tight">Property Logo &amp; Images</h2>
                      <p className="text-label text-ink-muted mt-0.5">Logo, cover image and gallery photos</p>
                    </div>
                  </div>
                </div>

                {/* Cover Image Banner */}
                <div className="relative h-36 w-full rounded-md overflow-hidden shadow-xs mb-4 group">
                  <img
                    src="https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?auto=format&fit=crop&w=1200&q=85"
                    alt="Resort Cover"
                    className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-ink/50 via-transparent to-transparent" />
                  <Button variant="secondary"
                    type="button"
                    onClick={() => toast('Change cover image dialog', { tone: 'info' })}
                    className="absolute bottom-2.5 right-2.5 flex items-center gap-1.5 transition-colors"
                  >
                    <Lucide.Camera size={13} />
                    <span>Change cover image</span>
                  </Button>
                </div>

                {/* Logo Section */}
                <div className="flex items-center gap-3.5 mb-5 p-3 rounded-md border" style={{ borderColor: 'var(--color-border-subtle)', background: 'color-mix(in srgb, var(--color-muted-surface) 40%, var(--color-surface))' }}>
                  <div
                    className="flex h-16 w-16 flex-none items-center justify-center rounded-md border bg-surface shadow-xs p-1 text-center"
                    style={{ borderColor: 'var(--color-border)' }}
                  >
                    <div className="flex flex-col items-center justify-center">
                      <Lucide.Building2 size={20} className="text-warning-text mb-0.5" />
                      <span className="text-micro font-bold uppercase tracking-wider text-ink-secondary leading-tight">
                        Grand Horizon
                      </span>
                    </div>
                  </div>
                  <div className="min-w-0 flex-1">
                    <Button variant="secondary"
                      type="button"
                      onClick={() => toast('Change logo dialog', { tone: 'info' })}
                      className="flex items-center gap-1.5 transition-colors"
                      style={{ borderColor: 'var(--color-border)' }}
                    >
                      <Lucide.Image size={13} />
                      <span>Change logo</span>
                    </Button>
                    <p className="text-label text-ink-secondary mt-1 leading-snug">
                      Recommended size: 400 × 400 px<br />PNG, JPG (max 2MB)
                    </p>
                  </div>
                </div>

                {/* Gallery Images */}
                <div>
                  <p className="text-label font-medium text-ink mb-2">Gallery Images</p>
                  <div className="grid grid-cols-5 gap-2">
                    {[
                      'https://images.unsplash.com/photo-1590490360182-c33d57733427?auto=format&fit=crop&w=300&q=80',
                      'https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?auto=format&fit=crop&w=300&q=80',
                      'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=300&q=80',
                      'https://images.unsplash.com/photo-1572116469696-31de0f17cc34?auto=format&fit=crop&w=300&q=80',
                    ].map((src, idx) => (
                      <div key={idx} className="relative aspect-square rounded-md overflow-hidden border shadow-2xs group" style={{ borderColor: 'var(--color-border)' }}>
                        <img src={src} alt="Gallery thumb" className="h-full w-full object-cover transition-transform group-hover:scale-110" />
                      </div>
                    ))}
                    <Button variant="secondary"
                      type="button"
                      onClick={() => toast('Add gallery photos dialog', { tone: 'info' })}
                      className="flex flex-col items-center justify-center transition-colors"
                      style={{ borderColor: 'var(--color-border)', color: 'var(--color-ink-muted)' }}
                    >
                      <Lucide.Plus size={16} strokeWidth={2.4} />
                      <span className="text-label font-medium mt-1 text-center leading-tight">Add photos</span>
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* ================= MIDDLE SECTION: Contact Info + Operational Settings + Quick Actions ================= */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
            {/* CARD 3: Contact Information */}
            <div
              className="rounded-2xl border p-5 sm:p-6 shadow-sm flex flex-col justify-between"
              style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}
            >
              <div>
                <div className="flex items-center justify-between pb-3.5 mb-3.5 border-b border-divider">
                  <div className="flex items-center gap-2.5">
                    <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-tr from-info-text to-info-border text-white shadow-xs shadow-info-text/20">
                      <Lucide.Phone size={17} strokeWidth={2.4} />
                    </div>
                    <div>
                      <h2 className="text-body font-bold text-ink tracking-tight">Contact Information</h2>
                      <p className="text-label text-ink-muted mt-0.5">Public contact details for guests</p>
                    </div>
                  </div>
                </div>

                <div className="flex flex-col gap-3">
                  <div>
                    <label className="block text-label font-medium text-ink mb-1.5">Front Desk Phone</label>
                    <div className="relative">
                      <Lucide.Phone size={15} className="absolute left-3.5 top-3 text-ink-muted" />
                      <TextField
                        type="text"
                        value={frontDeskPhone}
                        onChange={(e) => setFrontDeskPhone(e.target.value)}
                        className="w-full focus:outline-none focus:ring-2 pl-9 pr-3.5"
                        style={{ borderColor: 'var(--color-border)', background: 'var(--color-surface)' }}
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-label font-medium text-ink mb-1.5">Reservations Email</label>
                    <div className="relative">
                      <Lucide.Mail size={15} className="absolute left-3.5 top-3 text-ink-muted" />
                      <TextField
                        type="email"
                        value={reservationsEmail}
                        onChange={(e) => setReservationsEmail(e.target.value)}
                        className="w-full focus:outline-none focus:ring-2 pl-9 pr-3.5"
                        style={{ borderColor: 'var(--color-border)', background: 'var(--color-surface)' }}
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-label font-medium text-ink mb-1.5">General Email</label>
                    <div className="relative">
                      <Lucide.Mail size={15} className="absolute left-3.5 top-3 text-ink-muted" />
                      <TextField
                        type="email"
                        value={generalEmail}
                        onChange={(e) => setGeneralEmail(e.target.value)}
                        className="w-full focus:outline-none focus:ring-2 pl-9 pr-3.5"
                        style={{ borderColor: 'var(--color-border)', background: 'var(--color-surface)' }}
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-label font-medium text-ink mb-1.5">Emergency Contact</label>
                    <div className="relative">
                      <Lucide.PhoneCall size={15} className="absolute left-3.5 top-3 text-ink-muted" />
                      <TextField
                        type="text"
                        value={emergencyPhone}
                        onChange={(e) => setEmergencyPhone(e.target.value)}
                        className="w-full focus:outline-none focus:ring-2 pl-9 pr-3.5"
                        style={{ borderColor: 'var(--color-border)', background: 'var(--color-surface)' }}
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* CARD 4: Operational Settings */}
            <div
              className="rounded-2xl border p-5 sm:p-6 shadow-sm flex flex-col justify-between"
              style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}
            >
              <div>
                <div className="flex items-center justify-between pb-3.5 mb-3.5 border-b border-divider">
                  <div className="flex items-center gap-2.5">
                    <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-tr from-success-text to-success-border text-white shadow-xs shadow-success-text/20">
                      <Lucide.Clock size={17} strokeWidth={2.4} />
                    </div>
                    <div>
                      <h2 className="text-body font-bold text-ink tracking-tight">Operational Settings</h2>
                      <p className="text-label text-ink-muted mt-0.5">Configure key operational details</p>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="col-span-2 sm:col-span-1">
                    <label className="block text-label font-medium text-ink mb-1.5">Time Zone</label>
                    <SelectField
                      value={timeZone}
                      onChange={(e) => setTimeZone(e.target.value)}
                      className="w-full focus:outline-none focus:ring-2"
                      style={{ borderColor: 'var(--color-border)', background: 'var(--color-surface)' }}
                    >
                      <option>(GMT+05:30) India Standard Time</option>
                      <option>(GMT+00:00) UTC</option>
                      <option>(GMT-05:00) Eastern Time</option>
                      <option>(GMT+01:00) Central European Time</option>
                      <option>(GMT+08:00) Singapore Time</option>
                    </SelectField>
                  </div>

                  <div className="col-span-2 sm:col-span-1">
                    <label className="block text-label font-medium text-ink mb-1.5">Date Format</label>
                    <SelectField
                      value={dateFormat}
                      onChange={(e) => setDateFormat(e.target.value)}
                      className="w-full focus:outline-none focus:ring-2"
                      style={{ borderColor: 'var(--color-border)', background: 'var(--color-surface)' }}
                    >
                      <option>DD/MM/YYYY</option>
                      <option>MM/DD/YYYY</option>
                      <option>YYYY-MM-DD</option>
                    </SelectField>
                  </div>

                  <div>
                    <label className="block text-label font-medium text-ink mb-1.5">Check-in Time</label>
                    <div className="relative">
                      <Lucide.Clock size={15} className="absolute left-3 top-3 text-ink-muted" />
                      <TextField
                        type="text"
                        value={checkInTime}
                        onChange={(e) => setCheckInTime(e.target.value)}
                        className="w-full focus:outline-none focus:ring-2 pl-8 pr-2.5"
                        style={{ borderColor: 'var(--color-border)', background: 'var(--color-surface)' }}
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-label font-medium text-ink mb-1.5">Check-out Time</label>
                    <div className="relative">
                      <Lucide.Clock size={15} className="absolute left-3 top-3 text-ink-muted" />
                      <TextField
                        type="text"
                        value={checkOutTime}
                        onChange={(e) => setCheckOutTime(e.target.value)}
                        className="w-full focus:outline-none focus:ring-2 pl-8 pr-2.5"
                        style={{ borderColor: 'var(--color-border)', background: 'var(--color-surface)' }}
                      />
                    </div>
                  </div>

                  <div className="col-span-2">
                    <label className="block text-label font-medium text-ink mb-1.5">Default Currency</label>
                    <SelectField
                      value={currency}
                      onChange={(e) => setCurrency(e.target.value)}
                      className="w-full focus:outline-none focus:ring-2"
                      style={{ borderColor: 'var(--color-border)', background: 'var(--color-surface)' }}
                    >
                      {/* A saved currency outside the list still shows up as the selection. */}
                      {(CURRENCY_OPTIONS.includes(currency) ? CURRENCY_OPTIONS : [currency, ...CURRENCY_OPTIONS]).map(
                        (option) => (
                          <option key={option}>{option}</option>
                        ),
                      )}
                    </SelectField>
                  </div>

                  <div>
                    <label className="block text-label font-medium text-ink mb-1.5">Number of Floors</label>
                    <TextField
                      type="number"
                      value={floors}
                      onChange={(e) => setFloors(e.target.value)}
                      className="w-full focus:outline-none focus:ring-2"
                      style={{ borderColor: 'var(--color-border)', background: 'var(--color-surface)' }}
                    />
                  </div>

                  <div>
                    <label className="block text-label font-medium text-ink mb-1.5">Total Rooms</label>
                    <TextField
                      type="number"
                      value={totalRooms}
                      onChange={(e) => setTotalRooms(e.target.value)}
                      className="w-full focus:outline-none focus:ring-2"
                      style={{ borderColor: 'var(--color-border)', background: 'var(--color-surface)' }}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* CARD 5: Quick Actions */}
            <div
              className="rounded-2xl border p-5 sm:p-6 shadow-sm flex flex-col justify-between"
              style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}
            >
              <div>
                <div className="pb-4 mb-4 border-b" style={{ borderColor: 'var(--color-border-subtle)' }}>
                  <h2 className="text-body font-semibold text-ink">Quick Actions</h2>
                  <p className="text-label text-ink-secondary mt-0.5">Common property actions</p>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  {/* Action 1: Business Details */}
                  <Button variant="secondary"
                    type="button"
                    onClick={() => setActiveTab('taxes')}
                    className="flex flex-col items-start text-left transition-all"
                    style={{ borderColor: 'var(--color-border)', background: 'var(--color-surface)' }}
                  >
                    <div className="flex h-9 w-9 items-center justify-center rounded-md bg-info-bg text-info-text mb-2 group-hover:scale-105 transition-transform">
                      <Lucide.Building2 size={18} strokeWidth={2.2} />
                    </div>
                    <span className="text-body font-semibold text-ink leading-tight">Business Details</span>
                    <span className="text-label text-ink-secondary mt-1 leading-tight">Update legal and tax information</span>
                  </Button>

                  {/* Action 2: Upload Documents */}
                  <Button variant="secondary"
                    type="button"
                    onClick={() => toast('Document upload center', { tone: 'info' })}
                    className="flex flex-col items-start text-left transition-all"
                    style={{ borderColor: 'var(--color-border)', background: 'var(--color-surface)' }}
                  >
                    <div className="flex h-9 w-9 items-center justify-center rounded-md bg-primary/10 text-primary mb-2 group-hover:scale-105 transition-transform">
                      <Lucide.FileText size={18} strokeWidth={2.2} />
                    </div>
                    <span className="text-body font-semibold text-ink leading-tight">Upload Documents</span>
                    <span className="text-label text-ink-secondary mt-1 leading-tight">License, permits, certificates</span>
                  </Button>

                  {/* Action 3: Set Policies */}
                  <Button variant="secondary"
                    type="button"
                    onClick={() => setActiveTab('policies')}
                    className="flex flex-col items-start text-left transition-all"
                    style={{ borderColor: 'var(--color-border)', background: 'var(--color-surface)' }}
                  >
                    <div className="flex h-9 w-9 items-center justify-center rounded-md bg-success-bg text-success-text mb-2 group-hover:scale-105 transition-transform">
                      <Lucide.ShieldCheck size={18} strokeWidth={2.2} />
                    </div>
                    <span className="text-body font-semibold text-ink leading-tight">Set Policies</span>
                    <span className="text-label text-ink-secondary mt-1 leading-tight">Cancellation, payment, guest</span>
                  </Button>

                  {/* Action 4: Manage Amenities */}
                  <Button variant="secondary"
                    type="button"
                    onClick={() => {
                      const el = document.getElementById('amenities-section');
                      el?.scrollIntoView({ behavior: 'smooth' });
                    }}
                    className="flex flex-col items-start text-left transition-all"
                    style={{ borderColor: 'var(--color-border)', background: 'var(--color-surface)' }}
                  >
                    <div className="flex h-9 w-9 items-center justify-center rounded-md bg-warning-bg text-warning-text mb-2 group-hover:scale-105 transition-transform">
                      <Lucide.Star size={18} strokeWidth={2.2} />
                    </div>
                    <span className="text-body font-semibold text-ink leading-tight">Manage Amenities</span>
                    <span className="text-label text-ink-secondary mt-1 leading-tight">Property facilities and services</span>
                  </Button>
                </div>
              </div>
            </div>
          </div>

          {/* ================= BOTTOM SECTION: Description + Amenities + Property Status ================= */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
            {/* CARD 6: Property Description */}
            <div
              className="rounded-2xl border p-5 sm:p-6 shadow-sm flex flex-col justify-between"
              style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}
            >
              <div>
                <div className="flex items-center justify-between pb-4 mb-4 border-b" style={{ borderColor: 'var(--color-border-subtle)' }}>
                  <div>
                    <h2 className="text-body font-semibold text-ink">Property Description</h2>
                    <p className="text-label text-ink-secondary mt-0.5">This description is shown to guests on booking channels</p>
                  </div>
                </div>

                {/* Rich text formatting bar */}
                <div className="flex items-center gap-1 border-b pb-2 mb-2 text-ink-secondary" style={{ borderColor: 'var(--color-border-subtle)' }}>
                  <IconButton variant="ghost" type="button" className="font-bold">B</IconButton>
                  <IconButton variant="ghost" type="button" className="italic font-serif">I</IconButton>
                  <IconButton variant="ghost" type="button" className="underline">U</IconButton>
                  <span className="h-4 w-px bg-border mx-1" />
                  <IconButton variant="ghost" type="button" ><Lucide.List size={15} /></IconButton>
                  <IconButton variant="ghost" type="button" ><Lucide.Link2 size={15} /></IconButton>
                </div>

                <TextArea
                  rows={5}
                  value={description}
                  onChange={(e) => setDescription(e.target.value.slice(0, 500))}
                  className="w-full focus:outline-none focus:ring-2"
                  style={{ borderColor: 'var(--color-border)', background: 'var(--color-surface)' }}
                />

                <div className="flex justify-end mt-2">
                  <span className="text-label text-ink-secondary">
                    Characters: {description.length} / 500
                  </span>
                </div>
              </div>
            </div>

            {/* CARD 7: Amenities & Facilities */}
            <div
              id="amenities-section"
              className="rounded-2xl border p-5 sm:p-6 shadow-sm flex flex-col justify-between"
              style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}
            >
              <div>
                <div className="flex items-center justify-between pb-4 mb-4 border-b" style={{ borderColor: 'var(--color-border-subtle)' }}>
                  <div>
                    <h2 className="text-body font-semibold text-ink">Amenities & Facilities</h2>
                    <p className="text-label text-ink-secondary mt-0.5">Select amenities available at your property</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {amenities.map((item) => (
                    <label
                      key={item.id}
                      onClick={() => toggleAmenity(item.id)}
                      className={`flex items-center gap-2 p-2 rounded-md border text-label font-medium cursor-pointer transition-all ${
                        item.checked ? 'border-primary/40 bg-primary/[0.04]' : 'border-border hover:bg-muted-surface/40'
                      }`}
                      style={{ borderColor: item.checked ? 'var(--color-primary)' : 'var(--color-border)' }}
                    >
                      <Checkbox
                        type="checkbox"
                        checked={item.checked}
                        onChange={() => {}} // handled by label click
                      />
                      <span className="truncate text-ink">{item.label}</span>
                    </label>
                  ))}
                </div>

                <Button variant="link"
                  type="button"
                  onClick={addCustomAmenity}
                  className="flex items-center gap-1.5 mt-4 hover:underline"
                >
                  <Lucide.Plus size={14} strokeWidth={2.4} />
                  <span>Add custom amenity</span>
                </Button>
              </div>
            </div>

            {/* CARD 8: Property Status */}
            <div
              className="rounded-2xl border p-5 sm:p-6 shadow-sm flex flex-col justify-between"
              style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}
            >
              <div>
                <div className="pb-4 mb-4 border-b" style={{ borderColor: 'var(--color-border-subtle)' }}>
                  <h2 className="text-body font-semibold text-ink">Property Status</h2>
                  <p className="text-label text-ink-secondary mt-0.5">Current configuration status</p>
                </div>

                {/* Status Box */}
                <div
                  className="flex items-start gap-3 rounded-2xl border p-4 mb-5"
                  style={{
                    background: 'color-mix(in srgb, var(--color-success) 10%, var(--color-surface))',
                    borderColor: 'color-mix(in srgb, var(--color-success) 25%, transparent)',
                  }}
                >
                  <div className="flex h-8 w-8 flex-none items-center justify-center rounded-md bg-success-text text-white shadow-xs">
                    <Lucide.CheckCircle2 size={18} strokeWidth={2.4} />
                  </div>
                  <div>
                    <p className="text-body font-semibold text-success-text leading-snug">Property is Active</p>
                    <p className="text-label text-success-text/80 leading-relaxed mt-0.5">
                      Your property is configured and ready to accept reservations.
                    </p>
                  </div>
                </div>

                {/* Metadata Details */}
                <div className="flex flex-col gap-2 text-label">
                  <div className="flex items-center justify-between border-b pb-2" style={{ borderColor: 'var(--color-border-subtle)' }}>
                    <span className="text-ink-secondary">Last updated</span>
                    <span className="font-semibold text-ink">Oct 14, 2026, 10:30 AM</span>
                  </div>
                  <div className="flex items-center justify-between border-b pb-2" style={{ borderColor: 'var(--color-border-subtle)' }}>
                    <span className="text-ink-secondary">Updated by</span>
                    <span className="font-semibold text-ink">Admin</span>
                  </div>
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-ink-secondary">Configuration completeness</span>
                      <span className="font-bold text-success-text">92%</span>
                    </div>
                    <div className="h-2 w-full rounded-full bg-muted-surface overflow-hidden">
                      <div className="h-full rounded-full bg-success-text" style={{ width: '92%' }} />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
        </fieldset>
      )}

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
      {activeTab === 'branding' && (
        <div className="rounded-2xl border p-5 sm:p-6 shadow-sm" style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}>
          <div className="flex items-center justify-between pb-4 mb-4 border-b" style={{ borderColor: 'var(--color-border-subtle)' }}>
            <div>
              <h2 className="text-body font-semibold text-ink">Appearance & House Themes</h2>
              <p className="text-label text-ink-secondary mt-0.5">Select from 9 luxury curated hotel house color palettes</p>
            </div>
            <Button variant="primary"
              type="button"
              onClick={onOpenThemes}
              className="flex items-center gap-2"
            >
              <Lucide.Palette size={16} />
              <span>Open Theme Swatcher</span>
            </Button>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2 sm:gap-2.5">
            {PRESET_LIST.map((p) => {
              const isActive = preset === p.id;
              return (
                <Button variant="secondary"
                  key={p.id}
                  type="button"
                  onClick={() => setPreset(p.id)}
                  className="text-left transition-all"
                  style={{
                    borderColor: isActive ? 'var(--color-primary)' : 'var(--color-border)',
                    background: isActive ? 'color-mix(in srgb, var(--color-primary) 8%, var(--color-surface))' : 'var(--color-surface)',
                    boxShadow: isActive ? '0 0 0 2px var(--color-primary)' : undefined,
                  }}
                >
                  <div className="flex gap-1 mb-2.5">
                    {p.swatch.slice(0, 4).map((color, i) => (
                      <span key={i} className="h-4 flex-1 rounded-full shadow-2xs" style={{ background: color }} />
                    ))}
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-body font-semibold text-ink truncate">{p.name}</span>
                    {isActive ? <Lucide.Check size={14} className="text-primary flex-none" /> : null}
                  </div>
                </Button>
              );
            })}
          </div>
        </div>
      )}

      {/* ================= ROOM SETTINGS TAB ================= */}
      {activeTab === 'room-settings' && (
        <RoomSettingsTab currencyCode={currencyCode} />
      )}

      {/* ================= OTHER TABS (FALLBACK / PLACEHOLDER CARDS) ================= */}
      {['guests', 'integrations', 'notifications', 'advanced'].includes(activeTab) && (
        <div className="rounded-2xl border p-8 shadow-sm text-center" style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}>
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary mb-3">
            <Lucide.Sliders size={26} />
          </div>
          <h2 className="text-body font-semibold text-ink capitalize">{activeTab.replace('-', ' ')} Settings</h2>
          <p className="text-body text-ink-secondary max-w-md mx-auto mt-1 mb-5">
            Manage your hotel's {activeTab.replace('-', ' ')} preferences, configurations, and channel integrations.
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
  );
}
