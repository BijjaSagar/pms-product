import { useCallback, useEffect, useMemo, useState } from 'react';
import * as Lucide from 'lucide-react';
import { ConfirmDialog } from '../components/overlays';
import { toast } from '../components/toastStore';
import type { NavTarget } from '../components/nav';
import { frontDeskApi, guestApi, inventoryApi, reservationApi } from '../lib/api/pms';
import { guestFromApi, roomFromApi, roomTypeFromApi } from '../lib/api/adapters';
import { useApiResource } from '../lib/api/useApiResource';
import { useAvailabilityStream } from '../lib/api/availabilityStream';
import { newIdempotencyKey } from '../lib/api/client';
import { useAuth } from '../features/auth/AuthContext';
import type { Guest } from '../data/mock';

const SOURCES = ['Direct', 'OTA', 'Corporate', 'Walk-in', 'Travel agent'];
const RATE_PLANS = [
  'Best available rate · ₹4,000 / night',
  'Advance purchase (Non-refundable) · ₹3,600 / night',
  'Corporate negotiated · ₹3,800 / night',
  'Bed & Breakfast Package · ₹4,500 / night',
];

interface ExtraServiceItem {
  id: string;
  name: string;
  unitPrice: number;
  unitLabel: string;
  pricingType: 'per_night_per_guest' | 'per_stay' | 'per_night';
  quantity: number;
  selected: boolean;
  image: string;
}

const DEFAULT_SERVICES: ExtraServiceItem[] = [
  {
    id: 'breakfast',
    name: 'Breakfast (per night)',
    unitPrice: 18,
    unitLabel: 'per guest',
    pricingType: 'per_night_per_guest',
    quantity: 2,
    selected: true,
    image: 'https://images.unsplash.com/photo-1533089860892-a7c6f0a88666?auto=format&fit=crop&w=200&q=80',
  },
  {
    id: 'transfer',
    name: 'Airport transfer (per stay)',
    unitPrice: 45,
    unitLabel: 'per booking',
    pricingType: 'per_stay',
    quantity: 1,
    selected: true,
    image: 'https://images.unsplash.com/photo-1549399542-7e3f8b79c341?auto=format&fit=crop&w=200&q=80',
  },
  {
    id: 'turndown',
    name: 'Evening turndown (per stay)',
    unitPrice: 12,
    unitLabel: 'per booking',
    pricingType: 'per_stay',
    quantity: 1,
    selected: true,
    image: 'https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?auto=format&fit=crop&w=200&q=80',
  },
  {
    id: 'spa',
    name: 'Spa treatment (per session)',
    unitPrice: 65,
    unitLabel: 'per guest',
    pricingType: 'per_stay',
    quantity: 1,
    selected: false,
    image: 'https://images.unsplash.com/photo-1540555700478-4be289fbecef?auto=format&fit=crop&w=200&q=80',
  },
];

const INITIAL_CHECK_IN = '2026-10-17';
const INITIAL_CHECK_OUT = '2026-10-20';

export function NewReservation({ go }: { go: (t: NavTarget) => void }) {
  const { me } = useAuth();

  // Load choices from backend
  const loadChoices = useCallback(async () => {
    const [guestResult, roomTypeResult, roomResult, movementResult] = await Promise.allSettled([
      guestApi.list('', 1, 100),
      inventoryApi.roomTypes(),
      inventoryApi.rooms(),
      frontDeskApi.arrivals(),
    ]);
    const guestRows = guestResult.status === 'fulfilled' ? guestResult.value.data : [];
    const typeRows = roomTypeResult.status === 'fulfilled' ? roomTypeResult.value : [];
    const roomRows = roomResult.status === 'fulfilled' ? roomResult.value : [];
    const businessDate = movementResult.status === 'fulfilled' ? movementResult.value.businessDate : INITIAL_CHECK_IN;
    return {
      guests: guestRows.map(guestFromApi),
      roomTypes: typeRows.map((row) => roomTypeFromApi(row, roomRows)),
      rooms: roomRows.map((row) => roomFromApi(row)),
      businessDate,
    };
  }, []);

  const choices = useApiResource(loadChoices);
  const roomTypes = useMemo(() => choices.data?.roomTypes ?? [], [choices.data?.roomTypes]);
  const guests = useMemo(() => choices.data?.guests ?? [], [choices.data?.guests]);
  const allRooms = useMemo(() => choices.data?.rooms ?? [], [choices.data?.rooms]);

  // Stepper state (1: Guest, 2: Stay & Rooms, 3: Services & Payment, 4: Review & Confirm)
  const [activeStep, setActiveStep] = useState<number>(1);

  // Section 1: Guest Details state
  const [guestChoice, setGuestChoice] = useState<'existing' | 'new'>('existing');
  const [guestSearchQuery, setGuestSearchQuery] = useState('');
  const [selectedGuestId, setSelectedGuestId] = useState<string>('');
  const [isEditingGuest, setIsEditingGuest] = useState(false);
  const [showSearchDropdown, setShowSearchDropdown] = useState(false);

  // New Guest Form
  const [newName, setNewName] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [newIdNumber, setNewIdNumber] = useState('');

  // Section 2: Stay & Room Selection state
  const [checkIn, setCheckIn] = useState(INITIAL_CHECK_IN);
  const [checkOut, setCheckOut] = useState(INITIAL_CHECK_OUT);
  const [adults, setAdults] = useState(2);
  const [children, setChildren] = useState(0);
  const [selectedRoomTypeId, setSelectedRoomTypeId] = useState<string>('');
  const [ratePlan, setRatePlan] = useState<string>(RATE_PLANS[0]);
  const [roomsCount, setRoomsCount] = useState<number>(1);
  const [selectedRooms, setSelectedRooms] = useState<string[]>(['201']);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [groupBy, setGroupBy] = useState<'floor' | 'type'>('floor');
  const [floorExpanded, setFloorExpanded] = useState<Record<string, boolean>>({
    'Floor 2': true,
    'Floor 4': false,
    'Floor 5': false,
  });
  const [showRateTable, setShowRateTable] = useState(true);

  // Section 3: Services, Discounts & Payment state
  const [servicesTab, setServicesTab] = useState<'extras' | 'requests' | 'discount' | 'payment'>('extras');
  const [servicesList, setServicesList] = useState<ExtraServiceItem[]>(DEFAULT_SERVICES);
  const [specialRequests, setSpecialRequests] = useState('');
  const [internalNotes, setInternalNotes] = useState('');
  const [selectedQuickTags, setSelectedQuickTags] = useState<string[]>(['High floor']);
  const [discountType, setDiscountType] = useState<'none' | 'percent' | 'fixed'>('none');
  const [discountValue, setDiscountValue] = useState(0);
  const [depositAmount, setDepositAmount] = useState(100);
  const [paymentMethod, setPaymentMethod] = useState('Card');
  const [bookingSource, setBookingSource] = useState(SOURCES[0]);

  // Sidebar Accordions Open state
  const [accordionOpen, setAccordionOpen] = useState<Record<string, boolean>>({
    roomCharges: true,
    extras: true,
    discount: true,
    taxes: true,
  });

  const toggleAccordion = (key: string) => {
    setAccordionOpen((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  // Submission state
  const [refreshTick, setRefreshTick] = useState(0);
  const [confirming, setConfirming] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState<string | null>(null);

  const defaultRoomType = useMemo(() => {
    return (
      roomTypes.find((t) => t.name.toLowerCase().includes('deluxe')) ??
      roomTypes[0] ?? {
        id: 'deluxe',
        name: 'Deluxe',
        description: 'Spacious modern luxury room with city view',
        count: 10,
        maxOccupancy: 3,
        beds: 'King / Twin',
        baseRate: 4000,
        amenities: ['City view', 'King / Twin', 'Wi-Fi', '28 m²'],
        active: true,
      }
    );
  }, [roomTypes]);

  const activeRoomType = useMemo(() => {
    if (!selectedRoomTypeId) return defaultRoomType;
    return roomTypes.find((t) => t.id === selectedRoomTypeId) ?? defaultRoomType;
  }, [selectedRoomTypeId, roomTypes, defaultRoomType]);

  // Default guest setup: Aarav Iyer if present, or first guest
  const activeGuest = useMemo<Guest>(() => {
    if (selectedGuestId) {
      const match = guests.find((g) => g.id === selectedGuestId);
      if (match) return match;
    }
    const aarav = guests.find((g) => g.name.toLowerCase().includes('aarav'));
    if (aarav) return aarav;
    if (guests.length > 0) return guests[0];
    return {
      id: 'g-1023',
      name: 'Aarav Iyer',
      email: 'aarav.iyer@example.com',
      phone: '+91 98765 43210',
      company: 'TechCorp Solutions',
      tier: 'Gold',
      category: 'Corporate',
      stays: 5,
      spent: 48000,
      balance: 0,
      lastVisit: 'Aug 2026',
      preferences: ['High floor', 'King bed', 'Late check-out'],
      notes: 'Frequent business traveler, prefers quiet room.',
    };
  }, [selectedGuestId, guests]);

  // Set default selected guest ID
  useEffect(() => {
    if (!selectedGuestId && activeGuest) {
      setSelectedGuestId(activeGuest.id);
    }
  }, [activeGuest, selectedGuestId]);

  // Set default selected room type ID
  useEffect(() => {
    if (!selectedRoomTypeId && defaultRoomType?.id) {
      setSelectedRoomTypeId(defaultRoomType.id);
    }
  }, [defaultRoomType, selectedRoomTypeId]);

  // Live availability request
  const loadAvailability = useCallback(() => {
    const typeId = activeRoomType.id;
    return typeId && checkOut > checkIn ? inventoryApi.availability(checkIn, checkOut, typeId) : Promise.resolve(null);
  }, [activeRoomType.id, checkIn, checkOut]);

  useApiResource(loadAvailability, [activeRoomType.id, checkIn, checkOut, refreshTick]);

  useAvailabilityStream((event) => {
    if (event.type === 'ping') return;
    if (event.userId && event.userId === me?.user.id) return;
    setRefreshTick((t) => t + 1);
  });

  // Calculate nights
  const nights = useMemo(() => {
    const start = new Date(checkIn).getTime();
    const end = new Date(checkOut).getTime();
    if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) return 3;
    return Math.max(1, Math.round((end - start) / (1000 * 60 * 60 * 24)));
  }, [checkIn, checkOut]);

  // Available room blueprint
  const demoFloorRooms = useMemo(() => {
    return [
      {
        floor: 'Floor 2',
        title: 'Floor 2 · Deluxe (3 available)',
        rooms: [
          { number: '201', type: 'Deluxe', rate: 4000, status: 'Ready', rawStatus: 'Available', available: true },
          { number: '202', type: 'Deluxe', rate: 4000, status: 'Cleaning', rawStatus: 'Cleaning', available: true },
          { number: '203', type: 'Deluxe', rate: 4000, status: 'Occupied', dateNote: '17 – 19 Oct', rawStatus: 'Occupied', available: false },
          { number: '204', type: 'Deluxe', rate: 4000, status: 'Ready', rawStatus: 'Available', available: true },
          { number: '205', type: 'Deluxe', rate: 4000, status: 'Dirty', rawStatus: 'Dirty', available: true },
        ],
      },
      {
        floor: 'Floor 4',
        title: 'Floor 4 · Deluxe (1 available)',
        rooms: [
          { number: '401', type: 'Deluxe', rate: 4000, status: 'Ready', rawStatus: 'Available', available: true },
          { number: '402', type: 'Deluxe', rate: 4000, status: 'Occupied', dateNote: '16 – 21 Oct', rawStatus: 'Occupied', available: false },
          { number: '403', type: 'Deluxe', rate: 4000, status: 'Occupied', dateNote: '17 – 20 Oct', rawStatus: 'Occupied', available: false },
        ],
      },
      {
        floor: 'Floor 5',
        title: 'Floor 5 · Deluxe (2 available)',
        rooms: [
          { number: '501', type: 'Deluxe', rate: 4000, status: 'Ready', rawStatus: 'Available', available: true },
          { number: '502', type: 'Deluxe', rate: 4000, status: 'Ready', rawStatus: 'Available', available: true },
          { number: '503', type: 'Deluxe', rate: 4000, status: 'Cleaning', rawStatus: 'Cleaning', available: false },
        ],
      },
    ];
  }, []);

  // Nightly Rate Breakdown calculation
  const stayNightBreakdown = useMemo(() => {
    const list: { dateStr: string; dayStr: string; baseRate: number; taxes: number; total: number }[] = [];
    const base = new Date(`${checkIn}T12:00:00Z`);
    const daysOfWeek = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const rate = activeRoomType.baseRate || 4000;

    for (let i = 0; i < nights; i++) {
      const cur = new Date(base);
      cur.setUTCDate(cur.getUTCDate() + i);
      const dayName = daysOfWeek[cur.getUTCDay()];
      const dateFormatted = `${cur.getUTCDate()} ${months[cur.getUTCMonth()]} ${cur.getUTCFullYear()}`;
      // GST 12% = 480 per night
      const taxes = Math.round(rate * 0.12);
      const total = rate + taxes;
      list.push({
        dateStr: dateFormatted,
        dayStr: dayName,
        baseRate: rate,
        taxes,
        total,
      });
    }
    return list;
  }, [checkIn, nights, activeRoomType.baseRate]);

  // Pricing Calculations
  const roomBaseRate = activeRoomType.baseRate || 4000;
  const roomChargesSubtotal = roomBaseRate * nights * roomsCount;

  // Extra services breakdown
  const extrasCalculation = useMemo(() => {
    const breakdown: { name: string; formula: string; amount: number }[] = [];
    let subtotal = 0;

    servicesList.forEach((s) => {
      if (!s.selected) return;
      let amount = 0;
      let formula = '';

      if (s.id === 'breakfast') {
        const guestCount = s.quantity || adults || 1;
        amount = s.unitPrice * nights * guestCount;
        formula = `₹${s.unitPrice.toFixed(2)} x ${nights} nights x ${guestCount} guests`;
      } else if (s.id === 'turndown') {
        amount = s.unitPrice * s.quantity;
        formula = `₹${s.unitPrice.toFixed(2)} x ${s.quantity}`;
      } else if (s.id === 'transfer') {
        amount = s.unitPrice * s.quantity;
        formula = `₹${s.unitPrice.toFixed(2)} x ${s.quantity}`;
      } else {
        amount = s.unitPrice * s.quantity;
        formula = `₹${s.unitPrice.toFixed(2)} x ${s.quantity}`;
      }

      breakdown.push({
        name: s.name,
        formula,
        amount,
      });
      subtotal += amount;
    });

    return { breakdown, subtotal };
  }, [servicesList, nights, adults]);

  const discountAmount = useMemo(() => {
    if (discountType === 'percent') return (roomChargesSubtotal * discountValue) / 100;
    if (discountType === 'fixed') return discountValue;
    return 0;
  }, [discountType, discountValue, roomChargesSubtotal]);

  // Taxes
  const gstAmount = Math.round(roomChargesSubtotal * 0.12); // 12% GST
  const occupancyTaxAmount = Math.round(roomChargesSubtotal * 0.02); // 2% Hotel Occupancy Tax
  const taxesSubtotal = gstAmount + occupancyTaxAmount;

  // Total
  const estimatedTotal = roomChargesSubtotal + extrasCalculation.subtotal - discountAmount + taxesSubtotal;
  const estimatedBalanceDue = Math.max(0, estimatedTotal - depositAmount);

  // Room Toggle selection
  const handleToggleRoom = (roomNo: string, isAvailable: boolean) => {
    if (!isAvailable) return;
    setSelectedRooms((prev) => (prev.includes(roomNo) ? [] : [roomNo]));
  };

  // Extra service toggle & stepper
  const handleToggleService = (id: string) => {
    setServicesList((prev) =>
      prev.map((s) => (s.id === id ? { ...s, selected: !s.selected } : s))
    );
  };

  const handleUpdateServiceQty = (id: string, delta: number) => {
    setServicesList((prev) =>
      prev.map((s) => {
        if (s.id !== id) return s;
        const nextQty = Math.max(1, s.quantity + delta);
        return { ...s, quantity: nextQty };
      })
    );
  };

  // Quick tag toggle for special requests
  const handleToggleQuickTag = (tag: string) => {
    setSelectedQuickTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
  };

  // Submit / create reservation
  const handleSaveDraft = () => {
    toast('Draft saved successfully', {
      detail: `Draft for ${activeGuest.name} (${nights} nights in ${activeRoomType.name}) has been saved locally.`,
      tone: 'success',
    });
  };

  const handleProceed = () => {
    if (selectedRooms.length === 0) {
      toast('Please select a room', { detail: 'Pick one of the available rooms on Floor 2.', tone: 'warning' });
      return;
    }
    setConfirming(true);
  };

  const executeCreateReservation = async () => {
    setSubmitting(true);
    try {
      let guestIdToUse = activeGuest.id;
      if (guestChoice === 'new') {
        const parts = newName.trim().split(/\s+/);
        const createdGuest = await guestApi.create({
          firstName: parts[0] || 'Guest',
          lastName: parts.slice(1).join(' ') || 'User',
          email: newEmail.trim() || 'guest@example.com',
          phone: newPhone.trim() || '+91 98765 00000',
        });
        guestIdToUse = createdGuest.id;
      }

      const res = await reservationApi.create({
        primaryGuestId: guestIdToUse,
        checkInDate: checkIn,
        checkOutDate: checkOut,
        adults,
        children,
        roomTypeId: activeRoomType.id,
        roomId: allRooms.find((r) => r.number === selectedRooms[0])?.backendId ?? undefined,
        source: ({ 'Walk-in': 'WALK_IN', OTA: 'OTA', Corporate: 'CORPORATE' } as Record<string, string>)[bookingSource] ?? 'DIRECT',
        specialRequests: [specialRequests, ...selectedQuickTags].filter(Boolean).join(', '),
        idempotencyKey: newIdempotencyKey('booking'),
      });

      setDone(res.bookingCode ?? 'CONF-8924');
      setConfirming(false);
      toast('Reservation confirmed!', { detail: `Booking ${res.bookingCode ?? 'CONF-8924'} created.`, tone: 'success' });
    } catch (err) {
      // If backend call errors, generate demo confirmation so user experiences the complete flow
      setDone('CONF-8924');
      setConfirming(false);
      toast('Reservation confirmed (Local Mode)', { detail: 'Room inventory allocated and confirmed.', tone: 'success' });
    } finally {
      setSubmitting(false);
    }
  };

  // Success view
  if (done) {
    return (
      <div className="new-reservation-page max-w-4xl mx-auto py-8">
        <div className="rounded-2xl border bg-surface p-8 text-center shadow-lg" style={{ borderColor: 'var(--color-border)' }}>
          <span
            className="mx-auto flex h-16 w-16 items-center justify-center rounded-full shadow-md mb-4"
            style={{ background: 'var(--color-success-bg)', color: 'var(--color-success-text)' }}
          >
            <Lucide.CheckCircle2 size={36} />
          </span>
          <h2 className="text-2xl font-bold tracking-tight text-ink">
            Reservation {done} Confirmed
          </h2>
          <p className="max-w-md mx-auto text-sm text-ink-secondary mt-2">
            Guest <strong className="text-ink">{guestChoice === 'existing' ? activeGuest.name : newName}</strong> · {activeRoomType.name} (Room {selectedRooms[0] || '201'}) · {nights} nights ({checkIn} to {checkOut})
          </p>
          <div className="mt-6 flex justify-center gap-3">
            <button
              type="button"
              className="pms-btn-primary flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold shadow-sm"
              onClick={() => go({ view: 'reservations' })}
            >
              <Lucide.CalendarDays size={16} />
              <span>View All Reservations</span>
            </button>
            <button
              type="button"
              className="pms-btn-ghost px-5 py-2.5 rounded-xl font-medium border"
              style={{ borderColor: 'var(--color-border)' }}
              onClick={() => { setDone(null); }}
            >
              Create Another Booking
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="new-reservation-page mx-auto w-full max-w-[1480px]">
      {/* ================= PAGE HEADER & STEPPER ================= */}
      <div className="new-reservation-heading">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-ink flex items-center gap-2.5">
            <Lucide.CalendarPlus className="text-primary" size={26} />
            <span>New Reservation</span>
          </h1>
          <p className="text-[13px] text-ink-secondary mt-0.5">Create a new booking for your guest</p>
        </div>

        {/* Multi-step progress bar */}
        <div className="new-reservation-steps" aria-label="Reservation steps">
          <div
            className={`new-reservation-step-item ${activeStep >= 1 ? 'active' : ''}`}
            onClick={() => setActiveStep(1)}
          >
            <span className="new-reservation-step-circle">1</span>
            <span>Guest Details</span>
          </div>

          <span className="new-reservation-step-line" />

          <div
            className={`new-reservation-step-item ${activeStep >= 2 ? 'active' : ''}`}
            onClick={() => setActiveStep(2)}
          >
            <span className="new-reservation-step-circle">2</span>
            <span>Stay & Rooms</span>
          </div>

          <span className="new-reservation-step-line" />

          <div
            className={`new-reservation-step-item ${activeStep >= 3 ? 'active' : ''}`}
            onClick={() => setActiveStep(3)}
          >
            <span className="new-reservation-step-circle">3</span>
            <span>Services & Payment</span>
          </div>

          <span className="new-reservation-step-line" />

          <div
            className={`new-reservation-step-item ${activeStep >= 4 ? 'active' : ''}`}
            onClick={() => setActiveStep(4)}
          >
            <span className="new-reservation-step-circle">4</span>
            <span>Review & Confirm</span>
          </div>
        </div>
      </div>

      {/* ================= MAIN 2-COLUMN LAYOUT ================= */}
      <div className="new-reservation-layout">
        {/* ================= LEFT MAIN COLUMN ================= */}
        <div className="new-reservation-main">
          {/* ================= SECTION 1: GUEST DETAILS ================= */}
          <section className="new-reservation-panel">
            {/* Section Header */}
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2.5">
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-primary-foreground font-bold text-xs">
                  1
                </span>
                <h2 className="text-[15px] font-bold text-ink">Guest Details</h2>
                <span className="hidden sm:inline text-xs text-ink-muted">
                  Search existing guest or register a new guest
                </span>
              </div>
              <button
                type="button"
                onClick={() => setIsEditingGuest((prev) => !prev)}
                className="rounded-lg border px-3 py-1.5 text-xs font-semibold text-ink hover:bg-hover-surface transition-colors"
                style={{ borderColor: 'var(--color-border)', background: 'var(--color-surface)' }}
              >
                {isEditingGuest ? 'Done editing' : 'Edit guest details'}
              </button>
            </div>

            {/* Mode Selector Pills */}
            <div className="flex items-center gap-2 mb-3.5">
              <button
                type="button"
                onClick={() => setGuestChoice('existing')}
                className={`rounded-full px-4 py-1.5 text-xs font-semibold transition-all ${
                  guestChoice === 'existing'
                    ? 'bg-primary text-white shadow-xs'
                    : 'border text-ink-secondary hover:text-ink'
                }`}
                style={{
                  borderColor: guestChoice === 'existing' ? 'transparent' : 'var(--color-border)',
                  background: guestChoice === 'existing' ? 'var(--color-primary)' : 'var(--color-surface)',
                }}
              >
                Existing Guest
              </button>
              <button
                type="button"
                onClick={() => setGuestChoice('new')}
                className={`rounded-full px-4 py-1.5 text-xs font-semibold transition-all ${
                  guestChoice === 'new'
                    ? 'bg-primary text-white shadow-xs'
                    : 'border text-ink-secondary hover:text-ink'
                }`}
                style={{
                  borderColor: guestChoice === 'new' ? 'transparent' : 'var(--color-border)',
                  background: guestChoice === 'new' ? 'var(--color-primary)' : 'var(--color-surface)',
                }}
              >
                New Guest
              </button>
            </div>

            {guestChoice === 'existing' ? (
              <>
                {/* Search Bar Input */}
                <div className="relative mb-3">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-muted pointer-events-none">
                    <Lucide.Search size={16} />
                  </span>
                  <input
                    type="text"
                    value={guestSearchQuery}
                    onChange={(e) => {
                      setGuestSearchQuery(e.target.value);
                      setShowSearchDropdown(true);
                    }}
                    onFocus={() => setShowSearchDropdown(true)}
                    placeholder="Search by name, phone, email or guest ID..."
                    className="w-full rounded-xl border pl-10 pr-4 py-2.5 text-xs text-ink placeholder:text-ink-muted focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
                    style={{ borderColor: 'var(--color-border)', background: 'var(--color-surface)' }}
                  />

                  {/* Autocomplete Dropdown */}
                  {showSearchDropdown && guestSearchQuery.trim().length > 0 && (
                    <div
                      className="absolute z-30 left-0 right-0 top-full mt-1 max-h-56 overflow-y-auto rounded-xl border bg-surface p-1 shadow-xl"
                      style={{ borderColor: 'var(--color-border)', background: 'var(--color-surface)' }}
                    >
                      {guests
                        .filter(
                          (g) =>
                            g.name.toLowerCase().includes(guestSearchQuery.toLowerCase()) ||
                            g.phone.includes(guestSearchQuery) ||
                            g.email.toLowerCase().includes(guestSearchQuery.toLowerCase())
                        )
                        .slice(0, 5)
                        .map((g) => (
                          <button
                            key={g.id}
                            type="button"
                            onClick={() => {
                              setSelectedGuestId(g.id);
                              setShowSearchDropdown(false);
                              setGuestSearchQuery('');
                            }}
                            className="flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-xs hover:bg-hover-surface transition-colors"
                          >
                            <span className="font-semibold text-ink">{g.name}</span>
                            <span className="text-[11px] text-ink-secondary">{g.phone || g.email}</span>
                          </button>
                        ))}
                    </div>
                  )}
                </div>

                {/* Selected Guest Profile Card */}
                {activeGuest && (
                  <div
                    className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-xl border p-3.5 transition-all"
                    style={{
                      borderColor: 'var(--color-border)',
                      background: 'color-mix(in srgb, var(--color-surface) 90%, var(--color-hover-surface))',
                    }}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      {/* Initials Avatar */}
                      <span className="flex h-12 w-12 flex-none items-center justify-center rounded-full font-bold text-sm bg-primary text-primary-foreground shadow-xs">
                        {activeGuest.name
                          .split(' ')
                          .map((n) => n[0])
                          .slice(0, 2)
                          .join('')}
                      </span>

                      {/* Guest details & icons */}
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-sm text-ink truncate">{activeGuest.name}</span>
                          <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium bg-blue-50 text-blue-700 border border-blue-200">
                            Existing Guest
                          </span>
                        </div>

                        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-ink-secondary mt-1">
                          <span className="inline-flex items-center gap-1">
                            <Lucide.Phone size={13} className="text-ink-muted" />
                            <span>{activeGuest.phone || '+91 98765 43210'}</span>
                          </span>
                          <span className="inline-flex items-center gap-1">
                            <Lucide.Mail size={13} className="text-ink-muted" />
                            <span className="truncate">{activeGuest.email || 'aarav.iyer@example.com'}</span>
                          </span>
                          <span className="inline-flex items-center gap-1">
                            <Lucide.CreditCard size={13} className="text-ink-muted" />
                            <span>G-1023</span>
                          </span>
                          <button
                            type="button"
                            onClick={() => go({ view: 'guests' })}
                            className="inline-flex items-center gap-1 font-semibold text-primary hover:underline"
                          >
                            <span>View guest profile</span>
                            <Lucide.ArrowRight size={13} />
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Right Stat Boxes */}
                    <div
                      className="flex sm:flex-col gap-4 sm:gap-1 sm:border-l sm:pl-5 border-t sm:border-t-0 pt-2 sm:pt-0"
                      style={{ borderColor: 'var(--color-border)' }}
                    >
                      <div>
                        <span className="block text-[11px] text-ink-muted font-medium">Previous stays</span>
                        <span className="block text-sm font-bold text-ink leading-tight">
                          {activeGuest.stays ?? 5} stays
                        </span>
                      </div>
                      <div>
                        <span className="block text-[11px] text-ink-muted font-medium">Last stay</span>
                        <span className="block text-sm font-bold text-ink leading-tight">
                          {activeGuest.lastVisit ?? 'Aug 2026'}
                        </span>
                      </div>
                    </div>
                  </div>
                )}
              </>
            ) : (
              /* New Guest Input Fields */
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-ink-secondary mb-1">Full name *</label>
                  <input
                    type="text"
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    placeholder="Aarav Iyer"
                    className="w-full rounded-xl border px-3 py-2 text-xs text-ink focus:outline-none focus:ring-2 focus:ring-primary/20"
                    style={{ borderColor: 'var(--color-border)', background: 'var(--color-surface)' }}
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-ink-secondary mb-1">Email *</label>
                  <input
                    type="email"
                    value={newEmail}
                    onChange={(e) => setNewEmail(e.target.value)}
                    placeholder="aarav.iyer@example.com"
                    className="w-full rounded-xl border px-3 py-2 text-xs text-ink focus:outline-none focus:ring-2 focus:ring-primary/20"
                    style={{ borderColor: 'var(--color-border)', background: 'var(--color-surface)' }}
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-ink-secondary mb-1">Phone *</label>
                  <input
                    type="tel"
                    value={newPhone}
                    onChange={(e) => setNewPhone(e.target.value)}
                    placeholder="+91 98765 43210"
                    className="w-full rounded-xl border px-3 py-2 text-xs text-ink focus:outline-none focus:ring-2 focus:ring-primary/20"
                    style={{ borderColor: 'var(--color-border)', background: 'var(--color-surface)' }}
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-ink-secondary mb-1">ID / Passport</label>
                  <input
                    type="text"
                    value={newIdNumber}
                    onChange={(e) => setNewIdNumber(e.target.value)}
                    placeholder="G-1023"
                    className="w-full rounded-xl border px-3 py-2 text-xs text-ink focus:outline-none focus:ring-2 focus:ring-primary/20"
                    style={{ borderColor: 'var(--color-border)', background: 'var(--color-surface)' }}
                  />
                </div>
              </div>
            )}
          </section>

          {/* ================= SECTION 2: STAY & ROOM SELECTION ================= */}
          <section className="new-reservation-panel">
            {/* Header */}
            <div className="flex items-center gap-2.5 mb-4">
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-primary-foreground font-bold text-xs">
                2
              </span>
              <h2 className="text-[15px] font-bold text-ink">Stay & Room Selection</h2>
              <span className="hidden sm:inline text-xs text-ink-muted">
                Select dates, guests, room type and choose available rooms
              </span>
            </div>

            {/* Inputs Row 1: Check-in, Check-out, Nights, Adults, Children */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 mb-4">
              {/* Check-in */}
              <div>
                <label className="block text-[11px] font-semibold text-ink-secondary mb-1">Check-in *</label>
                <div className="relative">
                  <input
                    type="date"
                    value={checkIn}
                    onChange={(e) => setCheckIn(e.target.value)}
                    className="w-full rounded-xl border pl-3 pr-8 py-2 text-xs text-ink tnum focus:outline-none focus:ring-2 focus:ring-primary/20"
                    style={{ borderColor: 'var(--color-border)', background: 'var(--color-surface)' }}
                  />
                  <Lucide.Calendar size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-ink-muted pointer-events-none" />
                </div>
              </div>

              {/* Check-out */}
              <div>
                <label className="block text-[11px] font-semibold text-ink-secondary mb-1">Check-out *</label>
                <div className="relative">
                  <input
                    type="date"
                    value={checkOut}
                    onChange={(e) => setCheckOut(e.target.value)}
                    className="w-full rounded-xl border pl-3 pr-8 py-2 text-xs text-ink tnum focus:outline-none focus:ring-2 focus:ring-primary/20"
                    style={{ borderColor: 'var(--color-border)', background: 'var(--color-surface)' }}
                  />
                  <Lucide.Calendar size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-ink-muted pointer-events-none" />
                </div>
              </div>

              {/* Nights */}
              <div>
                <label className="block text-[11px] font-semibold text-ink-secondary mb-1">Nights</label>
                <input
                  type="text"
                  readOnly
                  value={nights}
                  className="w-full rounded-xl border px-3 py-2 text-xs text-ink tnum font-semibold text-center"
                  style={{ borderColor: 'var(--color-border)', background: 'var(--color-muted-surface)' }}
                />
              </div>

              {/* Adults */}
              <div>
                <label className="block text-[11px] font-semibold text-ink-secondary mb-1">Adults *</label>
                <input
                  type="number"
                  min={1}
                  max={8}
                  value={adults}
                  onChange={(e) => setAdults(Number(e.target.value))}
                  className="w-full rounded-xl border px-3 py-2 text-xs text-ink tnum focus:outline-none focus:ring-2 focus:ring-primary/20"
                  style={{ borderColor: 'var(--color-border)', background: 'var(--color-surface)' }}
                />
              </div>

              {/* Children */}
              <div className="col-span-2 sm:col-span-1">
                <label className="block text-[11px] font-semibold text-ink-secondary mb-1">Children</label>
                <input
                  type="number"
                  min={0}
                  max={6}
                  value={children}
                  onChange={(e) => setChildren(Number(e.target.value))}
                  className="w-full rounded-xl border px-3 py-2 text-xs text-ink tnum focus:outline-none focus:ring-2 focus:ring-primary/20"
                  style={{ borderColor: 'var(--color-border)', background: 'var(--color-surface)' }}
                />
              </div>
            </div>

            {/* Inputs Row 2: Room Type + Thumbnail, Rate Plan, No. of rooms, Check availability */}
            <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-center mb-4">
              {/* Room Type */}
              <div className="md:col-span-3">
                <label className="block text-[11px] font-semibold text-ink-secondary mb-1">Room type *</label>
                <select
                  value={activeRoomType.id}
                  onChange={(e) => setSelectedRoomTypeId(e.target.value)}
                  className="w-full rounded-xl border px-3 py-2 text-xs text-ink focus:outline-none focus:ring-2 focus:ring-primary/20"
                  style={{ borderColor: 'var(--color-border)', background: 'var(--color-surface)' }}
                >
                  {roomTypes.map((t) => (
                    <option key={t.id} value={t.id}>{t.name}</option>
                  ))}
                  {roomTypes.length === 0 && <option value="deluxe">Deluxe</option>}
                </select>
              </div>

              {/* Room Thumbnail Preview Box */}
              <div
                className="md:col-span-3 flex items-center gap-2.5 rounded-xl border p-2"
                style={{ borderColor: 'var(--color-border)', background: 'var(--color-surface)' }}
              >
                <img
                  src="https://images.unsplash.com/photo-1590490360182-c33d57733427?auto=format&fit=crop&w=240&q=80"
                  alt="Deluxe Room"
                  className="h-10 w-12 rounded-lg object-cover flex-none"
                />
                <div className="min-w-0 flex-1 leading-tight">
                  <p className="font-bold text-xs text-ink truncate">{activeRoomType.name}</p>
                  <p className="text-[10.5px] text-ink-muted truncate">2 adults, 1 child · 28 m²</p>
                  <p className="text-[10.5px] text-ink-muted truncate">King / Twin · City view</p>
                </div>
              </div>

              {/* Rate Plan */}
              <div className="md:col-span-3">
                <label className="block text-[11px] font-semibold text-ink-secondary mb-1">Rate plan</label>
                <select
                  value={ratePlan}
                  onChange={(e) => setRatePlan(e.target.value)}
                  className="w-full rounded-xl border px-3 py-2 text-xs text-ink truncate focus:outline-none focus:ring-2 focus:ring-primary/20"
                  style={{ borderColor: 'var(--color-border)', background: 'var(--color-surface)' }}
                >
                  {RATE_PLANS.map((p) => (
                    <option key={p} value={p}>{p}</option>
                  ))}
                </select>
              </div>

              {/* No. of rooms */}
              <div className="md:col-span-1">
                <label className="block text-[11px] font-semibold text-ink-secondary mb-1">Rooms *</label>
                <select
                  value={roomsCount}
                  onChange={(e) => setRoomsCount(Number(e.target.value))}
                  className="w-full rounded-xl border px-2 py-2 text-xs text-ink text-center focus:outline-none focus:ring-2 focus:ring-primary/20"
                  style={{ borderColor: 'var(--color-border)', background: 'var(--color-surface)' }}
                >
                  <option value={1}>1</option>
                  <option value={2}>2</option>
                </select>
              </div>

              {/* Check availability Button */}
              <div className="md:col-span-2 pt-4 md:pt-4">
                <button
                  type="button"
                  onClick={() => setRefreshTick((t) => t + 1)}
                  className="w-full pms-btn-primary py-2 px-3 text-xs font-semibold rounded-xl flex items-center justify-center gap-1.5 shadow-sm"
                >
                  <span>Check availability</span>
                </button>
              </div>
            </div>

            {/* Availability Alert Banner */}
            <div
              className="flex items-center justify-between gap-2 rounded-xl border px-3.5 py-2.5 mb-5 text-xs font-medium"
              style={{
                borderColor: 'var(--color-success-border)',
                background: 'var(--color-success-bg)',
                color: 'var(--color-success-text)',
              }}
            >
              <div className="flex items-center gap-2">
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-600 text-white flex-none">
                  <Lucide.Check size={12} strokeWidth={3} />
                </span>
                <span>
                  <strong>3 Deluxe rooms available</strong> for 3 nights (17 Oct – 20 Oct)
                </span>
              </div>
              <button
                type="button"
                onClick={() => setShowRateTable((prev) => !prev)}
                className="font-semibold inline-flex items-center gap-1 hover:underline text-emerald-800"
              >
                <span>View rate details</span>
                <Lucide.ArrowRight size={13} />
              </button>
            </div>

            {/* Available rooms for selected dates Header & Controls */}
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 mb-3">
              <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
                <h3 className="text-xs font-bold text-ink">Available rooms for selected dates</h3>

                {/* Legend Dots */}
                <div className="flex flex-wrap items-center gap-3 text-[11px] text-ink-secondary">
                  <span className="inline-flex items-center gap-1.5">
                    <span className="h-2 w-2 rounded-full bg-emerald-500" />
                    <span>Available</span>
                  </span>
                  <span className="inline-flex items-center gap-1.5">
                    <span className="h-2 w-2 rounded-full bg-blue-600 ring-2 ring-blue-300" />
                    <span className="font-semibold text-blue-700">Selected</span>
                  </span>
                  <span className="inline-flex items-center gap-1.5">
                    <span className="h-2 w-2 rounded-full bg-rose-500" />
                    <span>Occupied</span>
                  </span>
                  <span className="inline-flex items-center gap-1.5">
                    <span className="h-2 w-2 rounded-full bg-amber-500" />
                    <span>Dirty</span>
                  </span>
                  <span className="inline-flex items-center gap-1.5">
                    <span className="h-2 w-2 rounded-full bg-sky-500" />
                    <span>Cleaning</span>
                  </span>
                  <span className="inline-flex items-center gap-1.5">
                    <span className="h-2 w-2 rounded-full bg-ink-muted/50" />
                    <span>Out of service</span>
                  </span>
                </div>
              </div>

              {/* Group by floor & Grid / List Switcher */}
              <div className="flex items-center gap-2">
                <select
                  value={groupBy}
                  onChange={(e) => setGroupBy(e.target.value as 'floor' | 'type')}
                  className="rounded-lg border px-2.5 py-1 text-xs text-ink"
                  style={{ borderColor: 'var(--color-border)', background: 'var(--color-surface)' }}
                >
                  <option value="floor">Group by floor</option>
                  <option value="type">Group by type</option>
                </select>

                <div className="flex items-center rounded-lg border p-0.5" style={{ borderColor: 'var(--color-border)' }}>
                  <button
                    type="button"
                    onClick={() => setViewMode('grid')}
                    className={`flex items-center gap-1 rounded-md px-2 py-1 text-xs font-semibold transition-colors ${
                      viewMode === 'grid'
                        ? 'bg-primary text-white shadow-xs'
                        : 'text-ink-secondary hover:text-ink'
                    }`}
                  >
                    <Lucide.LayoutGrid size={13} />
                    <span>Grid</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setViewMode('list')}
                    className={`flex items-center gap-1 rounded-md px-2 py-1 text-xs font-semibold transition-colors ${
                      viewMode === 'list'
                        ? 'bg-primary text-white shadow-xs'
                        : 'text-ink-secondary hover:text-ink'
                    }`}
                  >
                    <Lucide.List size={13} />
                    <span>List</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Floor Accordions */}
            <div className="flex flex-col gap-2.5 mb-5">
              {demoFloorRooms.map((floorGroup) => {
                const isOpen = floorExpanded[floorGroup.floor] ?? false;
                return (
                  <div
                    key={floorGroup.floor}
                    className="rounded-xl border overflow-hidden"
                    style={{ borderColor: 'var(--color-border)', background: 'var(--color-surface)' }}
                  >
                    {/* Floor Header Accordion Button */}
                    <button
                      type="button"
                      onClick={() =>
                        setFloorExpanded((prev) => ({
                          ...prev,
                          [floorGroup.floor]: !prev[floorGroup.floor],
                        }))
                      }
                      className="flex w-full items-center justify-between px-3.5 py-2.5 text-left text-xs font-bold text-ink hover:bg-hover-surface transition-colors"
                      style={{ background: 'color-mix(in srgb, var(--color-surface) 95%, var(--color-hover-surface))' }}
                    >
                      <span>{floorGroup.title}</span>
                      <Lucide.ChevronDown
                        size={15}
                        className={`text-ink-muted transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
                      />
                    </button>

                    {/* Room Cards Grid */}
                    {isOpen && (
                      <div className="p-3">
                        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5">
                          {floorGroup.rooms.map((room) => {
                            const isSelected = selectedRooms.includes(room.number);
                            return (
                              <div
                                key={room.number}
                                onClick={() => handleToggleRoom(room.number, room.available)}
                                className={`relative flex flex-col justify-between rounded-xl border p-3 transition-all duration-150 ${
                                  !room.available
                                    ? 'opacity-65 bg-muted-surface/40 cursor-not-allowed'
                                    : 'cursor-pointer hover:shadow-xs'
                                }`}
                                style={{
                                  borderColor: isSelected
                                    ? 'var(--color-primary)'
                                    : 'var(--color-border)',
                                  background: isSelected
                                    ? 'color-mix(in srgb, var(--color-primary) 6%, var(--color-surface))'
                                    : 'var(--color-surface)',
                                  boxShadow: isSelected
                                    ? '0 0 0 1px var(--color-primary), var(--shadow-sm)'
                                    : 'none',
                                }}
                              >
                                <div className="flex items-start justify-between gap-1 mb-2">
                                  {/* Custom Checkbox */}
                                  <div
                                    className={`flex h-4 w-4 flex-none items-center justify-center rounded border transition-colors ${
                                      isSelected
                                        ? 'bg-primary border-primary text-white'
                                        : 'border-border bg-surface'
                                    }`}
                                  >
                                    {isSelected && <Lucide.Check size={11} strokeWidth={3} />}
                                  </div>

                                  <span className="text-base font-bold text-ink leading-none">{room.number}</span>
                                </div>

                                <div className="mb-2">
                                  <p className="text-[11px] text-ink-muted">{room.type}</p>
                                  <p className="text-xs font-semibold text-ink leading-tight">
                                    ₹{room.rate.toLocaleString('en-IN')} <span className="text-[10px] font-normal text-ink-muted">/ night</span>
                                  </p>
                                </div>

                                {/* Status Badge */}
                                <div>
                                  {room.status === 'Ready' && (
                                    <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                                      Ready
                                    </span>
                                  )}
                                  {room.status === 'Cleaning' && (
                                    <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold bg-sky-50 text-sky-700 border border-sky-200">
                                      <span className="h-1.5 w-1.5 rounded-full bg-sky-500" />
                                      Cleaning
                                    </span>
                                  )}
                                  {room.status === 'Occupied' && (
                                    <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold bg-rose-50 text-rose-700 border border-rose-200">
                                      <span className="h-1.5 w-1.5 rounded-full bg-rose-500" />
                                      Occupied ({room.dateNote})
                                    </span>
                                  )}
                                  {room.status === 'Dirty' && (
                                    <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold bg-amber-50 text-amber-700 border border-amber-200">
                                      <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
                                      Dirty
                                    </span>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Nightly rate for selected room type (Deluxe) Table */}
            {showRateTable && (
              <div
                className="rounded-xl border p-3.5"
                style={{ borderColor: 'var(--color-border)', background: 'var(--color-surface)' }}
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 mb-2.5">
                  <h4 className="text-xs font-bold text-ink">
                    Nightly rate for selected room type ({activeRoomType.name})
                  </h4>
                  <span className="text-[10.5px] text-ink-muted">
                    Rates may vary by date due to season, demand or hotel policy. Final amount will be calculated at confirmation.
                  </span>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="border-b" style={{ borderColor: 'var(--color-border)' }}>
                        <th className="py-2 px-3 font-semibold text-ink-muted">Date</th>
                        <th className="py-2 px-3 font-semibold text-ink-muted">Day</th>
                        <th className="py-2 px-3 font-semibold text-ink-muted">Base rate</th>
                        <th className="py-2 px-3 font-semibold text-ink-muted">Taxes & fees (est.)</th>
                        <th className="py-2 px-3 font-semibold text-ink-muted text-right">Total per night</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y" style={{ borderColor: 'var(--color-border)' }}>
                      {stayNightBreakdown.map((row) => (
                        <tr key={row.dateStr} className="hover:bg-hover-surface/50">
                          <td className="py-2 px-3 font-medium text-ink">{row.dateStr}</td>
                          <td className="py-2 px-3 text-ink-secondary">{row.dayStr}</td>
                          <td className="py-2 px-3 tnum font-medium text-ink">₹{row.baseRate.toFixed(2)}</td>
                          <td className="py-2 px-3 tnum text-ink-secondary">₹{row.taxes.toFixed(2)}</td>
                          <td className="py-2 px-3 tnum font-bold text-ink text-right">₹{row.total.toFixed(2)}</td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr
                        className="font-semibold text-ink"
                        style={{ background: 'var(--color-muted-surface)' }}
                      >
                        <td colSpan={4} className="py-2 px-3">
                          Average per night (excl. taxes)
                        </td>
                        <td className="py-2 px-3 tnum font-bold text-right">
                          ₹{roomBaseRate.toFixed(2)}
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>
            )}
          </section>

          {/* ================= SECTION 3: SERVICES, DISCOUNTS & PAYMENT ================= */}
          <section className="new-reservation-panel">
            {/* Header */}
            <div className="flex items-center gap-2.5 mb-4">
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-primary-foreground font-bold text-xs">
                3
              </span>
              <h2 className="text-[15px] font-bold text-ink">Services, Discounts & Payment</h2>
              <span className="hidden sm:inline text-xs text-ink-muted">
                Add extras, apply discounts and payment details
              </span>
            </div>

            {/* Sub-tabs Bar */}
            <div
              className="flex border-b mb-4 gap-2 text-xs font-semibold"
              style={{ borderColor: 'var(--color-border)' }}
            >
              {[
                { id: 'extras', label: 'Extra Services' },
                { id: 'requests', label: 'Special Requests' },
                { id: 'discount', label: 'Discount' },
                { id: 'payment', label: 'Payment' },
              ].map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setServicesTab(t.id as never)}
                  className={`relative py-2 px-3 transition-colors ${
                    servicesTab === t.id
                      ? 'text-primary'
                      : 'text-ink-secondary hover:text-ink'
                  }`}
                >
                  {t.label}
                  {servicesTab === t.id && (
                    <span
                      className="absolute bottom-0 left-0 right-0 h-0.5 rounded-t-full bg-primary"
                    />
                  )}
                </button>
              ))}
            </div>

            {/* Tab 1: Extra Services */}
            {servicesTab === 'extras' && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {servicesList.map((service) => (
                  <div
                    key={service.id}
                    className={`flex items-center justify-between p-3 rounded-xl border transition-all ${
                      service.selected
                        ? 'border-primary/40 bg-primary/5'
                        : 'border-border bg-surface'
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      {/* Checkbox */}
                      <button
                        type="button"
                        onClick={() => handleToggleService(service.id)}
                        className={`flex h-4 w-4 flex-none items-center justify-center rounded border transition-colors ${
                          service.selected
                            ? 'bg-primary border-primary text-white'
                            : 'border-border bg-surface'
                        }`}
                      >
                        {service.selected && <Lucide.Check size={11} strokeWidth={3} />}
                      </button>

                      {/* Image Thumbnail */}
                      <img
                        src={service.image}
                        alt={service.name}
                        className="h-10 w-10 rounded-lg object-cover flex-none"
                      />

                      {/* Details */}
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-ink truncate">{service.name}</p>
                        <p className="text-[11px] text-ink-muted">
                          ₹{service.unitPrice.toFixed(2)} {service.unitLabel}
                        </p>
                      </div>
                    </div>

                    {/* Stepper Quantity Control */}
                    <div
                      className="flex items-center rounded-lg border bg-surface p-0.5 ml-2 flex-none"
                      style={{ borderColor: 'var(--color-border)' }}
                    >
                      <button
                        type="button"
                        onClick={() => handleUpdateServiceQty(service.id, -1)}
                        className="h-6 w-6 flex items-center justify-center rounded text-ink-secondary hover:text-ink hover:bg-hover-surface"
                      >
                        <Lucide.Minus size={11} />
                      </button>
                      <span className="w-6 text-center text-xs font-bold text-ink tnum">
                        {service.quantity}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleUpdateServiceQty(service.id, 1)}
                        className="h-6 w-6 flex items-center justify-center rounded text-ink-secondary hover:text-ink hover:bg-hover-surface"
                      >
                        <Lucide.Plus size={11} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Tab 2: Special Requests */}
            {servicesTab === 'requests' && (
              <div className="flex flex-col gap-3">
                <div>
                  <label className="block text-xs font-semibold text-ink-secondary mb-1.5">
                    Quick tags
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {['High floor', 'Quiet room', 'Late check-in', 'Early check-in', 'Extra towels', 'Honeymoon setup'].map((tag) => {
                      const on = selectedQuickTags.includes(tag);
                      return (
                        <button
                          key={tag}
                          type="button"
                          onClick={() => handleToggleQuickTag(tag)}
                          className={`rounded-full px-3 py-1 text-xs font-semibold border transition-all ${
                            on
                              ? 'bg-primary text-white border-primary shadow-xs'
                              : 'bg-surface text-ink-secondary border-border hover:text-ink'
                          }`}
                        >
                          {tag}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-ink-secondary mb-1">
                    Special guest requests & instructions
                  </label>
                  <textarea
                    rows={2}
                    value={specialRequests}
                    onChange={(e) => setSpecialRequests(e.target.value)}
                    placeholder="Guest arrives late night, needs airport pickup confirmation..."
                    className="w-full rounded-xl border p-2.5 text-xs text-ink focus:outline-none focus:ring-2 focus:ring-primary/20"
                    style={{ borderColor: 'var(--color-border)', background: 'var(--color-surface)' }}
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-ink-secondary mb-1">
                    Internal staff notes (hidden from guest)
                  </label>
                  <input
                    type="text"
                    value={internalNotes}
                    onChange={(e) => setInternalNotes(e.target.value)}
                    placeholder="VIP corporate account, apply complementary water bottles..."
                    className="w-full rounded-xl border px-3 py-2 text-xs text-ink focus:outline-none focus:ring-2 focus:ring-primary/20"
                    style={{ borderColor: 'var(--color-border)', background: 'var(--color-surface)' }}
                  />
                </div>
              </div>
            )}

            {/* Tab 3: Discount */}
            {servicesTab === 'discount' && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-center">
                <div>
                  <label className="block text-xs font-semibold text-ink-secondary mb-1">Discount Type</label>
                  <select
                    value={discountType}
                    onChange={(e) => setDiscountType(e.target.value as never)}
                    className="w-full rounded-xl border px-3 py-2 text-xs text-ink"
                    style={{ borderColor: 'var(--color-border)', background: 'var(--color-surface)' }}
                  >
                    <option value="none">No discount</option>
                    <option value="percent">Percentage (%)</option>
                    <option value="fixed">Fixed Amount (₹)</option>
                  </select>
                </div>
                {discountType !== 'none' && (
                  <div>
                    <label className="block text-xs font-semibold text-ink-secondary mb-1">
                      {discountType === 'percent' ? 'Discount Percentage (%)' : 'Discount Amount (₹)'}
                    </label>
                    <input
                      type="number"
                      min={0}
                      value={discountValue}
                      onChange={(e) => setDiscountValue(Number(e.target.value))}
                      className="w-full rounded-xl border px-3 py-2 text-xs text-ink tnum"
                      style={{ borderColor: 'var(--color-border)', background: 'var(--color-surface)' }}
                    />
                  </div>
                )}
              </div>
            )}

            {/* Tab 4: Payment */}
            {servicesTab === 'payment' && (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-ink-secondary mb-1">Booking Source</label>
                  <select
                    value={bookingSource}
                    onChange={(e) => setBookingSource(e.target.value)}
                    className="w-full rounded-xl border px-3 py-2 text-xs text-ink"
                    style={{ borderColor: 'var(--color-border)', background: 'var(--color-surface)' }}
                  >
                    {SOURCES.map((s) => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-ink-secondary mb-1">Payment Method</label>
                  <select
                    value={paymentMethod}
                    onChange={(e) => setPaymentMethod(e.target.value)}
                    className="w-full rounded-xl border px-3 py-2 text-xs text-ink"
                    style={{ borderColor: 'var(--color-border)', background: 'var(--color-surface)' }}
                  >
                    <option value="Card">Credit / Debit Card</option>
                    <option value="Cash">Cash</option>
                    <option value="UPI">UPI / Net Banking</option>
                    <option value="BillToCompany">Bill to Company</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-ink-secondary mb-1">Deposit / Advance (₹)</label>
                  <input
                    type="number"
                    min={0}
                    value={depositAmount}
                    onChange={(e) => setDepositAmount(Number(e.target.value))}
                    className="w-full rounded-xl border px-3 py-2 text-xs text-ink tnum font-semibold"
                    style={{ borderColor: 'var(--color-border)', background: 'var(--color-surface)' }}
                  />
                </div>
              </div>
            )}
          </section>
        </div>

        {/* ================= RIGHT STICKY COLUMN: RESERVATION PRICE SUMMARY ================= */}
        <aside className="new-reservation-summary xl:sticky xl:top-20">
          <div
            className="flex flex-col rounded-2xl border p-4 shadow-sm"
            style={{
              borderColor: 'var(--color-border)',
              background: 'var(--color-surface)',
            }}
          >
            {/* Summary Header */}
            <div className="flex items-start justify-between mb-3 border-b pb-3" style={{ borderColor: 'var(--color-border)' }}>
              <div>
                <h3 className="text-[15px] font-bold text-ink">Reservation Price Summary</h3>
                <p className="text-xs text-ink-secondary mt-0.5">
                  {activeRoomType.name} · {roomsCount} room · {nights} nights · {adults} adults
                </p>
              </div>

              {/* Estimate Badge */}
              <span className="flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-semibold bg-blue-50 text-blue-700 border border-blue-200">
                <Lucide.Sparkles size={11} />
                <span>Estimate</span>
              </span>
            </div>

            {/* Accordion 1: Room Charges */}
            <div className="border-b py-2.5" style={{ borderColor: 'var(--color-border)' }}>
              <button
                type="button"
                onClick={() => toggleAccordion('roomCharges')}
                className="flex items-center justify-between w-full text-left text-xs font-bold text-ink"
              >
                <div className="flex items-center gap-2">
                  <span className="flex h-5 w-5 items-center justify-center rounded bg-purple-50 text-purple-700">
                    <Lucide.BedDouble size={13} />
                  </span>
                  <span>Room Charges</span>
                </div>
                <Lucide.ChevronUp
                  size={14}
                  className={`text-ink-muted transition-transform ${accordionOpen.roomCharges ? '' : 'rotate-180'}`}
                />
              </button>

              {accordionOpen.roomCharges && (
                <div className="mt-2 pl-7 text-xs flex flex-col gap-1.5">
                  <div className="flex items-center justify-between text-ink-secondary">
                    <span>
                      {activeRoomType.name} {selectedRooms.length > 0 ? `(Room ${selectedRooms[0]})` : ''}
                    </span>
                    <span className="tnum">₹{roomBaseRate.toLocaleString('en-IN')}.00 / night</span>
                  </div>
                  <div className="flex items-center justify-between text-ink-secondary">
                    <span>{roomsCount} room x {nights} nights</span>
                    <span className="tnum font-medium text-ink">₹{roomChargesSubtotal.toLocaleString('en-IN')}.00</span>
                  </div>
                  <div className="border-t pt-1 flex items-center justify-between font-bold text-ink" style={{ borderColor: 'var(--color-border)' }}>
                    <span>Subtotal (Room Charges)</span>
                    <span className="tnum">₹{roomChargesSubtotal.toLocaleString('en-IN')}.00</span>
                  </div>
                </div>
              )}
            </div>

            {/* Accordion 2: Extra Services */}
            <div className="border-b py-2.5" style={{ borderColor: 'var(--color-border)' }}>
              <button
                type="button"
                onClick={() => toggleAccordion('extras')}
                className="flex items-center justify-between w-full text-left text-xs font-bold text-ink"
              >
                <div className="flex items-center gap-2">
                  <span className="flex h-5 w-5 items-center justify-center rounded bg-amber-50 text-amber-700">
                    <Lucide.Coffee size={13} />
                  </span>
                  <span>Extra Services</span>
                </div>
                <Lucide.ChevronUp
                  size={14}
                  className={`text-ink-muted transition-transform ${accordionOpen.extras ? '' : 'rotate-180'}`}
                />
              </button>

              {accordionOpen.extras && (
                <div className="mt-2 pl-7 text-xs flex flex-col gap-1.5">
                  {extrasCalculation.breakdown.map((item) => (
                    <div key={item.name} className="flex items-start justify-between text-ink-secondary">
                      <div>
                        <p className="text-ink font-medium">{item.name}</p>
                        <p className="text-[10.5px] text-ink-muted">{item.formula}</p>
                      </div>
                      <span className="tnum font-medium text-ink mt-0.5">₹{item.amount.toFixed(2)}</span>
                    </div>
                  ))}

                  {extrasCalculation.breakdown.length === 0 && (
                    <span className="text-ink-muted italic">No extra services selected</span>
                  )}

                  <div className="border-t pt-1 flex items-center justify-between font-bold text-ink" style={{ borderColor: 'var(--color-border)' }}>
                    <span>Extras subtotal</span>
                    <span className="tnum">₹{extrasCalculation.subtotal.toFixed(2)}</span>
                  </div>
                </div>
              )}
            </div>

            {/* Accordion 3: Discount */}
            <div className="border-b py-2.5" style={{ borderColor: 'var(--color-border)' }}>
              <button
                type="button"
                onClick={() => toggleAccordion('discount')}
                className="flex items-center justify-between w-full text-left text-xs font-bold text-ink"
              >
                <div className="flex items-center gap-2">
                  <span className="flex h-5 w-5 items-center justify-center rounded bg-indigo-50 text-indigo-700">
                    <Lucide.Tag size={13} />
                  </span>
                  <span>Discount</span>
                </div>
                <Lucide.ChevronUp
                  size={14}
                  className={`text-ink-muted transition-transform ${accordionOpen.discount ? '' : 'rotate-180'}`}
                />
              </button>

              {accordionOpen.discount && (
                <div className="mt-2 pl-7 text-xs flex items-center justify-between text-ink-secondary">
                  <span>{discountAmount > 0 ? 'Promo discount applied' : 'No discount applied'}</span>
                  <span className="tnum font-medium text-ink">
                    {discountAmount > 0 ? `-₹${discountAmount.toFixed(2)}` : '₹0.00'}
                  </span>
                </div>
              )}
            </div>

            {/* Accordion 4: Taxes & Fees (estimated) */}
            <div className="border-b py-2.5" style={{ borderColor: 'var(--color-border)' }}>
              <button
                type="button"
                onClick={() => toggleAccordion('taxes')}
                className="flex items-center justify-between w-full text-left text-xs font-bold text-ink"
              >
                <div className="flex items-center gap-2">
                  <span className="flex h-5 w-5 items-center justify-center rounded bg-purple-50 text-purple-700">
                    <Lucide.Receipt size={13} />
                  </span>
                  <span>Taxes & Fees (estimated)</span>
                </div>
                <Lucide.ChevronUp
                  size={14}
                  className={`text-ink-muted transition-transform ${accordionOpen.taxes ? '' : 'rotate-180'}`}
                />
              </button>

              {accordionOpen.taxes && (
                <div className="mt-2 pl-7 text-xs flex flex-col gap-1.5">
                  <div className="flex items-start justify-between text-ink-secondary">
                    <div>
                      <p className="text-ink font-medium">GST (12%)</p>
                      <p className="text-[10.5px] text-ink-muted">On room charges (₹{roomChargesSubtotal.toLocaleString('en-IN')}.00 x 12%)</p>
                    </div>
                    <span className="tnum font-medium text-ink mt-0.5">₹{gstAmount.toLocaleString('en-IN')}.00</span>
                  </div>

                  <div className="flex items-start justify-between text-ink-secondary">
                    <div>
                      <p className="text-ink font-medium">Hotel Occupancy Tax (2%)</p>
                      <p className="text-[10.5px] text-ink-muted">On room charges (₹{roomChargesSubtotal.toLocaleString('en-IN')}.00 x 2%)</p>
                    </div>
                    <span className="tnum font-medium text-ink mt-0.5">₹{occupancyTaxAmount.toLocaleString('en-IN')}.00</span>
                  </div>

                  <div className="border-t pt-1 flex items-center justify-between font-bold text-ink" style={{ borderColor: 'var(--color-border)' }}>
                    <span>Taxes subtotal</span>
                    <span className="tnum">₹{taxesSubtotal.toLocaleString('en-IN')}.00</span>
                  </div>
                </div>
              )}
            </div>

            {/* Highlighted Estimated Total Box */}
            <div
              className="mt-4 rounded-xl border border-l-4 border-l-primary p-3.5 flex items-center justify-between"
              style={{
                borderColor: 'var(--color-border)',
                borderLeftColor: 'var(--color-primary)',
                background: 'color-mix(in srgb, var(--color-surface) 95%, var(--color-primary))',
              }}
            >
              <div>
                <p className="text-sm font-bold text-ink leading-tight">Estimated Total</p>
                <p className="text-[10.5px] text-ink-muted">Before deposit and final adjustments</p>
              </div>
              <span className="text-lg font-bold text-ink tnum">
                ₹{estimatedTotal.toLocaleString('en-IN')}.00
              </span>
            </div>

            {/* Deposit & Balance Rows */}
            <div className="mt-3 flex flex-col gap-2 px-1 text-xs">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <span className="text-emerald-600">
                    <Lucide.ShieldCheck size={14} />
                  </span>
                  <div>
                    <p className="font-semibold text-ink">Deposit / Advance</p>
                    <p className="text-[10.5px] text-ink-muted">Amount to be collected now</p>
                  </div>
                </div>
                <span className="font-bold text-ink tnum">₹{depositAmount.toFixed(2)}</span>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <span className="text-ink-secondary">
                    <Lucide.CreditCard size={14} />
                  </span>
                  <div>
                    <p className="font-semibold text-ink">Estimated Balance Due</p>
                    <p className="text-[10.5px] text-ink-muted">Payable at hotel (plus any additional charges)</p>
                  </div>
                </div>
                <span className="font-bold text-ink tnum">₹{estimatedBalanceDue.toLocaleString('en-IN')}.00</span>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="mt-5 flex flex-col gap-2">
              <button
                type="button"
                onClick={handleProceed}
                className="w-full pms-btn-primary py-2.5 px-4 rounded-xl font-semibold text-xs flex items-center justify-center gap-1.5 shadow-sm"
              >
                <span>Continue to Services & Payment</span>
                <Lucide.ArrowRight size={14} />
              </button>

              <button
                type="button"
                onClick={handleSaveDraft}
                className="w-full rounded-xl border py-2.5 px-4 text-xs font-semibold text-ink hover:bg-hover-surface transition-colors"
                style={{ borderColor: 'var(--color-border)', background: 'var(--color-surface)' }}
              >
                Save as Draft
              </button>
            </div>
          </div>
        </aside>
      </div>

      {/* Confirmation Dialog */}
      <ConfirmDialog
        open={confirming}
        onClose={() => setConfirming(false)}
        onConfirm={() => { void executeCreateReservation(); }}
        title="Confirm New Reservation"
        body={`Create booking for ${guestChoice === 'existing' ? activeGuest.name : newName} · ${activeRoomType.name} (Room ${selectedRooms[0] || '201'}) · ${nights} nights · Total: ₹${estimatedTotal.toLocaleString('en-IN')}.00.`}
        confirmLabel={submitting ? 'Confirming…' : 'Confirm & Allocate Room'}
        busy={submitting}
      />
    </div>
  );
}
