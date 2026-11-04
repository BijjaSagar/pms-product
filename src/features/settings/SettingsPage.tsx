import { useCallback, useState } from 'react';
import * as Lucide from 'lucide-react';
import { useAuth } from '../../features/auth/AuthContext';
import { propertyApi, adminApi, inventoryApi, settingsApi } from '../../lib/api/pms';
import { clockDisplay, clockTo24, zoneLabelOf, zoneOf } from '../../lib/api/propertyMapping';
import { useApiResource } from '../../lib/api/useApiResource';
import { toast } from '../../utils/toast';
import { displayApiError } from '../../lib/api/client';
import { useTheme } from '../../theme/useTheme';
import { PRESET_LIST } from '../../theme/presets';
import { loadRoomInventory } from '../../lib/api/loaders';
import { formatCurrency } from '../../lib/api/format';
import { Modal } from '../../components/overlays';
import { Field } from '../../components/controls';
import { inputClass } from '../../utils/styling';
import type { RoomType } from '../../types';
import { Button, Checkbox, IconButton, SelectField, TextArea, TextField } from '../../components/primitives';

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

interface AmenityItem {
  id: string;
  label: string;
  checked: boolean;
}

/*
 * Property settings that have no column in the backend. Each is kept as a setting under its key,
 * and a value that was never saved reads as the empty value here.
 */
const SETTING_FALLBACKS: Record<string, unknown> = {
  'address.line2': '',
  'contact.phone': '',
  'contact.email': '',
  'contact.website': '',
  'contact.frontDeskPhone': '',
  'contact.reservationsEmail': '',
  'contact.generalEmail': '',
  'contact.emergencyPhone': '',
  'property.type': '',
  'property.starRating': '',
  'property.description': '',
  'property.amenities': [],
  'ops.dateFormat': 'DD/MM/YYYY',
  'invoice.prefix': 'INV-',
  'policy.cancellation': '',
  'policy.noShow': '',
  'policy.child': '',
};

async function readSettings(): Promise<Record<string, unknown>> {
  const entries = await Promise.all(
    Object.entries(SETTING_FALLBACKS).map(async ([key, fallback]) => [key, await settingsApi.get(key, fallback)] as const),
  );
  return Object.fromEntries(entries);
}

function saveSettings(values: Record<string, unknown>): Promise<void[]> {
  return Promise.all(Object.entries(values).map(([key, value]) => settingsApi.set(key, value)));
}

const EMPTY_ROOM_TYPE: RoomType = {
  id: '',
  name: '',
  description: '',
  count: 0,
  maxOccupancy: 2,
  maxAdults: 2,
  maxChildren: 0,
  beds: '',
  baseRate: 0,
  amenities: [],
  active: true,
};

/* The operational preferences the room settings tab edits: stored settings, plus the property's hold time. */
async function loadRoomPreferences(readSettingValues: boolean, readProperty: boolean) {
  const [inventory, turnaround, keycards, property] = await Promise.all([
    loadRoomInventory(),
    readSettingValues ? settingsApi.get<number | null>('ops.turnaroundMinutes', null) : Promise.resolve(null),
    readSettingValues ? settingsApi.get<number | null>('ops.keycardsPerRoom', null) : Promise.resolve(null),
    readProperty ? propertyApi.current() : Promise.resolve(null),
  ]);
  return { ...inventory, turnaround, keycards, property };
}

function RoomSettingsTab({ currencyCode }: { currencyCode: string }) {
  const { can } = useAuth();
  const resource = useApiResource(useCallback(() => loadRoomPreferences(can('config.manage'), can('property.read')), [can]));
  const types: RoomType[] = resource.data?.roomTypes ?? [];
  const [editing, setEditing] = useState<RoomType | null>(null);
  const [amenText, setAmenText] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  // Operational preferences, filled from the backend once when they arrive
  const [turnaroundMinutes, setTurnaroundMinutes] = useState('');
  const [keycardsPerRoom, setKeycardsPerRoom] = useState('');
  const [autoReleaseHoldMinutes, setAutoReleaseHoldMinutes] = useState('');
  const [savingPrefs, setSavingPrefs] = useState(false);
  const [prefsLoaded, setPrefsLoaded] = useState(false);
  if (resource.data && !prefsLoaded) {
    setPrefsLoaded(true);
    setTurnaroundMinutes(resource.data.turnaround === null ? '' : String(resource.data.turnaround));
    setKeycardsPerRoom(resource.data.keycards === null ? '' : String(resource.data.keycards));
    setAutoReleaseHoldMinutes(resource.data.property?.holdMinutes == null ? '' : String(resource.data.property.holdMinutes));
  }

  const openAdd = () => {
    setEditing({ ...EMPTY_ROOM_TYPE, id: `RT-NEW-${types.length + 1}` });
    setAmenText('');
  };

  const openEdit = (t: RoomType) => {
    setEditing({ ...t, amenities: [...t.amenities] });
    setAmenText(t.amenities.join(', '));
  };

  const save = async () => {
    if (!editing) return;
    if (editing.name.trim().length < 2) {
      return toast('Name required', { detail: 'Give the room type a descriptive name.', tone: 'warning' });
    }
    if (editing.baseRate < 0) {
      return toast('Check base rate', { detail: 'Base rate must be zero or above.', tone: 'warning' });
    }
    const amenities = amenText
      .split(',')
      .map((a) => a.trim())
      .filter(Boolean);

    setIsSaving(true);
    try {
      if (editing.id.startsWith('RT-NEW')) {
        const code = editing.name.trim().toUpperCase().replace(/[^A-Z0-9]+/g, '-').slice(0, 40);
        await inventoryApi.createRoomType({
          code,
          name: editing.name.trim(),
          description: editing.description,
          maxAdults: Math.max(1, editing.maxAdults ?? editing.maxOccupancy),
          maxChildren: Math.max(0, editing.maxChildren ?? 0),
          baseRate: editing.baseRate,
          amenities,
        });
      } else {
        await inventoryApi.updateRoomType(editing.id, {
          name: editing.name.trim(),
          description: editing.description,
          maxAdults: Math.max(1, editing.maxAdults ?? editing.maxOccupancy),
          maxChildren: Math.max(0, editing.maxChildren ?? 0),
          baseRate: editing.baseRate,
          isActive: editing.active,
          amenities,
        });
      }
      resource.refresh();
      toast('Room type saved', { detail: 'Configuration updated successfully.', tone: 'success' });
      setEditing(null);
    } catch (error) {
      toast('Could not save room type', { detail: displayApiError(error), tone: 'danger' });
    } finally {
      setIsSaving(false);
    }
  };

  const handleSavePreferences = async () => {
    const turnaround = Number(turnaroundMinutes);
    const keycards = Number(keycardsPerRoom);
    const hold = Number(autoReleaseHoldMinutes);
    if (!Number.isInteger(turnaround) || !Number.isInteger(keycards) || !Number.isInteger(hold) || hold < 1) {
      toast('Enter whole numbers for the room rules', { tone: 'warning' });
      return;
    }
    setSavingPrefs(true);
    try {
      await saveSettings({ 'ops.turnaroundMinutes': turnaround, 'ops.keycardsPerRoom': keycards });
      await propertyApi.update({ holdMinutes: hold });
      resource.refresh();
      toast('Room operational rules updated', { tone: 'success' });
    } catch (err) {
      toast('Could not save room operational rules', { detail: displayApiError(err), tone: 'danger' });
    } finally {
      setSavingPrefs(false);
    }
  };

  const totalRooms = types.reduce((s, t) => s + t.count, 0);
  const activeTypes = types.filter((t) => t.active).length;
  const minRate = types.length > 0 ? Math.min(...types.map((t) => t.baseRate)) : 0;

  return (
    <div className="flex flex-col gap-5">
      {/* 4 Summary Stat Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="rounded-2xl border p-4 shadow-2xs flex flex-col justify-between" style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}>
          <div className="flex items-center justify-between">
            <span className="text-label font-semibold text-ink-secondary">Room Categories</span>
            <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-info-bg text-info-text">
              <Lucide.Layers size={16} />
            </span>
          </div>
          <div className="mt-2">
            <span className="text-disp3 font-black text-ink tnum">{types.length}</span>
            <p className="text-label text-ink-secondary mt-0.5">{activeTypes} active for booking</p>
          </div>
        </div>

        <div className="rounded-2xl border p-4 shadow-2xs flex flex-col justify-between" style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}>
          <div className="flex items-center justify-between">
            <span className="text-label font-semibold text-ink-secondary">Rooms in Inventory</span>
            <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-success-bg text-success-text">
              <Lucide.BedDouble size={16} />
            </span>
          </div>
          <div className="mt-2">
            <span className="text-disp3 font-black text-ink tnum">{totalRooms}</span>
            <p className="text-label text-ink-secondary mt-0.5">Across all hotel wings</p>
          </div>
        </div>

        <div className="rounded-2xl border p-4 shadow-2xs flex flex-col justify-between" style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}>
          <div className="flex items-center justify-between">
            <span className="text-label font-semibold text-ink-secondary">Starting Base Rate</span>
            <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-warning-bg text-warning-text">
              <Lucide.Tag size={16} />
            </span>
          </div>
          <div className="mt-2">
            <span className="text-disp3 font-black text-ink tnum">{formatCurrency(minRate, currencyCode)}</span>
            <p className="text-label text-ink-secondary mt-0.5">Lowest base nightly rate</p>
          </div>
        </div>

        <div className="rounded-2xl border p-4 shadow-2xs flex flex-col justify-between" style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}>
          <div className="flex items-center justify-between">
            <span className="text-label font-semibold text-ink-secondary">Catalog Health</span>
            <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <Lucide.ShieldCheck size={16} />
            </span>
          </div>
          <div className="mt-2">
            <span className="text-disp3 font-black text-success-text tnum">100%</span>
            <p className="text-label text-ink-secondary mt-0.5">Rates & amenities mapped</p>
          </div>
        </div>
      </div>

      {/* Main Room Types Table Card */}
      <div className="rounded-2xl border p-5 sm:p-6 shadow-sm" style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between pb-3.5 mb-3.5 border-b border-divider gap-3">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-tr from-primary to-dark-accent text-white shadow-xs shadow-primary/20">
              <Lucide.BedDouble size={17} strokeWidth={2.4} />
            </div>
            <div>
              <h2 className="text-body font-bold text-ink tracking-tight">Room Types &amp; Categories</h2>
              <p className="text-label text-ink-muted mt-0.5">
                Manage room categories, base rates, occupant limits, and luxury amenities
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="secondary"
              type="button"
              onClick={() => resource.refresh()}
              className="flex items-center gap-1.5"
              title="Refresh room types"
            >
              <Lucide.RefreshCw size={13} className={resource.loading ? 'animate-spin' : ''} />
              <span>Refresh</span>
            </Button>
            <Button variant="primary"
              type="button"
              onClick={openAdd}
              className="flex items-center gap-1.5"
            >
              <Lucide.Plus size={15} strokeWidth={2.4} />
              <span>Add Room Type</span>
            </Button>
          </div>
        </div>

        {resource.error && (
          <div className="mb-4 flex items-center gap-2 rounded-xl border border-danger-border bg-danger-bg p-3 text-label text-danger-text">
            <Lucide.AlertCircle size={16} />
            <span>Could not load room types: {resource.error}</span>
          </div>
        )}

        <div className="pms-table-scroll overflow-x-auto">
          <table className="pms-table min-w-[760px] w-full text-left">
            <thead>
              <tr>
                <th className="w-10 text-center">#</th>
                <th>CATEGORY</th>
                <th>ROOMS</th>
                <th>CAPACITY</th>
                <th className="text-right">BASE RATE</th>
                <th>AMENITIES</th>
                <th>STATUS</th>
                <th className="text-right">ACTIONS</th>
              </tr>
            </thead>
            <tbody>
              {types.map((t, idx) => (
                <tr key={t.id} className="transition-colors hover:bg-page/70 border-b border-divider last:border-b-0">
                  <td className="text-center font-medium text-ink-muted text-label py-3">{idx + 1}</td>
                  <td className="py-3">
                    <span className="block font-bold text-ink text-label">{t.name}</span>
                    <span className="block max-w-[260px] truncate text-label text-ink-muted mt-0.5">
                      {t.description || 'Standard room category'}
                    </span>
                  </td>
                  <td className="tnum font-semibold text-ink text-label py-3">{t.count}</td>
                  <td className="tnum text-ink-secondary text-label py-3">
                    <span className="inline-flex items-center gap-1 bg-muted-surface px-2 py-0.5 rounded-md">
                      <Lucide.Users size={12} className="text-ink-secondary" />
                      <span>{t.maxOccupancy} guests max</span>
                    </span>
                  </td>
                  <td className="tnum text-right font-bold text-ink text-label py-3">
                    {formatCurrency(t.baseRate, currencyCode)}
                  </td>
                  <td className="max-w-[220px] py-3">
                    <div className="flex flex-wrap gap-1 max-w-[220px]">
                      {t.amenities.length > 0 ? (
                        t.amenities.slice(0, 3).map((a, i) => (
                          <span key={i} className="text-micro font-medium bg-muted-surface text-ink-secondary px-1.5 py-0.5 rounded">
                            {a}
                          </span>
                        ))
                      ) : (
                        <span className="text-label text-ink-muted">—</span>
                      )}
                      {t.amenities.length > 3 && (
                        <span className="text-micro font-bold text-ink-muted px-1 py-0.5">
                          +{t.amenities.length - 3}
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="py-3">
                    <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-label font-bold ${
                      t.active ? 'bg-success-bg text-success-text border border-success-border' : 'bg-muted-surface text-ink-secondary'
                    }`}>
                      <span className={`h-1.5 w-1.5 rounded-full ${t.active ? 'bg-success-text' : 'bg-ink-disabled'}`} />
                      {t.active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="text-right py-3">
                    <Button variant="secondary"
                      type="button"
                      onClick={() => openEdit(t)}
                      className="transition-colors cursor-pointer"
                      title={`Edit ${t.name}`}
                    >
                      <Lucide.Pencil size={14} />
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {types.length === 0 && !resource.loading && (
            <p className="py-8 text-center text-label text-ink-muted">No room types configured yet.</p>
          )}
        </div>
      </div>

      {/* Room Operations & Policies Card */}
      <div className="rounded-2xl border p-5 sm:p-6 shadow-sm" style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}>
        <div className="flex items-center justify-between pb-3.5 mb-3.5 border-b border-divider">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-tr from-primary to-dark-accent text-white shadow-xs shadow-primary/20">
              <Lucide.Clock size={17} strokeWidth={2.4} />
            </div>
            <div>
              <h2 className="text-body font-bold text-ink tracking-tight">Room Operations &amp; Holding Rules</h2>
              <p className="text-label text-ink-muted mt-0.5">Default automated rules applied across room inventory</p>
            </div>
          </div>
          <Button variant="primary"
            type="button"
            onClick={handleSavePreferences}
            disabled={savingPrefs}
            className="flex items-center gap-1.5 cursor-pointer transition-all disabled:opacity-50"
          >
            Save Rules
          </Button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className="block text-label font-medium text-ink mb-1.5">Cleaning Turnaround Window</label>
            <SelectField
              value={turnaroundMinutes}
              onChange={(e) => setTurnaroundMinutes(e.target.value)}
              className="w-full focus:outline-none"
              style={{ borderColor: 'var(--color-border)', background: 'var(--color-surface)' }}
            >
              <option value="20">20 Minutes</option>
              <option value="30">30 Minutes (Standard)</option>
              <option value="45">45 Minutes</option>
              <option value="60">60 Minutes</option>
            </SelectField>
            <span className="text-label text-ink-secondary mt-1 block">Allocated housekeeping duration per room departure</span>
          </div>

          <div>
            <label className="block text-label font-medium text-ink mb-1.5">Default Keycards Allotment</label>
            <SelectField
              value={keycardsPerRoom}
              onChange={(e) => setKeycardsPerRoom(e.target.value)}
              className="w-full focus:outline-none"
              style={{ borderColor: 'var(--color-border)', background: 'var(--color-surface)' }}
            >
              <option value="1">1 Keycard</option>
              <option value="2">2 Keycards (Standard)</option>
              <option value="3">3 Keycards</option>
            </SelectField>
            <span className="text-label text-ink-secondary mt-1 block">Initial issued RFID access cards on check-in</span>
          </div>

          <div>
            <label className="block text-label font-medium text-ink mb-1.5">Auto-Release Hold Timeout</label>
            <SelectField
              value={autoReleaseHoldMinutes}
              onChange={(e) => setAutoReleaseHoldMinutes(e.target.value)}
              className="w-full focus:outline-none"
              style={{ borderColor: 'var(--color-border)', background: 'var(--color-surface)' }}
            >
              <option value="10">10 Minutes</option>
              <option value="15">15 Minutes (Recommended)</option>
              <option value="30">30 Minutes</option>
            </SelectField>
            <span className="text-label text-ink-secondary mt-1 block">Release uncommitted room locks during reservation creation</span>
          </div>
        </div>

        <div className="mt-4 pt-3 border-t flex justify-end" style={{ borderColor: 'var(--color-border-subtle)' }}>
          <Button variant="primary"
            type="button"
            onClick={handleSavePreferences}
            disabled={savingPrefs}
            className="disabled:opacity-50"
          >
            {savingPrefs ? 'Saving…' : 'Save Operational Rules'}
          </Button>
        </div>
      </div>

      {/* Edit / Add Room Type Modal */}
      <Modal
        open={editing !== null}
        onClose={() => setEditing(null)}
        title={editing?.id.startsWith('RT-NEW') ? 'Add Room Type' : `Edit ${editing?.name}`}
        subtitle="Manage room category details, rates, occupant limits, and luxury inclusions"
        wide
      >
        {editing && (
          <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2 py-2">
            <Field label="Category name">
              <input
                value={editing.name}
                onChange={(e) => setEditing({ ...editing, name: e.target.value })}
                className={inputClass()}
                placeholder="e.g. Deluxe Suite, Executive King"
                autoFocus
              />
            </Field>
            <Field label={`Standard base rate per night (${currencyCode})`}>
              <input
                type="number"
                min={0}
                value={editing.baseRate}
                onChange={(e) => setEditing({ ...editing, baseRate: Number(e.target.value) })}
                className={inputClass('tnum')}
              />
            </Field>
            <div className="sm:col-span-2">
              <Field label="Description">
                <input
                  value={editing.description}
                  onChange={(e) => setEditing({ ...editing, description: e.target.value })}
                  className={inputClass()}
                  placeholder="Summary of room size, view, and furnishings"
                />
              </Field>
            </div>
            <Field label="Max adults">
              <input
                type="number"
                min={1}
                max={8}
                value={editing.maxAdults ?? editing.maxOccupancy}
                onChange={(e) => setEditing({ ...editing, maxAdults: Number(e.target.value) })}
                className={inputClass('tnum')}
              />
            </Field>
            <Field label="Max children">
              <input
                type="number"
                min={0}
                max={6}
                value={editing.maxChildren ?? 0}
                onChange={(e) => setEditing({ ...editing, maxChildren: Number(e.target.value) })}
                className={inputClass('tnum')}
              />
            </Field>
            <Field label="Active catalog status">
              <select
                value={editing.active ? 'active' : 'inactive'}
                onChange={(e) => setEditing({ ...editing, active: e.target.value === 'active' })}
                className={inputClass()}
              >
                <option value="active">Active (Available for booking)</option>
                <option value="inactive">Inactive (Hidden from sales)</option>
              </select>
            </Field>
            <div className="sm:col-span-2">
              <Field label="Amenities (comma-separated list)">
                <input
                  value={amenText}
                  onChange={(e) => setAmenText(e.target.value)}
                  placeholder="Free Wi-Fi, King Bed, Mini Bar, Balcony"
                  className={inputClass()}
                />
              </Field>
            </div>
            <div className="flex gap-2 sm:col-span-2 pt-3 border-t" style={{ borderColor: 'var(--color-border)' }}>
              <Button variant="secondary"
                type="button"
                className="flex-1"
                onClick={() => setEditing(null)}
                disabled={isSaving}
              >
                Cancel
              </Button>
              <Button variant="primary"
                type="button"
                onClick={save}
                disabled={isSaving}
              >
                {isSaving ? 'Saving…' : 'Save Room Type'}
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}

export function Settings({
  onOpenThemes,
  initialTab = 'general',
}: {
  onOpenThemes?: () => void;
  initialTab?: SettingsTab;
}) {
  const { can } = useAuth();
  const { preset, setPreset } = useTheme();

  // The property, the settings the backend keeps as key and value pairs, and the rooms that make up the property
  const loadSettings = useCallback(async () => {
    const [property, taxRules, rooms, stored] = await Promise.all([
      can('property.read') ? propertyApi.current() : Promise.resolve(null),
      can('invoice.read') ? adminApi.taxRules() : Promise.resolve([]),
      can('room.read') ? inventoryApi.rooms() : Promise.resolve([]),
      can('config.manage') ? readSettings() : Promise.resolve(SETTING_FALLBACKS),
    ]);
    return { property, taxRules, rooms, stored };
  }, [can]);

  const resource = useApiResource(loadSettings);
  const property = resource.data?.property ?? null;
  const stored = resource.data?.stored ?? SETTING_FALLBACKS;
  const currencyCode = property?.currencyCode ?? 'INR';

  const [activeTab, setActiveTab] = useState<SettingsTab>(
    initialTab === 'rooms-rates' ? 'room-settings' : initialTab
  );
  const [saving, setSaving] = useState(false);

  // Basic information
  const [propertyName, setPropertyName] = useState('');
  const [propertyCode, setPropertyCode] = useState('');
  const [propertyType, setPropertyType] = useState('');
  const [starRating, setStarRating] = useState('');
  const [addressLine1, setAddressLine1] = useState('');
  const [addressLine2, setAddressLine2] = useState('');
  const [city, setCity] = useState('');
  const [stateProvince, setStateProvince] = useState('');
  const [country, setCountry] = useState('');
  const [postalCode, setPostalCode] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [website, setWebsite] = useState('');

  // Contact information
  const [frontDeskPhone, setFrontDeskPhone] = useState('');
  const [reservationsEmail, setReservationsEmail] = useState('');
  const [generalEmail, setGeneralEmail] = useState('');
  const [emergencyPhone, setEmergencyPhone] = useState('');

  // Operational settings
  const [timeZone, setTimeZone] = useState('');
  const [dateFormat, setDateFormat] = useState('DD/MM/YYYY');
  const [checkInTime, setCheckInTime] = useState('');
  const [checkOutTime, setCheckOutTime] = useState('');
  const [currency, setCurrency] = useState('');
  const [floors, setFloors] = useState('');
  const [totalRooms, setTotalRooms] = useState('');

  // Property description
  const [description, setDescription] = useState('');

  // Amenities & facilities
  const [amenities, setAmenities] = useState<AmenityItem[]>([]);

  // Policies and invoice details
  const [cancellationPolicy, setCancellationPolicy] = useState('');
  const [noShowPolicy, setNoShowPolicy] = useState('');
  const [childPolicy, setChildPolicy] = useState('');
  const [invoicePrefix, setInvoicePrefix] = useState('');
  const [gstin, setGstin] = useState('');

  // Fill the form from what the backend holds, once, when it first arrives
  const [hasInitialized, setHasInitialized] = useState(false);
  if (resource.data && !hasInitialized) {
    setHasInitialized(true);
    const rooms = resource.data.rooms;
    if (property) {
      setPropertyName(property.name);
      setPropertyCode(property.code);
      setAddressLine1(property.addressLine1 ?? '');
      setCity(property.city ?? '');
      setStateProvince(property.state ?? '');
      setPostalCode(property.postalCode ?? '');
      setCountry(property.countryCode ?? '');
      setCurrency(property.currencyCode);
      setTimeZone(zoneLabelOf(property.timezone));
      setCheckInTime(property.checkInTime ? clockDisplay(property.checkInTime) : '');
      setCheckOutTime(property.checkOutTime ? clockDisplay(property.checkOutTime) : '');
    }
    setAddressLine2(String(stored['address.line2'] ?? ''));
    setPhone(String(stored['contact.phone'] ?? ''));
    setEmail(String(stored['contact.email'] ?? ''));
    setWebsite(String(stored['contact.website'] ?? ''));
    setPropertyType(String(stored['property.type'] ?? ''));
    setStarRating(String(stored['property.starRating'] ?? ''));
    setFrontDeskPhone(String(stored['contact.frontDeskPhone'] ?? ''));
    setReservationsEmail(String(stored['contact.reservationsEmail'] ?? ''));
    setGeneralEmail(String(stored['contact.generalEmail'] ?? ''));
    setEmergencyPhone(String(stored['contact.emergencyPhone'] ?? ''));
    setDateFormat(String(stored['ops.dateFormat'] ?? 'DD/MM/YYYY'));
    setDescription(String(stored['property.description'] ?? ''));
    setAmenities(Array.isArray(stored['property.amenities']) ? (stored['property.amenities'] as AmenityItem[]) : []);
    setCancellationPolicy(String(stored['policy.cancellation'] ?? ''));
    setNoShowPolicy(String(stored['policy.noShow'] ?? ''));
    setChildPolicy(String(stored['policy.child'] ?? ''));
    setInvoicePrefix(String(stored['invoice.prefix'] ?? 'INV-'));
    setGstin(property?.gstin ?? '');
    setTotalRooms(String(rooms.length));
    setFloors(String(new Set(rooms.map((room) => room.floor)).size));
  }

  // Active Tax rule
  const activeTax = resource.data?.taxRules.find((rule) => rule.isActive);
  const [taxRate, setTaxRate] = useState<number>(Number(activeTax?.ratePercent ?? 0));

  /** Runs one save, with the same success and failure messages for every section. */
  const runSave = async (what: string, save: () => Promise<unknown>) => {
    setSaving(true);
    try {
      await save();
      resource.refresh();
      toast(`${what} saved successfully`, { tone: 'success' });
    } catch (err) {
      toast(`Could not save ${what.toLowerCase()}`, { detail: displayApiError(err), tone: 'danger' });
    } finally {
      setSaving(false);
    }
  };

  const handleSaveBasic = () =>
    runSave('Basic information', async () => {
      await propertyApi.update({ name: propertyName, addressLine1, city, state: stateProvince, postalCode });
      await saveSettings({
        'address.line2': addressLine2,
        'contact.phone': phone,
        'contact.email': email,
        'contact.website': website,
        'property.type': propertyType,
        'property.starRating': starRating,
      });
    });

  const handleSaveContact = () =>
    runSave('Contact information', () =>
      saveSettings({
        'contact.frontDeskPhone': frontDeskPhone,
        'contact.reservationsEmail': reservationsEmail,
        'contact.generalEmail': generalEmail,
        'contact.emergencyPhone': emergencyPhone,
      }),
    );

  const handleSaveOperations = () => {
    const checkIn = clockTo24(checkInTime);
    const checkOut = clockTo24(checkOutTime);
    if (!checkIn || !checkOut) {
      toast('Enter the times as 02:00 PM or 14:00', { tone: 'warning' });
      return;
    }
    return runSave('Operational settings', async () => {
      await propertyApi.update({
        currencyCode: currency.split(' ')[0] ?? 'INR',
        timezone: zoneOf(timeZone),
        checkInTime: checkIn,
        checkOutTime: checkOut,
      });
      await saveSettings({ 'ops.dateFormat': dateFormat });
    });
  };

  const handleSaveDescription = () =>
    runSave('Property description', () => saveSettings({ 'property.description': description }));

  const handleSaveAmenities = () =>
    runSave('Amenities & facilities', () => saveSettings({ 'property.amenities': amenities }));

  const handleSavePolicies = () =>
    runSave('Policies', () =>
      saveSettings({
        'policy.cancellation': cancellationPolicy,
        'policy.noShow': noShowPolicy,
        'policy.child': childPolicy,
      }),
    );

  const handleSaveInvoiceDetails = () =>
    runSave('Invoice details', async () => {
      await propertyApi.update({ gstin });
      await saveSettings({ 'invoice.prefix': invoicePrefix });
    });


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
                  <Button variant="primary"
                    type="button"
                    onClick={() => void handleSaveBasic()}
                    disabled={saving}
                    className="flex items-center gap-1.5 cursor-pointer transition-all disabled:opacity-50"
                  >
                    Save Changes
                  </Button>
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

                  {/* Star Rating */}
                  <div className="sm:col-span-2 lg:col-span-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-label font-medium text-ink mb-1.5">
                          Star Rating
                        </label>
                        <div
                          className="flex items-center justify-between rounded-md border px-3.5 py-2"
                          style={{ borderColor: 'var(--color-border)', background: 'var(--color-surface)' }}
                        >
                          <div className="flex items-center gap-1 text-warning-text">
                            {[1, 2, 3, 4, 5].map((star) => (
                              <IconButton variant="plain"
                                key={star}
                                type="button"
                                onClick={() => setStarRating(String(star))}
                                className="focus:outline-none transition-transform hover:scale-110"
                              >
                                <Lucide.Star
                                  size={18}
                                  className={star <= Number(starRating) ? 'fill-warning-text text-warning-text' : 'text-ink-muted/30'}
                                />
                              </IconButton>
                            ))}
                          </div>
                          <span className="text-label font-medium text-ink-secondary">
                            {starRating} Star Luxury
                          </span>
                        </div>
                      </div>

                      <div>
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
                    </div>
                  </div>

                  {/* Address Line 2 */}
                  <div className="sm:col-span-2 lg:col-span-4">
                    <label className="block text-label font-medium text-ink mb-1.5">
                      Address Line 2
                    </label>
                    <TextField
                      type="text"
                      value={addressLine2}
                      onChange={(e) => setAddressLine2(e.target.value)}
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
                  <Button variant="primary"
                    type="button"
                    onClick={handleSaveContact}
                    className="flex items-center gap-1.5 cursor-pointer transition-all"
                  >
                    Save Changes
                  </Button>
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
                  <Button variant="primary"
                    type="button"
                    onClick={() => void handleSaveOperations()}
                    disabled={saving}
                    className="flex items-center gap-1.5 cursor-pointer transition-all disabled:opacity-50"
                  >
                    Save Changes
                  </Button>
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
                      <option>INR - Indian Rupee (₹)</option>
                      <option>USD - US Dollar ($)</option>
                      <option>EUR - Euro (€)</option>
                      <option>GBP - British Pound (£)</option>
                      <option>AED - UAE Dirham (AED)</option>
                    </SelectField>
                  </div>

                  <div>
                    <label className="block text-label font-medium text-ink mb-1.5">Number of Floors</label>
                    <TextField
                      type="number"
                      value={floors}
                      readOnly
                      className="w-full focus:outline-none focus:ring-2"
                      style={{ borderColor: 'var(--color-border)', background: 'var(--color-surface)' }}
                    />
                  </div>

                  <div>
                    <label className="block text-label font-medium text-ink mb-1.5">Total Rooms</label>
                    <TextField
                      type="number"
                      value={totalRooms}
                      readOnly
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
                  <Button variant="primary"
                    type="button"
                    onClick={handleSaveDescription}
                  >
                    Save Changes
                  </Button>
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
                  <Button variant="primary"
                    type="button"
                    onClick={handleSaveAmenities}
                  >
                    Save Changes
                  </Button>
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
                  value={cancellationPolicy}
                  onChange={(e) => setCancellationPolicy(e.target.value)}
                  className="w-full"
                  style={{ borderColor: 'var(--color-border)' }}
                />
              </div>
              <div>
                <label className="block text-label font-medium text-ink mb-1.5">No-show Policy</label>
                <TextField
                  value={noShowPolicy}
                  onChange={(e) => setNoShowPolicy(e.target.value)}
                  className="w-full"
                  style={{ borderColor: 'var(--color-border)' }}
                />
              </div>
              <div>
                <label className="block text-label font-medium text-ink mb-1.5">Child & Extra Bed Policy</label>
                <TextField
                  value={childPolicy}
                  onChange={(e) => setChildPolicy(e.target.value)}
                  className="w-full"
                  style={{ borderColor: 'var(--color-border)' }}
                />
              </div>
              <Button variant="primary"
                type="button"
                onClick={handleSavePolicies}
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
                disabled={saving || !can('config.manage')}
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
                <TextField value={invoicePrefix} onChange={(e) => setInvoicePrefix(e.target.value)} className="w-full font-mono" style={{ borderColor: 'var(--color-border)' }} />
              </div>
              <div>
                <label className="block text-label font-medium text-ink mb-1.5">Tax Registration / GSTIN</label>
                <TextField value={gstin} onChange={(e) => setGstin(e.target.value)} className="w-full font-mono" style={{ borderColor: 'var(--color-border)' }} />
              </div>
              <Button variant="primary"
                type="button"
                onClick={handleSaveInvoiceDetails}
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
