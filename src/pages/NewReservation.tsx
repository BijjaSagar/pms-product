import { useMemo, useState } from 'react';
import * as Lucide from 'lucide-react';
import type { NavTarget } from '../components/nav';
import { toast } from '../components/toastStore';
import { ThemeSwatcher } from '../components/ThemeSwatcher';

interface RoomRequirement {
  id: string;
  roomIndex: number;
  category: string;
  adults: number;
  children: number;
  infant: number;
  roomNo: string;
  rate: number;
}

interface FrontDeskTask {
  id: string;
  text: string;
  done: boolean;
  priority: 'low' | 'medium' | 'high';
}

const ROOM_CATEGORIES = [
  { name: 'Family Studio', baseRate: 4100, maxGuests: 4, desc: 'Spacious studio with kitchenette & lounge' },
  { name: 'Deluxe King', baseRate: 3500, maxGuests: 2, desc: 'King bed, city view & workspace' },
  { name: 'Executive Suite', baseRate: 5800, maxGuests: 3, desc: 'Master bedroom, living area & bathtub' },
  { name: 'Club Twin', baseRate: 3200, maxGuests: 2, desc: 'Twin beds, ergonomic setup & balcony' },
];

const MEAL_PLANS = [
  { code: 'EP', label: 'EP - Room Only', surcharge: 0 },
  { code: 'CP', label: 'CP - Bed & Breakfast', surcharge: 450 },
  { code: 'MAP', label: 'MAP - Half Board (Bkfst + Dinner)', surcharge: 950 },
  { code: 'AP', label: 'AP - Full Board (All Meals)', surcharge: 1400 },
];

const SAMPLE_GUEST_DATABASE = [
  { id: 'g-101', name: 'Rohan Sharma', phone: '+91 88829 51951', email: 'rohan.sharma@example.com', gst: '27AABCT1234A1Z5', city: 'Mumbai', vip: true },
  { id: 'g-102', name: 'Aarav Iyer', phone: '+91 98200 12345', email: 'aarav.iyer@example.com', gst: '', city: 'Bengaluru', vip: false },
  { id: 'g-103', name: 'Pooja Verma', phone: '+91 98110 99881', email: 'pooja.verma@example.com', gst: '07AAAAA0000A1Z5', city: 'New Delhi', vip: true },
  { id: 'g-104', name: 'Vikram Malhotra', phone: '+91 97112 34567', email: 'vikram.m@zenithcorp.in', gst: '29AABCM9988F1Z2', city: 'Pune', vip: false },
];

export function NewReservation({
  go,
  onOpenThemes,
}: {
  go: (t: NavTarget) => void;
  onOpenThemes?: () => void;
}) {
  const [swatcherOpen, setSwatcherOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'general' | 'outlet' | 'preferences'>('general');

  // Booking Parameters
  const [bookingSource, setBookingSource] = useState('Direct');
  const [sourceType, setSourceType] = useState('Phone');
  const [bookingRefId, setBookingRefId] = useState('DJB-2026-9042');
  const [checkInDate, setCheckInDate] = useState('2026-10-20');
  const [checkOutDate, setCheckOutDate] = useState('2026-10-21');
  const [bookingType, setBookingType] = useState('Confirmed');
  const [checkInTime, setCheckInTime] = useState('13:00');
  const [checkOutTime, setCheckOutTime] = useState('11:00');
  const [samePlanAllRooms, setSamePlanAllRooms] = useState(true);
  const [payAtHotel, setPayAtHotel] = useState(false);
  const [ratePlan, setRatePlan] = useState('Best Available Rates');
  const [selectedCategory, setSelectedCategory] = useState('Family Studio');
  const [mealPlan, setMealPlan] = useState('EP');

  // Requirements (Rooms list)
  const [overridePrice, setOverridePrice] = useState(false);
  const [requirements, setRequirements] = useState<RoomRequirement[]>([
    {
      id: 'req-1',
      roomIndex: 1,
      category: 'Family Studio',
      adults: 2,
      children: 0,
      infant: 0,
      roomNo: '202',
      rate: 4100,
    },
  ]);

  // Billing Preferences
  const [roomBillTo, setRoomBillTo] = useState('To Guest');
  const [extrasBillTo, setExtrasBillTo] = useState('To Guest');
  const [billToCompany, setBillToCompany] = useState(false);
  const [noPost, setNoPost] = useState(false);
  const [companyName, setCompanyName] = useState('');
  const [companyGst, setCompanyGst] = useState('');

  // Guest Details
  const [guestSearch, setGuestSearch] = useState('');
  const [showGuestSearchDropdown, setShowGuestSearchDropdown] = useState(false);
  const [guestSalutation, setGuestSalutation] = useState('Mr.');
  const [guestName, setGuestName] = useState('Rohan Sharma');
  const [guestContact, setGuestContact] = useState('+91 88829 51951');
  const [guestEmail, setGuestEmail] = useState('support@djubo.com');
  const [guestIdType, setGuestIdType] = useState('Aadhaar Card');
  const [guestIdNumber, setGuestIdNumber] = useState('9842 1290 8731');
  const [specialRequests, setSpecialRequests] = useState('Quiet room on upper floor preferred.');

  // Payments & Financials
  const [paymentNotes, setPaymentNotes] = useState('Pre-booking verified via direct call.');
  const [paymentsList, setPaymentsList] = useState<{ id: string; method: string; amount: number; time: string; ref: string }[]>([]);
  const [discountAmount, setDiscountAmount] = useState(0);

  // Front Desk Tasks & Checklist
  const [tasks, setTasks] = useState<FrontDeskTask[]>([
    { id: 't-1', text: 'Verify physical Photo ID and collect signed registration card', done: false, priority: 'high' },
    { id: 't-2', text: 'Pre-allocate room 202 on high floor (Requested by guest)', done: true, priority: 'medium' },
    { id: 't-3', text: 'Send digital invoice and welcome packet via WhatsApp', done: false, priority: 'low' },
  ]);
  const [newTaskInput, setNewTaskInput] = useState('');

  // Modal states
  const [collectModalOpen, setCollectModalOpen] = useState(false);
  const [collectAmount, setCollectAmount] = useState('4305');
  const [collectMethod, setCollectMethod] = useState<'UPI / QR' | 'Credit Card' | 'Debit Card' | 'Cash' | 'Bank Transfer'>('UPI / QR');
  const [collectRef, setCollectRef] = useState('');
  const [copiedCode, setCopiedCode] = useState(false);
  const [issueModalOpen, setIssueModalOpen] = useState(false);
  const [issueText, setIssueText] = useState('');

  // Confirmation state
  const [confirmedBooking, setConfirmedBooking] = useState<{
    code: string;
    total: number;
    guest: string;
    rooms: number;
    nights: number;
  } | null>(null);

  // Night calculation
  const nightsCount = useMemo(() => {
    try {
      const d1 = new Date(checkInDate);
      const d2 = new Date(checkOutDate);
      const diff = Math.ceil((d2.getTime() - d1.getTime()) / (1000 * 60 * 60 * 24));
      return Math.max(1, isNaN(diff) ? 1 : diff);
    } catch {
      return 1;
    }
  }, [checkInDate, checkOutDate]);

  // Financial calculations
  const roomCharges = useMemo(() => {
    return requirements.reduce((acc, r) => acc + r.rate * nightsCount, 0);
  }, [requirements, nightsCount]);

  const taxAmount = useMemo(() => {
    return Math.round(roomCharges * 0.05); // 5% GST
  }, [roomCharges]);

  const subTotal = Math.max(0, roomCharges - discountAmount);
  const totalBill = subTotal + taxAmount;
  const totalPaid = paymentsList.reduce((acc, p) => acc + p.amount, 0);
  const outstanding = Math.max(0, totalBill - totalPaid);

  const formatDisplayDate = (dStr: string) => {
    try {
      const date = new Date(dStr);
      const day = date.getDate();
      const month = date.toLocaleString('en-US', { month: 'short' }).toUpperCase();
      const year = date.getFullYear();
      const weekday = date.toLocaleString('en-US', { weekday: 'short' });
      return { day: isNaN(day) ? '20' : String(day).padStart(2, '0'), month, year, weekday };
    } catch {
      return { day: '20', month: 'OCT', year: 2026, weekday: 'Tue' };
    }
  };

  const inDate = formatDisplayDate(checkInDate);
  const outDate = formatDisplayDate(checkOutDate);

  const handleAddRoom = () => {
    const nextIdx = requirements.length + 1;
    const catObj = ROOM_CATEGORIES.find((c) => c.name === selectedCategory) || ROOM_CATEGORIES[0];
    const newReq: RoomRequirement = {
      id: `req-${Date.now()}`,
      roomIndex: nextIdx,
      category: selectedCategory,
      adults: 2,
      children: 0,
      infant: 0,
      roomNo: String(200 + nextIdx),
      rate: catObj.baseRate,
    };
    setRequirements((prev) => [...prev, newReq]);
    toast.success('Room Added', { detail: `Room ${nextIdx} (${selectedCategory}) added to requirements.` });
  };

  const handleRemoveRoom = (id: string) => {
    if (requirements.length <= 1) {
      toast.warning('Minimum Required', { detail: 'At least one room requirement must remain.' });
      return;
    }
    setRequirements((prev) => prev.filter((r) => r.id !== id));
    toast.info('Room Removed', { detail: 'Room requirement removed from folio.' });
  };

  const handleUpdateRequirement = (id: string, field: keyof RoomRequirement, value: unknown) => {
    setRequirements((prev) =>
      prev.map((r) => (r.id === id ? { ...r, [field]: value } : r))
    );
  };

  const handleToggleTask = (id: string) => {
    setTasks((prev) =>
      prev.map((t) => (t.id === id ? { ...t, done: !t.done } : t))
    );
  };

  const handleAddTask = () => {
    if (!newTaskInput.trim()) return;
    setTasks((prev) => [
      ...prev,
      { id: `t-${Date.now()}`, text: newTaskInput.trim(), done: false, priority: 'medium' },
    ]);
    setNewTaskInput('');
    toast.success('Task Added', { detail: 'Front desk task recorded.' });
  };

  const handleRecordPayment = () => {
    const amt = parseFloat(collectAmount);
    if (!amt || amt <= 0) {
      toast.error('Invalid Amount', { detail: 'Please specify an amount greater than ₹0.' });
      return;
    }
    const newPayment = {
      id: `pay-${Date.now()}`,
      method: collectMethod,
      amount: amt,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      ref: collectRef || `TXN-${Math.floor(100000 + Math.random() * 900000)}`,
    };
    setPaymentsList((prev) => [...prev, newPayment]);
    setCollectModalOpen(false);
    setCollectRef('');
    toast.success('Payment Recorded', { detail: `₹${amt.toLocaleString('en-IN')} via ${collectMethod}` });
  };

  const handleConfirmReservation = (withEmail = false) => {
    if (!guestName.trim()) {
      toast.error('Guest Name Required', { detail: 'Please provide guest name before confirming.' });
      return;
    }

    const code = bookingRefId || `DJB-2026-${Math.floor(1000 + Math.random() * 9000)}`;
    setConfirmedBooking({
      code,
      total: totalBill,
      guest: guestName,
      rooms: requirements.length,
      nights: nightsCount,
    });

    toast.success('Reservation Confirmed', {
      detail: `${guestName} · Ref #${code} ${withEmail ? '· Confirmation email sent' : ''}`,
    });
  };

  const handleCopyCode = () => {
    navigator.clipboard.writeText(bookingRefId);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
    toast.info('Copied', { detail: 'Booking reference copied to clipboard.' });
  };

  // SUCCESS CONFIRMATION SCREEN
  if (confirmedBooking) {
    return (
      <div className="max-w-4xl mx-auto py-8 px-4 text-slate-900 font-sans">
        <div className="bg-white rounded-3xl border border-slate-200/90 shadow-[0_12px_40px_-10px_rgba(15,23,42,0.08)] p-6 sm:p-10 text-center relative overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-2 bg-gradient-to-r from-emerald-500 via-[var(--color-primary)] to-teal-500" />

          <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600 shadow-sm border border-emerald-100 mb-5">
            <Lucide.CheckCircle2 size={44} />
          </div>

          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold mb-3 uppercase tracking-wider">
            <Lucide.ShieldCheck size={14} />
            Folio Verified & Confirmed
          </div>

          <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900">
            Booking Ref #{confirmedBooking.code}
          </h2>
          <p className="max-w-lg mx-auto text-xs sm:text-sm text-slate-500 mt-2">
            Reservation successfully saved for <strong className="text-slate-800">{confirmedBooking.guest}</strong>. All room allotments, billing routing, and front desk tasks have been registered.
          </p>

          {/* Quick Summary Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 max-w-2xl mx-auto mt-6 text-left">
            <div className="p-3.5 rounded-xl border border-slate-100 bg-slate-50/70">
              <span className="block text-[10px] font-bold text-slate-400 uppercase">Check-in</span>
              <span className="text-xs sm:text-sm font-bold text-slate-800 mt-0.5 block">{checkInDate}</span>
              <span className="text-[10px] text-slate-500">{checkInTime} hrs</span>
            </div>
            <div className="p-3.5 rounded-xl border border-slate-100 bg-slate-50/70">
              <span className="block text-[10px] font-bold text-slate-400 uppercase">Check-out</span>
              <span className="text-xs sm:text-sm font-bold text-slate-800 mt-0.5 block">{checkOutDate}</span>
              <span className="text-[10px] text-slate-500">{checkOutTime} hrs</span>
            </div>
            <div className="p-3.5 rounded-xl border border-slate-100 bg-slate-50/70">
              <span className="block text-[10px] font-bold text-slate-400 uppercase">Allotment</span>
              <span className="text-xs sm:text-sm font-bold text-slate-800 mt-0.5 block">{confirmedBooking.rooms} Room(s)</span>
              <span className="text-[10px] text-slate-500">{confirmedBooking.nights} Night(s)</span>
            </div>
            <div className="p-3.5 rounded-xl border border-slate-100 bg-slate-50/70">
              <span className="block text-[10px] font-bold text-slate-400 uppercase">Total Bill</span>
              <span className="text-xs sm:text-sm font-bold text-emerald-700 font-mono mt-0.5 block">
                ₹{confirmedBooking.total.toLocaleString('en-IN')}.00
              </span>
              <span className="text-[10px] text-slate-500 font-semibold">
                {outstanding === 0 ? 'Fully Settled' : `₹${outstanding.toLocaleString('en-IN')} Due`}
              </span>
            </div>
          </div>

          {/* Actions */}
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <button
              type="button"
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold bg-[var(--color-primary)] hover:opacity-95 text-white shadow-sm transition-all text-xs cursor-pointer"
              onClick={() => go({ view: 'reservations' })}
            >
              <Lucide.CalendarDays size={15} />
              <span>View All Reservations</span>
            </button>
            <button
              type="button"
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl font-semibold border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 shadow-xs transition-colors text-xs cursor-pointer"
              onClick={() => window.print()}
            >
              <Lucide.Printer size={15} className="text-slate-500" />
              <span>Print Registration Slip</span>
            </button>
            <button
              type="button"
              className="px-4 py-2.5 rounded-xl font-semibold border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 shadow-xs transition-colors text-xs cursor-pointer"
              onClick={() => {
                setConfirmedBooking(null);
                setBookingRefId(`DJB-2026-${Math.floor(1000 + Math.random() * 9000)}`);
              }}
            >
              Create Another Booking
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full text-slate-900 font-sans pb-24 flex flex-col gap-4">
      {/* ================= PAGE HEADER & VIEW BAR ================= */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-4 sm:p-5 shadow-[0_2px_10px_-2px_rgba(15,23,42,0.03)] flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-tr from-[var(--color-primary)] to-indigo-600 text-white font-black shadow-md shadow-[var(--color-primary)]/20">
            <Lucide.FileSpreadsheet size={22} />
          </div>
          <div>
            <div className="flex items-center gap-2.5 flex-wrap">
              <h1 className="text-xl sm:text-2xl font-extrabold tracking-tight text-slate-900">
                New Reservation 3
              </h1>
              <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 shadow-2xs">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                Folio Console
              </span>
              <span className="text-[11px] font-bold px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 font-mono">
                #{bookingRefId}
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Refined 3-column reservation workstation with luxury boarding ticket, real-time bill routing & task checklist
            </p>
          </div>
        </div>

        {/* Header Actions */}
        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={() => go({ view: 'reservations' })}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold shadow-xs transition-colors cursor-pointer"
          >
            <Lucide.CalendarDays size={14} className="text-slate-400" />
            <span className="hidden sm:inline">All Reservations</span>
          </button>
          <button
            type="button"
            onClick={() => (onOpenThemes ? onOpenThemes() : setSwatcherOpen(true))}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold shadow-xs transition-colors cursor-pointer"
            title="Theme Palette"
          >
            <Lucide.Palette size={14} className="text-[var(--color-primary)]" />
            <span>Theme</span>
          </button>
        </div>
      </div>

      {/* ================= 3-COLUMN MASTER WORKBENCH ================= */}
      <div className="grid grid-cols-1 lg:grid-cols-[310px_1fr] xl:grid-cols-[330px_1fr_280px] gap-4 items-start">

        {/* ================= LEFT COLUMN: LUXURY FOLIO BOARDING TICKET ================= */}
        <div className="flex flex-col rounded-3xl border border-slate-200/90 bg-white shadow-[0_4px_25px_-5px_rgba(15,23,42,0.06)] overflow-hidden lg:sticky lg:top-4">

          {/* Top Boarding Pass Header Strip */}
          <div className="bg-gradient-to-r from-slate-900 via-slate-850 to-slate-900 p-4 text-white flex items-center justify-between border-b border-slate-800">
            <div className="flex items-center gap-2">
              <span className="flex h-2.5 w-2.5 rounded-full bg-emerald-400 shadow-sm shadow-emerald-400/50" />
              <span className="text-xs font-black tracking-wider uppercase text-slate-200">
                GUEST FOLIO
              </span>
            </div>
            <div className="flex items-center gap-1.5 bg-slate-800/80 px-2.5 py-1 rounded-lg border border-slate-700/80">
              <span className="text-[10px] text-slate-400 font-mono">REF ID</span>
              <span className="text-xs font-bold text-white font-mono">{bookingRefId}</span>
              <button
                type="button"
                onClick={handleCopyCode}
                className="text-slate-400 hover:text-white transition-colors ml-1 cursor-pointer"
                title="Copy Reference"
              >
                {copiedCode ? <Lucide.Check size={12} className="text-emerald-400" /> : <Lucide.Copy size={12} />}
              </button>
            </div>
          </div>

          {/* Ticket Body with Notched Perforations */}
          <div className="p-5 flex flex-col gap-4 relative">

            {/* Elegant Calendar Journey Tile */}
            <div className="bg-gradient-to-b from-slate-50 to-white rounded-2xl border border-slate-200/80 p-4 shadow-2xs">
              <div className="flex items-center justify-between text-center">
                {/* Check In */}
                <div className="text-left">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">CHECK-IN</span>
                  <div className="flex items-baseline gap-1 mt-0.5">
                    <span className="text-3xl font-black text-slate-900 leading-none">{inDate.day}</span>
                    <span className="text-xs font-bold text-slate-600 uppercase">{inDate.month}</span>
                  </div>
                  <span className="text-[10px] font-semibold text-slate-400 mt-1 block">{inDate.weekday} · {checkInTime}</span>
                </div>

                {/* Duration Badge with line */}
                <div className="flex-1 flex flex-col items-center px-3">
                  <div className="flex items-center gap-1 text-[10px] font-bold text-slate-700 bg-white px-2.5 py-1 rounded-full border border-slate-200 shadow-2xs">
                    <Lucide.Moon size={11} className="text-indigo-500" />
                    <span>{nightsCount} {nightsCount === 1 ? 'Night' : 'Nights'}</span>
                  </div>
                  <div className="w-full relative flex items-center justify-center my-1.5">
                    <div className="w-full border-t border-dashed border-slate-300" />
                    <Lucide.BedDouble size={13} className="text-slate-400 absolute bg-white px-0.5" />
                  </div>
                  <span className="text-[9px] text-slate-400 font-medium">Allotment</span>
                </div>

                {/* Check Out */}
                <div className="text-right">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">CHECK-OUT</span>
                  <div className="flex items-baseline justify-end gap-1 mt-0.5">
                    <span className="text-3xl font-black text-slate-900 leading-none">{outDate.day}</span>
                    <span className="text-xs font-bold text-slate-600 uppercase">{outDate.month}</span>
                  </div>
                  <span className="text-[10px] font-semibold text-slate-400 mt-1 block">{outDate.weekday} · {checkOutTime}</span>
                </div>
              </div>
            </div>

            {/* Room & Meal Plan Strip */}
            <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50/80 border border-slate-200/70">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600 shrink-0 border border-indigo-100">
                  <Lucide.Building2 size={16} />
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-bold text-slate-900 truncate">
                    {requirements.length}x {selectedCategory}
                  </p>
                  <p className="text-[11px] text-slate-500 font-medium truncate">
                    Plan: <strong className="text-slate-700 font-semibold">{mealPlan}</strong> · Room: {requirements.map((r) => r.roomNo).join(', ')}
                  </p>
                </div>
              </div>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-white border border-slate-200 text-slate-700 shadow-2xs shrink-0">
                {requirements.reduce((a, b) => a + b.adults, 0)} Adults
              </span>
            </div>

            {/* Guest Profile Chip */}
            <div className="p-3 rounded-xl border border-slate-100 bg-white shadow-2xs flex items-center justify-between">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[var(--color-primary)] text-white font-bold text-xs shrink-0">
                  {guestName ? guestName.charAt(0).toUpperCase() : 'G'}
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-bold text-slate-900 truncate">{guestName || 'Unnamed Guest'}</span>
                    <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-amber-50 text-amber-700 border border-amber-200">VIP</span>
                  </div>
                  <span className="text-[11px] text-slate-500 font-medium truncate block">{guestContact || 'No contact'}</span>
                </div>
              </div>
              <a
                href={`tel:${guestContact}`}
                className="flex h-7 w-7 items-center justify-center rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors"
                title="Call Guest"
              >
                <Lucide.Phone size={13} />
              </a>
            </div>

            {/* Double-Ring Luxury Confirmed Seal */}
            <div className="flex justify-center py-1">
              <div className="relative inline-flex items-center justify-center p-2 rounded-full border-2 border-dashed border-emerald-500/70 rotate-[-6deg] bg-emerald-50/30">
                <div className="flex flex-col h-16 w-16 items-center justify-center rounded-full border-2 border-emerald-600 bg-white text-emerald-700 shadow-sm text-center">
                  <Lucide.ShieldCheck size={16} className="text-emerald-600" />
                  <span className="font-black text-[9px] uppercase tracking-wider mt-0.5 leading-none">
                    CONFIRMED
                  </span>
                  <span className="text-[7px] font-bold text-emerald-500 font-mono mt-0.5">FRONT DESK</span>
                </div>
              </div>
            </div>

            {/* Total Bill & Outstanding Status */}
            <div className="rounded-2xl border border-slate-200/90 bg-gradient-to-br from-slate-50 via-white to-slate-50/50 p-4 shadow-2xs flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">TOTAL INVOICE</span>
                <span className="text-base font-extrabold text-slate-900 font-mono">
                  ₹{totalBill.toLocaleString('en-IN')}.00
                </span>
              </div>

              <div className="h-[1px] bg-slate-200/70" />

              <div className="flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase block">OUTSTANDING</span>
                  <span className={`text-sm font-extrabold font-mono ${outstanding > 0 ? 'text-amber-600' : 'text-emerald-600'}`}>
                    ₹{outstanding.toLocaleString('en-IN')}.00
                  </span>
                </div>

                {outstanding > 0 ? (
                  <button
                    type="button"
                    onClick={() => {
                      setCollectAmount(String(outstanding));
                      setCollectModalOpen(true);
                    }}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-600 active:bg-amber-700 text-white text-xs font-bold shadow-xs transition-all cursor-pointer"
                  >
                    <Lucide.Banknote size={13} />
                    <span>e-Collect</span>
                  </button>
                ) : (
                  <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                    <Lucide.Check size={11} />
                    Paid in Full
                  </span>
                )}
              </div>
            </div>

            {/* Quick Tile Buttons Footer */}
            <div className="grid grid-cols-4 gap-2 pt-2 border-t border-slate-100 text-center">
              <button
                type="button"
                className="flex flex-col items-center justify-center py-2 px-1 rounded-xl border border-slate-200/80 hover:bg-slate-50 text-slate-600 transition-colors shadow-2xs cursor-pointer group"
                title="Direct Phone Booking"
              >
                <Lucide.PhoneCall size={14} className="text-slate-500 group-hover:text-[var(--color-primary)] transition-colors" />
                <span className="text-[9px] font-bold mt-1 text-slate-700">DIRECT</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setCollectAmount(String(outstanding));
                  setCollectModalOpen(true);
                }}
                className="flex flex-col items-center justify-center py-2 px-1 rounded-xl border border-slate-200/80 hover:bg-slate-50 text-slate-600 transition-colors shadow-2xs cursor-pointer group"
                title="Collect Payment"
              >
                <Lucide.Banknote size={14} className="text-amber-600" />
                <span className="text-[9px] font-bold mt-1 text-slate-700">₹ PAY</span>
              </button>
              <button
                type="button"
                className="flex flex-col items-center justify-center py-2 px-1 rounded-xl border border-slate-200/80 hover:bg-slate-50 text-slate-600 transition-colors shadow-2xs cursor-pointer group"
                title="Assigned Rooms"
              >
                <Lucide.BedDouble size={14} className="text-indigo-500" />
                <span className="text-[9px] font-bold mt-1 text-slate-700">ROOMS</span>
              </button>
              <button
                type="button"
                className="flex flex-col items-center justify-center py-2 px-1 rounded-xl border border-slate-200/80 hover:bg-slate-50 text-slate-600 transition-colors shadow-2xs cursor-pointer group"
                title="Guest ID Verification"
              >
                <Lucide.CreditCard size={14} className="text-emerald-600" />
                <span className="text-[9px] font-bold mt-1 text-slate-700">ID / CARD</span>
              </button>
            </div>
          </div>
        </div>

        {/* ================= CENTER COLUMN: REFINED WORKBENCH & INTAKE CONSOLE ================= */}
        <div className="flex flex-col gap-4 min-w-0">

          {/* Sub Navigation Segmented Tabs */}
          <div className="flex items-center gap-1.5 p-1 bg-slate-100/80 rounded-2xl border border-slate-200/80 w-fit">
            <button
              type="button"
              onClick={() => setActiveTab('general')}
              className={`flex items-center gap-1.5 px-4 py-2 text-xs font-bold rounded-xl transition-all cursor-pointer ${activeTab === 'general'
                ? 'bg-white text-slate-900 shadow-sm border border-slate-200/60'
                : 'text-slate-600 hover:text-slate-900'
                }`}
            >
              <Lucide.FileText size={13} className={activeTab === 'general' ? 'text-[var(--color-primary)]' : 'text-slate-400'} />
              <span>General Reservation</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('outlet')}
              className={`flex items-center gap-1.5 px-4 py-2 text-xs font-bold rounded-xl transition-all cursor-pointer ${activeTab === 'outlet'
                ? 'bg-white text-slate-900 shadow-sm border border-slate-200/60'
                : 'text-slate-600 hover:text-slate-900'
                }`}
            >
              <Lucide.Receipt size={13} className={activeTab === 'outlet' ? 'text-[var(--color-primary)]' : 'text-slate-400'} />
              <span>+ Outlet / POS Addons</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('preferences')}
              className={`flex items-center gap-1.5 px-4 py-2 text-xs font-bold rounded-xl transition-all cursor-pointer ${activeTab === 'preferences'
                ? 'bg-white text-slate-900 shadow-sm border border-slate-200/60'
                : 'text-slate-600 hover:text-slate-900'
                }`}
            >
              <Lucide.Sliders size={13} className={activeTab === 'preferences' ? 'text-[var(--color-primary)]' : 'text-slate-400'} />
              <span>Billing Preferences</span>
            </button>
          </div>

          {activeTab === 'general' && (
            <div className="flex flex-col gap-4">

              {/* SECTION 1: BOOKING PARAMETERS & DETAILS */}
              <section className="bg-white rounded-3xl border border-slate-200/80 p-5 sm:p-6 shadow-[0_2px_12px_-2px_rgba(15,23,42,0.04)] flex flex-col gap-4">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <div className="flex items-center gap-2.5">
                    <span className="flex h-7 w-7 items-center justify-center rounded-xl bg-[var(--color-primary)] text-white font-bold text-xs shadow-xs">
                      1
                    </span>
                    <div>
                      <h2 className="text-sm font-bold text-slate-900">Booking Details & Rate Plan</h2>
                      <p className="text-[11px] text-slate-400">Channel source, stay duration, meal plan & occupancy setup</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Status:</span>
                    <select
                      value={bookingType}
                      onChange={(e) => setBookingType(e.target.value)}
                      className="text-[11px] font-bold text-slate-700 bg-slate-50 border border-slate-200/80 px-2.5 py-1 rounded-lg focus:outline-none focus:border-[var(--color-primary)] cursor-pointer"
                    >
                      <option value="Confirmed">Confirmed</option>
                      <option value="Guaranteed">Guaranteed</option>
                      <option value="Tentative">Tentative</option>
                      <option value="Waitlist">Waitlist</option>
                    </select>
                  </div>
                </div>

                {/* Row 1: Channel Source & Type */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1.5">
                      Booking Source
                    </label>
                    <select
                      value={bookingSource}
                      onChange={(e) => setBookingSource(e.target.value)}
                      className="w-full rounded-xl border border-slate-200 bg-slate-50/50 hover:bg-white focus:bg-white px-3 py-2 text-xs text-slate-900 font-semibold focus:outline-none focus:border-[var(--color-primary)] focus:ring-2 focus:ring-[var(--color-primary)]/15 transition-all cursor-pointer"
                    >
                      <option value="Direct">Direct (Hotel Desk)</option>
                      <option value="OTA - Booking.com">OTA - Booking.com</option>
                      <option value="OTA - Agoda">OTA - Agoda</option>
                      <option value="OTA - MakeMyTrip">OTA - MakeMyTrip</option>
                      <option value="Corporate">Corporate Negotiated</option>
                      <option value="Walk-in">Walk-in Direct</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1.5">
                      Booking Type / Mode
                    </label>
                    <select
                      value={sourceType}
                      onChange={(e) => setSourceType(e.target.value)}
                      className="w-full rounded-xl border border-slate-200 bg-slate-50/50 hover:bg-white focus:bg-white px-3 py-2 text-xs text-slate-900 font-semibold focus:outline-none focus:border-[var(--color-primary)] focus:ring-2 focus:ring-[var(--color-primary)]/15 transition-all cursor-pointer"
                    >
                      <option value="Phone">Phone Call Inquiry</option>
                      <option value="Email">Email Confirmation</option>
                      <option value="Web Portal">Web Portal / Engine</option>
                      <option value="Front Desk">Front Desk Agent</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1.5">
                      Reference ID <span className="text-rose-500">*</span>
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        value={bookingRefId}
                        onChange={(e) => setBookingRefId(e.target.value)}
                        placeholder="e.g. DJB-2026-9042"
                        className="w-full rounded-xl border border-slate-200 bg-slate-50/50 hover:bg-white focus:bg-white px-3 py-2 text-xs text-slate-900 font-mono font-bold focus:outline-none focus:border-[var(--color-primary)] focus:ring-2 focus:ring-[var(--color-primary)]/15 transition-all"
                      />
                      <button
                        type="button"
                        onClick={() => setBookingRefId(`DJB-2026-${Math.floor(1000 + Math.random() * 9000)}`)}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] text-[var(--color-primary)] font-bold hover:underline cursor-pointer"
                      >
                        Auto
                      </button>
                    </div>
                  </div>
                </div>

                {/* Row 2: Stay Dates & Times (4-Grid) */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 bg-slate-50/70 p-3.5 rounded-2xl border border-slate-200/70">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                      Check-in Date
                    </label>
                    <input
                      type="date"
                      value={checkInDate}
                      onChange={(e) => setCheckInDate(e.target.value)}
                      className="w-full rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs text-slate-900 font-semibold focus:outline-none focus:border-[var(--color-primary)]"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                      Check-in Time
                    </label>
                    <input
                      type="time"
                      value={checkInTime}
                      onChange={(e) => setCheckInTime(e.target.value)}
                      className="w-full rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs text-slate-900 font-semibold focus:outline-none focus:border-[var(--color-primary)]"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                      Check-out Date
                    </label>
                    <input
                      type="date"
                      value={checkOutDate}
                      onChange={(e) => setCheckOutDate(e.target.value)}
                      className="w-full rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs text-slate-900 font-semibold focus:outline-none focus:border-[var(--color-primary)]"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                      Check-out Time
                    </label>
                    <input
                      type="time"
                      value={checkOutTime}
                      onChange={(e) => setCheckOutTime(e.target.value)}
                      className="w-full rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs text-slate-900 font-semibold focus:outline-none focus:border-[var(--color-primary)]"
                    />
                  </div>
                </div>

                {/* Quick Checkbox Options */}
                <div className="flex flex-wrap items-center gap-4 text-xs font-semibold text-slate-700">
                  <label className="inline-flex items-center gap-2 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={samePlanAllRooms}
                      onChange={(e) => setSamePlanAllRooms(e.target.checked)}
                      className="h-4 w-4 rounded border-slate-300 text-[var(--color-primary)] focus:ring-[var(--color-primary)] cursor-pointer"
                    />
                    <span>Same Plan for All Rooms</span>
                  </label>

                  <label className="inline-flex items-center gap-2 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={payAtHotel}
                      onChange={(e) => setPayAtHotel(e.target.checked)}
                      className="h-4 w-4 rounded border-slate-300 text-[var(--color-primary)] focus:ring-[var(--color-primary)] cursor-pointer"
                    />
                    <span>Pay At Hotel (Post charges to folio)</span>
                  </label>
                </div>

                {/* Category & Meal Plan Selection */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1 border-t border-slate-100">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1.5">
                      Rate Plan
                    </label>
                    <select
                      value={ratePlan}
                      onChange={(e) => setRatePlan(e.target.value)}
                      className="w-full rounded-xl border border-slate-200 bg-slate-50/50 hover:bg-white focus:bg-white px-3 py-2 text-xs text-slate-900 font-semibold focus:outline-none focus:border-[var(--color-primary)] focus:ring-2 focus:ring-[var(--color-primary)]/15 transition-all cursor-pointer"
                    >
                      <option value="Best Available Rates">Best Available Rates (BAR)</option>
                      <option value="Corporate Static 2026">Corporate Static 2026</option>
                      <option value="Member Loyalty Exclusive">Member Loyalty Exclusive</option>
                      <option value="Weekend Escape Package">Weekend Escape Package</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1.5">
                      Category
                    </label>
                    <select
                      value={selectedCategory}
                      onChange={(e) => {
                        const newCat = e.target.value;
                        setSelectedCategory(newCat);
                        const cObj = ROOM_CATEGORIES.find((c) => c.name === newCat);
                        if (cObj) {
                          setRequirements((prev) =>
                            prev.map((r) => ({ ...r, category: newCat, rate: cObj.baseRate }))
                          );
                        }
                      }}
                      className="w-full rounded-xl border border-slate-200 bg-slate-50/50 hover:bg-white focus:bg-white px-3 py-2 text-xs text-slate-900 font-semibold focus:outline-none focus:border-[var(--color-primary)] focus:ring-2 focus:ring-[var(--color-primary)]/15 transition-all cursor-pointer"
                    >
                      {ROOM_CATEGORIES.map((c) => (
                        <option key={c.name} value={c.name}>
                          {c.name} (Base ₹{c.baseRate.toLocaleString('en-IN')})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1.5">
                      Meal Plan
                    </label>
                    <select
                      value={mealPlan}
                      onChange={(e) => setMealPlan(e.target.value)}
                      className="w-full rounded-xl border border-slate-200 bg-slate-50/50 hover:bg-white focus:bg-white px-3 py-2 text-xs text-slate-900 font-semibold focus:outline-none focus:border-[var(--color-primary)] focus:ring-2 focus:ring-[var(--color-primary)]/15 transition-all cursor-pointer"
                    >
                      {MEAL_PLANS.map((mp) => (
                        <option key={mp.code} value={mp.code}>
                          {mp.label} {mp.surcharge > 0 ? `(+₹${mp.surcharge})` : ''}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </section>

              {/* SECTION 2: REQUIREMENTS & ROOMS BREAKDOWN */}
              <section className="bg-white rounded-3xl border border-slate-200/80 p-5 sm:p-6 shadow-[0_2px_12px_-2px_rgba(15,23,42,0.04)] flex flex-col gap-4">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <div className="flex items-center gap-2.5">
                    <span className="flex h-7 w-7 items-center justify-center rounded-xl bg-[var(--color-primary)] text-white font-bold text-xs shadow-xs">
                      2
                    </span>
                    <div>
                      <h2 className="text-sm font-bold text-slate-900">Room Requirements & Allocation</h2>
                      <p className="text-[11px] text-slate-400">Specify guest headcounts, room numbers, and custom pricing overrides</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setOverridePrice(!overridePrice)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all cursor-pointer flex items-center gap-1.5 ${overridePrice
                        ? 'bg-amber-50 border-amber-300 text-amber-800 shadow-2xs'
                        : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                        }`}
                    >
                      <Lucide.Sliders size={12} />
                      <span>{overridePrice ? 'Lock Price' : 'Override Price'}</span>
                    </button>
                    <button
                      type="button"
                      onClick={handleAddRoom}
                      className="px-3 py-1.5 rounded-xl bg-[var(--color-primary)] hover:opacity-95 text-white text-xs font-bold shadow-xs transition-all cursor-pointer flex items-center gap-1"
                    >
                      <Lucide.Plus size={13} />
                      <span>Add Room</span>
                    </button>
                  </div>
                </div>

                {/* Rooms List */}
                <div className="flex flex-col gap-3">
                  {requirements.map((req) => (
                    <div
                      key={req.id}
                      className="rounded-2xl border border-slate-200/90 bg-slate-50/40 p-4 transition-all hover:border-slate-300 flex flex-col gap-3"
                    >
                      {/* Room Row Header */}
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600 font-bold text-xs border border-indigo-100">
                            {req.roomIndex}
                          </span>
                          <span className="text-xs font-extrabold text-slate-900">
                            Room {req.roomIndex} · {req.category}
                          </span>
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200">
                            Clean / Ready
                          </span>
                        </div>

                        <div className="flex items-center gap-2">
                          <span className="text-xs font-extrabold text-slate-900 font-mono">
                            ₹{req.rate.toLocaleString('en-IN')}{' '}
                            <span className="text-[10px] font-normal text-slate-500">/ night</span>
                          </span>
                          {requirements.length > 1 && (
                            <button
                              type="button"
                              onClick={() => handleRemoveRoom(req.id)}
                              className="text-slate-400 hover:text-rose-600 transition-colors p-1"
                              title="Remove Room"
                            >
                              <Lucide.Trash2 size={13} />
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Room Row Parameters */}
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-1">
                        {/* Adults */}
                        <div>
                          <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                            Adults
                          </label>
                          <div className="flex items-center rounded-xl border border-slate-200 bg-white overflow-hidden shadow-2xs">
                            <button
                              type="button"
                              onClick={() => handleUpdateRequirement(req.id, 'adults', Math.max(1, req.adults - 1))}
                              className="px-2.5 py-1.5 text-slate-500 hover:bg-slate-100 font-bold text-xs cursor-pointer"
                            >
                              -
                            </button>
                            <span className="flex-1 text-center text-xs font-bold text-slate-900">{req.adults}</span>
                            <button
                              type="button"
                              onClick={() => handleUpdateRequirement(req.id, 'adults', req.adults + 1)}
                              className="px-2.5 py-1.5 text-slate-500 hover:bg-slate-100 font-bold text-xs cursor-pointer"
                            >
                              +
                            </button>
                          </div>
                        </div>

                        {/* Children */}
                        <div>
                          <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                            Children (6-12)
                          </label>
                          <div className="flex items-center rounded-xl border border-slate-200 bg-white overflow-hidden shadow-2xs">
                            <button
                              type="button"
                              onClick={() => handleUpdateRequirement(req.id, 'children', Math.max(0, req.children - 1))}
                              className="px-2.5 py-1.5 text-slate-500 hover:bg-slate-100 font-bold text-xs cursor-pointer"
                            >
                              -
                            </button>
                            <span className="flex-1 text-center text-xs font-bold text-slate-900">{req.children}</span>
                            <button
                              type="button"
                              onClick={() => handleUpdateRequirement(req.id, 'children', req.children + 1)}
                              className="px-2.5 py-1.5 text-slate-500 hover:bg-slate-100 font-bold text-xs cursor-pointer"
                            >
                              +
                            </button>
                          </div>
                        </div>

                        {/* Infant */}
                        <div>
                          <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                            Infant (&lt;5)
                          </label>
                          <div className="flex items-center rounded-xl border border-slate-200 bg-white overflow-hidden shadow-2xs">
                            <button
                              type="button"
                              onClick={() => handleUpdateRequirement(req.id, 'infant', Math.max(0, req.infant - 1))}
                              className="px-2.5 py-1.5 text-slate-500 hover:bg-slate-100 font-bold text-xs cursor-pointer"
                            >
                              -
                            </button>
                            <span className="flex-1 text-center text-xs font-bold text-slate-900">{req.infant}</span>
                            <button
                              type="button"
                              onClick={() => handleUpdateRequirement(req.id, 'infant', req.infant + 1)}
                              className="px-2.5 py-1.5 text-slate-500 hover:bg-slate-100 font-bold text-xs cursor-pointer"
                            >
                              +
                            </button>
                          </div>
                        </div>

                        {/* Assigned Room Number */}
                        <div>
                          <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                            Room Number
                          </label>
                          <select
                            value={req.roomNo}
                            onChange={(e) => handleUpdateRequirement(req.id, 'roomNo', e.target.value)}
                            className="w-full rounded-xl border border-slate-200 bg-white px-2.5 py-1.5 text-xs text-slate-900 font-bold focus:outline-none focus:border-[var(--color-primary)] cursor-pointer shadow-2xs"
                          >
                            <option value="201">Room 201 (1st Flr)</option>
                            <option value="202">Room 202 (2nd Flr)</option>
                            <option value="203">Room 203 (2nd Flr)</option>
                            <option value="301">Room 301 (3rd Flr)</option>
                            <option value="302">Room 302 (3rd Flr)</option>
                          </select>
                        </div>
                      </div>

                      {/* Custom Rate Override input */}
                      {overridePrice && (
                        <div className="pt-2 border-t border-slate-200/60 flex items-center justify-between gap-3">
                          <span className="text-[11px] font-semibold text-amber-800">
                            Custom Rate Override:
                          </span>
                          <div className="flex items-center gap-1.5">
                            <span className="text-xs font-bold text-slate-500">₹</span>
                            <input
                              type="number"
                              value={req.rate}
                              onChange={(e) => handleUpdateRequirement(req.id, 'rate', Number(e.target.value) || 0)}
                              className="w-28 rounded-lg border border-amber-300 bg-amber-50/50 px-2.5 py-1 text-xs font-bold font-mono text-slate-900 focus:outline-none focus:border-amber-500"
                            />
                            <span className="text-[10px] text-slate-500">/ night</span>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>

                {/* Subtotals & Taxes calculation breakdown */}
                <div className="bg-slate-50/80 rounded-2xl p-4 border border-slate-200/70 flex flex-col gap-2 text-xs">
                  <div className="flex items-center justify-between text-slate-600">
                    <span>Total Selected Rooms</span>
                    <span className="font-bold text-slate-900">{requirements.length} Room(s) · {nightsCount} Night(s)</span>
                  </div>
                  <div className="flex items-center justify-between text-slate-600">
                    <span>Room Charges Subtotal</span>
                    <span className="font-bold font-mono text-slate-900">₹{roomCharges.toLocaleString('en-IN')}.00</span>
                  </div>
                  <div className="flex items-center justify-between text-slate-600">
                    <span>Applicable GST (5%)</span>
                    <span className="font-bold font-mono text-slate-900">₹{taxAmount.toLocaleString('en-IN')}.00</span>
                  </div>
                  <div className="h-[1px] bg-slate-200 my-0.5" />
                  <div className="flex items-center justify-between text-sm font-bold text-slate-900">
                    <span>Requirements Total</span>
                    <span className="font-mono text-emerald-700">₹{totalBill.toLocaleString('en-IN')}.00</span>
                  </div>
                </div>
              </section>

              {/* SECTION 3: GUEST DETAILS & PROFILE SEARCH */}
              <section className="bg-white rounded-3xl border border-slate-200/80 p-5 sm:p-6 shadow-[0_2px_12px_-2px_rgba(15,23,42,0.04)] flex flex-col gap-4">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <div className="flex items-center gap-2.5">
                    <span className="flex h-7 w-7 items-center justify-center rounded-xl bg-[var(--color-primary)] text-white font-bold text-xs shadow-xs">
                      3
                    </span>
                    <div>
                      <h2 className="text-sm font-bold text-slate-900">Guest Information & Verification</h2>
                      <p className="text-[11px] text-slate-400">Search existing CRM profiles or register fresh visitor identity</p>
                    </div>
                  </div>

                  <span className="text-[11px] font-bold text-slate-500 bg-slate-50 border border-slate-200/80 px-2.5 py-1 rounded-lg">
                    Primary Resident
                  </span>
                </div>

                {/* Live Guest Search Bar */}
                <div className="relative">
                  <div className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-slate-50/50 px-3.5 py-2.5 text-xs text-slate-900 shadow-2xs focus-within:bg-white focus-within:border-[var(--color-primary)] focus-within:ring-2 focus-within:ring-[var(--color-primary)]/15 transition-all">
                    <Lucide.Search size={15} className="text-slate-400 shrink-0" />
                    <input
                      type="text"
                      value={guestSearch}
                      onChange={(e) => {
                        setGuestSearch(e.target.value);
                        setShowGuestSearchDropdown(true);
                      }}
                      onFocus={() => setShowGuestSearchDropdown(true)}
                      placeholder="Quick search by name, contact phone, or guest reference..."
                      className="w-full bg-transparent border-none outline-none placeholder:text-slate-400 text-xs text-slate-900 font-medium"
                    />
                    {guestSearch && (
                      <button
                        type="button"
                        onClick={() => {
                          setGuestSearch('');
                          setShowGuestSearchDropdown(false);
                        }}
                        className="text-slate-400 hover:text-slate-600"
                      >
                        <Lucide.X size={14} />
                      </button>
                    )}
                  </div>

                  {/* Dropdown with guest database */}
                  {showGuestSearchDropdown && guestSearch && (
                    <div className="absolute left-0 right-0 top-full mt-1.5 z-20 rounded-2xl border border-slate-200 bg-white p-2 shadow-xl">
                      <div className="text-[10px] font-bold text-slate-400 uppercase px-2 py-1">
                        Matching Profiles in PMS
                      </div>
                      {SAMPLE_GUEST_DATABASE.filter(
                        (g) =>
                          g.name.toLowerCase().includes(guestSearch.toLowerCase()) ||
                          g.phone.includes(guestSearch)
                      ).map((g) => (
                        <button
                          key={g.id}
                          type="button"
                          onClick={() => {
                            setGuestName(g.name);
                            setGuestContact(g.phone);
                            setGuestEmail(g.email);
                            if (g.gst) {
                              setCompanyGst(g.gst);
                              setBillToCompany(true);
                            }
                            setShowGuestSearchDropdown(false);
                            setGuestSearch('');
                            toast.success('Guest Profile Loaded', { detail: `${g.name} (${g.city})` });
                          }}
                          className="w-full flex items-center justify-between p-2 rounded-xl hover:bg-slate-50 transition-colors text-left cursor-pointer"
                        >
                          <div>
                            <span className="font-bold text-slate-900 text-xs block">{g.name}</span>
                            <span className="text-[11px] text-slate-500">{g.phone} · {g.email}</span>
                          </div>
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-600">
                            {g.city}
                          </span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Form fields */}
                <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                  <div className="sm:col-span-1">
                    <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1.5">
                      Salutation
                    </label>
                    <select
                      value={guestSalutation}
                      onChange={(e) => setGuestSalutation(e.target.value)}
                      className="w-full rounded-xl border border-slate-200 bg-slate-50/50 hover:bg-white focus:bg-white px-3 py-2 text-xs text-slate-900 font-semibold focus:outline-none focus:border-[var(--color-primary)] focus:ring-2 focus:ring-[var(--color-primary)]/15 transition-all cursor-pointer"
                    >
                      <option value="Mr.">Mr.</option>
                      <option value="Ms.">Ms.</option>
                      <option value="Mrs.">Mrs.</option>
                      <option value="Dr.">Dr.</option>
                    </select>
                  </div>

                  <div className="sm:col-span-3">
                    <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1.5">
                      Full Legal Name <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={guestName}
                      onChange={(e) => setGuestName(e.target.value)}
                      placeholder="e.g. Rohan Sharma"
                      className="w-full rounded-xl border border-slate-200 bg-slate-50/50 hover:bg-white focus:bg-white px-3.5 py-2 text-xs text-slate-900 font-semibold focus:outline-none focus:border-[var(--color-primary)] focus:ring-2 focus:ring-[var(--color-primary)]/15 transition-all"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1.5">
                      Phone Number <span className="text-rose-500">*</span>
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        value={guestContact}
                        onChange={(e) => setGuestContact(e.target.value)}
                        placeholder="e.g. +91 88829 51951"
                        className="w-full rounded-xl border border-slate-200 bg-slate-50/50 hover:bg-white focus:bg-white px-3.5 py-2 text-xs text-slate-900 font-semibold focus:outline-none focus:border-[var(--color-primary)] focus:ring-2 focus:ring-[var(--color-primary)]/15 transition-all"
                      />
                      <Lucide.Phone size={13} className="text-slate-400 absolute right-3 top-1/2 -translate-y-1/2" />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1.5">
                      Email Address
                    </label>
                    <div className="relative">
                      <input
                        type="email"
                        value={guestEmail}
                        onChange={(e) => setGuestEmail(e.target.value)}
                        placeholder="e.g. guest@example.com"
                        className="w-full rounded-xl border border-slate-200 bg-slate-50/50 hover:bg-white focus:bg-white px-3.5 py-2 text-xs text-slate-900 font-semibold focus:outline-none focus:border-[var(--color-primary)] focus:ring-2 focus:ring-[var(--color-primary)]/15 transition-all"
                      />
                      <Lucide.Mail size={13} className="text-slate-400 absolute right-3 top-1/2 -translate-y-1/2" />
                    </div>
                  </div>
                </div>

                {/* ID Verification Row */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1 border-t border-slate-100">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1.5">
                      Identity Document
                    </label>
                    <select
                      value={guestIdType}
                      onChange={(e) => setGuestIdType(e.target.value)}
                      className="w-full rounded-xl border border-slate-200 bg-slate-50/50 hover:bg-white focus:bg-white px-3 py-2 text-xs text-slate-900 font-semibold focus:outline-none focus:border-[var(--color-primary)] focus:ring-2 focus:ring-[var(--color-primary)]/15 transition-all cursor-pointer"
                    >
                      <option value="Aadhaar Card">Aadhaar Card</option>
                      <option value="Passport">Passport</option>
                      <option value="Driving License">Driving License</option>
                      <option value="Voter ID">Voter ID</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1.5">
                      Document Number
                    </label>
                    <input
                      type="text"
                      value={guestIdNumber}
                      onChange={(e) => setGuestIdNumber(e.target.value)}
                      placeholder="e.g. 9842 1290 8731"
                      className="w-full rounded-xl border border-slate-200 bg-slate-50/50 hover:bg-white focus:bg-white px-3.5 py-2 text-xs text-slate-900 font-mono font-bold focus:outline-none focus:border-[var(--color-primary)] focus:ring-2 focus:ring-[var(--color-primary)]/15 transition-all"
                    />
                  </div>
                </div>

                {/* Special Requests */}
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1.5">
                    Front Desk & Stay Notes
                  </label>
                  <textarea
                    rows={2}
                    value={specialRequests}
                    onChange={(e) => setSpecialRequests(e.target.value)}
                    placeholder="Guest preferences, arrival notes, or housekeeping requests..."
                    className="w-full rounded-xl border border-slate-200 bg-slate-50/50 hover:bg-white focus:bg-white p-3 text-xs text-slate-900 focus:outline-none focus:border-[var(--color-primary)] focus:ring-2 focus:ring-[var(--color-primary)]/15 transition-all resize-none"
                  />
                </div>
              </section>

              {/* SECTION 4: PAYMENTS & SUMMARY BREAKDOWN */}
              <section className="bg-white rounded-3xl border border-slate-200/80 p-5 sm:p-6 shadow-[0_2px_12px_-2px_rgba(15,23,42,0.04)] flex flex-col gap-4">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <div className="flex items-center gap-2.5">
                    <span className="flex h-7 w-7 items-center justify-center rounded-xl bg-[var(--color-primary)] text-white font-bold text-xs shadow-xs">
                      4
                    </span>
                    <div>
                      <h2 className="text-sm font-bold text-slate-900">Payments & Master Folio Summary</h2>
                      <p className="text-[11px] text-slate-400">Payment receipts, advances collected & outstanding balance</p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      setCollectAmount(String(outstanding));
                      setCollectModalOpen(true);
                    }}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold shadow-xs transition-all cursor-pointer"
                  >
                    <Lucide.Banknote size={13} />
                    <span>Collect Payment</span>
                  </button>
                </div>

                {/* Payments Recorded List */}
                {paymentsList.length > 0 ? (
                  <div className="flex flex-col gap-2">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                      Recorded Transactions
                    </span>
                    {paymentsList.map((p) => (
                      <div
                        key={p.id}
                        className="flex items-center justify-between p-3 rounded-xl border border-slate-200/80 bg-slate-50/60 text-xs"
                      >
                        <div className="flex items-center gap-2.5">
                          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-100 text-emerald-700">
                            <Lucide.Check size={14} />
                          </div>
                          <div>
                            <span className="font-bold text-slate-900 block">{p.method}</span>
                            <span className="text-[10px] text-slate-500 font-mono">Ref: {p.ref} · {p.time}</span>
                          </div>
                        </div>
                        <span className="font-extrabold font-mono text-emerald-700">
                          ₹{p.amount.toLocaleString('en-IN')}.00
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="rounded-2xl border border-dashed border-slate-200 p-4 text-center text-xs text-slate-500 bg-slate-50/30">
                    No advance payments recorded yet. Click <strong>Collect Payment</strong> to record an advance or deposit.
                  </div>
                )}

                {/* Payment Notes */}
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1.5">
                    Payment & Accounting Notes
                  </label>
                  <input
                    type="text"
                    value={paymentNotes}
                    onChange={(e) => setPaymentNotes(e.target.value)}
                    placeholder="e.g. Card pre-authorization held or UPI transaction reference..."
                    className="w-full rounded-xl border border-slate-200 bg-slate-50/50 hover:bg-white focus:bg-white px-3.5 py-2 text-xs text-slate-900 font-semibold focus:outline-none focus:border-[var(--color-primary)] transition-all"
                  />
                </div>

                {/* Itemized Bill Summary Table */}
                <div className="rounded-2xl border border-slate-200/90 bg-white p-4 flex flex-col gap-2 text-xs">
                  <div className="flex items-center justify-between text-slate-600">
                    <span>Room Charges ({requirements.length} room, {nightsCount} night)</span>
                    <span className="font-semibold font-mono text-slate-900">₹{roomCharges.toLocaleString('en-IN')}.00</span>
                  </div>

                  <div className="flex items-center justify-between text-slate-600">
                    <span>Add-ons / Food Services</span>
                    <span className="font-semibold font-mono text-slate-900">₹0.00</span>
                  </div>

                  <div className="flex items-center justify-between text-slate-600">
                    <div className="flex items-center gap-1.5">
                      <span>Discount Applied</span>
                      <span className="text-[10px] text-slate-400 font-medium">(Editable)</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <span className="text-slate-400 font-mono text-xs">-₹</span>
                      <input
                        type="number"
                        min="0"
                        value={discountAmount || ''}
                        onChange={(e) => setDiscountAmount(Math.max(0, Number(e.target.value) || 0))}
                        placeholder="0"
                        className="w-20 rounded-lg border border-slate-200 bg-slate-50 px-2 py-0.5 text-right font-mono font-bold text-xs text-slate-800 focus:outline-none focus:border-[var(--color-primary)]"
                      />
                    </div>
                  </div>

                  <div className="h-[1px] bg-slate-100 my-0.5" />

                  <div className="flex items-center justify-between font-bold text-slate-700">
                    <span>Sub-Total</span>
                    <span className="font-mono text-slate-900">₹{subTotal.toLocaleString('en-IN')}.00</span>
                  </div>

                  <div className="flex items-center justify-between text-slate-600">
                    <span>Goods & Services Tax (GST 5%)</span>
                    <span className="font-semibold font-mono text-slate-900">₹{taxAmount.toLocaleString('en-IN')}.00</span>
                  </div>

                  <div className="flex items-center justify-between text-emerald-700 font-bold">
                    <span>Payments Received</span>
                    <span className="font-mono">₹{totalPaid.toLocaleString('en-IN')}.00</span>
                  </div>

                  <div className="h-[1px] bg-slate-200 my-1" />

                  <div className="flex items-center justify-between text-sm font-extrabold text-slate-900 pt-0.5">
                    <span>Net Payable at Hotel</span>
                    <span className="font-mono text-base text-[var(--color-primary)]">
                      ₹{outstanding.toLocaleString('en-IN')}.00
                    </span>
                  </div>
                </div>
              </section>

            </div>
          )}

          {/* OUTLET / POS ADDONS TAB */}
          {activeTab === 'outlet' && (
            <div className="bg-white rounded-3xl border border-slate-200/80 p-6 shadow-xs flex flex-col gap-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2">
                  <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-amber-50 text-amber-600">
                    <Lucide.Receipt size={16} />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-900">Outlet & Point of Sale Charges</h3>
                    <p className="text-[11px] text-slate-500">Route restaurant orders, spa treatments, or laundry to room folio</p>
                  </div>
                </div>
                <span className="text-xs font-bold text-slate-500">0 Active Outlets</span>
              </div>

              <div className="rounded-2xl border border-dashed border-slate-200 p-8 text-center flex flex-col items-center justify-center gap-2">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-50 text-slate-400">
                  <Lucide.UtensilsCrossed size={22} />
                </div>
                <h4 className="text-xs font-bold text-slate-800">No Outlet Charges Incurred</h4>
                <p className="text-[11px] text-slate-500 max-w-sm">
                  Outlet charges (Bar, Restaurant, Laundry) can be posted to Room {requirements[0]?.roomNo || '202'} after check-in.
                </p>
                <button
                  type="button"
                  onClick={() => toast.info('POS Outlet', { detail: 'Outlet charge simulator available once checked in.' })}
                  className="mt-2 px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs cursor-pointer"
                >
                  Post Direct Charge
                </button>
              </div>
            </div>
          )}

          {/* BILLING PREFERENCES TAB */}
          {activeTab === 'preferences' && (
            <div className="bg-white rounded-3xl border border-slate-200/80 p-6 shadow-xs flex flex-col gap-4">
              <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
                  <Lucide.Sliders size={16} />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Billing Routing & Corporate Invoicing</h3>
                  <p className="text-[11px] text-slate-500">Configure folio settlement routing, company accounts & credit rules</p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1.5">
                    Room Bill Routing
                  </label>
                  <select
                    value={roomBillTo}
                    onChange={(e) => setRoomBillTo(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50/50 hover:bg-white focus:bg-white px-3 py-2 text-xs text-slate-900 font-semibold focus:outline-none focus:border-[var(--color-primary)] cursor-pointer"
                  >
                    <option value="To Guest">To Guest (Direct Settlement)</option>
                    <option value="To Company">To Company Account</option>
                    <option value="To Travel Agent">To Travel Agent / OTA Voucher</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1.5">
                    Extras & Minibar Routing
                  </label>
                  <select
                    value={extrasBillTo}
                    onChange={(e) => setExtrasBillTo(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50/50 hover:bg-white focus:bg-white px-3 py-2 text-xs text-slate-900 font-semibold focus:outline-none focus:border-[var(--color-primary)] cursor-pointer"
                  >
                    <option value="To Guest">To Guest (Direct Settlement)</option>
                    <option value="To Company">To Company Account</option>
                  </select>
                </div>
              </div>

              <div className="flex flex-col gap-3 pt-2 border-t border-slate-100 text-xs">
                <label className="inline-flex items-center gap-2 cursor-pointer font-semibold text-slate-700">
                  <input
                    type="checkbox"
                    checked={billToCompany}
                    onChange={(e) => setBillToCompany(e.target.checked)}
                    className="h-4 w-4 rounded border-slate-300 text-[var(--color-primary)] cursor-pointer"
                  />
                  <span>Bill To Corporate / Company Account</span>
                </label>

                {billToCompany && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pl-6 pt-1">
                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                        Company Name
                      </label>
                      <input
                        type="text"
                        value={companyName}
                        onChange={(e) => setCompanyName(e.target.value)}
                        placeholder="e.g. Zenith Tech Solutions Pvt Ltd"
                        className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-900 font-medium"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                        Corporate GSTIN
                      </label>
                      <input
                        type="text"
                        value={companyGst}
                        onChange={(e) => setCompanyGst(e.target.value)}
                        placeholder="e.g. 27AABCT1234A1Z5"
                        className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-900 font-mono font-bold"
                      />
                    </div>
                  </div>
                )}

                <label className="inline-flex items-center gap-2 cursor-pointer font-semibold text-slate-700">
                  <input
                    type="checkbox"
                    checked={noPost}
                    onChange={(e) => setNoPost(e.target.checked)}
                    className="h-4 w-4 rounded border-slate-300 text-[var(--color-primary)] cursor-pointer"
                  />
                  <span>No Post (Block guest from charging extras/minibar to room)</span>
                </label>
              </div>
            </div>
          )}

        </div>

        {/* ================= RIGHT COLUMN: TASKS, CHECKLIST & FRONT DESK LOG ================= */}
        <div className="flex flex-col gap-4">

          {/* Front Desk Tasks Panel */}
          <div className="bg-white rounded-3xl border border-slate-200/90 shadow-[0_4px_20px_-5px_rgba(15,23,42,0.05)] p-5 flex flex-col gap-3.5">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="flex h-7 w-7 items-center justify-center rounded-xl bg-amber-50 text-amber-600">
                  <Lucide.CheckSquare size={15} />
                </div>
                <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                  Checklist & Tasks
                </h3>
              </div>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700">
                {tasks.filter((t) => t.done).length}/{tasks.length} Done
              </span>
            </div>

            {/* Task Items */}
            <div className="flex flex-col gap-2">
              {tasks.map((task) => (
                <div
                  key={task.id}
                  onClick={() => handleToggleTask(task.id)}
                  className={`flex items-start gap-2.5 p-2.5 rounded-xl border transition-all cursor-pointer ${task.done
                    ? 'bg-slate-50 border-slate-200/60 opacity-60'
                    : 'bg-white border-slate-200 hover:border-slate-300 shadow-2xs'
                    }`}
                >
                  <button
                    type="button"
                    className={`mt-0.5 flex h-4 w-4 items-center justify-center rounded border transition-colors ${task.done
                      ? 'bg-emerald-500 border-emerald-500 text-white'
                      : 'border-slate-300 bg-white'
                      }`}
                  >
                    {task.done && <Lucide.Check size={11} />}
                  </button>
                  <span
                    className={`text-xs flex-1 ${task.done ? 'line-through text-slate-400 font-normal' : 'font-semibold text-slate-800'
                      }`}
                  >
                    {task.text}
                  </span>
                </div>
              ))}
            </div>

            {/* Quick Add Task Input */}
            <div className="flex items-center gap-1.5 pt-1">
              <input
                type="text"
                value={newTaskInput}
                onChange={(e) => setNewTaskInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleAddTask()}
                placeholder="Add front desk task..."
                className="flex-1 rounded-xl border border-slate-200 bg-slate-50/50 hover:bg-white focus:bg-white px-3 py-1.5 text-xs text-slate-900 focus:outline-none focus:border-[var(--color-primary)]"
              />
              <button
                type="button"
                onClick={handleAddTask}
                className="flex h-8 w-8 items-center justify-center rounded-xl bg-slate-900 text-white hover:bg-slate-800 transition-colors cursor-pointer shrink-0"
              >
                <Lucide.Plus size={14} />
              </button>
            </div>
          </div>

          {/* Reservation Audit & Timestamp Card */}
          <div className="bg-white rounded-3xl border border-slate-200/90 shadow-2xs p-5 flex flex-col gap-3 text-xs">
            <div className="flex items-center gap-2 text-slate-900 font-bold text-xs uppercase tracking-wider">
              <Lucide.Clock size={14} className="text-slate-400" />
              <span>Audit Trail</span>
            </div>

            <div className="flex flex-col gap-2 text-[11px] text-slate-600">
              <div className="flex justify-between">
                <span className="text-slate-400">Created:</span>
                <span className="font-semibold text-slate-800">Today, 13:45 hrs</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Created By:</span>
                <span className="font-semibold text-slate-800">Front Desk (Admin)</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">System Source:</span>
                <span className="font-semibold text-slate-800">Direct Portal / Desk</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Folio ID:</span>
                <span className="font-mono font-bold text-slate-900">{bookingRefId}</span>
              </div>
            </div>
          </div>

        </div>

      </div>

      {/* ================= FLOATING ACTION DOCK (BOTTOM BAR) ================= */}
      <div className="fixed bottom-4 left-4 right-4 sm:left-auto sm:right-6 sm:max-w-3xl z-40">
        <div className="backdrop-blur-md bg-white/95 rounded-2xl border border-slate-200/90 p-3 sm:px-4 shadow-[0_12px_36px_-6px_rgba(15,23,42,0.18)] flex items-center justify-between gap-3">

          {/* Left: Report an issue */}
          <button
            type="button"
            onClick={() => setIssueModalOpen(true)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-rose-200 bg-rose-50/70 hover:bg-rose-100/80 text-rose-700 text-xs font-bold transition-colors cursor-pointer"
          >
            <Lucide.AlertCircle size={14} />
            <span className="hidden sm:inline">Report Issue</span>
          </button>

          {/* Center: Live Total Ticker */}
          <div className="hidden md:flex items-center gap-2 text-xs font-bold px-3 py-1.5 rounded-xl bg-slate-50 border border-slate-200/60">
            <span className="text-slate-500">{requirements.length} Room(s) · {nightsCount} Night(s)</span>
            <span className="h-3 w-[1px] bg-slate-300" />
            <span className="font-mono text-slate-900">₹{totalBill.toLocaleString('en-IN')}.00</span>
          </div>

          {/* Right: Actions */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => go({ view: 'reservations' })}
              className="px-3.5 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => {
                setCollectAmount(String(outstanding));
                setCollectModalOpen(true);
              }}
              className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 active:bg-amber-700 text-white text-xs font-bold shadow-xs transition-all cursor-pointer flex items-center gap-1.5"
            >
              <Lucide.Banknote size={14} />
              <span>Save & Pay</span>
            </button>
            <button
              type="button"
              onClick={() => handleConfirmReservation(true)}
              className="px-5 py-2 rounded-xl bg-[var(--color-primary)] hover:opacity-95 text-white text-xs font-bold shadow-md shadow-[var(--color-primary)]/20 transition-all cursor-pointer flex items-center gap-1.5"
            >
              <Lucide.CheckCircle2 size={14} />
              <span>Confirm & Email</span>
            </button>
          </div>

        </div>
      </div>

      {/* ================= PAYMENT COLLECT MODAL ================= */}
      {collectModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/40 backdrop-blur-xs">
          <div className="bg-white rounded-3xl border border-slate-200 max-w-md w-full p-6 shadow-2xl flex flex-col gap-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-amber-50 text-amber-600">
                  <Lucide.Banknote size={18} />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Collect Folio Payment</h3>
                  <p className="text-[11px] text-slate-400">Record advance or settle outstanding bill</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setCollectModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <Lucide.X size={16} />
              </button>
            </div>

            <div className="flex flex-col gap-3">
              <div>
                <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1.5">
                  Payment Amount (₹)
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 font-bold text-slate-400">₹</span>
                  <input
                    type="number"
                    value={collectAmount}
                    onChange={(e) => setCollectAmount(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50/50 hover:bg-white focus:bg-white pl-8 pr-4 py-2.5 text-sm font-bold font-mono text-slate-900 focus:outline-none focus:border-[var(--color-primary)]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1.5">
                  Payment Mode
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {(['UPI / QR', 'Credit Card', 'Debit Card', 'Cash'] as const).map((method) => (
                    <button
                      key={method}
                      type="button"
                      onClick={() => setCollectMethod(method)}
                      className={`py-2 px-3 rounded-xl border text-xs font-bold transition-all cursor-pointer ${collectMethod === method
                        ? 'bg-[var(--color-primary)] text-white border-transparent shadow-xs'
                        : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                        }`}
                    >
                      {method}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1.5">
                  Transaction / Slip Reference
                </label>
                <input
                  type="text"
                  value={collectRef}
                  onChange={(e) => setCollectRef(e.target.value)}
                  placeholder="e.g. UPI-984210982 / POS Approval Code"
                  className="w-full rounded-xl border border-slate-200 bg-slate-50/50 hover:bg-white focus:bg-white px-3.5 py-2 text-xs text-slate-900 font-mono"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setCollectModalOpen(false)}
                className="px-4 py-2 rounded-xl border border-slate-200 text-slate-700 text-xs font-bold hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleRecordPayment}
                className="px-5 py-2 rounded-xl bg-[var(--color-primary)] text-white text-xs font-bold hover:opacity-95 shadow-xs"
              >
                Confirm Payment
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================= REPORT ISSUE MODAL ================= */}
      {issueModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/40 backdrop-blur-xs">
          <div className="bg-white rounded-3xl border border-slate-200 max-w-md w-full p-6 shadow-2xl flex flex-col gap-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-rose-50 text-rose-600">
                  <Lucide.AlertCircle size={18} />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Report Reservation Issue</h3>
                  <p className="text-[11px] text-slate-400">Escalate an allotment, rate, or sync issue</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIssueModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <Lucide.X size={16} />
              </button>
            </div>

            <textarea
              rows={3}
              value={issueText}
              onChange={(e) => setIssueText(e.target.value)}
              placeholder="Describe the issue (e.g. rate mismatch on OTA, room allocation conflict)..."
              className="w-full rounded-xl border border-slate-200 p-3 text-xs text-slate-900 focus:outline-none focus:border-[var(--color-primary)] resize-none"
            />

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setIssueModalOpen(false)}
                className="px-4 py-2 rounded-xl border border-slate-200 text-slate-700 text-xs font-bold hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  toast.success('Issue Submitted', { detail: 'Escalated to IT & Duty Manager.' });
                  setIssueModalOpen(false);
                  setIssueText('');
                }}
                className="px-5 py-2 rounded-xl bg-rose-600 text-white text-xs font-bold hover:bg-rose-700 shadow-xs"
              >
                Submit Ticket
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Theme Swatcher Modal Drawer */}
      <ThemeSwatcher open={swatcherOpen} onClose={() => setSwatcherOpen(false)} />
    </div>
  );
}
