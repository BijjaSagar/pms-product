import { useState } from 'react';
import * as Lucide from 'lucide-react';
import { toast } from '../components/toastStore';
import { Modal } from '../components/overlays';

interface RatePlanItem {
  id: string;
  name: string;
  roomTypes: string;
  channels: string;
  status: 'Active' | 'Inactive' | 'Scheduled';
  description?: string;
  mealPlan?: string;
  cancellationPolicy?: string;
}

interface SeasonItem {
  id: string;
  name: string;
  period: string;
  adjustment: string;
  isPositive: boolean;
  status: 'Active' | 'Scheduled' | 'Expired';
}

interface MatrixDate {
  day: string;
  month: string;
  weekday: string;
  isWeekend: boolean;
}

export function RateManagement() {
  // Filter States
  const [selectedRoomType, setSelectedRoomType] = useState('Deluxe');
  const [selectedRatePlan, setSelectedRatePlan] = useState('Best Available Rate (BAR)');
  const [selectedChannel, setSelectedChannel] = useState('all');
  const [activeTab, setActiveTab] = useState<'calendar' | 'plans' | 'seasonality' | 'restrictions' | 'mapping' | 'bulk' | 'history'>('calendar');
  const [viewBy, setViewBy] = useState('Room Type');

  // Modals state
  const [showCreatePlanModal, setShowCreatePlanModal] = useState(false);
  const [showAddSeasonModal, setShowAddSeasonModal] = useState(false);
  const [showBulkUpdateModal, setShowBulkUpdateModal] = useState(false);
  const [showEditPlanModal, setShowEditPlanModal] = useState(false);
  const [selectedPlanForMenu, setSelectedPlanForMenu] = useState<string | null>(null);

  // New Rate Plan Form State
  const [newPlanName, setNewPlanName] = useState('');
  const [newPlanCode, setNewPlanCode] = useState('');
  const [newPlanMeal, setNewPlanMeal] = useState('Room Only');
  const [newPlanCancel, setNewPlanCancel] = useState('Free cancellation up to 24 hours');
  const [newPlanAdjustment, setNewPlanAdjustment] = useState('0');

  // New Season Form State
  const [newSeasonName, setNewSeasonName] = useState('');
  const [newSeasonStart, setNewSeasonStart] = useState('2026-11-01');
  const [newSeasonEnd, setNewSeasonEnd] = useState('2026-11-15');
  const [newSeasonAdj, setNewSeasonAdj] = useState('+20%');

  // Matrix 15 Dates (Oct 14 - Oct 28, 2026)
  const matrixDates: MatrixDate[] = [
    { day: '14', month: 'Oct', weekday: 'Wed', isWeekend: false },
    { day: '15', month: 'Oct', weekday: 'Thu', isWeekend: false },
    { day: '16', month: 'Oct', weekday: 'Fri', isWeekend: false },
    { day: '17', month: 'Oct', weekday: 'Sat', isWeekend: true },
    { day: '18', month: 'Oct', weekday: 'Sun', isWeekend: true },
    { day: '19', month: 'Oct', weekday: 'Mon', isWeekend: false },
    { day: '20', month: 'Oct', weekday: 'Tue', isWeekend: false },
    { day: '21', month: 'Oct', weekday: 'Wed', isWeekend: false },
    { day: '22', month: 'Oct', weekday: 'Thu', isWeekend: false },
    { day: '23', month: 'Oct', weekday: 'Fri', isWeekend: false },
    { day: '24', month: 'Oct', weekday: 'Sat', isWeekend: true },
    { day: '25', month: 'Oct', weekday: 'Sun', isWeekend: true },
    { day: '26', month: 'Oct', weekday: 'Mon', isWeekend: false },
    { day: '27', month: 'Oct', weekday: 'Tue', isWeekend: false },
    { day: '28', month: 'Oct', weekday: 'Wed', isWeekend: false },
  ];

  // Editable Matrix Values
  const [baseRates, setBaseRates] = useState<number[]>([
    8500, 8500, 9000, 9500, 9500, 8500, 8500, 8500, 9000, 9500, 9500, 8500, 8500, 8500, 8500,
  ]);
  const [minStays, setMinStays] = useState<number[]>([
    1, 1, 1, 2, 2, 1, 1, 1, 1, 2, 2, 1, 1, 1, 1,
  ]);
  const [maxStays, setMaxStays] = useState<number[]>([
    14, 14, 14, 14, 14, 14, 14, 14, 14, 14, 14, 14, 14, 14, 14,
  ]);
  const [closedToArrival, setClosedToArrival] = useState<boolean[]>([
    false, false, false, true, true, false, false, false, false, false, true, true, false, false, false,
  ]);
  const [closedToDeparture, setClosedToDeparture] = useState<boolean[]>([
    false, false, false, true, true, false, false, false, false, false, true, true, false, false, false,
  ]);
  const [stopSell, setStopSell] = useState<boolean[]>([
    false, false, false, false, false, false, false, false, false, false, false, false, false, false, false,
  ]);

  const totalAvailableRooms = [15, 15, 12, 8, 8, 15, 15, 15, 12, 8, 8, 15, 15, 15, 15];
  const expectedDemand: ('Medium' | 'High')[] = [
    'Medium', 'Medium', 'High', 'High', 'High', 'Medium', 'Medium', 'Medium', 'High', 'High', 'High', 'Medium', 'Medium', 'Medium', 'Medium',
  ];

  // Rate Plans List
  const [ratePlans, setRatePlans] = useState<RatePlanItem[]>([
    {
      id: 'bar',
      name: 'Best Available Rate (BAR)',
      roomTypes: 'All Rooms',
      channels: '6 channels',
      status: 'Active',
      description: 'Flexible rate with no restrictions. Available across all channels.',
      mealPlan: 'Room Only',
      cancellationPolicy: 'Free cancellation up to 24 hours',
    },
    {
      id: 'advance',
      name: 'Advance Purchase',
      roomTypes: 'All Rooms',
      channels: '6 channels',
      status: 'Active',
      description: 'Non-refundable rate with 15% discount for bookings made 14 days in advance.',
      mealPlan: 'Room Only',
      cancellationPolicy: 'Non-refundable',
    },
    {
      id: 'lastminute',
      name: 'Last Minute Deal',
      roomTypes: 'Standard, Deluxe',
      channels: '4 channels',
      status: 'Active',
      description: 'Discounted rate for reservations made within 48 hours of check-in.',
      mealPlan: 'Room Only',
      cancellationPolicy: 'Free cancellation up to 6 hours',
    },
    {
      id: 'corporate',
      name: 'Corporate Rate',
      roomTypes: 'All Rooms',
      channels: '3 channels',
      status: 'Inactive',
      description: 'Negotiated flat corporate rate for business partners and accounts.',
      mealPlan: 'Breakfast Included',
      cancellationPolicy: 'Free cancellation up to 48 hours',
    },
    {
      id: 'member',
      name: 'Member Discount',
      roomTypes: 'All Rooms',
      channels: '6 channels',
      status: 'Active',
      description: 'Exclusive 10% loyalty member rate applicable across direct and OTA programs.',
      mealPlan: 'Breakfast Included',
      cancellationPolicy: 'Free cancellation up to 24 hours',
    },
    {
      id: 'longstay',
      name: 'Long Stay Rate',
      roomTypes: 'Suites',
      channels: '4 channels',
      status: 'Active',
      description: 'Special weekly/monthly package with complimentary laundry and airport pickup.',
      mealPlan: 'Breakfast Included',
      cancellationPolicy: 'Free cancellation up to 72 hours',
    },
  ]);

  // Seasonal Pricing List
  const [seasons, setSeasons] = useState<SeasonItem[]>([
    { id: '1', name: 'Peak Season', period: 'Dec 20 – Jan 10', adjustment: '+30%', isPositive: true, status: 'Active' },
    { id: '2', name: 'Summer Holiday', period: 'Apr 01 – Jun 15', adjustment: '+20%', isPositive: true, status: 'Active' },
    { id: '3', name: 'Monsoon Special', period: 'Jul 01 – Sep 15', adjustment: '-15%', isPositive: false, status: 'Active' },
    { id: '4', name: 'Diwali Festive', period: 'Oct 20 – Nov 10', adjustment: '+25%', isPositive: true, status: 'Scheduled' },
    { id: '5', name: 'New Year', period: 'Dec 28 – Jan 02', adjustment: '+40%', isPositive: true, status: 'Active' },
  ]);

  // Bulk clone across all dates
  const handleCloneRow = (type: 'baseRate' | 'minStay' | 'maxStay' | 'cta' | 'ctd' | 'stopSell') => {
    if (type === 'baseRate') {
      const firstVal = baseRates[0];
      setBaseRates(Array(15).fill(firstVal));
      toast(`Copied Base Rate (₹${firstVal.toLocaleString('en-IN')}) across all 15 dates`, { tone: 'success' });
    } else if (type === 'minStay') {
      const firstVal = minStays[0];
      setMinStays(Array(15).fill(firstVal));
      toast(`Copied Min Stay (${firstVal} night) across all 15 dates`, { tone: 'success' });
    } else if (type === 'maxStay') {
      const firstVal = maxStays[0];
      setMaxStays(Array(15).fill(firstVal));
      toast(`Copied Max Stay (${firstVal} nights) across all 15 dates`, { tone: 'success' });
    } else if (type === 'cta') {
      const firstVal = closedToArrival[0];
      setClosedToArrival(Array(15).fill(firstVal));
      toast(`Closed to Arrival rule copied to all dates`, { tone: 'info' });
    } else if (type === 'ctd') {
      const firstVal = closedToDeparture[0];
      setClosedToDeparture(Array(15).fill(firstVal));
      toast(`Closed to Departure rule copied to all dates`, { tone: 'info' });
    } else if (type === 'stopSell') {
      const firstVal = stopSell[0];
      setStopSell(Array(15).fill(firstVal));
      toast(`Stop Sell rule copied to all dates`, { tone: 'info' });
    }
  };

  // Update rates handler
  const handleUpdateRates = () => {
    toast(`Successfully published updated rates for ${selectedRoomType} (${selectedRatePlan}) to all 6 channels!`, {
      tone: 'success',
    });
  };

  return (
    <div className="flex flex-col gap-4 pb-8 w-full">
      {/* 1. TOP HEADER & QUICK ACTION BUTTONS */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-[28px] font-bold tracking-tight text-ink flex items-center gap-2.5">
            <Lucide.SlidersHorizontal className="text-primary" size={28} />
            <span>Rate Management</span>
          </h1>
          <p className="text-xs text-ink-secondary mt-1">
            Manage room rates, availability, restrictions and seasonal pricing across all channels
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* + Create Rate Plan Button */}
          <button
            type="button"
            onClick={() => setShowCreatePlanModal(true)}
            className="pms-btn-primary flex items-center gap-1.5 px-3.5 py-2 text-sm font-semibold"
          >
            <Lucide.Plus size={16} strokeWidth={2.4} />
            <span>Create Rate Plan</span>
          </button>
        </div>
      </div>

      {/* 2. STATS / KPI ROW (5 CARDS) */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2">
        {/* Card 1: Rate Plans */}
        <div className="pms-card p-3 sm:p-3.5 flex items-center gap-3 transition-all hover:shadow-md">
          <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center flex-shrink-0">
            <Lucide.SlidersHorizontal size={20} strokeWidth={2.4} />
          </div>
          <div>
            <div className="text-xl font-bold text-ink leading-tight tnum">6</div>
            <div className="text-xs font-medium text-ink-secondary mt-0.5">Rate Plans</div>
            <div className="text-xs font-semibold text-emerald-600 flex items-center gap-0.5 mt-0.5">
              <span>↗</span>
              <span>active promotions</span>
            </div>
          </div>
        </div>

        {/* Card 2: Total Rooms */}
        <div className="pms-card p-3 sm:p-3.5 flex items-center gap-3 transition-all hover:shadow-md">
          <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center flex-shrink-0">
            <Lucide.BedDouble size={20} strokeWidth={2.4} />
          </div>
          <div>
            <div className="text-xl font-bold text-ink leading-tight tnum">50</div>
            <div className="text-xs font-medium text-ink-secondary mt-0.5">Total Rooms</div>
            <div className="text-xs font-normal text-ink-muted mt-0.5">Across 5 room types</div>
          </div>
        </div>

        {/* Card 3: ADR (This Month) */}
        <div className="pms-card p-3 sm:p-3.5 flex items-center gap-3 transition-all hover:shadow-md">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-700 flex items-center justify-center flex-shrink-0 font-bold text-lg">
            ₹
          </div>
          <div>
            <div className="text-xl font-bold text-ink leading-tight tnum">₹8,450</div>
            <div className="text-xs font-medium text-ink-secondary mt-0.5">ADR (This Month)</div>
            <div className="text-xs font-semibold text-emerald-600 flex items-center gap-0.5 mt-0.5">
              <span>↑ 12%</span>
              <span className="font-normal text-ink-muted">vs last month</span>
            </div>
          </div>
        </div>

        {/* Card 4: Occupancy (This Month) */}
        <div className="pms-card p-3 sm:p-3.5 flex items-center gap-3 transition-all hover:shadow-md">
          <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-600 flex items-center justify-center flex-shrink-0">
            <Lucide.CalendarDays size={20} strokeWidth={2.4} />
          </div>
          <div>
            <div className="text-xl font-bold text-ink leading-tight tnum">78%</div>
            <div className="text-xs font-medium text-ink-secondary mt-0.5">Occupancy (This Month)</div>
            <div className="text-xs font-semibold text-emerald-600 flex items-center gap-0.5 mt-0.5">
              <span>↑ 6%</span>
              <span className="font-normal text-ink-muted">vs last month</span>
            </div>
          </div>
        </div>

        {/* Card 5: Projected Revenue */}
        <div className="pms-card p-3 sm:p-3.5 flex items-center gap-3 col-span-2 sm:col-span-1 transition-all hover:shadow-md">
          <div className="w-10 h-10 rounded-xl bg-rose-500/10 text-rose-600 flex items-center justify-center flex-shrink-0">
            <Lucide.TrendingUp size={20} strokeWidth={2.4} />
          </div>
          <div>
            <div className="text-xl font-bold text-ink leading-tight tnum">₹4,22,500</div>
            <div className="text-xs font-medium text-ink-secondary mt-0.5">Projected Revenue</div>
            <div className="text-xs font-normal text-ink-muted mt-0.5">Next 30 days</div>
          </div>
        </div>
      </div>

      {/* 3. FILTER BAR CARD */}
      <div className="pms-card p-4 sm:p-5 flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 flex-1">
          {/* Room Type */}
          <div>
            <label className="block text-[11px] font-semibold text-ink-muted mb-1">Room Type</label>
            <select
              value={selectedRoomType}
              onChange={(e) => setSelectedRoomType(e.target.value)}
              className="w-full pms-input text-xs font-semibold"
            >
              <option value="Deluxe">Deluxe</option>
              <option value="Standard">Standard</option>
              <option value="Superior">Superior</option>
              <option value="Suite">Suite</option>
              <option value="Family">Family</option>
              <option value="Executive">Executive</option>
            </select>
          </div>

          {/* Rate Plan */}
          <div>
            <label className="block text-[11px] font-semibold text-ink-muted mb-1">Rate Plan</label>
            <select
              value={selectedRatePlan}
              onChange={(e) => setSelectedRatePlan(e.target.value)}
              className="w-full pms-input text-xs font-semibold"
            >
              <option value="Best Available Rate (BAR)">Best Available Rate (BAR)</option>
              <option value="Advance Purchase">Advance Purchase</option>
              <option value="Last Minute Deal">Last Minute Deal</option>
              <option value="Corporate Rate">Corporate Rate</option>
              <option value="Member Discount">Member Discount</option>
              <option value="Long Stay Rate">Long Stay Rate</option>
            </select>
          </div>

          {/* Date Range */}
          <div>
            <label className="block text-[11px] font-semibold text-ink-muted mb-1">Date Range</label>
            <button
              type="button"
              onClick={() => toast('Date range: Oct 14, 2026 – Oct 28, 2026', { tone: 'info' })}
              className="w-full pms-btn-ghost flex items-center justify-between gap-2 px-3 py-2 text-xs font-semibold cursor-pointer"
            >
              <span className="flex items-center gap-1.5 truncate">
                <Lucide.Calendar size={13} className="text-primary flex-shrink-0" />
                <span className="truncate">Oct 14, 2026 – Oct 28, 2026</span>
              </span>
              <Lucide.ChevronDown size={14} className="text-ink-muted flex-shrink-0" />
            </button>
          </div>

          {/* Channel */}
          <div>
            <label className="block text-[11px] font-semibold text-ink-muted mb-1">Channel</label>
            <select
              value={selectedChannel}
              onChange={(e) => setSelectedChannel(e.target.value)}
              className="w-full pms-input text-xs font-semibold"
            >
              <option value="all">All Channels</option>
              <option value="booking">Booking.com</option>
              <option value="expedia">Expedia</option>
              <option value="airbnb">Airbnb</option>
              <option value="agoda">Agoda</option>
              <option value="makemytrip">MakeMyTrip</option>
              <option value="goibibo">Goibibo</option>
            </select>
          </div>
        </div>

        {/* Right Action Buttons */}
        <div className="flex items-center gap-2.5 flex-shrink-0">
          <button
            type="button"
            onClick={() => toast('Additional filter parameters (Occupancy, Min nights, Meal plan)', { tone: 'info' })}
            className="pms-btn-ghost flex items-center gap-1.5 text-xs font-semibold px-3.5 py-2"
          >
            <Lucide.SlidersHorizontal size={14} />
            <span>More Filters</span>
          </button>

          <button
            type="button"
            onClick={handleUpdateRates}
            className="pms-btn-primary px-5 py-2 text-xs font-bold"
          >
            Update Rates
          </button>
        </div>
      </div>

      {/* 4. SUB-TABS ROW & VIEW CONTROLS */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 pb-1 border-b" style={{ borderColor: 'var(--color-border)' }}>
        {/* Left Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
          {[
            { id: 'calendar', label: 'Rate Calendar', icon: Lucide.CalendarDays },
            { id: 'plans', label: 'Rate Plans', icon: Lucide.Layers },
            { id: 'seasonality', label: 'Seasonality', icon: Lucide.SunMedium },
            { id: 'restrictions', label: 'Restrictions', icon: Lucide.Lock },
            { id: 'mapping', label: 'Channel Mapping', icon: Lucide.Network },
            { id: 'bulk', label: 'Bulk Update', icon: Lucide.Zap },
            { id: 'history', label: 'History', icon: Lucide.History },
          ].map((t) => {
            const isActive = activeTab === t.id;
            const Icon = t.icon;
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => setActiveTab(t.id as typeof activeTab)}
                className={`flex items-center gap-2 rounded-md px-4 py-2 text-sm font-semibold whitespace-nowrap transition-all cursor-pointer ${
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

        {/* Right View & Date Controls */}
        <div className="flex items-center gap-2 self-end sm:self-auto flex-shrink-0">
          <div className="flex items-center gap-1.5 text-xs">
            <span className="text-ink-muted font-medium">View By</span>
            <select
              value={viewBy}
              onChange={(e) => setViewBy(e.target.value)}
              className="rounded-lg border px-2.5 py-1 text-xs font-semibold text-ink focus:outline-none"
              style={{ borderColor: 'var(--color-border)', background: 'var(--color-surface)' }}
            >
              <option value="Room Type">Room Type</option>
              <option value="Channel">Channel</option>
              <option value="Rate Plan">Rate Plan</option>
            </select>
          </div>

          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => toast('Viewing previous 15 days', { tone: 'info' })}
              className="pms-btn-ghost p-1 rounded-lg border border-border"
              title="Previous"
            >
              <Lucide.ChevronLeft size={15} />
            </button>
            <button
              type="button"
              onClick={() => toast('Jumped to Today', { tone: 'info' })}
              className="pms-btn-ghost px-2.5 py-1 rounded-lg border border-border text-xs font-semibold"
            >
              Today
            </button>
            <button
              type="button"
              onClick={() => toast('Viewing next 15 days', { tone: 'info' })}
              className="pms-btn-ghost p-1 rounded-lg border border-border"
              title="Next"
            >
              <Lucide.ChevronRight size={15} />
            </button>
          </div>
        </div>
      </div>

      {/* 5. MAIN SECTION: RATE CALENDAR MATRIX (LEFT) + RATE PLAN DETAILS (RIGHT) */}
      <div className="flex flex-col xl:flex-row gap-5 items-stretch w-full">
        {/* LEFT COLUMN: 15-Day Rate Matrix Card */}
        <div className="pms-card flex-1 min-w-0 p-4 sm:p-5 flex flex-col justify-between">
          <div>
            {/* Header inside Matrix Card */}
            <div className="flex items-center justify-between pb-3 mb-3 border-b" style={{ borderColor: 'var(--color-border-subtle)' }}>
              <div className="flex items-center gap-2.5">
                <h2 className="text-sm font-bold text-ink">
                  {selectedRoomType} Room – {selectedRatePlan}
                </h2>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10.5px] font-semibold bg-emerald-100 text-emerald-700 border border-emerald-200">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  <span>Published to 6 channels</span>
                </span>
              </div>
            </div>

            {/* Matrix Table */}
            <div className="overflow-x-auto -mx-1 px-1">
              <table className="w-full border-collapse text-xs">
                <thead>
                  <tr style={{ background: 'color-mix(in srgb, var(--color-muted-surface) 50%, var(--color-surface))' }}>
                    <th
                      className="py-2.5 px-3 text-left font-bold text-ink border-b border-r sticky left-0 z-10 min-w-[140px]"
                      style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}
                    >
                      Oct 2026
                    </th>
                    {matrixDates.map((d, i) => (
                      <th
                        key={i}
                        className={`py-2 px-1 text-center font-semibold border-b border-r min-w-[48px] ${
                          d.isWeekend ? 'bg-rose-50/50 text-rose-700' : 'text-ink-secondary'
                        }`}
                        style={{ borderColor: 'var(--color-border-subtle)' }}
                      >
                        <div className="text-[12px] font-bold leading-tight">{d.day}</div>
                        <div className="text-[9.5px] uppercase font-bold text-ink-muted mt-0.5">{d.weekday}</div>
                      </th>
                    ))}
                    <th className="py-2 px-1 border-b w-8" style={{ borderColor: 'var(--color-border-subtle)' }} />
                  </tr>
                </thead>
                <tbody>
                  {/* Row 1: Base Rate (₹) */}
                  <tr className="border-b hover:bg-muted-surface/30 transition-colors" style={{ borderColor: 'var(--color-border-subtle)' }}>
                    <td className="py-2.5 px-3 font-bold text-ink border-r sticky left-0 z-10" style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}>
                      Base Rate (₹)
                    </td>
                    {baseRates.map((rate, idx) => {
                      const isWeekend = matrixDates[idx].isWeekend;
                      return (
                        <td
                          key={idx}
                          className={`p-1 border-r text-center ${isWeekend ? 'bg-rose-50/20' : ''}`}
                          style={{ borderColor: 'var(--color-border-subtle)' }}
                        >
                          <input
                            type="text"
                            value={rate.toLocaleString('en-IN')}
                            onChange={(e) => {
                              const num = parseInt(e.target.value.replace(/,/g, ''), 10);
                              if (!isNaN(num)) {
                                const next = [...baseRates];
                                next[idx] = num;
                                setBaseRates(next);
                              }
                            }}
                            className="w-full text-center py-1 rounded-md border text-[11px] font-semibold text-ink focus:outline-none focus:border-primary"
                            style={{ borderColor: 'var(--color-border-subtle)', background: 'var(--color-surface)' }}
                          />
                        </td>
                      );
                    })}
                    <td className="p-1 text-center">
                      <button
                        type="button"
                        onClick={() => handleCloneRow('baseRate')}
                        className="text-primary hover:text-primary-hover p-1 hover:bg-primary/10 rounded transition-colors cursor-pointer"
                        title="Copy Base Rate across all 15 dates"
                      >
                        <Lucide.Copy size={13} />
                      </button>
                    </td>
                  </tr>

                  {/* Row 2: Minimum Stay */}
                  <tr className="border-b hover:bg-muted-surface/30 transition-colors" style={{ borderColor: 'var(--color-border-subtle)' }}>
                    <td className="py-2 px-3 font-bold text-ink border-r sticky left-0 z-10" style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}>
                      Minimum Stay
                    </td>
                    {minStays.map((val, idx) => (
                      <td
                        key={idx}
                        className={`p-1 border-r text-center ${matrixDates[idx].isWeekend ? 'bg-rose-50/20' : ''}`}
                        style={{ borderColor: 'var(--color-border-subtle)' }}
                      >
                        <input
                          type="number"
                          min={1}
                          max={30}
                          value={val}
                          onChange={(e) => {
                            const num = parseInt(e.target.value, 10);
                            if (!isNaN(num)) {
                              const next = [...minStays];
                              next[idx] = num;
                              setMinStays(next);
                            }
                          }}
                          className="w-full text-center py-0.5 rounded border text-[11px] font-medium text-ink focus:outline-none focus:border-primary"
                          style={{ borderColor: 'var(--color-border-subtle)', background: 'var(--color-surface)' }}
                        />
                      </td>
                    ))}
                    <td className="p-1 text-center">
                      <button
                        type="button"
                        onClick={() => handleCloneRow('minStay')}
                        className="text-primary hover:text-primary-hover p-1 hover:bg-primary/10 rounded transition-colors cursor-pointer"
                        title="Copy Min Stay across all dates"
                      >
                        <Lucide.Copy size={13} />
                      </button>
                    </td>
                  </tr>

                  {/* Row 3: Maximum Stay */}
                  <tr className="border-b hover:bg-muted-surface/30 transition-colors" style={{ borderColor: 'var(--color-border-subtle)' }}>
                    <td className="py-2 px-3 font-bold text-ink border-r sticky left-0 z-10" style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}>
                      Maximum Stay
                    </td>
                    {maxStays.map((val, idx) => (
                      <td
                        key={idx}
                        className={`p-1 border-r text-center ${matrixDates[idx].isWeekend ? 'bg-rose-50/20' : ''}`}
                        style={{ borderColor: 'var(--color-border-subtle)' }}
                      >
                        <input
                          type="number"
                          min={1}
                          max={90}
                          value={val}
                          onChange={(e) => {
                            const num = parseInt(e.target.value, 10);
                            if (!isNaN(num)) {
                              const next = [...maxStays];
                              next[idx] = num;
                              setMaxStays(next);
                            }
                          }}
                          className="w-full text-center py-0.5 rounded border text-[11px] font-medium text-ink focus:outline-none focus:border-primary"
                          style={{ borderColor: 'var(--color-border-subtle)', background: 'var(--color-surface)' }}
                        />
                      </td>
                    ))}
                    <td className="p-1 text-center">
                      <button
                        type="button"
                        onClick={() => handleCloneRow('maxStay')}
                        className="text-primary hover:text-primary-hover p-1 hover:bg-primary/10 rounded transition-colors cursor-pointer"
                        title="Copy Max Stay across all dates"
                      >
                        <Lucide.Copy size={13} />
                      </button>
                    </td>
                  </tr>

                  {/* Row 4: Closed to Arrival */}
                  <tr className="border-b hover:bg-muted-surface/30 transition-colors" style={{ borderColor: 'var(--color-border-subtle)' }}>
                    <td className="py-2 px-3 font-bold text-ink border-r sticky left-0 z-10" style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}>
                      Closed to Arrival
                    </td>
                    {closedToArrival.map((isChecked, idx) => (
                      <td
                        key={idx}
                        className={`py-2 px-1 border-r text-center ${matrixDates[idx].isWeekend ? 'bg-rose-50/20' : ''}`}
                        style={{ borderColor: 'var(--color-border-subtle)' }}
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={(e) => {
                            const next = [...closedToArrival];
                            next[idx] = e.target.checked;
                            setClosedToArrival(next);
                          }}
                          className="w-4 h-4 rounded text-primary cursor-pointer accent-primary"
                        />
                      </td>
                    ))}
                    <td className="p-1 text-center">
                      <button
                        type="button"
                        onClick={() => handleCloneRow('cta')}
                        className="text-primary hover:text-primary-hover p-1 hover:bg-primary/10 rounded transition-colors cursor-pointer"
                        title="Copy Closed to Arrival across all dates"
                      >
                        <Lucide.Copy size={13} />
                      </button>
                    </td>
                  </tr>

                  {/* Row 5: Closed to Departure */}
                  <tr className="border-b hover:bg-muted-surface/30 transition-colors" style={{ borderColor: 'var(--color-border-subtle)' }}>
                    <td className="py-2 px-3 font-bold text-ink border-r sticky left-0 z-10" style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}>
                      Closed to Departure
                    </td>
                    {closedToDeparture.map((isChecked, idx) => (
                      <td
                        key={idx}
                        className={`py-2 px-1 border-r text-center ${matrixDates[idx].isWeekend ? 'bg-rose-50/20' : ''}`}
                        style={{ borderColor: 'var(--color-border-subtle)' }}
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={(e) => {
                            const next = [...closedToDeparture];
                            next[idx] = e.target.checked;
                            setClosedToDeparture(next);
                          }}
                          className="w-4 h-4 rounded text-primary cursor-pointer accent-primary"
                        />
                      </td>
                    ))}
                    <td className="p-1 text-center">
                      <button
                        type="button"
                        onClick={() => handleCloneRow('ctd')}
                        className="text-primary hover:text-primary-hover p-1 hover:bg-primary/10 rounded transition-colors cursor-pointer"
                        title="Copy Closed to Departure across all dates"
                      >
                        <Lucide.Copy size={13} />
                      </button>
                    </td>
                  </tr>

                  {/* Row 6: Stop Sell */}
                  <tr className="border-b hover:bg-muted-surface/30 transition-colors" style={{ borderColor: 'var(--color-border-subtle)' }}>
                    <td className="py-2 px-3 font-bold text-ink border-r sticky left-0 z-10" style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}>
                      Stop Sell
                    </td>
                    {stopSell.map((isChecked, idx) => (
                      <td
                        key={idx}
                        className={`py-2 px-1 border-r text-center ${matrixDates[idx].isWeekend ? 'bg-rose-50/20' : ''}`}
                        style={{ borderColor: 'var(--color-border-subtle)' }}
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={(e) => {
                            const next = [...stopSell];
                            next[idx] = e.target.checked;
                            setStopSell(next);
                          }}
                          className="w-4 h-4 rounded text-red-600 cursor-pointer accent-red-600"
                        />
                      </td>
                    ))}
                    <td className="p-1 text-center">
                      <button
                        type="button"
                        onClick={() => handleCloneRow('stopSell')}
                        className="text-primary hover:text-primary-hover p-1 hover:bg-primary/10 rounded transition-colors cursor-pointer"
                        title="Copy Stop Sell across all dates"
                      >
                        <Lucide.Copy size={13} />
                      </button>
                    </td>
                  </tr>

                  {/* Row 7: Total Available Rooms */}
                  <tr className="border-b hover:bg-muted-surface/30 transition-colors" style={{ borderColor: 'var(--color-border-subtle)' }}>
                    <td className="py-2.5 px-3 font-bold text-ink border-r sticky left-0 z-10" style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}>
                      Total Available Rooms
                    </td>
                    {totalAvailableRooms.map((rooms, idx) => (
                      <td
                        key={idx}
                        className={`py-2 px-1 border-r text-center font-bold text-ink-secondary tnum ${
                          matrixDates[idx].isWeekend ? 'bg-rose-50/20' : ''
                        }`}
                        style={{ borderColor: 'var(--color-border-subtle)' }}
                      >
                        {rooms}
                      </td>
                    ))}
                    <td className="p-1" />
                  </tr>

                  {/* Row 8: Expected Demand */}
                  <tr className="hover:bg-muted-surface/30 transition-colors">
                    <td className="py-2.5 px-3 font-bold text-ink border-r sticky left-0 z-10" style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}>
                      Expected Demand
                    </td>
                    {expectedDemand.map((demand, idx) => (
                      <td
                        key={idx}
                        className={`p-1 border-r text-center ${matrixDates[idx].isWeekend ? 'bg-rose-50/20' : ''}`}
                        style={{ borderColor: 'var(--color-border-subtle)' }}
                      >
                        <span
                          className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-bold ${
                            demand === 'High'
                              ? 'bg-rose-100 text-rose-700'
                              : 'bg-amber-100 text-amber-700'
                          }`}
                        >
                          {demand}
                        </span>
                      </td>
                    ))}
                    <td className="p-1" />
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: Rate Plan Details Card */}
        <div className="pms-card w-full xl:w-[320px] 2xl:w-[340px] flex-shrink-0 p-5 flex flex-col justify-between">
          <div>
            {/* Header: Title + Active Badge */}
            <div className="flex items-center justify-between pb-3 mb-4 border-b" style={{ borderColor: 'var(--color-border-subtle)' }}>
              <h2 className="text-sm font-bold text-ink">Rate Plan Details</h2>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10.5px] font-semibold bg-emerald-100 text-emerald-700 border border-emerald-200">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                <span>Active</span>
              </span>
            </div>

            {/* Content Fields */}
            <div className="flex flex-col gap-4 text-xs">
              <div>
                <div className="text-[11px] font-semibold text-ink-muted">Rate Plan Name</div>
                <div className="text-sm font-bold text-ink mt-0.5">{selectedRatePlan}</div>
              </div>

              <div>
                <div className="text-[11px] font-semibold text-ink-muted">Description</div>
                <div className="text-xs text-ink-secondary mt-0.5 leading-relaxed">
                  Flexible rate with no restrictions. Available across all channels.
                </div>
              </div>

              <div>
                <div className="text-[11px] font-semibold text-ink-muted">Meal Plan</div>
                <div className="text-xs font-semibold text-ink mt-0.5">Room Only</div>
              </div>

              <div>
                <div className="text-[11px] font-semibold text-ink-muted">Cancellation Policy</div>
                <div className="flex items-center gap-1.5 text-xs text-ink mt-0.5">
                  <Lucide.Clock size={13} className="text-ink-muted" />
                  <span>Free cancellation up to 24 hours</span>
                </div>
              </div>

              <div>
                <div className="text-[11px] font-semibold text-ink-muted mb-1.5">Channels</div>
                <div className="flex items-center gap-1.5 flex-wrap">
                  {/* Booking.com */}
                  <span className="w-6 h-6 rounded bg-[#003580] text-white font-bold flex items-center justify-center text-[10px] shadow-2xs">
                    B.
                  </span>
                  {/* Expedia */}
                  <span className="w-6 h-6 rounded bg-[#FFCC00] text-black font-bold flex items-center justify-center text-[11px] shadow-2xs">
                    ↗
                  </span>
                  {/* Airbnb */}
                  <span className="w-6 h-6 rounded bg-[#FF5A5F] text-white font-bold flex items-center justify-center text-[10px] shadow-2xs">
                    <Lucide.Home size={12} />
                  </span>
                  <span className="px-2 py-0.5 rounded-md bg-muted-surface text-[10.5px] font-semibold text-ink-muted">
                    +3 more
                  </span>
                </div>
              </div>

              <div className="pt-2 border-t" style={{ borderColor: 'var(--color-border-subtle)' }}>
                <div className="text-[11px] text-ink-muted">
                  Last Updated: <span className="font-semibold text-ink-secondary">Oct 14, 2026, 11:20 AM</span>
                </div>
                <div className="text-[11px] text-ink-muted">
                  by <span className="font-semibold text-ink">Admin</span>
                </div>
              </div>
            </div>
          </div>

          {/* Action Buttons: Edit Rate Plan & Clone */}
          <div className="grid grid-cols-2 gap-2 mt-5 pt-3 border-t" style={{ borderColor: 'var(--color-border-subtle)' }}>
            <button
              type="button"
              onClick={() => setShowEditPlanModal(true)}
              className="pms-btn-ghost flex items-center justify-center gap-1.5 py-2 text-xs font-semibold"
            >
              <Lucide.Edit3 size={13} />
              <span>Edit Rate Plan</span>
            </button>
            <button
              type="button"
              onClick={() => {
                toast(`Cloned ${selectedRatePlan} as new template`, { tone: 'success' });
              }}
              className="pms-btn-ghost flex items-center justify-center gap-1.5 py-2 text-xs font-semibold"
            >
              <Lucide.Copy size={13} />
              <span>Clone</span>
            </button>
          </div>
        </div>
      </div>

      {/* 6. BOTTOM ROW: 3 CARDS (RATE PLANS, SEASONAL PRICING, RATE PERFORMANCE) */}
      <div className="flex flex-col lg:flex-row gap-5 items-stretch w-full">
        {/* CARD 1: Rate Plans */}
        <div className="pms-card w-full lg:w-[35%] flex-shrink-0 p-4 sm:p-5 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 mb-3 border-b" style={{ borderColor: 'var(--color-border-subtle)' }}>
              <div className="flex items-center gap-2">
                <Lucide.SlidersHorizontal size={17} className="text-primary" />
                <h2 className="text-sm font-bold text-ink">Rate Plans</h2>
              </div>
              <button
                type="button"
                onClick={() => setShowCreatePlanModal(true)}
                className="text-xs font-semibold text-primary hover:underline cursor-pointer flex items-center gap-1"
              >
                <Lucide.Plus size={12} strokeWidth={2.4} />
                <span>Create Rate Plan</span>
              </button>
            </div>

            <div className="overflow-x-auto -mx-1 px-1">
              <table className="w-full text-xs text-left min-w-[340px]">
                <thead>
                  <tr className="text-ink-muted uppercase text-[10px] font-bold border-b" style={{ borderColor: 'var(--color-border-subtle)' }}>
                    <th className="pb-2">Name</th>
                    <th className="pb-2">Room Types</th>
                    <th className="pb-2">Channels</th>
                    <th className="pb-2">Status</th>
                    <th className="pb-2 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y" style={{ borderColor: 'var(--color-border-subtle)' }}>
                  {ratePlans.map((plan) => (
                    <tr key={plan.id} className="hover:bg-muted-surface/40 transition-colors">
                      <td className="py-2.5 pr-2 font-bold text-ink text-[11.5px] truncate max-w-[130px]">
                        {plan.name}
                      </td>
                      <td className="py-2.5 pr-2 text-ink-secondary text-[11px] truncate max-w-[90px]">
                        {plan.roomTypes}
                      </td>
                      <td className="py-2.5 pr-2 text-ink-muted text-[11px] whitespace-nowrap">
                        {plan.channels}
                      </td>
                      <td className="py-2.5 pr-2 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-semibold ${
                            plan.status === 'Active'
                              ? 'bg-emerald-100 text-emerald-700'
                              : 'bg-amber-100 text-amber-700'
                          }`}
                        >
                          <span className={`w-1.5 h-1.5 rounded-full ${plan.status === 'Active' ? 'bg-emerald-500' : 'bg-amber-500'}`} />
                          <span>{plan.status}</span>
                        </span>
                      </td>
                      <td className="py-2.5 text-right relative">
                        <button
                          type="button"
                          onClick={() => setSelectedPlanForMenu(selectedPlanForMenu === plan.id ? null : plan.id)}
                          className="p-1 hover:bg-muted-surface rounded text-ink-muted hover:text-ink cursor-pointer"
                        >
                          <Lucide.MoreVertical size={14} />
                        </button>
                        {selectedPlanForMenu === plan.id && (
                          <div
                            className="absolute right-0 top-7 w-32 rounded-xl border shadow-lg py-1 z-20 text-xs text-ink"
                            style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}
                          >
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedRatePlan(plan.name);
                                setSelectedPlanForMenu(null);
                                toast(`Viewing ${plan.name}`, { tone: 'info' });
                              }}
                              className="w-full text-left px-3 py-1.5 hover:bg-muted-surface"
                            >
                              View Details
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedPlanForMenu(null);
                                setShowEditPlanModal(true);
                              }}
                              className="w-full text-left px-3 py-1.5 hover:bg-muted-surface"
                            >
                              Edit Plan
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* CARD 2: Seasonal Pricing */}
        <div className="pms-card w-full lg:w-[35%] flex-shrink-0 p-4 sm:p-5 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 mb-3 border-b" style={{ borderColor: 'var(--color-border-subtle)' }}>
              <div className="flex items-center gap-2">
                <Lucide.CalendarRange size={17} className="text-primary" />
                <h2 className="text-sm font-bold text-ink">Seasonal Pricing</h2>
              </div>
              <button
                type="button"
                onClick={() => setShowAddSeasonModal(true)}
                className="text-xs font-semibold text-primary hover:underline cursor-pointer flex items-center gap-1"
              >
                <Lucide.Plus size={12} strokeWidth={2.4} />
                <span>Add Season</span>
              </button>
            </div>

            <div className="overflow-x-auto -mx-1 px-1">
              <table className="w-full text-xs text-left min-w-[320px]">
                <thead>
                  <tr className="text-ink-muted uppercase text-[10px] font-bold border-b" style={{ borderColor: 'var(--color-border-subtle)' }}>
                    <th className="pb-2">Season Name</th>
                    <th className="pb-2">Period</th>
                    <th className="pb-2 text-center">Rate Adjustment</th>
                    <th className="pb-2 text-right">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y" style={{ borderColor: 'var(--color-border-subtle)' }}>
                  {seasons.map((s) => (
                    <tr key={s.id} className="hover:bg-muted-surface/40 transition-colors">
                      <td className="py-2.5 pr-2 font-bold text-ink text-[11.5px] truncate max-w-[120px]">
                        {s.name}
                      </td>
                      <td className="py-2.5 pr-2 text-ink-muted text-[11px] whitespace-nowrap">
                        {s.period}
                      </td>
                      <td className="py-2.5 px-2 text-center font-bold text-[11.5px] whitespace-nowrap">
                        <span className={s.isPositive ? 'text-rose-600' : 'text-emerald-600'}>
                          {s.adjustment}
                        </span>
                      </td>
                      <td className="py-2.5 text-right whitespace-nowrap">
                        <span
                          className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-semibold ${
                            s.status === 'Active'
                              ? 'bg-emerald-100 text-emerald-700'
                              : 'bg-amber-100 text-amber-700'
                          }`}
                        >
                          <span className={`w-1.5 h-1.5 rounded-full ${s.status === 'Active' ? 'bg-emerald-500' : 'bg-amber-500'}`} />
                          <span>{s.status}</span>
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* CARD 3: Rate Performance (Last 30 Days) */}
        <div className="pms-card w-full lg:flex-1 min-w-[280px] p-4 sm:p-5 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 mb-3 border-b" style={{ borderColor: 'var(--color-border-subtle)' }}>
              <div className="flex items-center gap-2">
                <Lucide.LineChart size={17} className="text-primary" />
                <h2 className="text-sm font-bold text-ink">
                  Rate Performance <span className="font-normal text-xs text-ink-muted">(Last 30 Days)</span>
                </h2>
              </div>
            </div>

            {/* Top 3 Metric Pills */}
            <div className="grid grid-cols-3 gap-2 pb-3 mb-3 border-b text-center" style={{ borderColor: 'var(--color-border-subtle)' }}>
              <div>
                <div className="text-[11px] text-ink-muted">ADR</div>
                <div className="text-sm font-extrabold text-ink tnum mt-0.5">₹8,450</div>
                <div className="text-[10px] font-bold text-emerald-600">+12%</div>
              </div>
              <div>
                <div className="text-[11px] text-ink-muted">Occupancy</div>
                <div className="text-sm font-extrabold text-ink tnum mt-0.5">78%</div>
                <div className="text-[10px] font-bold text-emerald-600">+6%</div>
              </div>
              <div>
                <div className="text-[11px] text-ink-muted">Revenue</div>
                <div className="text-sm font-extrabold text-ink tnum mt-0.5">₹4,22,500</div>
                <div className="text-[10px] font-bold text-emerald-600">+18%</div>
              </div>
            </div>

            {/* Chart Legend */}
            <div className="flex items-center justify-end gap-3 text-[10.5px] font-semibold text-ink-muted mb-2">
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-primary" />
                <span>ADR (₹)</span>
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-amber-500" />
                <span>Occupancy (%)</span>
              </span>
            </div>

            {/* Inline SVG Chart */}
            <div className="w-full h-32 relative">
              <svg className="w-full h-full overflow-visible" viewBox="0 0 300 100" preserveAspectRatio="none">
                <defs>
                  <linearGradient id="adrGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="var(--color-primary)" stopOpacity="0.25" />
                    <stop offset="100%" stopColor="var(--color-primary)" stopOpacity="0.0" />
                  </linearGradient>
                </defs>

                {/* Grid horizontal lines */}
                <line x1="0" y1="20" x2="300" y2="20" stroke="var(--color-border-subtle)" strokeDasharray="3 3" />
                <line x1="0" y1="50" x2="300" y2="50" stroke="var(--color-border-subtle)" strokeDasharray="3 3" />
                <line x1="0" y1="80" x2="300" y2="80" stroke="var(--color-border-subtle)" strokeDasharray="3 3" />

                {/* ADR Area fill */}
                <path
                  d="M 10 75 Q 70 85, 120 70 T 220 50 T 290 55 L 290 95 L 10 95 Z"
                  fill="url(#adrGradient)"
                />

                {/* ADR Line */}
                <path
                  d="M 10 75 Q 70 85, 120 70 T 220 50 T 290 55"
                  fill="none"
                  stroke="var(--color-primary)"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                />

                {/* Occupancy Line (Amber) */}
                <path
                  d="M 10 50 Q 70 30, 120 40 T 220 30 T 290 35"
                  fill="none"
                  stroke="#f59e0b"
                  strokeWidth="2.2"
                  strokeLinecap="round"
                />

                {/* Data points */}
                <circle cx="10" cy="75" r="3" fill="var(--color-primary)" />
                <circle cx="120" cy="70" r="3" fill="var(--color-primary)" />
                <circle cx="220" cy="50" r="3" fill="var(--color-primary)" />
                <circle cx="290" cy="55" r="3" fill="var(--color-primary)" />

                <circle cx="10" cy="50" r="3" fill="#f59e0b" />
                <circle cx="120" cy="40" r="3" fill="#f59e0b" />
                <circle cx="220" cy="30" r="3" fill="#f59e0b" />
                <circle cx="290" cy="35" r="3" fill="#f59e0b" />
              </svg>
            </div>

            {/* X-Axis Dates */}
            <div className="flex items-center justify-between text-[9.5px] text-ink-muted pt-1">
              <span>Sep 15</span>
              <span>Sep 22</span>
              <span>Sep 29</span>
              <span>Oct 06</span>
              <span>Oct 13</span>
            </div>
          </div>
        </div>
      </div>

      {/* ================= MODAL: CREATE RATE PLAN ================= */}
      {showCreatePlanModal && (
        <Modal
          open={showCreatePlanModal}
          onClose={() => setShowCreatePlanModal(false)}
          title="Create New Rate Plan"
          subtitle="Configure pricing structure, meal plans, cancellation policies and channels"
          footer={
            <div className="flex items-center justify-end gap-2 w-full">
              <button
                type="button"
                onClick={() => setShowCreatePlanModal(false)}
                className="pms-btn-ghost px-4 py-2 text-xs font-semibold rounded-xl border border-border"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  if (!newPlanName.trim()) {
                    toast('Please enter a Rate Plan name', { tone: 'danger' });
                    return;
                  }
                  const newPlan: RatePlanItem = {
                    id: `plan-${Date.now()}`,
                    name: newPlanName,
                    roomTypes: 'All Rooms',
                    channels: '6 channels',
                    status: 'Active',
                    description: `Custom rate plan with ${newPlanMeal} and ${newPlanCancel}.`,
                    mealPlan: newPlanMeal,
                    cancellationPolicy: newPlanCancel,
                  };
                  setRatePlans([newPlan, ...ratePlans]);
                  toast(`Rate Plan "${newPlanName}" created successfully!`, { tone: 'success' });
                  setShowCreatePlanModal(false);
                  setNewPlanName('');
                }}
                className="pms-btn-primary px-4 py-2 text-xs font-bold rounded-xl shadow-xs"
              >
                Create Plan
              </button>
            </div>
          }
        >
          <div className="flex flex-col gap-4 text-xs">
            <div>
              <label className="block font-semibold text-ink mb-1">Rate Plan Name *</label>
              <input
                type="text"
                placeholder="e.g. Weekend Special, Summer Flash Sale"
                value={newPlanName}
                onChange={(e) => setNewPlanName(e.target.value)}
                className="pms-input w-full text-xs font-medium"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block font-semibold text-ink mb-1">Rate Plan Code</label>
                <input
                  type="text"
                  placeholder="e.g. WKD-SPEC"
                  value={newPlanCode}
                  onChange={(e) => setNewPlanCode(e.target.value)}
                  className="pms-input w-full text-xs font-medium uppercase"
                />
              </div>

              <div>
                <label className="block font-semibold text-ink mb-1">Base Price Adjustment (%)</label>
                <input
                  type="text"
                  placeholder="e.g. -10 or +15"
                  value={newPlanAdjustment}
                  onChange={(e) => setNewPlanAdjustment(e.target.value)}
                  className="pms-input w-full text-xs font-medium"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block font-semibold text-ink mb-1">Meal Plan</label>
                <select
                  value={newPlanMeal}
                  onChange={(e) => setNewPlanMeal(e.target.value)}
                  className="pms-input w-full text-xs font-medium"
                >
                  <option value="Room Only">Room Only (EP)</option>
                  <option value="Breakfast Included">Breakfast Included (CP)</option>
                  <option value="Half Board">Half Board (MAP - Breakfast + Dinner)</option>
                  <option value="Full Board">Full Board (AP - All Meals)</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-ink mb-1">Cancellation Policy</label>
                <select
                  value={newPlanCancel}
                  onChange={(e) => setNewPlanCancel(e.target.value)}
                  className="pms-input w-full text-xs font-medium"
                >
                  <option value="Free cancellation up to 24 hours">Free cancellation up to 24 hours</option>
                  <option value="Free cancellation up to 48 hours">Free cancellation up to 48 hours</option>
                  <option value="Non-refundable">Non-refundable</option>
                  <option value="Moderate (5 days)">Moderate (5 days)</option>
                </select>
              </div>
            </div>
          </div>
        </Modal>
      )}

      {/* ================= MODAL: ADD SEASON ================= */}
      {showAddSeasonModal && (
        <Modal
          open={showAddSeasonModal}
          onClose={() => setShowAddSeasonModal(false)}
          title="Add Seasonal Pricing Rule"
          subtitle="Define multiplier or surcharge for peak seasons and special dates"
          footer={
            <div className="flex items-center justify-end gap-2 w-full">
              <button
                type="button"
                onClick={() => setShowAddSeasonModal(false)}
                className="pms-btn-ghost px-4 py-2 text-xs font-semibold rounded-xl border border-border"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  if (!newSeasonName.trim()) {
                    toast('Please enter a Season name', { tone: 'danger' });
                    return;
                  }
                  const newSeason: SeasonItem = {
                    id: `season-${Date.now()}`,
                    name: newSeasonName,
                    period: `${newSeasonStart} – ${newSeasonEnd}`,
                    adjustment: newSeasonAdj.startsWith('+') || newSeasonAdj.startsWith('-') ? newSeasonAdj : `+${newSeasonAdj}`,
                    isPositive: !newSeasonAdj.startsWith('-'),
                    status: 'Active',
                  };
                  setSeasons([...seasons, newSeason]);
                  toast(`Season "${newSeasonName}" added successfully!`, { tone: 'success' });
                  setShowAddSeasonModal(false);
                  setNewSeasonName('');
                }}
                className="pms-btn-primary px-4 py-2 text-xs font-bold rounded-xl shadow-xs"
              >
                Add Season
              </button>
            </div>
          }
        >
          <div className="flex flex-col gap-4 text-xs">
            <div>
              <label className="block font-semibold text-ink mb-1">Season Name *</label>
              <input
                type="text"
                placeholder="e.g. Winter Carnival, Holi Festive"
                value={newSeasonName}
                onChange={(e) => setNewSeasonName(e.target.value)}
                className="pms-input w-full text-xs font-medium"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block font-semibold text-ink mb-1">Start Date</label>
                <input
                  type="date"
                  value={newSeasonStart}
                  onChange={(e) => setNewSeasonStart(e.target.value)}
                  className="pms-input w-full text-xs font-medium"
                />
              </div>

              <div>
                <label className="block font-semibold text-ink mb-1">End Date</label>
                <input
                  type="date"
                  value={newSeasonEnd}
                  onChange={(e) => setNewSeasonEnd(e.target.value)}
                  className="pms-input w-full text-xs font-medium"
                />
              </div>
            </div>

            <div>
              <label className="block font-semibold text-ink mb-1">Rate Adjustment</label>
              <input
                type="text"
                placeholder="e.g. +25% or -15%"
                value={newSeasonAdj}
                onChange={(e) => setNewSeasonAdj(e.target.value)}
                className="pms-input w-full text-xs font-medium"
              />
            </div>
          </div>
        </Modal>
      )}

      {/* ================= MODAL: BULK UPDATE ================= */}
      {showBulkUpdateModal && (
        <Modal
          open={showBulkUpdateModal}
          onClose={() => setShowBulkUpdateModal(false)}
          title="Bulk Rate & Restrictions Update"
          subtitle="Apply bulk adjustments to multiple room types, channels and date ranges"
          footer={
            <div className="flex items-center justify-end gap-2 w-full">
              <button
                type="button"
                onClick={() => setShowBulkUpdateModal(false)}
                className="pms-btn-ghost px-4 py-2 text-xs font-semibold rounded-xl border border-border"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  toast('Bulk rates and restrictions updated across selected dates!', { tone: 'success' });
                  setShowBulkUpdateModal(false);
                }}
                className="pms-btn-primary px-4 py-2 text-xs font-bold rounded-xl shadow-xs"
              >
                Apply Bulk Update
              </button>
            </div>
          }
        >
          <div className="flex flex-col gap-4 text-xs">
            <div
              className="p-3 rounded-xl text-xs flex items-center gap-2 border"
              style={{
                background: 'var(--color-info-bg)',
                color: 'var(--color-info-text)',
                borderColor: 'var(--color-info-border)',
              }}
            >
              <Lucide.Info size={16} className="flex-shrink-0" />
              <span>Bulk update will override rates and restrictions for all matching dates.</span>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block font-semibold text-ink mb-1">Target Rate</label>
                <input
                  type="number"
                  placeholder="e.g. 9000"
                  defaultValue={9000}
                  className="pms-input w-full text-xs font-medium"
                />
              </div>

              <div>
                <label className="block font-semibold text-ink mb-1">Min Stay (Nights)</label>
                <input
                  type="number"
                  placeholder="e.g. 2"
                  defaultValue={2}
                  className="pms-input w-full text-xs font-medium"
                />
              </div>
            </div>

            <div className="flex items-center gap-4">
              <label className="flex items-center gap-2 text-ink font-semibold cursor-pointer">
                <input type="checkbox" className="w-4 h-4 rounded text-primary accent-primary cursor-pointer" />
                <span>Apply to Weekends Only</span>
              </label>

              <label className="flex items-center gap-2 text-ink font-semibold cursor-pointer">
                <input type="checkbox" className="w-4 h-4 rounded text-primary accent-primary cursor-pointer" />
                <span>Sync with OTAs Instantly</span>
              </label>
            </div>
          </div>
        </Modal>
      )}

      {/* ================= MODAL: EDIT RATE PLAN ================= */}
      {showEditPlanModal && (
        <Modal
          open={showEditPlanModal}
          onClose={() => setShowEditPlanModal(false)}
          title={`Edit Rate Plan: ${selectedRatePlan}`}
          subtitle="Modify pricing settings, policies and distribution"
          footer={
            <div className="flex items-center justify-end gap-2 w-full">
              <button
                type="button"
                onClick={() => setShowEditPlanModal(false)}
                className="pms-btn-ghost px-4 py-2 text-xs font-semibold rounded-xl border border-border"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  toast(`Changes saved for ${selectedRatePlan}!`, { tone: 'success' });
                  setShowEditPlanModal(false);
                }}
                className="pms-btn-primary px-4 py-2 text-xs font-bold rounded-xl shadow-xs"
              >
                Save Changes
              </button>
            </div>
          }
        >
          <div className="flex flex-col gap-4 text-xs">
            <div>
              <label className="block font-semibold text-ink mb-1">Rate Plan Name</label>
              <input
                type="text"
                defaultValue={selectedRatePlan}
                className="pms-input w-full text-xs font-medium"
              />
            </div>

            <div>
              <label className="block font-semibold text-ink mb-1">Meal Plan</label>
              <select
                defaultValue="Room Only"
                className="pms-input w-full text-xs font-medium"
              >
                <option value="Room Only">Room Only</option>
                <option value="Breakfast Included">Breakfast Included</option>
                <option value="Half Board">Half Board</option>
              </select>
            </div>

            <div>
              <label className="block font-semibold text-ink mb-1">Cancellation Policy</label>
              <input
                type="text"
                defaultValue="Free cancellation up to 24 hours"
                className="pms-input w-full text-xs font-medium"
              />
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
