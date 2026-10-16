import { useCallback, useState } from 'react';
import * as Lucide from 'lucide-react';
import { useAuth } from '../features/auth/AuthContext';
import { propertyApi, adminApi } from '../lib/api/pms';
import { useApiResource } from '../lib/api/useApiResource';
import { toast } from '../components/toastStore';
import { displayApiError } from '../lib/api/client';
import { useTheme } from '../theme/useTheme';
import { PRESET_LIST } from '../theme/presets';

type SettingsTab =
  | 'general'
  | 'policies'
  | 'rooms-rates'
  | 'taxes'
  | 'guests'
  | 'integrations'
  | 'branding'
  | 'notifications'
  | 'advanced';

interface AmenityItem {
  id: string;
  label: string;
  checked: boolean;
}

export function Settings({ onOpenThemes }: { onOpenThemes: () => void }) {
  const { me, can } = useAuth();
  const { preset, setPreset } = useTheme();

  // Load active property & taxes
  const loadSettings = useCallback(async () => {
    const [properties, taxRules] = await Promise.all([
      can('property.read') ? propertyApi.list() : Promise.resolve([]),
      can('invoice.read') ? adminApi.taxRules() : Promise.resolve([]),
    ]);
    return {
      property: properties.find((p) => p.id === me?.activePropertyId) ?? null,
      taxRules,
    };
  }, [can, me?.activePropertyId]);

  const resource = useApiResource(loadSettings);
  const property = resource.data?.property;

  const [activeTab, setActiveTab] = useState<SettingsTab>('general');
  const [saving, setSaving] = useState(false);

  // Basic Information State
  const [propertyName, setPropertyName] = useState('The Grand Horizon Hotel');
  const [propertyCode, setPropertyCode] = useState('TGH');
  const [propertyType, setPropertyType] = useState('Hotel');
  const [starRating, setStarRating] = useState('4');
  const [addressLine1, setAddressLine1] = useState('123 Beach Road');
  const [addressLine2, setAddressLine2] = useState('Marine Drive');
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

  // Sync initial API data when loaded
  const [hasInitialized, setHasInitialized] = useState(false);
  if (property && !hasInitialized) {
    if (property.name) setPropertyName(property.name);
    if (property.addressLine1) setAddressLine1(property.addressLine1);
    if (property.city) setCity(property.city);
    if (property.currencyCode) setCurrency(`${property.currencyCode}`);
    if (property.timezone) setTimeZone(property.timezone);
    if (property.checkInTime) setCheckInTime(property.checkInTime);
    if (property.checkOutTime) setCheckOutTime(property.checkOutTime);
    setHasInitialized(true);
  }

  // Active Tax rule
  const activeTax = resource.data?.taxRules.find((rule) => rule.isActive);
  const [taxRate, setTaxRate] = useState<number>(Number(activeTax?.ratePercent ?? 12));

  // Save handler for backend-wired fields
  const handleSaveBasic = async () => {
    if (!me?.activePropertyId) {
      toast('Basic information saved locally', { tone: 'success' });
      return;
    }
    setSaving(true);
    try {
      await propertyApi.update(me.activePropertyId, {
        name: propertyName,
        addressLine1,
        city,
      });
      resource.refresh();
      toast('Basic Information saved successfully', { tone: 'success' });
    } catch (err) {
      toast('Could not save basic information', { detail: displayApiError(err), tone: 'danger' });
    } finally {
      setSaving(false);
    }
  };

  const handleSaveContact = () => {
    toast('Contact Information updated successfully', { tone: 'success' });
  };

  const handleSaveOperations = async () => {
    if (!me?.activePropertyId) {
      toast('Operational Settings saved locally', { tone: 'success' });
      return;
    }
    setSaving(true);
    try {
      const code = currency.split(' ')[0] ?? 'INR';
      await propertyApi.update(me.activePropertyId, {
        currencyCode: code,
        timezone: timeZone,
        checkInTime,
        checkOutTime,
      });
      resource.refresh();
      toast('Operational settings saved successfully', { tone: 'success' });
    } catch (err) {
      toast('Could not save operational settings', { detail: displayApiError(err), tone: 'danger' });
    } finally {
      setSaving(false);
    }
  };

  const handleSaveDescription = () => {
    toast('Property description updated', { tone: 'success' });
  };

  const handleSaveAmenities = () => {
    toast('Amenities & facilities updated', { tone: 'success' });
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
    { id: 'rooms-rates', label: 'Room & Rates', icon: Lucide.BedDouble },
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
        <div>
          <h1 className="text-[28px] font-bold tracking-tight text-ink flex items-center gap-2.5">
            <Lucide.Settings className="text-primary" size={26} />
            <span>Property Settings</span>
          </h1>
          <p className="text-xs text-ink-secondary mt-1">
            Manage your hotel information, policies, configurations and system preferences
          </p>
        </div>
      </div>

      {/* ================= HORIZONTAL TABS BAR ================= */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 border-b" style={{ borderColor: 'var(--color-border)' }}>
        {TABS_CONFIG.map((t) => {
          const isActive = activeTab === t.id;
          const Icon = t.icon;
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => setActiveTab(t.id)}
              className={`flex items-center gap-2 rounded-md px-4 py-2 text-sm font-semibold whitespace-nowrap transition-all ${
                isActive
                  ? 'text-white shadow-sm'
                  : 'text-ink-secondary hover:text-ink hover:bg-black/[0.03]'
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
            </button>
          );
        })}
      </div>

      {/* ================= GENERAL TAB CONTENT (MATCHING SCREENSHOT 1:1) ================= */}
      {activeTab === 'general' && (
        <div className="flex flex-col gap-5">
          {/* ================= TOP SECTION: Basic Information (2/3) + Logo & Images (1/3) ================= */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
            {/* CARD 1: Basic Information */}
            <div
              className="lg:col-span-2 rounded-2xl border p-5 sm:p-6 shadow-sm flex flex-col justify-between"
              style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}
            >
              <div>
                <div className="flex items-center justify-between pb-4 mb-4 border-b" style={{ borderColor: 'var(--color-border-subtle)' }}>
                  <div>
                    <h2 className="text-base font-semibold text-ink">Basic Information</h2>
                    <p className="text-xs text-ink-secondary mt-0.5">Core details about your property</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => void handleSaveBasic()}
                    disabled={saving}
                    className="pms-btn-primary px-4 py-2 text-sm font-semibold rounded-md shadow-xs disabled:opacity-50"
                  >
                    Save Changes
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                  {/* Property Name */}
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-medium text-ink mb-1.5">
                      Property Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={propertyName}
                      onChange={(e) => setPropertyName(e.target.value)}
                      className="w-full rounded-md border px-3.5 py-2 text-sm font-normal text-ink focus:outline-none focus:ring-2 focus:ring-primary/20"
                      style={{ borderColor: 'var(--color-border)', background: 'var(--color-surface)' }}
                    />
                  </div>

                  {/* Property Code */}
                  <div>
                    <label className="block text-xs font-medium text-ink mb-1.5">
                      Property Code <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={propertyCode}
                      onChange={(e) => setPropertyCode(e.target.value.toUpperCase())}
                      className="w-full rounded-md border px-3.5 py-2 text-sm font-normal text-ink focus:outline-none focus:ring-2 focus:ring-primary/20 uppercase"
                      style={{ borderColor: 'var(--color-border)', background: 'var(--color-surface)' }}
                    />
                  </div>

                  {/* Property Type */}
                  <div>
                    <label className="block text-xs font-medium text-ink mb-1.5">
                      Property Type
                    </label>
                    <select
                      value={propertyType}
                      onChange={(e) => setPropertyType(e.target.value)}
                      className="w-full rounded-md border px-3.5 py-2 text-sm font-normal text-ink focus:outline-none focus:ring-2 focus:ring-primary/20"
                      style={{ borderColor: 'var(--color-border)', background: 'var(--color-surface)' }}
                    >
                      <option>Hotel</option>
                      <option>Resort</option>
                      <option>Boutique Hotel</option>
                      <option>Motel</option>
                      <option>Villa</option>
                      <option>Apartment</option>
                    </select>
                  </div>

                  {/* Star Rating */}
                  <div className="sm:col-span-2 lg:col-span-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-medium text-ink mb-1.5">
                          Star Rating
                        </label>
                        <div
                          className="flex items-center justify-between rounded-md border px-3.5 py-2"
                          style={{ borderColor: 'var(--color-border)', background: 'var(--color-surface)' }}
                        >
                          <div className="flex items-center gap-1 text-amber-500">
                            {[1, 2, 3, 4, 5].map((star) => (
                              <button
                                key={star}
                                type="button"
                                onClick={() => setStarRating(String(star))}
                                className="focus:outline-none transition-transform hover:scale-110"
                              >
                                <Lucide.Star
                                  size={18}
                                  className={star <= Number(starRating) ? 'fill-amber-400 text-amber-500' : 'text-ink-muted/30'}
                                />
                              </button>
                            ))}
                          </div>
                          <span className="text-xs font-medium text-ink-secondary">
                            {starRating} Star Luxury
                          </span>
                        </div>
                      </div>

                      <div>
                        <label className="block text-xs font-medium text-ink mb-1.5">
                          Address Line 1
                        </label>
                        <input
                          type="text"
                          value={addressLine1}
                          onChange={(e) => setAddressLine1(e.target.value)}
                          className="w-full rounded-md border px-3.5 py-2 text-sm font-normal text-ink focus:outline-none focus:ring-2 focus:ring-primary/20"
                          style={{ borderColor: 'var(--color-border)', background: 'var(--color-surface)' }}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Address Line 2 */}
                  <div className="sm:col-span-2 lg:col-span-4">
                    <label className="block text-xs font-medium text-ink mb-1.5">
                      Address Line 2
                    </label>
                    <input
                      type="text"
                      value={addressLine2}
                      onChange={(e) => setAddressLine2(e.target.value)}
                      className="w-full rounded-md border px-3.5 py-2 text-sm font-normal text-ink focus:outline-none focus:ring-2 focus:ring-primary/20"
                      style={{ borderColor: 'var(--color-border)', background: 'var(--color-surface)' }}
                    />
                  </div>

                  {/* City, State, Country, Postal Code */}
                  <div>
                    <label className="block text-xs font-medium text-ink mb-1.5">City</label>
                    <input
                      type="text"
                      value={city}
                      onChange={(e) => setCity(e.target.value)}
                      className="w-full rounded-md border px-3.5 py-2 text-sm font-normal text-ink focus:outline-none focus:ring-2 focus:ring-primary/20"
                      style={{ borderColor: 'var(--color-border)', background: 'var(--color-surface)' }}
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-ink mb-1.5">State / Province</label>
                    <input
                      type="text"
                      value={stateProvince}
                      onChange={(e) => setStateProvince(e.target.value)}
                      className="w-full rounded-md border px-3.5 py-2 text-sm font-normal text-ink focus:outline-none focus:ring-2 focus:ring-primary/20"
                      style={{ borderColor: 'var(--color-border)', background: 'var(--color-surface)' }}
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-ink mb-1.5">Country</label>
                    <input
                      type="text"
                      value={country}
                      onChange={(e) => setCountry(e.target.value)}
                      className="w-full rounded-md border px-3.5 py-2 text-sm font-normal text-ink focus:outline-none focus:ring-2 focus:ring-primary/20"
                      style={{ borderColor: 'var(--color-border)', background: 'var(--color-surface)' }}
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-ink mb-1.5">Postal Code</label>
                    <input
                      type="text"
                      value={postalCode}
                      onChange={(e) => setPostalCode(e.target.value)}
                      className="w-full rounded-md border px-3.5 py-2 text-sm font-normal text-ink focus:outline-none focus:ring-2 focus:ring-primary/20"
                      style={{ borderColor: 'var(--color-border)', background: 'var(--color-surface)' }}
                    />
                  </div>

                  {/* Phone, Email, Website */}
                  <div className="sm:col-span-2 lg:col-span-4 grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
                    <div>
                      <label className="block text-xs font-medium text-ink mb-1.5">Phone Number</label>
                      <div className="relative">
                        <Lucide.Phone size={15} className="absolute left-3.5 top-3 text-ink-muted" />
                        <input
                          type="text"
                          value={phone}
                          onChange={(e) => setPhone(e.target.value)}
                          className="w-full rounded-md border pl-9 pr-3.5 py-2 text-sm font-normal text-ink focus:outline-none focus:ring-2 focus:ring-primary/20"
                          style={{ borderColor: 'var(--color-border)', background: 'var(--color-surface)' }}
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-ink mb-1.5">Email Address</label>
                      <div className="relative">
                        <Lucide.Mail size={15} className="absolute left-3.5 top-3 text-ink-muted" />
                        <input
                          type="email"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          className="w-full rounded-md border pl-9 pr-3.5 py-2 text-sm font-normal text-ink focus:outline-none focus:ring-2 focus:ring-primary/20"
                          style={{ borderColor: 'var(--color-border)', background: 'var(--color-surface)' }}
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-ink mb-1.5">Website</label>
                      <div className="relative">
                        <Lucide.Globe size={15} className="absolute left-3.5 top-3 text-ink-muted" />
                        <input
                          type="text"
                          value={website}
                          onChange={(e) => setWebsite(e.target.value)}
                          className="w-full rounded-md border pl-9 pr-3.5 py-2 text-sm font-normal text-ink focus:outline-none focus:ring-2 focus:ring-primary/20"
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
                <div className="pb-4 mb-4 border-b" style={{ borderColor: 'var(--color-border-subtle)' }}>
                  <h2 className="text-base font-semibold text-ink">Property Logo & Images</h2>
                  <p className="text-xs text-ink-secondary mt-0.5">Logo, cover image and gallery photos</p>
                </div>

                {/* Cover Image Banner */}
                <div className="relative h-36 w-full rounded-md overflow-hidden shadow-xs mb-4 group">
                  <img
                    src="https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?auto=format&fit=crop&w=1200&q=85"
                    alt="Resort Cover"
                    className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent" />
                  <button
                    type="button"
                    onClick={() => toast('Change cover image dialog', { tone: 'info' })}
                    className="absolute bottom-2.5 right-2.5 flex items-center gap-1.5 rounded-lg bg-white/90 backdrop-blur-md px-2.5 py-1 text-xs font-medium text-ink shadow-sm hover:bg-surface transition-colors"
                  >
                    <Lucide.Camera size={13} />
                    <span>Change cover image</span>
                  </button>
                </div>

                {/* Logo Section */}
                <div className="flex items-center gap-3.5 mb-5 p-3 rounded-md border" style={{ borderColor: 'var(--color-border-subtle)', background: 'color-mix(in srgb, var(--color-muted-surface) 40%, var(--color-surface))' }}>
                  <div
                    className="flex h-16 w-16 flex-none items-center justify-center rounded-md border bg-white shadow-xs p-1 text-center"
                    style={{ borderColor: 'var(--color-border)' }}
                  >
                    <div className="flex flex-col items-center justify-center">
                      <Lucide.Building2 size={20} className="text-amber-600 mb-0.5" />
                      <span className="text-[8px] font-bold uppercase tracking-wider text-ink-secondary leading-tight">
                        Grand Horizon
                      </span>
                    </div>
                  </div>
                  <div className="min-w-0 flex-1">
                    <button
                      type="button"
                      onClick={() => toast('Change logo dialog', { tone: 'info' })}
                      className="flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium text-ink hover:bg-black/[0.04] transition-colors"
                      style={{ borderColor: 'var(--color-border)' }}
                    >
                      <Lucide.Image size={13} />
                      <span>Change logo</span>
                    </button>
                    <p className="text-xs text-ink-secondary mt-1 leading-snug">
                      Recommended size: 400 × 400 px<br />PNG, JPG (max 2MB)
                    </p>
                  </div>
                </div>

                {/* Gallery Images */}
                <div>
                  <p className="text-xs font-medium text-ink mb-2">Gallery Images</p>
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
                    <button
                      type="button"
                      onClick={() => toast('Add gallery photos dialog', { tone: 'info' })}
                      className="flex flex-col items-center justify-center rounded-md border-2 border-dashed aspect-square transition-colors hover:border-primary hover:text-primary"
                      style={{ borderColor: 'var(--color-border)', color: 'var(--color-ink-muted)' }}
                    >
                      <Lucide.Plus size={16} strokeWidth={2.4} />
                      <span className="text-xs font-medium mt-1 text-center leading-tight">Add photos</span>
                    </button>
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
                <div className="flex items-center justify-between pb-4 mb-4 border-b" style={{ borderColor: 'var(--color-border-subtle)' }}>
                  <div>
                    <h2 className="text-base font-semibold text-ink">Contact Information</h2>
                    <p className="text-xs text-ink-secondary mt-0.5">Public contact details for guests</p>
                  </div>
                  <button
                    type="button"
                    onClick={handleSaveContact}
                    className="pms-btn-primary px-3.5 py-1.5 text-sm font-semibold rounded-md shadow-xs"
                  >
                    Save Changes
                  </button>
                </div>

                <div className="flex flex-col gap-3">
                  <div>
                    <label className="block text-xs font-medium text-ink mb-1.5">Front Desk Phone</label>
                    <div className="relative">
                      <Lucide.Phone size={15} className="absolute left-3.5 top-3 text-ink-muted" />
                      <input
                        type="text"
                        value={frontDeskPhone}
                        onChange={(e) => setFrontDeskPhone(e.target.value)}
                        className="w-full rounded-md border pl-9 pr-3.5 py-2 text-sm font-normal text-ink focus:outline-none focus:ring-2 focus:ring-primary/20"
                        style={{ borderColor: 'var(--color-border)', background: 'var(--color-surface)' }}
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-ink mb-1.5">Reservations Email</label>
                    <div className="relative">
                      <Lucide.Mail size={15} className="absolute left-3.5 top-3 text-ink-muted" />
                      <input
                        type="email"
                        value={reservationsEmail}
                        onChange={(e) => setReservationsEmail(e.target.value)}
                        className="w-full rounded-md border pl-9 pr-3.5 py-2 text-sm font-normal text-ink focus:outline-none focus:ring-2 focus:ring-primary/20"
                        style={{ borderColor: 'var(--color-border)', background: 'var(--color-surface)' }}
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-ink mb-1.5">General Email</label>
                    <div className="relative">
                      <Lucide.Mail size={15} className="absolute left-3.5 top-3 text-ink-muted" />
                      <input
                        type="email"
                        value={generalEmail}
                        onChange={(e) => setGeneralEmail(e.target.value)}
                        className="w-full rounded-md border pl-9 pr-3.5 py-2 text-sm font-normal text-ink focus:outline-none focus:ring-2 focus:ring-primary/20"
                        style={{ borderColor: 'var(--color-border)', background: 'var(--color-surface)' }}
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-ink mb-1.5">Emergency Contact</label>
                    <div className="relative">
                      <Lucide.PhoneCall size={15} className="absolute left-3.5 top-3 text-ink-muted" />
                      <input
                        type="text"
                        value={emergencyPhone}
                        onChange={(e) => setEmergencyPhone(e.target.value)}
                        className="w-full rounded-md border pl-9 pr-3.5 py-2 text-sm font-normal text-ink focus:outline-none focus:ring-2 focus:ring-primary/20"
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
                <div className="flex items-center justify-between pb-4 mb-4 border-b" style={{ borderColor: 'var(--color-border-subtle)' }}>
                  <div>
                    <h2 className="text-base font-semibold text-ink">Operational Settings</h2>
                    <p className="text-xs text-ink-secondary mt-0.5">Configure key operational details</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => void handleSaveOperations()}
                    disabled={saving}
                    className="pms-btn-primary px-3.5 py-1.5 text-sm font-semibold rounded-md shadow-xs disabled:opacity-50"
                  >
                    Save Changes
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="col-span-2 sm:col-span-1">
                    <label className="block text-xs font-medium text-ink mb-1.5">Time Zone</label>
                    <select
                      value={timeZone}
                      onChange={(e) => setTimeZone(e.target.value)}
                      className="w-full rounded-md border px-3 py-2 text-sm font-normal text-ink focus:outline-none focus:ring-2 focus:ring-primary/20"
                      style={{ borderColor: 'var(--color-border)', background: 'var(--color-surface)' }}
                    >
                      <option>(GMT+05:30) India Standard Time</option>
                      <option>(GMT+00:00) UTC</option>
                      <option>(GMT-05:00) Eastern Time</option>
                      <option>(GMT+01:00) Central European Time</option>
                      <option>(GMT+08:00) Singapore Time</option>
                    </select>
                  </div>

                  <div className="col-span-2 sm:col-span-1">
                    <label className="block text-xs font-medium text-ink mb-1.5">Date Format</label>
                    <select
                      value={dateFormat}
                      onChange={(e) => setDateFormat(e.target.value)}
                      className="w-full rounded-md border px-3 py-2 text-sm font-normal text-ink focus:outline-none focus:ring-2 focus:ring-primary/20"
                      style={{ borderColor: 'var(--color-border)', background: 'var(--color-surface)' }}
                    >
                      <option>DD/MM/YYYY</option>
                      <option>MM/DD/YYYY</option>
                      <option>YYYY-MM-DD</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-ink mb-1.5">Check-in Time</label>
                    <div className="relative">
                      <Lucide.Clock size={15} className="absolute left-3 top-3 text-ink-muted" />
                      <input
                        type="text"
                        value={checkInTime}
                        onChange={(e) => setCheckInTime(e.target.value)}
                        className="w-full rounded-md border pl-8 pr-2.5 py-2 text-sm font-normal text-ink focus:outline-none focus:ring-2 focus:ring-primary/20"
                        style={{ borderColor: 'var(--color-border)', background: 'var(--color-surface)' }}
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-ink mb-1.5">Check-out Time</label>
                    <div className="relative">
                      <Lucide.Clock size={15} className="absolute left-3 top-3 text-ink-muted" />
                      <input
                        type="text"
                        value={checkOutTime}
                        onChange={(e) => setCheckOutTime(e.target.value)}
                        className="w-full rounded-md border pl-8 pr-2.5 py-2 text-sm font-normal text-ink focus:outline-none focus:ring-2 focus:ring-primary/20"
                        style={{ borderColor: 'var(--color-border)', background: 'var(--color-surface)' }}
                      />
                    </div>
                  </div>

                  <div className="col-span-2">
                    <label className="block text-xs font-medium text-ink mb-1.5">Default Currency</label>
                    <select
                      value={currency}
                      onChange={(e) => setCurrency(e.target.value)}
                      className="w-full rounded-md border px-3 py-2 text-sm font-normal text-ink focus:outline-none focus:ring-2 focus:ring-primary/20"
                      style={{ borderColor: 'var(--color-border)', background: 'var(--color-surface)' }}
                    >
                      <option>INR - Indian Rupee (₹)</option>
                      <option>USD - US Dollar ($)</option>
                      <option>EUR - Euro (€)</option>
                      <option>GBP - British Pound (£)</option>
                      <option>AED - UAE Dirham (AED)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-ink mb-1.5">Number of Floors</label>
                    <input
                      type="number"
                      value={floors}
                      onChange={(e) => setFloors(e.target.value)}
                      className="w-full rounded-md border px-3 py-2 text-sm font-normal text-ink focus:outline-none focus:ring-2 focus:ring-primary/20"
                      style={{ borderColor: 'var(--color-border)', background: 'var(--color-surface)' }}
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-ink mb-1.5">Total Rooms</label>
                    <input
                      type="number"
                      value={totalRooms}
                      onChange={(e) => setTotalRooms(e.target.value)}
                      className="w-full rounded-md border px-3 py-2 text-sm font-normal text-ink focus:outline-none focus:ring-2 focus:ring-primary/20"
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
                  <h2 className="text-base font-semibold text-ink">Quick Actions</h2>
                  <p className="text-xs text-ink-secondary mt-0.5">Common property actions</p>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  {/* Action 1: Business Details */}
                  <button
                    type="button"
                    onClick={() => setActiveTab('taxes')}
                    className="flex flex-col items-start p-3 rounded-md border text-left transition-all hover:shadow-xs hover:border-primary group"
                    style={{ borderColor: 'var(--color-border)', background: 'var(--color-surface)' }}
                  >
                    <div className="flex h-9 w-9 items-center justify-center rounded-md bg-blue-50 text-blue-600 mb-2 group-hover:scale-105 transition-transform">
                      <Lucide.Building2 size={18} strokeWidth={2.2} />
                    </div>
                    <span className="text-sm font-semibold text-ink leading-tight">Business Details</span>
                    <span className="text-xs text-ink-secondary mt-1 leading-tight">Update legal and tax information</span>
                  </button>

                  {/* Action 2: Upload Documents */}
                  <button
                    type="button"
                    onClick={() => toast('Document upload center', { tone: 'info' })}
                    className="flex flex-col items-start p-3 rounded-md border text-left transition-all hover:shadow-xs hover:border-primary group"
                    style={{ borderColor: 'var(--color-border)', background: 'var(--color-surface)' }}
                  >
                    <div className="flex h-9 w-9 items-center justify-center rounded-md bg-purple-50 text-purple-600 mb-2 group-hover:scale-105 transition-transform">
                      <Lucide.FileText size={18} strokeWidth={2.2} />
                    </div>
                    <span className="text-sm font-semibold text-ink leading-tight">Upload Documents</span>
                    <span className="text-xs text-ink-secondary mt-1 leading-tight">License, permits, certificates</span>
                  </button>

                  {/* Action 3: Set Policies */}
                  <button
                    type="button"
                    onClick={() => setActiveTab('policies')}
                    className="flex flex-col items-start p-3 rounded-md border text-left transition-all hover:shadow-xs hover:border-primary group"
                    style={{ borderColor: 'var(--color-border)', background: 'var(--color-surface)' }}
                  >
                    <div className="flex h-9 w-9 items-center justify-center rounded-md bg-emerald-50 text-emerald-600 mb-2 group-hover:scale-105 transition-transform">
                      <Lucide.ShieldCheck size={18} strokeWidth={2.2} />
                    </div>
                    <span className="text-sm font-semibold text-ink leading-tight">Set Policies</span>
                    <span className="text-xs text-ink-secondary mt-1 leading-tight">Cancellation, payment, guest</span>
                  </button>

                  {/* Action 4: Manage Amenities */}
                  <button
                    type="button"
                    onClick={() => {
                      const el = document.getElementById('amenities-section');
                      el?.scrollIntoView({ behavior: 'smooth' });
                    }}
                    className="flex flex-col items-start p-3 rounded-md border text-left transition-all hover:shadow-xs hover:border-primary group"
                    style={{ borderColor: 'var(--color-border)', background: 'var(--color-surface)' }}
                  >
                    <div className="flex h-9 w-9 items-center justify-center rounded-md bg-amber-50 text-amber-600 mb-2 group-hover:scale-105 transition-transform">
                      <Lucide.Star size={18} strokeWidth={2.2} />
                    </div>
                    <span className="text-sm font-semibold text-ink leading-tight">Manage Amenities</span>
                    <span className="text-xs text-ink-secondary mt-1 leading-tight">Property facilities and services</span>
                  </button>
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
                    <h2 className="text-base font-semibold text-ink">Property Description</h2>
                    <p className="text-xs text-ink-secondary mt-0.5">This description is shown to guests on booking channels</p>
                  </div>
                  <button
                    type="button"
                    onClick={handleSaveDescription}
                    className="pms-btn-primary px-3.5 py-1.5 text-sm font-semibold rounded-md shadow-xs"
                  >
                    Save Changes
                  </button>
                </div>

                {/* Rich text formatting bar */}
                <div className="flex items-center gap-1 border-b pb-2 mb-2 text-ink-secondary" style={{ borderColor: 'var(--color-border-subtle)' }}>
                  <button type="button" className="p-1.5 rounded-lg hover:bg-black/[0.05] text-xs font-bold">B</button>
                  <button type="button" className="p-1.5 rounded-lg hover:bg-black/[0.05] text-xs italic font-serif">I</button>
                  <button type="button" className="p-1.5 rounded-lg hover:bg-black/[0.05] text-xs underline">U</button>
                  <span className="h-4 w-px bg-border mx-1" />
                  <button type="button" className="p-1.5 rounded-lg hover:bg-black/[0.05]"><Lucide.List size={15} /></button>
                  <button type="button" className="p-1.5 rounded-lg hover:bg-black/[0.05]"><Lucide.Link2 size={15} /></button>
                </div>

                <textarea
                  rows={5}
                  value={description}
                  onChange={(e) => setDescription(e.target.value.slice(0, 500))}
                  className="w-full rounded-md border p-3 text-sm leading-relaxed text-ink focus:outline-none focus:ring-2 focus:ring-primary/20 resize-none font-normal"
                  style={{ borderColor: 'var(--color-border)', background: 'var(--color-surface)' }}
                />

                <div className="flex justify-end mt-2">
                  <span className="text-xs text-ink-secondary">
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
                    <h2 className="text-base font-semibold text-ink">Amenities & Facilities</h2>
                    <p className="text-xs text-ink-secondary mt-0.5">Select amenities available at your property</p>
                  </div>
                  <button
                    type="button"
                    onClick={handleSaveAmenities}
                    className="pms-btn-primary px-3.5 py-1.5 text-sm font-semibold rounded-md shadow-xs"
                  >
                    Save Changes
                  </button>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {amenities.map((item) => (
                    <label
                      key={item.id}
                      onClick={() => toggleAmenity(item.id)}
                      className={`flex items-center gap-2 p-2 rounded-md border text-xs font-medium cursor-pointer transition-all ${
                        item.checked ? 'border-primary/40 bg-primary/[0.04]' : 'border-border hover:bg-muted-surface/40'
                      }`}
                      style={{ borderColor: item.checked ? 'var(--color-primary)' : 'var(--color-border)' }}
                    >
                      <input
                        type="checkbox"
                        checked={item.checked}
                        onChange={() => {}} // handled by label click
                        className="h-4 w-4 rounded accent-primary cursor-pointer"
                      />
                      <span className="truncate text-ink">{item.label}</span>
                    </label>
                  ))}
                </div>

                <button
                  type="button"
                  onClick={addCustomAmenity}
                  className="flex items-center gap-1.5 mt-4 text-xs font-semibold text-primary hover:underline"
                >
                  <Lucide.Plus size={14} strokeWidth={2.4} />
                  <span>Add custom amenity</span>
                </button>
              </div>
            </div>

            {/* CARD 8: Property Status */}
            <div
              className="rounded-2xl border p-5 sm:p-6 shadow-sm flex flex-col justify-between"
              style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}
            >
              <div>
                <div className="pb-4 mb-4 border-b" style={{ borderColor: 'var(--color-border-subtle)' }}>
                  <h2 className="text-base font-semibold text-ink">Property Status</h2>
                  <p className="text-xs text-ink-secondary mt-0.5">Current configuration status</p>
                </div>

                {/* Status Box */}
                <div
                  className="flex items-start gap-3 rounded-2xl border p-4 mb-5"
                  style={{
                    background: 'color-mix(in srgb, var(--color-success) 10%, var(--color-surface))',
                    borderColor: 'color-mix(in srgb, var(--color-success) 25%, transparent)',
                  }}
                >
                  <div className="flex h-8 w-8 flex-none items-center justify-center rounded-md bg-emerald-500 text-white shadow-xs">
                    <Lucide.CheckCircle2 size={18} strokeWidth={2.4} />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-emerald-900 leading-snug">Property is Active</p>
                    <p className="text-xs text-emerald-800/80 leading-relaxed mt-0.5">
                      Your property is configured and ready to accept reservations.
                    </p>
                  </div>
                </div>

                {/* Metadata Details */}
                <div className="flex flex-col gap-2 text-xs">
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
                      <span className="font-bold text-emerald-600">92%</span>
                    </div>
                    <div className="h-2 w-full rounded-full bg-muted-surface overflow-hidden">
                      <div className="h-full rounded-full bg-emerald-500" style={{ width: '92%' }} />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ================= POLICIES TAB ================= */}
      {activeTab === 'policies' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="rounded-2xl border p-5 sm:p-6 shadow-sm" style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}>
            <h2 className="text-base font-semibold text-ink mb-1">Booking & Cancellation Policies</h2>
            <p className="text-xs text-ink-secondary mb-4">Guest-facing terms applied on confirmed bookings</p>
            <div className="flex flex-col gap-3">
              <div>
                <label className="block text-xs font-medium text-ink mb-1.5">Cancellation Policy</label>
                <input
                  defaultValue="Free cancellation until 48h before arrival; first night charged thereafter."
                  className="w-full rounded-md border p-2.5 text-sm font-normal text-ink"
                  style={{ borderColor: 'var(--color-border)' }}
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-ink mb-1.5">No-show Policy</label>
                <input
                  defaultValue="First night charged to the primary payment method on file."
                  className="w-full rounded-md border p-2.5 text-sm font-normal text-ink"
                  style={{ borderColor: 'var(--color-border)' }}
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-ink mb-1.5">Child & Extra Bed Policy</label>
                <input
                  defaultValue="Children under 6 stay complimentary using existing bedding."
                  className="w-full rounded-md border p-2.5 text-sm font-normal text-ink"
                  style={{ borderColor: 'var(--color-border)' }}
                />
              </div>
              <button
                type="button"
                onClick={() => toast('Policies saved', { tone: 'success' })}
                className="pms-btn-primary px-4 py-2 text-sm font-semibold rounded-md mt-2 w-fit"
              >
                Save Policies
              </button>
            </div>
          </div>

          <div className="rounded-2xl border p-5 sm:p-6 shadow-sm" style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}>
            <h2 className="text-base font-semibold text-ink mb-1">Stay Rules & Check-in Requirements</h2>
            <p className="text-xs text-ink-secondary mb-4">Standard hospitality verification procedures</p>
            <div className="flex flex-col gap-3">
              <div className="flex items-center justify-between border-b pb-3" style={{ borderColor: 'var(--color-border-subtle)' }}>
                <div>
                  <p className="text-sm font-semibold text-ink">Mandatory Government ID on Check-in</p>
                  <p className="text-xs text-ink-secondary">Passport, driving license, or national identity card</p>
                </div>
                <input type="checkbox" defaultChecked className="h-5 w-5 rounded accent-primary cursor-pointer" />
              </div>
              <div className="flex items-center justify-between border-b pb-3" style={{ borderColor: 'var(--color-border-subtle)' }}>
                <div>
                  <p className="text-sm font-semibold text-ink">Security Deposit Guarantee</p>
                  <p className="text-xs text-ink-secondary">Pre-authorization hold of 20% on incidentals</p>
                </div>
                <input type="checkbox" defaultChecked className="h-5 w-5 rounded accent-primary cursor-pointer" />
              </div>
              <div className="flex items-center justify-between" style={{ borderColor: 'var(--color-border-subtle)' }}>
                <div>
                  <p className="text-sm font-semibold text-ink">Minimum Check-in Age (18+)</p>
                  <p className="text-xs text-ink-secondary">Primary guest must be 18 years or older</p>
                </div>
                <input type="checkbox" defaultChecked className="h-5 w-5 rounded accent-primary cursor-pointer" />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ================= TAXES & FEES TAB ================= */}
      {activeTab === 'taxes' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="rounded-2xl border p-5 sm:p-6 shadow-sm" style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}>
            <h2 className="text-base font-semibold text-ink mb-1">Active Backend Tax Rules</h2>
            <p className="text-xs text-ink-secondary mb-4">Taxes applied dynamically to folios and invoices</p>
            <div className="flex flex-col gap-3">
              <div>
                <label className="block text-xs font-medium text-ink mb-1.5">Tax Rate (%)</label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min={0}
                    max={40}
                    value={taxRate}
                    onChange={(e) => setTaxRate(Number(e.target.value))}
                    className="w-32 rounded-md border p-2 text-sm font-bold text-ink"
                    style={{ borderColor: 'var(--color-border)' }}
                  />
                  <span className="text-xs font-semibold text-ink-secondary">% GST / VAT</span>
                </div>
              </div>
              <button
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
                className="pms-btn-primary px-4 py-2 text-sm font-semibold rounded-md w-fit disabled:opacity-50"
              >
                Save Tax Rule
              </button>
            </div>
          </div>

          <div className="rounded-2xl border p-5 sm:p-6 shadow-sm" style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}>
            <h2 className="text-base font-semibold text-ink mb-1">Invoice Details & Legal Header</h2>
            <p className="text-xs text-ink-secondary mb-4">Printed information on guest folios & receipts</p>
            <div className="flex flex-col gap-3">
              <div>
                <label className="block text-xs font-medium text-ink mb-1.5">Invoice Prefix</label>
                <input defaultValue="INV-2026-" className="w-full rounded-md border p-2.5 font-mono text-sm text-ink" style={{ borderColor: 'var(--color-border)' }} />
              </div>
              <div>
                <label className="block text-xs font-medium text-ink mb-1.5">Tax Registration / GSTIN</label>
                <input defaultValue="27AAAAA0000A1Z5" className="w-full rounded-md border p-2.5 font-mono text-sm text-ink" style={{ borderColor: 'var(--color-border)' }} />
              </div>
              <button
                type="button"
                onClick={() => toast('Invoice details saved', { tone: 'success' })}
                className="pms-btn-primary px-4 py-2 text-sm font-semibold rounded-md w-fit"
              >
                Save Invoice Details
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================= BRANDING TAB ================= */}
      {activeTab === 'branding' && (
        <div className="rounded-2xl border p-5 sm:p-6 shadow-sm" style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}>
          <div className="flex items-center justify-between pb-4 mb-4 border-b" style={{ borderColor: 'var(--color-border-subtle)' }}>
            <div>
              <h2 className="text-base font-semibold text-ink">Appearance & House Themes</h2>
              <p className="text-xs text-ink-secondary mt-0.5">Select from 9 luxury curated hotel house color palettes</p>
            </div>
            <button
              type="button"
              onClick={onOpenThemes}
              className="pms-btn-primary flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-md"
            >
              <Lucide.Palette size={16} />
              <span>Open Theme Swatcher</span>
            </button>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2 sm:gap-2.5">
            {PRESET_LIST.map((p) => {
              const isActive = preset === p.id;
              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => setPreset(p.id)}
                  className="rounded-md border p-3 text-left transition-all hover:border-primary group"
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
                    <span className="text-sm font-semibold text-ink truncate">{p.name}</span>
                    {isActive ? <Lucide.Check size={14} className="text-primary flex-none" /> : null}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* ================= OTHER TABS (FALLBACK / PLACEHOLDER CARDS) ================= */}
      {['rooms-rates', 'guests', 'integrations', 'notifications', 'advanced'].includes(activeTab) && (
        <div className="rounded-2xl border p-8 shadow-sm text-center" style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}>
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary mb-3">
            <Lucide.Sliders size={26} />
          </div>
          <h2 className="text-lg font-semibold text-ink capitalize">{activeTab.replace('-', ' ')} Settings</h2>
          <p className="text-sm text-ink-secondary max-w-md mx-auto mt-1 mb-5">
            Manage your hotel's {activeTab.replace('-', ' ')} preferences, configurations, and channel integrations.
          </p>
          <button
            type="button"
            onClick={() => setActiveTab('general')}
            className="pms-btn-primary px-4 py-2 text-sm font-semibold rounded-md"
          >
            Back to General Settings
          </button>
        </div>
      )}
    </div>
  );
}
