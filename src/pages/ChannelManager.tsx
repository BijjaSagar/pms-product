import { useState } from 'react';
import * as Lucide from 'lucide-react';
import { toast } from '../components/toastStore';
import { Modal } from '../components/overlays';

interface Channel {
  id: string;
  name: string;
  code: string;
  logoBg: string;
  logoText: string;
  logoColor?: string;
  isCustomIcon?: boolean;
  status: 'connected' | 'error' | 'paused';
  lastSync: string;
  activeRooms: number;
  bookingsMtd: number;
  syncSuccess: number;
  errorDetail?: string;
}

interface RecentBooking {
  id: string;
  channel: string;
  channelCode: string;
  guestName: string;
  roomType: string;
  stayDates: string;
  status: 'Confirmed' | 'Pending' | 'Cancelled';
}

interface ChannelPerf {
  channel: string;
  channelCode: string;
  bookings: number;
  roomNights: number;
  sharePercent: number;
  color: string;
  revenue: number;
}

interface RateMapping {
  channel: string;
  channelCode: string;
  mappedCount: number;
}

export function ChannelManager() {
  // Sync state
  const [isSyncing, setIsSyncing] = useState(false);
  const [autoSyncEnabled, setAutoSyncEnabled] = useState(true);
  const [lastGlobalSync, setLastGlobalSync] = useState('Just now');

  // Modals state
  const [showAddChannelModal, setShowAddChannelModal] = useState(false);
  const [showLogsModal, setShowLogsModal] = useState(false);
  const [showMappingModal, setShowMappingModal] = useState(false);
  const [selectedChannelForMenu, setSelectedChannelForMenu] = useState<string | null>(null);
  const [viewAllBookingsModal, setViewAllBookingsModal] = useState(false);
  const [selectedCellInfo, setSelectedCellInfo] = useState<{ room: string; date: string; available: number; total: number } | null>(null);

  // Global Sync Settings toggles
  const [syncAvailability, setSyncAvailability] = useState(true);
  const [syncRates, setSyncRates] = useState(true);
  const [syncRestrictions, setSyncRestrictions] = useState(true);
  const [syncMinStay, setSyncMinStay] = useState(true);
  const [syncStopSell, setSyncStopSell] = useState(true);
  const [autoSyncToggle, setAutoSyncToggle] = useState(true);
  const [timeZone, setTimeZone] = useState('(GMT+05:30) India Standard Time');
  const [defaultMarkup, setDefaultMarkup] = useState('0');

  // Matrix Filter state
  const [activeTab, setActiveTab] = useState<'calendar' | 'rates' | 'restrictions' | 'mapping' | 'promotions'>('calendar');
  const [selectedChannelFilter, setSelectedChannelFilter] = useState('all');
  const [selectedRoomFilter, setSelectedRoomFilter] = useState('all');

  // Channels List State
  const [channels, setChannels] = useState<Channel[]>([
    {
      id: 'booking',
      name: 'Booking.com',
      code: 'booking',
      logoBg: '#003580',
      logoText: 'B.',
      logoColor: '#ffffff',
      status: 'connected',
      lastSync: '2 mins ago',
      activeRooms: 42,
      bookingsMtd: 12,
      syncSuccess: 98,
    },
    {
      id: 'expedia',
      name: 'Expedia',
      code: 'expedia',
      logoBg: '#FFCC00',
      logoText: '↗',
      logoColor: '#000000',
      status: 'connected',
      lastSync: '5 mins ago',
      activeRooms: 38,
      bookingsMtd: 10,
      syncSuccess: 100,
    },
    {
      id: 'airbnb',
      name: 'Airbnb',
      code: 'airbnb',
      logoBg: '#FF5A5F',
      logoText: 'Airbnb',
      logoColor: '#ffffff',
      isCustomIcon: true,
      status: 'connected',
      lastSync: '3 mins ago',
      activeRooms: 25,
      bookingsMtd: 8,
      syncSuccess: 100,
    },
    {
      id: 'agoda',
      name: 'Agoda',
      code: 'agoda',
      logoBg: '#ffffff',
      logoText: 'agoda',
      isCustomIcon: true,
      status: 'connected',
      lastSync: '4 mins ago',
      activeRooms: 30,
      bookingsMtd: 6,
      syncSuccess: 99,
    },
    {
      id: 'makemytrip',
      name: 'MakeMyTrip',
      code: 'makemytrip',
      logoBg: '#e41d24',
      logoText: 'my',
      logoColor: '#ffffff',
      status: 'connected',
      lastSync: '6 mins ago',
      activeRooms: 20,
      bookingsMtd: 4,
      syncSuccess: 100,
    },
    {
      id: 'goibibo',
      name: 'Goibibo',
      code: 'goibibo',
      logoBg: '#f36b21',
      logoText: 'go',
      logoColor: '#ffffff',
      status: 'error',
      lastSync: 'Failed (10:15 AM)',
      activeRooms: 18,
      bookingsMtd: 0,
      syncSuccess: 0,
      errorDetail: 'API Token Expired / Gateway 504 Timeout',
    },
  ]);

  // Sync Logs
  const [logs] = useState([
    { id: '1', time: '10:48:12 AM', channel: 'Booking.com', event: 'Inventory & Rate Push', status: 'Success', detail: '42 rooms inventory synchronized. Zero errors.' },
    { id: '2', time: '10:45:00 AM', channel: 'Expedia', event: 'Restrictions Push', status: 'Success', detail: 'Minimum stay rule (2 nights) applied for weekend.' },
    { id: '3', time: '10:42:33 AM', channel: 'Airbnb', event: 'Instant Booking Ingest', status: 'Success', detail: 'New reservation AB9876543 (Sarah Wilson) imported.' },
    { id: '4', time: '10:38:15 AM', channel: 'Agoda', event: 'Rate Parity Verification', status: 'Success', detail: 'All 6 room categories matched target rates.' },
    { id: '5', time: '10:35:50 AM', channel: 'MakeMyTrip', event: 'Inventory Push', status: 'Success', detail: 'Family Room inventory updated (3 units).' },
    { id: '6', time: '10:15:02 AM', channel: 'Goibibo', event: 'Handshake Authentication', status: 'Failed', detail: 'HTTP 504 Gateway Timeout while contacting Goibibo Extranet endpoint.' },
  ]);

  // Recent Bookings Data (from screenshot)
  const recentBookings: RecentBooking[] = [
    {
      id: 'BK1234567',
      channel: 'Booking.com',
      channelCode: 'booking',
      guestName: 'Rahul Mehta',
      roomType: 'Deluxe',
      stayDates: 'Oct 14 – Oct 16',
      status: 'Confirmed',
    },
    {
      id: 'AB9876543',
      channel: 'Airbnb',
      channelCode: 'airbnb',
      guestName: 'Sarah Wilson',
      roomType: 'Standard',
      stayDates: 'Oct 15 – Oct 17',
      status: 'Confirmed',
    },
    {
      id: 'EX5678901',
      channel: 'Expedia',
      channelCode: 'expedia',
      guestName: 'John Smith',
      roomType: 'Suite',
      stayDates: 'Oct 16 – Oct 20',
      status: 'Confirmed',
    },
    {
      id: 'AG2345678',
      channel: 'Agoda',
      channelCode: 'agoda',
      guestName: 'Priya Sharma',
      roomType: 'Superior',
      stayDates: 'Oct 14 – Oct 15',
      status: 'Confirmed',
    },
    {
      id: 'MM1122334',
      channel: 'MakeMyTrip',
      channelCode: 'makemytrip',
      guestName: 'Amit Kumar',
      roomType: 'Family',
      stayDates: 'Oct 18 – Oct 20',
      status: 'Pending',
    },
  ];

  // Channel Performance Data (from screenshot)
  const performanceData: ChannelPerf[] = [
    { channel: 'Booking.com', channelCode: 'booking', bookings: 28, roomNights: 112, sharePercent: 75, color: '#2563EB', revenue: 124560 },
    { channel: 'Expedia', channelCode: 'expedia', bookings: 18, roomNights: 76, sharePercent: 55, color: '#06B6D4', revenue: 82340 },
    { channel: 'Airbnb', channelCode: 'airbnb', bookings: 14, roomNights: 54, sharePercent: 42, color: '#F43F5E', revenue: 62780 },
    { channel: 'Agoda', channelCode: 'agoda', bookings: 10, roomNights: 40, sharePercent: 30, color: '#8B5CF6', revenue: 38900 },
    { channel: 'MakeMyTrip', channelCode: 'makemytrip', bookings: 8, roomNights: 32, sharePercent: 22, color: '#EF4444', revenue: 24500 },
    { channel: 'Goibibo', channelCode: 'goibibo', bookings: 4, roomNights: 16, sharePercent: 12, color: '#F59E0B', revenue: 12800 },
  ];

  // Rate Plan Mappings (from screenshot)
  const rateMappings: RateMapping[] = [
    { channel: 'Booking.com', channelCode: 'booking', mappedCount: 5 },
    { channel: 'Expedia', channelCode: 'expedia', mappedCount: 4 },
    { channel: 'Airbnb', channelCode: 'airbnb', mappedCount: 3 },
    { channel: 'Agoda', channelCode: 'agoda', mappedCount: 4 },
    { channel: 'MakeMyTrip', channelCode: 'makemytrip', mappedCount: 3 },
    { channel: 'Goibibo', channelCode: 'goibibo', mappedCount: 2 },
  ];

  // 15-day Calendar Matrix Data (Exact values from reference image)
  const matrixDates = [
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

  const roomMatrixRows = [
    {
      roomType: 'Standard',
      totalRooms: 20,
      availability: [12, 10, 8, 6, 8, 10, 12, 14, 16, 16, 14, 12, 10, 10, 12],
    },
    {
      roomType: 'Deluxe',
      totalRooms: 15,
      availability: [8, 8, 6, 5, 6, 8, 10, 12, 12, 12, 10, 8, 8, 8, 10],
    },
    {
      roomType: 'Superior',
      totalRooms: 10,
      availability: [6, 6, 4, 3, 4, 6, 8, 8, 10, 10, 6, 6, 4, 4, 8],
    },
    {
      roomType: 'Suite',
      totalRooms: 8,
      availability: [4, 4, 3, 2, 2, 4, 4, 6, 6, 6, 4, 4, 4, 4, 4],
    },
    {
      roomType: 'Family',
      totalRooms: 5,
      availability: [3, 3, 2, 1, 2, 3, 4, 4, 4, 4, 3, 3, 2, 2, 3],
    },
    {
      roomType: 'Executive',
      totalRooms: 4,
      availability: [2, 2, 1, 1, 1, 2, 2, 3, 3, 2, 2, 2, 2, 2, 2],
    },
  ];

  // Exact color styles matching the reference heatmap
  const getCellStyles = (roomType: string, val: number) => {
    if (val === 0) {
      return { bg: '#0f172a', text: '#ffffff' }; // Sold out (Dark)
    }
    let tier: 'high' | 'moderate' | 'low' = 'low';
    if (roomType === 'Standard') {
      tier = val >= 10 ? 'high' : val >= 6 ? 'moderate' : 'low';
    } else if (roomType === 'Deluxe') {
      tier = val >= 10 ? 'high' : val >= 6 ? 'moderate' : 'low';
    } else if (roomType === 'Superior') {
      tier = val >= 8 ? 'high' : val >= 6 ? 'moderate' : 'low';
    } else if (roomType === 'Suite') {
      tier = val >= 6 ? 'high' : val >= 4 ? 'moderate' : 'low';
    } else if (roomType === 'Family') {
      tier = val >= 4 ? 'high' : 'low';
    } else if (roomType === 'Executive') {
      tier = val >= 3 ? 'moderate' : 'low';
    }

    if (tier === 'high') {
      return { bg: '#dcfce7', text: '#15803d' }; // Soft pastel green
    }
    if (tier === 'moderate') {
      return { bg: '#fef3c7', text: '#b45309' }; // Soft pastel amber
    }
    return { bg: '#fee2e2', text: '#dc2626' }; // Soft pastel pink/red
  };

  // Channel Logo Renderer Helper
  const renderChannelLogo = (code: string, size = 'sm') => {
    const sizeClasses = size === 'lg' ? 'w-10 h-10 text-base' : 'w-7 h-7 text-xs';
    switch (code) {
      case 'booking':
        return (
          <div className={`${sizeClasses} rounded-lg bg-[#003580] text-white font-extrabold flex items-center justify-center flex-shrink-0 shadow-xs tracking-tighter`}>
            B.
          </div>
        );
      case 'expedia':
        return (
          <div className={`${sizeClasses} rounded-lg bg-[#FFCC00] text-black font-extrabold flex items-center justify-center flex-shrink-0 shadow-xs`}>
            <Lucide.ArrowUpRight size={size === 'lg' ? 22 : 16} strokeWidth={3} />
          </div>
        );
      case 'airbnb':
        return (
          <div className={`${sizeClasses} rounded-lg bg-[#FF5A5F] text-white font-bold flex items-center justify-center flex-shrink-0 shadow-xs`}>
            <Lucide.Home size={size === 'lg' ? 20 : 15} strokeWidth={2.4} />
          </div>
        );
      case 'agoda':
        return (
          <div className={`${sizeClasses} rounded-lg bg-white border border-border flex items-center justify-center flex-shrink-0 shadow-xs p-1`}>
            <div className="flex items-center gap-0.5">
              <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
              <span className="w-1.5 h-1.5 rounded-full bg-yellow-400" />
              <span className="w-1.5 h-1.5 rounded-full bg-green-500" />
              <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
            </div>
          </div>
        );
      case 'makemytrip':
        return (
          <div className={`${sizeClasses} rounded-lg bg-[#e41d24] text-white font-serif font-black italic flex items-center justify-center flex-shrink-0 shadow-xs`}>
            my
          </div>
        );
      case 'goibibo':
        return (
          <div className={`${sizeClasses} rounded-lg bg-[#f36b21] text-white font-black flex items-center justify-center flex-shrink-0 shadow-xs tracking-tight`}>
            go
          </div>
        );
      default:
        return (
          <div className={`${sizeClasses} rounded-lg bg-primary text-primary-foreground font-bold flex items-center justify-center flex-shrink-0`}>
            <Lucide.Globe size={16} />
          </div>
        );
    }
  };

  // Sync Trigger Handler
  const handleTriggerSync = () => {
    setIsSyncing(true);
    toast('Synchronizing with 6 channels...', { tone: 'info' });
    setTimeout(() => {
      setIsSyncing(false);
      setLastGlobalSync('Just now');
      toast('Sync complete! All rates and room availability are up to date.', { tone: 'success' });
    }, 1200);
  };

  // Reconnect Goibibo Handler
  const handleReconnect = (channelId: string) => {
    toast(`Re-authenticating with ${channelId.toUpperCase()} API endpoint...`, { tone: 'info' });
    setTimeout(() => {
      setChannels((prev) =>
        prev.map((c) =>
          c.id === channelId
            ? { ...c, status: 'connected', lastSync: 'Just now', syncSuccess: 100, errorDetail: undefined }
            : c,
        ),
      );
      toast('Goibibo API connected and verified successfully!', { tone: 'success' });
    }, 1000);
  };

  // Save Settings Handler
  const handleSaveSettings = () => {
    toast('Global sync settings and markup rules saved successfully!', { tone: 'success' });
  };

  return (
    <div className="flex flex-col gap-4 pb-8 w-full">
      {/* 1. TOP HEADER & MAIN CONTROLS */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-[28px] font-bold tracking-tight text-ink flex items-center gap-2.5">
            <Lucide.Globe className="text-primary" size={28} />
            <span>Channel Manager</span>
          </h1>
          <p className="text-xs text-ink-secondary mt-1">
            Manage your online travel channels, synchronize inventory, rates and availability in real-time
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Auto Sync Enabled Pill */}
          <button
            type="button"
            onClick={() => {
              setAutoSyncEnabled(!autoSyncEnabled);
              toast(`Auto Sync ${!autoSyncEnabled ? 'Enabled' : 'Paused'}`, { tone: 'info' });
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border transition-all cursor-pointer"
            style={{
              background: autoSyncEnabled ? 'color-mix(in srgb, #10b981 12%, var(--color-surface))' : 'var(--color-muted-surface)',
              borderColor: autoSyncEnabled ? 'color-mix(in srgb, #10b981 30%, transparent)' : 'var(--color-border)',
              color: autoSyncEnabled ? '#059669' : 'var(--color-ink-muted)',
            }}
          >
            <span className={`w-2 h-2 rounded-full ${autoSyncEnabled ? 'bg-emerald-500 animate-pulse' : 'bg-ink-muted'}`} />
            <span>{autoSyncEnabled ? 'Auto Sync Enabled' : 'Auto Sync Paused'}</span>
          </button>

          {/* Sync Now Button */}
          <button
            type="button"
            onClick={handleTriggerSync}
            disabled={isSyncing}
            className="pms-btn-ghost flex items-center gap-1.5 text-sm font-medium px-3.5 py-2 rounded-xl border border-border"
            title="Force instant sync with all OTAs"
          >
            <Lucide.RefreshCw size={14} className={isSyncing ? 'animate-spin text-primary' : ''} />
            <span>{isSyncing ? 'Syncing...' : 'Sync Now'}</span>
          </button>

          {/* Channel Logs Button */}
          <button
            type="button"
            onClick={() => setShowLogsModal(true)}
            className="pms-btn-ghost flex items-center gap-1.5 text-sm font-medium px-3.5 py-2 rounded-xl border border-border"
          >
            <Lucide.ScrollText size={14} />
            <span>Channel Logs</span>
          </button>

          {/* Add Channel Button */}
          <button
            type="button"
            onClick={() => setShowAddChannelModal(true)}
            className="pms-btn-primary flex items-center gap-1.5 px-3.5 py-2 text-sm font-semibold rounded-xl shadow-xs"
          >
            <Lucide.Plus size={16} strokeWidth={2.4} />
            <span>Add Channel</span>
          </button>
        </div>
      </div>

      {/* 2. STATS / KPI ROW (5 CARDS) */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
        {/* Card 1: Connected Channels */}
        <div className="pms-card p-3 sm:p-3.5 flex items-center gap-3 transition-all hover:shadow-md">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center flex-shrink-0">
            <Lucide.Link2 size={20} strokeWidth={2.4} />
          </div>
          <div>
            <div className="text-xl font-bold text-ink leading-tight tnum">6</div>
            <div className="text-xs font-medium text-ink-secondary mt-0.5">Connected Channels</div>
          </div>
        </div>

        {/* Card 2: Total Room Nights */}
        <div className="pms-card p-3 sm:p-3.5 flex items-center gap-3 transition-all hover:shadow-md">
          <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center flex-shrink-0">
            <Lucide.BedDouble size={20} strokeWidth={2.4} />
          </div>
          <div>
            <div className="text-xl font-bold text-ink leading-tight tnum">348</div>
            <div className="text-xs font-medium text-ink-secondary mt-0.5">
              Total Room Nights <span className="text-xs font-normal text-ink-muted">(Next 30 days)</span>
            </div>
          </div>
        </div>

        {/* Card 3: Upcoming Bookings */}
        <div className="pms-card p-3 sm:p-3.5 flex items-center gap-3 transition-all hover:shadow-md">
          <div className="w-10 h-10 rounded-xl bg-blue-500/10 text-blue-600 flex items-center justify-center flex-shrink-0">
            <Lucide.CalendarDays size={20} strokeWidth={2.4} />
          </div>
          <div>
            <div className="text-xl font-bold text-ink leading-tight tnum">87</div>
            <div className="text-xs font-medium text-ink-secondary mt-0.5">
              Upcoming Bookings <span className="text-xs font-normal text-ink-muted">(from channels)</span>
            </div>
          </div>
        </div>

        {/* Card 4: Expected Revenue */}
        <div className="pms-card p-3 sm:p-3.5 flex items-center gap-3 transition-all hover:shadow-md">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-700 flex items-center justify-center flex-shrink-0 font-bold text-lg">
            ₹
          </div>
          <div>
            <div className="text-xl font-bold text-ink leading-tight tnum">₹4,32,680</div>
            <div className="text-xs font-medium text-ink-secondary mt-0.5">
              Expected Revenue <span className="text-xs font-normal text-ink-muted">(Next 30 days)</span>
            </div>
          </div>
        </div>

        {/* Card 5: Channel Issues */}
        <div className="pms-card p-4 flex items-center gap-3.5 col-span-2 md:col-span-1 transition-all hover:shadow-md">
          <div className="w-12 h-12 rounded-2xl bg-rose-500/10 text-rose-600 flex items-center justify-center flex-shrink-0">
            <Lucide.AlertCircle size={22} strokeWidth={2.4} />
          </div>
          <div>
            <div className="text-2xl font-extrabold text-ink leading-tight tnum">2</div>
            <div className="text-xs font-semibold text-ink-secondary mt-0.5">
              Channel Issues <span className="text-[11px] font-semibold text-rose-600">(Needs attention)</span>
            </div>
          </div>
        </div>
      </div>

      {/* 3. MAIN OPERATIONAL ROW: 6 CHANNELS GRID (LEFT) + GLOBAL SYNC SETTINGS (RIGHT) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* LEFT COLUMN: 6 Channel Cards in 3x2 Grid */}
        <div className="lg:col-span-8 grid grid-cols-1 md:grid-cols-3 gap-4">
          {channels.map((ch) => {
            const isError = ch.status === 'error';
            return (
              <div
                key={ch.id}
                className="pms-card p-4 flex flex-col justify-between transition-all hover:shadow-md"
                style={{ borderColor: isError ? 'color-mix(in srgb, #ef4444 40%, var(--color-border))' : undefined }}
              >
                <div>
                  {/* Top: Logo + Name + Status + 3-Dots */}
                  <div className="flex items-start justify-between gap-2 mb-3">
                    <div className="flex items-center gap-2.5 min-w-0">
                      {renderChannelLogo(ch.code, 'lg')}
                      <div className="min-w-0">
                        <div className="font-bold text-ink text-sm truncate">{ch.name}</div>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <span
                            className={`inline-flex items-center gap-1 px-1.5 py-0.2 rounded-full text-[10.5px] font-semibold ${
                              isError
                                ? 'bg-rose-100 text-rose-700 border border-rose-200'
                                : 'bg-emerald-100 text-emerald-700 border border-emerald-200'
                            }`}
                          >
                            <span className={`w-1.5 h-1.5 rounded-full ${isError ? 'bg-rose-500' : 'bg-emerald-500'}`} />
                            <span>{isError ? 'Connection Error' : 'Connected'}</span>
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="relative">
                      <button
                        type="button"
                        onClick={() => setSelectedChannelForMenu(selectedChannelForMenu === ch.id ? null : ch.id)}
                        className="p-1 rounded-lg hover:bg-muted-surface text-ink-muted hover:text-ink transition-colors"
                        title="Channel settings"
                      >
                        <Lucide.MoreVertical size={16} />
                      </button>

                      {selectedChannelForMenu === ch.id && (
                        <div
                          className="absolute right-0 top-7 w-44 rounded-xl border shadow-lg py-1.5 z-20 text-xs text-ink"
                          style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}
                        >
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedChannelForMenu(null);
                              toast(`Configuring ${ch.name}`, { tone: 'info' });
                            }}
                            className="w-full text-left px-3 py-1.5 hover:bg-muted-surface flex items-center gap-2"
                          >
                            <Lucide.Settings size={13} />
                            <span>Channel Settings</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedChannelForMenu(null);
                              setShowMappingModal(true);
                            }}
                            className="w-full text-left px-3 py-1.5 hover:bg-muted-surface flex items-center gap-2"
                          >
                            <Lucide.Layers size={13} />
                            <span>Room & Rate Mapping</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedChannelForMenu(null);
                              toast(`Syncing ${ch.name}...`, { tone: 'info' });
                            }}
                            className="w-full text-left px-3 py-1.5 hover:bg-muted-surface flex items-center gap-2"
                          >
                            <Lucide.RefreshCw size={13} />
                            <span>Sync Now</span>
                          </button>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Subtext Last sync */}
                  <div className="text-[11px] mb-3">
                    <span className="text-ink-muted">Last sync </span>
                    <span className={isError ? 'font-bold text-rose-600' : 'font-semibold text-ink-secondary'}>
                      {ch.lastSync}
                    </span>
                  </div>
                </div>

                {/* Bottom 3 Metrics Row */}
                <div
                  className="pt-3 border-t grid grid-cols-3 gap-1.5 text-center items-center"
                  style={{ borderColor: 'var(--color-border-subtle)' }}
                >
                  {/* Metric 1: Active rooms */}
                  <div>
                    <div className="font-extrabold text-ink text-sm tnum">{ch.activeRooms}</div>
                    <div className="text-[10px] text-ink-muted leading-tight mt-0.5">Active rooms</div>
                  </div>

                  {/* Metric 2: Bookings (MTD) */}
                  <div>
                    <div className="font-extrabold text-ink text-sm tnum">{ch.bookingsMtd}</div>
                    <div className="text-[10px] text-ink-muted leading-tight mt-0.5">Bookings (MTD)</div>
                  </div>

                  {/* Metric 3: Sync success or Reconnect Button */}
                  <div>
                    {isError ? (
                      <button
                        type="button"
                        onClick={() => handleReconnect(ch.id)}
                        className="pms-btn-primary px-3 py-1.5 text-[11px] font-bold rounded-lg shadow-xs w-full cursor-pointer"
                      >
                        Reconnect
                      </button>
                    ) : (
                      <>
                        <div className="font-extrabold text-ink text-sm tnum">{ch.syncSuccess}%</div>
                        <div className="text-[10px] text-ink-muted leading-tight mt-0.5">Sync success</div>
                      </>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* RIGHT COLUMN: Global Sync Settings Card */}
        <div className="pms-card lg:col-span-4 p-5 flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 pb-3 mb-3 border-b" style={{ borderColor: 'var(--color-border-subtle)' }}>
              <Lucide.Settings2 size={18} className="text-primary" />
              <h2 className="text-sm font-bold text-ink">Global Sync Settings</h2>
            </div>

            {/* List of Toggles */}
            <div className="flex flex-col gap-3">
              {/* Toggle 1: Sync Availability */}
              <div className="flex items-center justify-between text-xs">
                <span className="flex items-center gap-2 text-ink font-semibold">
                  <Lucide.CheckCircle size={14} className="text-primary" />
                  <span>Sync Availability</span>
                </span>
                <button
                  type="button"
                  onClick={() => setSyncAvailability(!syncAvailability)}
                  className={`w-9 h-5 rounded-full transition-colors p-0.5 flex items-center cursor-pointer ${
                    syncAvailability ? 'bg-emerald-500 justify-end' : 'bg-muted-surface border border-border justify-start'
                  }`}
                >
                  <span className="w-4 h-4 rounded-full bg-white shadow-xs" />
                </button>
              </div>

              {/* Toggle 2: Sync Rates */}
              <div className="flex items-center justify-between text-xs">
                <span className="flex items-center gap-2 text-ink font-semibold">
                  <Lucide.Tag size={14} className="text-primary" />
                  <span>Sync Rates</span>
                </span>
                <button
                  type="button"
                  onClick={() => setSyncRates(!syncRates)}
                  className={`w-9 h-5 rounded-full transition-colors p-0.5 flex items-center cursor-pointer ${
                    syncRates ? 'bg-emerald-500 justify-end' : 'bg-muted-surface border border-border justify-start'
                  }`}
                >
                  <span className="w-4 h-4 rounded-full bg-white shadow-xs" />
                </button>
              </div>

              {/* Toggle 3: Sync Restrictions */}
              <div className="flex items-center justify-between text-xs">
                <span className="flex items-center gap-2 text-ink font-semibold">
                  <Lucide.ShieldCheck size={14} className="text-primary" />
                  <span>Sync Restrictions</span>
                </span>
                <button
                  type="button"
                  onClick={() => setSyncRestrictions(!syncRestrictions)}
                  className={`w-9 h-5 rounded-full transition-colors p-0.5 flex items-center cursor-pointer ${
                    syncRestrictions ? 'bg-emerald-500 justify-end' : 'bg-muted-surface border border-border justify-start'
                  }`}
                >
                  <span className="w-4 h-4 rounded-full bg-white shadow-xs" />
                </button>
              </div>

              {/* Toggle 4: Sync Minimum Stay */}
              <div className="flex items-center justify-between text-xs">
                <span className="flex items-center gap-2 text-ink font-semibold">
                  <Lucide.Clock size={14} className="text-primary" />
                  <span>Sync Minimum Stay</span>
                </span>
                <button
                  type="button"
                  onClick={() => setSyncMinStay(!syncMinStay)}
                  className={`w-9 h-5 rounded-full transition-colors p-0.5 flex items-center cursor-pointer ${
                    syncMinStay ? 'bg-emerald-500 justify-end' : 'bg-muted-surface border border-border justify-start'
                  }`}
                >
                  <span className="w-4 h-4 rounded-full bg-white shadow-xs" />
                </button>
              </div>

              {/* Toggle 5: Sync Stop Sell */}
              <div className="flex items-center justify-between text-xs">
                <span className="flex items-center gap-2 text-ink font-semibold">
                  <Lucide.Ban size={14} className="text-primary" />
                  <span>Sync Stop Sell</span>
                </span>
                <button
                  type="button"
                  onClick={() => setSyncStopSell(!syncStopSell)}
                  className={`w-9 h-5 rounded-full transition-colors p-0.5 flex items-center cursor-pointer ${
                    syncStopSell ? 'bg-emerald-500 justify-end' : 'bg-muted-surface border border-border justify-start'
                  }`}
                >
                  <span className="w-4 h-4 rounded-full bg-white shadow-xs" />
                </button>
              </div>

              {/* Toggle 6: Auto Sync (every 15 mins) */}
              <div className="flex items-center justify-between text-xs">
                <span className="flex items-center gap-2 text-ink font-semibold">
                  <Lucide.RefreshCw size={14} className="text-primary" />
                  <span>Auto Sync (every 15 mins)</span>
                </span>
                <button
                  type="button"
                  onClick={() => setAutoSyncToggle(!autoSyncToggle)}
                  className={`w-9 h-5 rounded-full transition-colors p-0.5 flex items-center cursor-pointer ${
                    autoSyncToggle ? 'bg-emerald-500 justify-end' : 'bg-muted-surface border border-border justify-start'
                  }`}
                >
                  <span className="w-4 h-4 rounded-full bg-white shadow-xs" />
                </button>
              </div>
            </div>

            {/* Time Zone Selection */}
            <div className="mt-4 pt-3 border-t flex flex-col gap-1.5" style={{ borderColor: 'var(--color-border-subtle)' }}>
              <label className="text-[11px] font-semibold text-ink-secondary">Sync Time Zone</label>
              <select
                value={timeZone}
                onChange={(e) => setTimeZone(e.target.value)}
                className="w-full pms-input text-xs font-medium"
              >
                <option value="(GMT+05:30) India Standard Time">(GMT+05:30) India Standard Time</option>
                <option value="(GMT+00:00) UTC">(GMT+00:00) UTC (Universal Coordinated)</option>
                <option value="(GMT+01:00) Central European Time">(GMT+01:00) Central European Time</option>
                <option value="(GMT-05:00) Eastern Time (US & Canada)">(GMT-05:00) Eastern Time (US & Canada)</option>
                <option value="(GMT+08:00) Singapore / Beijing Time">(GMT+08:00) Singapore / Beijing Time</option>
              </select>
            </div>

            {/* Default Markup (%) */}
            <div className="mt-3 flex flex-col gap-1.5">
              <label className="text-[11px] font-semibold text-ink-secondary flex items-center gap-1">
                <span>Default Markup (%)</span>
                <span title="Automatic price increase applied to channel rate pushes">
                  <Lucide.Info size={12} className="text-ink-muted" />
                </span>
              </label>
              <input
                type="number"
                min="0"
                max="100"
                value={defaultMarkup}
                onChange={(e) => setDefaultMarkup(e.target.value)}
                className="w-full pms-input text-xs font-medium"
              />
            </div>
          </div>

          {/* Save Settings Button */}
          <button
            type="button"
            onClick={handleSaveSettings}
            className="pms-btn-primary w-full mt-4 py-2 text-xs font-bold rounded-xl shadow-xs"
          >
            Save Settings
          </button>
        </div>
      </div>

      {/* 4. MIDDLE SECTION: MATRIX / CALENDAR VIEW & TABS */}
      <div className="pms-card p-4 sm:p-5">
        {/* Navigation Tabs & Filter Bar */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b" style={{ borderColor: 'var(--color-border-subtle)' }}>
          {/* Tabs */}
          <div className="flex items-center gap-1 overflow-x-auto pb-1 text-xs font-semibold">
            {[
              { id: 'calendar', label: 'Calendar View' },
              { id: 'rates', label: 'Rate & Availability' },
              { id: 'restrictions', label: 'Restrictions' },
              { id: 'mapping', label: 'Mapping' },
              { id: 'promotions', label: 'Channel Promotions' },
            ].map((tab) => {
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id as typeof activeTab)}
                  className={`px-3.5 py-2 rounded-xl transition-all whitespace-nowrap cursor-pointer ${
                    isActive
                      ? 'border-b-2 border-primary text-primary font-bold'
                      : 'text-ink-muted hover:text-ink hover:bg-muted-surface'
                  }`}
                  style={{
                    borderBottomColor: isActive ? 'var(--color-primary)' : 'transparent',
                  }}
                >
                  {tab.label}
                </button>
              );
            })}
          </div>

          {/* Filter Dropdowns on the right */}
          <div className="flex items-center gap-2 flex-wrap">
            {/* Channels Filter */}
            <select
              value={selectedChannelFilter}
              onChange={(e) => setSelectedChannelFilter(e.target.value)}
              className="pms-input rounded-xl px-3 py-1.5 text-xs font-semibold"
            >
              <option value="all">All Channels</option>
              <option value="booking">Booking.com</option>
              <option value="expedia">Expedia</option>
              <option value="airbnb">Airbnb</option>
              <option value="agoda">Agoda</option>
              <option value="makemytrip">MakeMyTrip</option>
            </select>

            {/* Room Types Filter */}
            <select
              value={selectedRoomFilter}
              onChange={(e) => setSelectedRoomFilter(e.target.value)}
              className="pms-input rounded-xl px-3 py-1.5 text-xs font-semibold"
            >
              <option value="all">All Room Types</option>
              <option value="standard">Standard</option>
              <option value="deluxe">Deluxe</option>
              <option value="superior">Superior</option>
              <option value="suite">Suite</option>
              <option value="family">Family</option>
              <option value="executive">Executive</option>
            </select>

            {/* Date Range Picker */}
            <button
              type="button"
              onClick={() => toast('Date Range Picker (Oct 14, 2026 – Oct 28, 2026)', { tone: 'info' })}
              className="pms-btn-ghost flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold"
            >
              <Lucide.Calendar size={13} className="text-primary" />
              <span>Oct 14, 2026 – Oct 28, 2026</span>
            </button>
          </div>
        </div>

        {/* The 15-Day Availability Matrix Table */}
        <div className="overflow-x-auto mt-4 rounded-xl border" style={{ borderColor: 'var(--color-border)' }}>
          <table className="w-full border-collapse text-xs">
            <thead>
              <tr style={{ background: 'color-mix(in srgb, var(--color-muted-surface) 60%, var(--color-surface))' }}>
                <th className="py-2.5 px-3 text-left font-bold text-ink border-b border-r sticky left-0 z-10 bg-surface min-w-[110px]" style={{ borderColor: 'var(--color-border)' }}>
                  Room Type
                </th>
                <th className="py-2.5 px-2 text-center font-bold text-ink border-b border-r min-w-[70px]" style={{ borderColor: 'var(--color-border)' }}>
                  Total Rooms
                </th>
                {matrixDates.map((d, i) => (
                  <th
                    key={i}
                    className={`py-2 px-1 text-center font-semibold border-b border-r min-w-[44px] ${
                      d.isWeekend ? 'bg-primary/5 text-primary' : 'text-ink-secondary'
                    }`}
                    style={{ borderColor: 'var(--color-border-subtle)' }}
                  >
                    <div className="text-[12px] font-bold leading-tight">{d.day}</div>
                    <div className="text-[9.5px] leading-tight text-ink-muted">{d.month}</div>
                    <div className="text-[9px] uppercase font-bold text-ink-muted mt-0.5">{d.weekday}</div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {roomMatrixRows
                .filter((r) => selectedRoomFilter === 'all' || r.roomType.toLowerCase() === selectedRoomFilter)
                .map((row) => (
                  <tr key={row.roomType} className="border-b" style={{ borderColor: 'var(--color-border-subtle)' }}>
                    {/* Room Type (Sticky left) */}
                    <td className="py-2.5 px-3 font-bold text-ink border-r sticky left-0 z-10 bg-surface" style={{ borderColor: 'var(--color-border)' }}>
                      {row.roomType}
                    </td>

                    {/* Total Rooms */}
                    <td className="py-2.5 px-2 text-center font-semibold text-ink-muted border-r tnum bg-surface" style={{ borderColor: 'var(--color-border)' }}>
                      {row.totalRooms}
                    </td>

                    {/* 15 Days Availability Cells */}
                    {row.availability.map((avail, idx) => {
                      const dateObj = matrixDates[idx];
                      const style = getCellStyles(row.roomType, avail);
                      return (
                        <td
                          key={idx}
                          className="p-0 border-r border-b text-center h-10"
                          style={{
                            borderColor: 'var(--color-border-subtle)',
                            background: style.bg,
                          }}
                        >
                          <button
                            type="button"
                            onClick={() =>
                              setSelectedCellInfo({
                                room: row.roomType,
                                date: `${dateObj.day} ${dateObj.month} (${dateObj.weekday})`,
                                available: avail,
                                total: row.totalRooms,
                              })
                            }
                            className="w-full h-full flex items-center justify-center font-bold text-xs transition-opacity hover:opacity-80 cursor-pointer"
                            style={{ color: style.text }}
                            title={`Room: ${row.roomType} | Available: ${avail}/${row.totalRooms}`}
                          >
                            {avail}
                          </button>
                        </td>
                      );
                    })}
                  </tr>
                ))}
            </tbody>
          </table>
        </div>

        {/* Availability Legend Bar */}
        <div className="flex items-center gap-5 mt-4 pt-3 border-t text-xs font-medium text-ink-secondary flex-wrap" style={{ borderColor: 'var(--color-border-subtle)' }}>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-[#15803d]" />
            <span>High Availability (≥ 70%)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-[#b45309]" />
            <span>Moderate (40–70%)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-[#dc2626]" />
            <span>Low (&lt; 40%)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-[#0f172a]" />
            <span>Sold Out</span>
          </div>
        </div>
      </div>

      {/* 5. BOTTOM ROW (3 CARDS): RECENT BOOKINGS + PERFORMANCE + RATE PLAN MAPPING */}
      <div className="flex flex-col lg:flex-row gap-5 items-stretch w-full">
        {/* CARD 1: Recent Channel Bookings */}
        <div className="pms-card w-full lg:w-[42%] flex-shrink-0 p-4 sm:p-5 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 mb-3 border-b" style={{ borderColor: 'var(--color-border-subtle)' }}>
              <div className="flex items-center gap-2">
                <Lucide.ReceiptText size={17} className="text-primary" />
                <h2 className="text-sm font-bold text-ink">Recent Channel Bookings</h2>
              </div>
              <button
                type="button"
                onClick={() => setViewAllBookingsModal(true)}
                className="text-xs font-semibold text-primary hover:underline cursor-pointer"
              >
                View all
              </button>
            </div>

            <div className="overflow-x-auto -mx-1 px-1">
              <table className="w-full text-xs text-left min-w-[460px]">
                <thead>
                  <tr className="text-ink-muted uppercase text-[10px] font-bold border-b" style={{ borderColor: 'var(--color-border-subtle)' }}>
                    <th className="pb-2">Channel</th>
                    <th className="pb-2">Booking ID</th>
                    <th className="pb-2">Guest Name</th>
                    <th className="pb-2">Room Type</th>
                    <th className="pb-2">Stay Dates</th>
                    <th className="pb-2 text-right">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y" style={{ borderColor: 'var(--color-border-subtle)' }}>
                  {recentBookings.map((b) => (
                    <tr key={b.id} className="hover:bg-muted-surface/40 transition-colors">
                      <td className="py-2.5 pr-2 whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          {renderChannelLogo(b.channelCode)}
                          <span className="font-semibold text-ink truncate text-[11.5px]">{b.channel}</span>
                        </div>
                      </td>
                      <td className="py-2.5 pr-2 font-mono text-ink-muted text-[11px] whitespace-nowrap">
                        {b.id}
                      </td>
                      <td className="py-2.5 pr-2 font-bold text-ink whitespace-nowrap text-[11.5px]">
                        {b.guestName}
                      </td>
                      <td className="py-2.5 pr-2 text-ink-secondary whitespace-nowrap text-[11px]">
                        {b.roomType}
                      </td>
                      <td className="py-2.5 pr-2 text-ink-muted whitespace-nowrap text-[11px]">
                        {b.stayDates}
                      </td>
                      <td className="py-2.5 text-right whitespace-nowrap">
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10.5px] font-semibold ${
                            b.status === 'Confirmed'
                              ? 'bg-emerald-100 text-emerald-700 border border-emerald-200'
                              : 'bg-amber-100 text-amber-700 border border-amber-200'
                          }`}
                        >
                          <span className={`w-1.5 h-1.5 rounded-full ${b.status === 'Confirmed' ? 'bg-emerald-500' : 'bg-amber-500'}`} />
                          <span>{b.status}</span>
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* CARD 2: Channel Performance (Last 30 Days) */}
        <div className="pms-card w-full lg:w-[32%] flex-shrink-0 p-4 sm:p-5 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 mb-3 border-b" style={{ borderColor: 'var(--color-border-subtle)' }}>
              <div className="flex items-center gap-2">
                <Lucide.BarChart3 size={17} className="text-primary" />
                <h2 className="text-sm font-bold text-ink">Channel Performance <span className="font-normal text-xs text-ink-muted">(Last 30 Days)</span></h2>
              </div>
              <button
                type="button"
                onClick={() => toast('Viewing Channel Performance Analytics', { tone: 'info' })}
                className="text-xs font-semibold text-primary hover:underline cursor-pointer"
              >
                View report
              </button>
            </div>

            <div className="overflow-x-auto -mx-1 px-1">
              <table className="w-full text-xs text-left min-w-[300px]">
                <thead>
                  <tr className="text-ink-muted uppercase text-[10px] font-bold border-b" style={{ borderColor: 'var(--color-border-subtle)' }}>
                    <th className="pb-2">Channel</th>
                    <th className="pb-2 text-center">Bookings</th>
                    <th className="pb-2 text-center">Room Nights</th>
                    <th className="pb-2 text-right">Revenue (₹)</th>
                  </tr>
                </thead>
                <tbody className="divide-y" style={{ borderColor: 'var(--color-border-subtle)' }}>
                  {performanceData.map((p) => (
                    <tr key={p.channel} className="hover:bg-muted-surface/40 transition-colors">
                      <td className="py-2.5 pr-2 whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          {renderChannelLogo(p.channelCode)}
                          <span className="font-semibold text-ink text-[11.5px] truncate">{p.channel}</span>
                        </div>
                      </td>
                      <td className="py-2.5 px-2 text-center font-bold text-ink tnum">
                        {p.bookings}
                      </td>
                      <td className="py-2.5 px-2 text-center text-ink-secondary tnum">
                        <div className="flex items-center justify-center gap-2">
                          <span>{p.roomNights}</span>
                          <div className="w-10 h-1.5 bg-muted-surface rounded-full overflow-hidden hidden sm:block">
                            <div className="h-full rounded-full" style={{ width: `${p.sharePercent}%`, background: p.color }} />
                          </div>
                        </div>
                      </td>
                      <td className="py-2.5 text-right font-bold text-ink tnum whitespace-nowrap text-[11.5px]">
                        ₹{p.revenue.toLocaleString('en-IN')}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* CARD 3: Rate Plan Mapping */}
        <div className="pms-card w-full lg:flex-1 min-w-[260px] p-4 sm:p-5 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 mb-2 border-b gap-2" style={{ borderColor: 'var(--color-border-subtle)' }}>
              <div className="min-w-0 flex-1">
                <h2 className="text-sm font-bold text-ink">Rate Plan Mapping</h2>
                <p className="text-[11px] text-ink-muted truncate">Manage rate plan mapping for each channel</p>
              </div>
              <button
                type="button"
                onClick={() => setShowMappingModal(true)}
                className="pms-btn-primary px-2.5 py-1 text-[11px] font-bold rounded-lg shadow-xs flex-shrink-0 whitespace-nowrap"
              >
                Manage Mapping
              </button>
            </div>

            <div className="flex flex-col divide-y" style={{ borderColor: 'var(--color-border-subtle)' }}>
              {rateMappings.map((rm) => (
                <div key={rm.channel} className="py-2.5 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2 min-w-0">
                    {renderChannelLogo(rm.channelCode)}
                    <div className="min-w-0">
                      <div className="font-bold text-ink text-xs truncate">{rm.channel}</div>
                      <div className="text-[10.5px] text-ink-muted truncate">{rm.mappedCount} rate plans mapped</div>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      toast(`Viewing mapping for ${rm.channel}`, { tone: 'info' });
                      setShowMappingModal(true);
                    }}
                    className="pms-btn-ghost px-2.5 py-1 text-[11px] font-semibold rounded-lg border border-border flex-shrink-0 whitespace-nowrap hover:bg-muted-surface cursor-pointer"
                  >
                    View
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ================= MODAL: ADD CHANNEL ================= */}
      {showAddChannelModal && (
        <Modal
          open={showAddChannelModal}
          onClose={() => setShowAddChannelModal(false)}
          title="Connect New Travel Channel"
          subtitle="Configure two-way API connection with Online Travel Agencies (OTAs)"
          footer={
            <div className="flex items-center justify-end gap-2 w-full">
              <button
                type="button"
                onClick={() => setShowAddChannelModal(false)}
                className="pms-btn-ghost px-4 py-2 text-xs font-semibold rounded-xl border border-border"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  toast('Channel credentials verified! Connection established.', { tone: 'success' });
                  setShowAddChannelModal(false);
                }}
                className="pms-btn-primary px-4 py-2 text-xs font-bold rounded-xl"
              >
                Connect Channel
              </button>
            </div>
          }
        >
          <div className="flex flex-col gap-4 text-xs">
            <div>
              <label className="pms-label mb-1.5 block">Select OTA Provider</label>
              <select className="pms-input w-full text-xs font-medium">
                <option value="trip">Trip.com / Ctrip</option>
                <option value="vrbo">Vrbo / HomeAway</option>
                <option value="hostelworld">Hostelworld</option>
                <option value="despegar">Despegar</option>
                <option value="google">Google Hotels (Free Links & CPC)</option>
              </select>
            </div>

            <div>
              <label className="pms-label mb-1.5 block">Hotel / Property ID on Channel</label>
              <input
                type="text"
                placeholder="e.g. PROP-8849102"
                className="pms-input w-full text-xs font-medium"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="pms-label mb-1.5 block">API Client ID</label>
                <input
                  type="text"
                  placeholder="client_live_..."
                  className="pms-input w-full text-xs font-medium"
                />
              </div>
              <div>
                <label className="pms-label mb-1.5 block">API Secret Key</label>
                <input
                  type="password"
                  placeholder="••••••••••••••••"
                  className="pms-input w-full text-xs font-medium"
                />
              </div>
            </div>

            <div className="rounded-xl border p-3 flex items-start gap-2.5" style={{ background: 'var(--color-muted-surface)', borderColor: 'var(--color-border)' }}>
              <Lucide.ShieldCheck size={18} className="text-emerald-600 flex-shrink-0 mt-0.5" />
              <p className="text-[11.5px] text-ink-secondary leading-relaxed">
                Our Channel Manager uses verified PCI-compliant 256-bit SSL encrypted webhooks to synchronize rate plans, ARI (Availability, Rates & Inventory), and instant guest reservations.
              </p>
            </div>
          </div>
        </Modal>
      )}

      {/* ================= MODAL: CHANNEL LOGS ================= */}
      {showLogsModal && (
        <Modal
          open={showLogsModal}
          onClose={() => setShowLogsModal(false)}
          title="Channel Synchronization Logs"
          subtitle="Real-time audit log of inventory, rate pushes, and webhook activity"
          wide
          footer={
            <div className="flex items-center justify-between w-full">
              <span className="text-[11px] text-ink-muted">Last synced: {lastGlobalSync}</span>
              <button
                type="button"
                onClick={() => setShowLogsModal(false)}
                className="pms-btn-primary px-4 py-2 text-xs font-bold rounded-xl"
              >
                Close Logs
              </button>
            </div>
          }
        >
          <div className="flex flex-col gap-2.5">
            {logs.map((log) => (
              <div
                key={log.id}
                className="rounded-xl border p-3 flex items-start justify-between gap-3 text-xs"
                style={{
                  background: log.status === 'Failed' ? 'color-mix(in srgb, #ef4444 8%, var(--color-surface))' : 'var(--color-page)',
                  borderColor: log.status === 'Failed' ? 'color-mix(in srgb, #ef4444 30%, transparent)' : 'var(--color-border)',
                }}
              >
                <div className="flex items-start gap-2.5 min-w-0">
                  <span className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ${log.status === 'Failed' ? 'bg-rose-500' : 'bg-emerald-500'}`} />
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-bold text-ink">{log.channel}</span>
                      <span className="text-[11px] text-ink-muted font-mono">{log.time}</span>
                      <span className="text-[11px] font-semibold text-primary px-1.5 py-0.2 rounded bg-primary/10">
                        {log.event}
                      </span>
                    </div>
                    <p className="text-[11.5px] text-ink-secondary mt-1 leading-snug">{log.detail}</p>
                  </div>
                </div>

                <span
                  className={`text-[10.5px] font-bold px-2 py-0.5 rounded-full whitespace-nowrap ${
                    log.status === 'Failed' ? 'bg-rose-100 text-rose-700' : 'bg-emerald-100 text-emerald-700'
                  }`}
                >
                  {log.status}
                </span>
              </div>
            ))}
          </div>
        </Modal>
      )}

      {/* ================= MODAL: RATE PLAN MAPPING ================= */}
      {showMappingModal && (
        <Modal
          open={showMappingModal}
          onClose={() => setShowMappingModal(false)}
          title="Rate Plan & Room Category Mapping"
          subtitle="Map internal PMS rate plans and rooms to external OTA distribution codes"
          wide
          footer={
            <div className="flex items-center justify-end gap-2 w-full">
              <button
                type="button"
                onClick={() => setShowMappingModal(false)}
                className="pms-btn-ghost px-4 py-2 text-xs font-semibold rounded-xl border border-border"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  toast('Channel mappings updated and pushed to all active OTAs', { tone: 'success' });
                  setShowMappingModal(false);
                }}
                className="pms-btn-primary px-4 py-2 text-xs font-bold rounded-xl"
              >
                Save & Push Mapping
              </button>
            </div>
          }
        >
          <div className="flex flex-col gap-3 text-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b text-[11px] uppercase font-bold text-ink-muted" style={{ borderColor: 'var(--color-border)' }}>
                    <th className="pb-2">PMS Room Type</th>
                    <th className="pb-2">PMS Rate Plan</th>
                    <th className="pb-2">Booking.com Rate Code</th>
                    <th className="pb-2">Expedia Rate Code</th>
                    <th className="pb-2 text-right">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y" style={{ borderColor: 'var(--color-border-subtle)' }}>
                  <tr>
                    <td className="py-2.5 font-bold text-ink">Standard Room</td>
                    <td className="py-2.5 text-ink-secondary">European Plan (EP)</td>
                    <td className="py-2.5 font-mono text-[11px] text-primary">STD-EP-BK01</td>
                    <td className="py-2.5 font-mono text-[11px] text-primary">EXP-STD-RO</td>
                    <td className="py-2.5 text-right font-semibold text-emerald-600">● Mapped</td>
                  </tr>
                  <tr>
                    <td className="py-2.5 font-bold text-ink">Deluxe Room</td>
                    <td className="py-2.5 text-ink-secondary">Bed & Breakfast (CP)</td>
                    <td className="py-2.5 font-mono text-[11px] text-primary">DLX-CP-BK02</td>
                    <td className="py-2.5 font-mono text-[11px] text-primary">EXP-DLX-BB</td>
                    <td className="py-2.5 text-right font-semibold text-emerald-600">● Mapped</td>
                  </tr>
                  <tr>
                    <td className="py-2.5 font-bold text-ink">Superior Room</td>
                    <td className="py-2.5 text-ink-secondary">Modified American (MAP)</td>
                    <td className="py-2.5 font-mono text-[11px] text-primary">SUP-MAP-BK03</td>
                    <td className="py-2.5 font-mono text-[11px] text-primary">EXP-SUP-HB</td>
                    <td className="py-2.5 text-right font-semibold text-emerald-600">● Mapped</td>
                  </tr>
                  <tr>
                    <td className="py-2.5 font-bold text-ink">Suite Room</td>
                    <td className="py-2.5 text-ink-secondary">Best Available Rate (BAR)</td>
                    <td className="py-2.5 font-mono text-[11px] text-primary">STE-BAR-BK04</td>
                    <td className="py-2.5 font-mono text-[11px] text-primary">EXP-STE-BAR</td>
                    <td className="py-2.5 text-right font-semibold text-emerald-600">● Mapped</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </Modal>
      )}

      {/* ================= MODAL: CELL OVERRIDE / DETAIL ================= */}
      {selectedCellInfo && (
        <Modal
          open={!!selectedCellInfo}
          onClose={() => setSelectedCellInfo(null)}
          title={`Inventory Details: ${selectedCellInfo.room}`}
          subtitle={`Date: ${selectedCellInfo.date} · Total Units: ${selectedCellInfo.total}`}
          footer={
            <div className="flex items-center justify-end gap-2 w-full">
              <button
                type="button"
                onClick={() => setSelectedCellInfo(null)}
                className="pms-btn-ghost px-4 py-2 text-xs font-semibold rounded-xl border border-border"
              >
                Close
              </button>
              <button
                type="button"
                onClick={() => {
                  toast(`Inventory updated for ${selectedCellInfo.room} on ${selectedCellInfo.date}`, { tone: 'success' });
                  setSelectedCellInfo(null);
                }}
                className="pms-btn-primary px-4 py-2 text-xs font-bold rounded-xl"
              >
                Save Availability
              </button>
            </div>
          }
        >
          <div className="flex flex-col gap-3 text-xs">
            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 rounded-xl border" style={{ background: 'var(--color-page)', borderColor: 'var(--color-border)' }}>
                <span className="text-ink-muted block text-[11px]">PMS Total Capacity</span>
                <span className="text-lg font-bold text-ink">{selectedCellInfo.total} rooms</span>
              </div>
              <div className="p-3 rounded-xl border" style={{ background: 'var(--color-page)', borderColor: 'var(--color-border)' }}>
                <span className="text-ink-muted block text-[11px]">Currently Open to OTAs</span>
                <span className="text-lg font-bold text-emerald-600">{selectedCellInfo.available} rooms</span>
              </div>
            </div>

            <div>
              <label className="pms-label mb-1.5 block">Adjust Available Channel Rooms</label>
              <input
                type="number"
                min="0"
                max={selectedCellInfo.total}
                defaultValue={selectedCellInfo.available}
                className="pms-input w-full text-xs font-medium"
              />
            </div>
          </div>
        </Modal>
      )}

      {/* ================= MODAL: VIEW ALL BOOKINGS ================= */}
      {viewAllBookingsModal && (
        <Modal
          open={viewAllBookingsModal}
          onClose={() => setViewAllBookingsModal(false)}
          title="All Online Travel Channel Bookings"
          subtitle="Showing incoming OTA bookings synchronized via Channel Manager"
          wide
          footer={
            <button
              type="button"
              onClick={() => setViewAllBookingsModal(false)}
              className="pms-btn-primary px-4 py-2 text-xs font-bold rounded-xl"
            >
              Done
            </button>
          }
        >
          <div className="overflow-x-auto text-xs">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b text-[11px] uppercase font-bold text-ink-muted" style={{ borderColor: 'var(--color-border)' }}>
                  <th className="pb-2">Channel</th>
                  <th className="pb-2">Booking ID</th>
                  <th className="pb-2">Guest</th>
                  <th className="pb-2">Room Type</th>
                  <th className="pb-2">Dates</th>
                  <th className="pb-2 text-right">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y" style={{ borderColor: 'var(--color-border-subtle)' }}>
                {recentBookings.map((b) => (
                  <tr key={b.id}>
                    <td className="py-2.5 font-semibold text-ink">{b.channel}</td>
                    <td className="py-2.5 font-mono text-ink-muted">{b.id}</td>
                    <td className="py-2.5 font-bold text-ink">{b.guestName}</td>
                    <td className="py-2.5 text-ink-secondary">{b.roomType}</td>
                    <td className="py-2.5 text-ink-muted">{b.stayDates}</td>
                    <td className="py-2.5 text-right font-semibold text-emerald-600">{b.status}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Modal>
      )}
    </div>
  );
}
