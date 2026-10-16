import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import * as Lucide from 'lucide-react';
import { toast } from '../components/toastStore';

type StatusType =
  | 'Available'
  | 'Occupied'
  | 'Arriving'
  | 'Departing'
  | 'Dirty'
  | 'Cleaning'
  | 'Inspected'
  | 'Out-of-service';

interface TimelineEvent {
  id: string;
  type: StatusType | 'Maintenance';
  label: string;
  subLabel?: string;
  guestName?: string;
  startHour: number; // 8 to 22 (8 AM to 10 PM)
  endHour: number;
  icon?: Lucide.LucideIcon;
}

interface RoomTimelineRow {
  number: string;
  type: string;
  floor: number;
  events: TimelineEvent[];
}

const STATUS_PILLS: {
  id: StatusType;
  label: string;
  color: string;
  bg: string;
  border: string;
  dot: string;
}[] = [
  {
    id: 'Available',
    label: 'Available',
    color: '#059669',
    bg: 'color-mix(in srgb, #10b981 12%, transparent)',
    border: 'color-mix(in srgb, #10b981 25%, transparent)',
    dot: '#10b981',
  },
  {
    id: 'Occupied',
    label: 'Occupied',
    color: '#1d4ed8',
    bg: 'color-mix(in srgb, #3b82f6 12%, transparent)',
    border: 'color-mix(in srgb, #3b82f6 25%, transparent)',
    dot: '#3b82f6',
  },
  {
    id: 'Arriving',
    label: 'Arriving',
    color: '#0284c7',
    bg: 'color-mix(in srgb, #0ea5e9 12%, transparent)',
    border: 'color-mix(in srgb, #0ea5e9 25%, transparent)',
    dot: '#0ea5e9',
  },
  {
    id: 'Departing',
    label: 'Departing',
    color: '#b45309',
    bg: 'color-mix(in srgb, #f59e0b 12%, transparent)',
    border: 'color-mix(in srgb, #f59e0b 25%, transparent)',
    dot: '#f59e0b',
  },
  {
    id: 'Dirty',
    label: 'Dirty',
    color: '#dc2626',
    bg: 'color-mix(in srgb, #ef4444 12%, transparent)',
    border: 'color-mix(in srgb, #ef4444 25%, transparent)',
    dot: '#ef4444',
  },
  {
    id: 'Cleaning',
    label: 'Cleaning',
    color: '#4f46e5',
    bg: 'color-mix(in srgb, #6366f1 12%, transparent)',
    border: 'color-mix(in srgb, #6366f1 25%, transparent)',
    dot: '#6366f1',
  },
  {
    id: 'Inspected',
    label: 'Inspected',
    color: '#047857',
    bg: 'color-mix(in srgb, #059669 12%, transparent)',
    border: 'color-mix(in srgb, #059669 25%, transparent)',
    dot: '#059669',
  },
  {
    id: 'Out-of-service',
    label: 'Out of service',
    color: '#be123c',
    bg: 'color-mix(in srgb, #e11d48 12%, transparent)',
    border: 'color-mix(in srgb, #e11d48 25%, transparent)',
    dot: '#e11d48',
  },
];

const TIME_SLOTS = [
  { hour: 8, label: '8 AM' },
  { hour: 10, label: '10 AM' },
  { hour: 12, label: '12 PM' },
  { hour: 14, label: '2 PM' },
  { hour: 16, label: '4 PM' },
  { hour: 18, label: '6 PM' },
  { hour: 20, label: '8 PM' },
  { hour: 22, label: '10 PM' },
];

const START_HOUR = 8;
const END_HOUR = 22;
const TOTAL_SPAN = END_HOUR - START_HOUR; // 14 hours

// Initial Room Timeline Dataset
const INITIAL_ROOMS_DATA: RoomTimelineRow[] = [
  // FLOOR 1
  {
    number: '101',
    type: 'STD',
    floor: 1,
    events: [
      {
        id: '101-avail',
        type: 'Available',
        label: 'Available',
        startHour: 8,
        endHour: 22,
      },
    ],
  },
  {
    number: '102',
    type: 'STD',
    floor: 1,
    events: [
      {
        id: '102-rahul',
        type: 'Occupied',
        label: 'Rahul Lal',
        guestName: 'Rahul Lal',
        subLabel: 'Check-in 10:00 AM',
        startHour: 10.5,
        endHour: 19.5,
        icon: Lucide.Luggage,
      },
    ],
  },
  {
    number: '103',
    type: 'DLX',
    floor: 1,
    events: [
      {
        id: '103-dirty',
        type: 'Dirty',
        label: 'Dirty',
        startHour: 8,
        endHour: 14,
      },
      {
        id: '103-clean',
        type: 'Cleaning',
        label: 'Cleaning',
        startHour: 14,
        endHour: 21,
      },
    ],
  },
  {
    number: '104',
    type: 'DLX',
    floor: 1,
    events: [
      {
        id: '104-clean',
        type: 'Cleaning',
        label: 'Cleaning',
        startHour: 8,
        endHour: 13,
      },
      {
        id: '104-avail',
        type: 'Available',
        label: 'Available',
        startHour: 13,
        endHour: 22,
      },
    ],
  },
  {
    number: '105',
    type: 'SUI',
    floor: 1,
    events: [
      {
        id: '105-avail',
        type: 'Available',
        label: 'Available',
        startHour: 8,
        endHour: 22,
      },
    ],
  },

  // FLOOR 2
  {
    number: '201',
    type: 'DLX',
    floor: 2,
    events: [
      {
        id: '201-riya',
        type: 'Occupied',
        label: 'Riya Sharma',
        guestName: 'Riya Sharma',
        subLabel: 'Check-in 03:00 PM',
        startHour: 14.5,
        endHour: 20.5,
        icon: Lucide.Luggage,
      },
    ],
  },
  {
    number: '202',
    type: 'DLX',
    floor: 2,
    events: [
      {
        id: '202-avail',
        type: 'Available',
        label: 'Available',
        startHour: 8,
        endHour: 22,
      },
    ],
  },
  {
    number: '203',
    type: 'DLX',
    floor: 2,
    events: [
      {
        id: '203-checkout',
        type: 'Departing',
        label: 'Check-out 11:00 AM',
        startHour: 9,
        endHour: 13,
        icon: Lucide.Clock,
      },
      {
        id: '203-cleaning',
        type: 'Cleaning',
        label: 'Cleaning',
        startHour: 18,
        endHour: 21,
      },
    ],
  },
  {
    number: '204',
    type: 'SUP',
    floor: 2,
    events: [
      {
        id: '204-occ',
        type: 'Occupied',
        label: 'Occupied',
        startHour: 8,
        endHour: 22,
      },
    ],
  },
  {
    number: '205',
    type: 'SUP',
    floor: 2,
    events: [
      {
        id: '205-avail',
        type: 'Available',
        label: 'Available',
        startHour: 8,
        endHour: 22,
      },
    ],
  },

  // FLOOR 3
  {
    number: '301',
    type: 'STD',
    floor: 3,
    events: [
      {
        id: '301-maint',
        type: 'Maintenance',
        label: 'Maintenance',
        startHour: 8,
        endHour: 22,
      },
    ],
  },
  {
    number: '302',
    type: 'STD',
    floor: 3,
    events: [
      {
        id: '302-avail',
        type: 'Available',
        label: 'Available',
        startHour: 8,
        endHour: 22,
      },
    ],
  },
  {
    number: '303',
    type: 'DLX',
    floor: 3,
    events: [
      {
        id: '303-arriving',
        type: 'Arriving',
        label: 'Arriving – 4:00 PM',
        startHour: 16,
        endHour: 19.5,
        icon: Lucide.User,
      },
    ],
  },
  {
    number: '304',
    type: 'DLX',
    floor: 3,
    events: [
      {
        id: '304-occ',
        type: 'Occupied',
        label: 'Occupied',
        startHour: 8,
        endHour: 22,
      },
    ],
  },
  {
    number: '305',
    type: 'SUI',
    floor: 3,
    events: [
      {
        id: '305-avail',
        type: 'Available',
        label: 'Available',
        startHour: 8,
        endHour: 22,
      },
    ],
  },
];

export function StatusBoard() {
  const [roomsData, setRoomsData] = useState<RoomTimelineRow[]>(INITIAL_ROOMS_DATA);
  const [viewMode, setViewMode] = useState<'timeline' | 'grid'>('timeline');
  const [selectedStatus, setSelectedStatus] = useState<StatusType | null>(null);
  const [currentDate, setCurrentDate] = useState('Oct 14, 2026');
  const [expandedFloors, setExpandedFloors] = useState<Record<number, boolean>>({
    1: true,
    2: true,
    3: true,
  });

  const [selectedRoomModal, setSelectedRoomModal] = useState<{
    number: string;
    type: string;
    floor: number;
    event?: TimelineEvent;
  } | null>(null);

  // Close modal on ESC key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setSelectedRoomModal(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const toggleFloor = (floor: number) => {
    setExpandedFloors((prev) => ({
      ...prev,
      [floor]: !prev[floor],
    }));
  };

  // Change room status in real-time
  const updateRoomStatus = (roomNumber: string, newStatus: StatusType | 'Maintenance') => {
    setRoomsData((prev) =>
      prev.map((r) => {
        if (r.number !== roomNumber) return r;
        return {
          ...r,
          events: [
            {
              id: `${roomNumber}-${newStatus.toLowerCase()}`,
              type: newStatus,
              label: newStatus === 'Maintenance' ? 'Maintenance' : newStatus,
              startHour: 8,
              endHour: 22,
            },
          ],
        };
      })
    );

    // Also update current active modal preview
    if (selectedRoomModal && selectedRoomModal.number === roomNumber) {
      setSelectedRoomModal((old) =>
        old
          ? {
              ...old,
              event: {
                id: `${roomNumber}-${newStatus.toLowerCase()}`,
                type: newStatus,
                label: newStatus === 'Maintenance' ? 'Maintenance' : newStatus,
                startHour: 8,
                endHour: 22,
              },
            }
          : null
      );
    }

    toast(`Room ${roomNumber} updated to ${newStatus}`, { tone: 'success' });
  };

  const floorsList = [1, 2, 3];

  const getEventStyle = (event: TimelineEvent) => {
    switch (event.type) {
      case 'Available':
        return {
          bg: '#e6f7ef',
          color: '#059669',
          border: '#a7f3d0',
        };
      case 'Occupied':
        return {
          bg: '#ebf3fe',
          color: '#1d4ed8',
          border: '#bfdbfe',
        };
      case 'Arriving':
        return {
          bg: '#e0f2fe',
          color: '#0284c7',
          border: '#bae6fd',
        };
      case 'Departing':
        return {
          bg: '#fef3c7',
          color: '#b45309',
          border: '#fde68a',
        };
      case 'Dirty':
        return {
          bg: '#fef3c7',
          color: '#b45309',
          border: '#fde68a',
        };
      case 'Cleaning':
        return {
          bg: '#dbeafe',
          color: '#2563eb',
          border: '#bfdbfe',
        };
      case 'Inspected':
        return {
          bg: '#dcfce7',
          color: '#15803d',
          border: '#86efac',
        };
      case 'Maintenance':
      case 'Out-of-service':
        return {
          bg: '#fee2e2',
          color: '#dc2626',
          border: '#fecaca',
        };
      default:
        return {
          bg: 'var(--color-surface)',
          color: 'var(--color-ink)',
          border: 'var(--color-border)',
        };
    }
  };

  return (
    <div className="flex flex-col gap-5 pms-animate-fade-in pb-12">
      {/* ================= PAGE HEADER & TOOLBAR ================= */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-[26px] font-bold tracking-tight text-ink flex items-center gap-2.5">
            <Lucide.LayoutGrid className="text-primary" size={26} />
            <span>Status Board</span>
          </h1>
          <p className="text-[13.5px] text-ink-muted mt-0.5">
            Live view of room status, housekeeping and guest movements
          </p>
        </div>

        {/* Header Action Controls */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Date Selector Button */}
          <button
            type="button"
            onClick={() => toast('Date picker dialog', { tone: 'info' })}
            className="flex items-center gap-2 rounded-md border px-3 py-1.5 text-[13px] font-semibold text-ink shadow-2xs hover:bg-black/[0.03] transition-colors"
            style={{ borderColor: 'var(--color-border)', background: 'var(--color-surface)' }}
          >
            <Lucide.Calendar size={15} className="text-ink-secondary" />
            <span>{currentDate}</span>
          </button>

          {/* Today Button */}
          <button
            type="button"
            onClick={() => {
              setCurrentDate('Oct 16, 2026');
              toast('Jumped to Today', { tone: 'success' });
            }}
            className="rounded-md border px-3 py-1.5 text-[13px] font-semibold text-primary shadow-2xs hover:bg-black/[0.03] transition-colors"
            style={{ borderColor: 'var(--color-border)', background: 'var(--color-surface)' }}
          >
            Today
          </button>

          {/* Grid vs Timeline Switcher */}
          <div
            className="flex rounded-md border p-0.5 gap-0.5 shadow-2xs"
            style={{ borderColor: 'var(--color-border)', background: 'var(--color-surface)' }}
          >
            <button
              type="button"
              onClick={() => setViewMode('grid')}
              className={`rounded-lg px-3 py-1.5 text-[12.5px] font-semibold transition-all ${
                viewMode === 'grid'
                  ? 'bg-primary text-white font-bold shadow-xs'
                  : 'text-ink-secondary hover:text-ink'
              }`}
            >
              Grid
            </button>
            <button
              type="button"
              onClick={() => setViewMode('timeline')}
              className={`rounded-lg px-3 py-1.5 text-[12.5px] font-semibold transition-all ${
                viewMode === 'timeline'
                  ? 'bg-primary text-white font-bold shadow-xs'
                  : 'text-ink-secondary hover:text-ink'
              }`}
            >
              Timeline
            </button>
          </div>

          {/* More options */}
          <button
            type="button"
            onClick={() => toast('Status board options: Export, Print, Refresh', { tone: 'info' })}
            className="flex h-9 w-9 items-center justify-center rounded-md border text-ink-secondary hover:text-ink hover:bg-black/[0.03] transition-colors shadow-2xs"
            style={{ borderColor: 'var(--color-border)', background: 'var(--color-surface)' }}
            title="More actions"
          >
            <Lucide.MoreHorizontal size={17} />
          </button>
        </div>
      </div>

      {/* ================= STATUS LEGEND FILTER PILLS ================= */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1" aria-label="Status filters">
        {STATUS_PILLS.map((pill) => {
          const isFilterActive = selectedStatus === pill.id;
          return (
            <button
              key={pill.id}
              type="button"
              onClick={() => setSelectedStatus(isFilterActive ? null : pill.id)}
              className={`flex items-center gap-2 rounded-full px-3 py-1.5 text-[12.5px] font-bold whitespace-nowrap transition-all shadow-2xs ${
                isFilterActive ? 'ring-2 ring-primary ring-offset-1 scale-105' : 'hover:opacity-90'
              }`}
              style={{
                background: pill.bg,
                color: pill.color,
                border: `1px solid ${pill.border}`,
              }}
            >
              <span
                className="h-2 w-2 rounded-full flex-none"
                style={{ background: pill.dot }}
              />
              <span>{pill.label}</span>
            </button>
          );
        })}
      </div>

      {/* ================= MAIN BOARD CONTENT ================= */}
      {viewMode === 'timeline' ? (
        /* ================= 1. TIMELINE HOURLY VIEW ================= */
        <div
          className="rounded-2xl border shadow-sm overflow-hidden"
          style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}
        >
          {/* Scrollable Timeline Grid */}
          <div className="overflow-x-auto">
            <div className="min-w-[880px]">
              {/* TIMELINE TIME HEADER */}
              <div
                className="grid grid-cols-[160px_repeat(8,1fr)] items-center border-b text-[12.5px] font-bold"
                style={{
                  background: 'color-mix(in srgb, var(--color-muted-surface) 60%, var(--color-surface))',
                  borderColor: 'var(--color-border)',
                  color: 'var(--color-ink)',
                }}
              >
                <div className="px-5 py-3 border-r" style={{ borderColor: 'var(--color-border)' }}>
                  Room
                </div>
                {TIME_SLOTS.map((slot) => (
                  <div
                    key={slot.hour}
                    className="py-3 text-center border-r last:border-r-0"
                    style={{ borderColor: 'var(--color-border-subtle)' }}
                  >
                    {slot.label}
                  </div>
                ))}
              </div>

              {/* TIMELINE BODY GROUPED BY FLOORS */}
              {floorsList.map((floorNum) => {
                const isExpanded = expandedFloors[floorNum] !== false;
                const floorRooms = roomsData.filter((r) => r.floor === floorNum);

                return (
                  <div key={floorNum} className="border-b last:border-b-0" style={{ borderColor: 'var(--color-border)' }}>
                    {/* Floor Accordion Button */}
                    <button
                      type="button"
                      onClick={() => toggleFloor(floorNum)}
                      className="flex w-full items-center gap-2 px-4 py-2.5 text-left font-bold text-[13px] transition-colors hover:bg-black/[0.02]"
                      style={{
                        background: 'color-mix(in srgb, var(--color-primary) 6%, var(--color-surface))',
                        color: 'var(--color-primary)',
                        borderBottom: isExpanded ? '1px solid var(--color-border-subtle)' : 'none',
                      }}
                    >
                      {isExpanded ? (
                        <Lucide.ChevronDown size={17} strokeWidth={2.4} />
                      ) : (
                        <Lucide.ChevronRight size={17} strokeWidth={2.4} />
                      )}
                      <span>Floor {floorNum}</span>
                      <span className="text-[11px] font-medium text-ink-muted ml-1">
                        ({floorRooms.length} rooms)
                      </span>
                    </button>

                    {/* Floor Rooms Rows */}
                    {isExpanded &&
                      floorRooms.map((room) => {
                        // Check if room matches status filter
                        if (selectedStatus) {
                          const matches = room.events.some((e) => e.type === selectedStatus);
                          if (!matches) return null;
                        }

                        return (
                          <div
                            key={room.number}
                            className="grid grid-cols-[160px_1fr] items-center border-b last:border-b-0 min-h-[46px] hover:bg-black/[0.01] transition-colors"
                            style={{ borderColor: 'var(--color-border-subtle)' }}
                          >
                            {/* Room Info Cell (CLICKABLE) */}
                            <div
                              onClick={() =>
                                setSelectedRoomModal({
                                  number: room.number,
                                  type: room.type,
                                  floor: room.floor,
                                  event: room.events[0],
                                })
                              }
                              className="group flex items-center justify-between px-5 py-2 border-r h-full cursor-pointer hover:bg-primary/[0.05] transition-colors"
                              style={{ borderColor: 'var(--color-border)' }}
                              title={`Click to manage Room ${room.number}`}
                            >
                              <span className="text-[14px] font-bold text-ink group-hover:text-primary transition-colors">
                                {room.number}
                              </span>
                              <span
                                className="rounded px-2 py-0.5 text-[11px] font-bold uppercase tracking-wider"
                                style={{
                                  background: 'color-mix(in srgb, var(--color-muted-surface) 90%, var(--color-surface))',
                                  color: 'var(--color-ink-secondary)',
                                }}
                              >
                                {room.type}
                              </span>
                            </div>

                            {/* Timeline Track with Background Hour Grid */}
                            <div
                              className="relative h-full flex items-center px-1 py-1.5 cursor-pointer"
                              onClick={() =>
                                setSelectedRoomModal({
                                  number: room.number,
                                  type: room.type,
                                  floor: room.floor,
                                  event: room.events[0],
                                })
                              }
                            >
                              {/* Background Hour Dividers */}
                              <div className="absolute inset-0 grid grid-cols-8 pointer-events-none">
                                {TIME_SLOTS.map((s) => (
                                  <div
                                    key={s.hour}
                                    className="border-r last:border-r-0 h-full opacity-35"
                                    style={{ borderColor: 'var(--color-border-subtle)' }}
                                  />
                                ))}
                              </div>

                              {/* Timeline Events / Blocks */}
                              {room.events.map((ev) => {
                                const leftPercent = ((ev.startHour - START_HOUR) / TOTAL_SPAN) * 100;
                                const widthPercent = ((ev.endHour - ev.startHour) / TOTAL_SPAN) * 100;
                                const style = getEventStyle(ev);
                                const Icon = ev.icon;

                                return (
                                  <div
                                    key={ev.id}
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setSelectedRoomModal({
                                        number: room.number,
                                        type: room.type,
                                        floor: room.floor,
                                        event: ev,
                                      })
                                    }}
                                    className="absolute h-9 rounded-md border flex items-center justify-center px-3 text-center cursor-pointer shadow-2xs transition-all hover:scale-[1.01] hover:shadow-sm"
                                    style={{
                                      left: `${Math.max(0.5, leftPercent)}%`,
                                      width: `${Math.min(99, widthPercent - 1)}%`,
                                      background: style.bg,
                                      color: style.color,
                                      borderColor: style.border,
                                    }}
                                    title={`Room ${room.number}: ${ev.label}${ev.subLabel ? ` (${ev.subLabel})` : ''}`}
                                  >
                                    <div className="flex items-center gap-2 truncate">
                                      {Icon ? (
                                        <div
                                          className="flex h-5 w-5 flex-none items-center justify-center rounded-md"
                                          style={{
                                            background: 'color-mix(in srgb, currentColor 15%, transparent)',
                                          }}
                                        >
                                          <Icon size={12} strokeWidth={2.4} />
                                        </div>
                                      ) : null}
                                      <div className="min-w-0 flex items-center gap-1.5 truncate">
                                        <span className="text-[12.5px] font-bold truncate">
                                          {ev.label}
                                        </span>
                                        {ev.subLabel ? (
                                          <span className="text-[11px] opacity-80 font-medium truncate">
                                            {ev.subLabel}
                                          </span>
                                        ) : null}
                                      </div>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        );
                      })}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      ) : (
        /* ================= 2. GRID MATRIX VIEW ================= */
        <div className="flex flex-col gap-4">
          {floorsList.map((f) => {
            const floorRooms = roomsData.filter((r) => r.floor === f);
            return (
              <div
                key={f}
                className="rounded-2xl border p-5 shadow-sm"
                style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}
              >
                <div className="flex items-center justify-between pb-3 mb-4 border-b" style={{ borderColor: 'var(--color-border-subtle)' }}>
                  <div className="flex items-center gap-2">
                    <span className="text-[15px] font-bold text-ink">Floor {f}</span>
                    <span className="text-[12px] text-ink-muted">({floorRooms.length} rooms)</span>
                  </div>
                  <span className="text-[12px] text-ink-muted">Level {f}</span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
                  {floorRooms.map((room) => {
                    const primaryEv = room.events[0];
                    const style = primaryEv
                      ? getEventStyle(primaryEv)
                      : getEventStyle({ id: '0', type: 'Available', label: 'Available', startHour: 8, endHour: 22 });

                    return (
                      <div
                        key={room.number}
                        onClick={() =>
                          setSelectedRoomModal({
                            number: room.number,
                            type: room.type,
                            floor: room.floor,
                            event: primaryEv,
                          })
                        }
                        className="rounded-md border p-3 cursor-pointer transition-all hover:scale-[1.02] hover:shadow-sm"
                        style={{
                          background: style.bg,
                          borderColor: style.border,
                        }}
                      >
                        <div className="flex items-center justify-between mb-1.5">
                          <span className="text-[16px] font-bold text-ink">{room.number}</span>
                          <span className="rounded px-1.5 py-0.5 text-[10.5px] font-bold uppercase bg-surface/80 text-ink border border-border/40">
                            {room.type}
                          </span>
                        </div>
                        <p className="text-[12px] font-bold truncate" style={{ color: style.color }}>
                          {primaryEv?.label ?? 'Available'}
                        </p>
                        {primaryEv?.subLabel ? (
                          <p className="text-[11px] opacity-80 truncate">{primaryEv.subLabel}</p>
                        ) : null}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ================= ULTRA-LUXURY ROOM DETAIL & STATUS MODAL (PORTALED TO BODY) ================= */}
      {selectedRoomModal &&
        typeof document !== 'undefined' &&
        createPortal(
          <div
            className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 bg-black/60 backdrop-blur-md pms-animate-fade-in"
            onClick={() => setSelectedRoomModal(null)}
            role="dialog"
            aria-modal="true"
          >
            <div
              className="relative w-full max-w-lg overflow-hidden rounded-3xl border shadow-2xl backdrop-blur-2xl pms-animate-pop"
              style={{
                background: 'var(--color-surface)',
                borderColor: 'var(--color-border)',
                boxShadow: '0 25px 60px -15px rgba(0, 0, 0, 0.3), 0 0 0 1px var(--color-border)',
              }}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Gradient Accent Bar */}
              <div className="h-1.5 w-full bg-gradient-to-r from-primary via-blue-500 to-emerald-500" />

              {/* Modal Header */}
              <div
                className="flex items-center justify-between p-5 border-b"
                style={{ borderColor: 'var(--color-border-subtle)' }}
              >
                <div className="flex items-center gap-3">
                  <div
                    className="flex h-11 w-11 items-center justify-center rounded-2xl text-[16px] font-bold text-white shadow-md"
                    style={{ background: 'var(--color-primary)' }}
                  >
                    {selectedRoomModal.number}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className="text-[17px] font-bold text-ink">
                        Room {selectedRoomModal.number}
                      </h2>
                      <span
                        className="rounded-md px-2 py-0.5 text-[10.5px] font-bold uppercase tracking-wider"
                        style={{
                          background: 'color-mix(in srgb, var(--color-primary) 12%, transparent)',
                          color: 'var(--color-primary)',
                        }}
                      >
                        {selectedRoomModal.type} Category
                      </span>
                    </div>
                    <p className="text-[12px] text-ink-muted mt-0.5">
                      Floor {selectedRoomModal.floor} · Main Wing · High Speed WiFi
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setSelectedRoomModal(null)}
                  className="rounded-md p-1.5 text-ink-muted hover:text-ink hover:bg-black/[0.05] transition-colors"
                  aria-label="Close dialog"
                >
                  <Lucide.X size={19} />
                </button>
              </div>

              {/* Modal Body */}
              <div className="p-5 flex flex-col gap-4 max-h-[calc(85vh-130px)] overflow-y-auto">
                {/* 1. Quick Change Status Chips */}
                <div>
                  <p className="text-[11.5px] font-bold uppercase tracking-wider text-ink-muted mb-2">
                    Quick Change Room Status
                  </p>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { type: 'Available' as const, label: 'Available', icon: Lucide.CheckCircle2, color: '#059669', bg: '#e6f7ef' },
                      { type: 'Occupied' as const, label: 'Occupied', icon: Lucide.Luggage, color: '#1d4ed8', bg: '#ebf3fe' },
                      { type: 'Cleaning' as const, label: 'Cleaning', icon: Lucide.Sparkles, color: '#4f46e5', bg: '#dbeafe' },
                      { type: 'Dirty' as const, label: 'Dirty', icon: Lucide.AlertCircle, color: '#dc2626', bg: '#fef3c7' },
                      { type: 'Inspected' as const, label: 'Inspected', icon: Lucide.ShieldCheck, color: '#047857', bg: '#dcfce7' },
                      { type: 'Maintenance' as const, label: 'Out of Service', icon: Lucide.Wrench, color: '#be123c', bg: '#fee2e2' },
                    ].map((opt) => {
                      const isCurrent = (selectedRoomModal.event?.type ?? 'Available') === opt.type;
                      return (
                        <button
                          key={opt.type}
                          type="button"
                          onClick={() => updateRoomStatus(selectedRoomModal.number, opt.type)}
                          className={`flex items-center gap-1.5 p-2 rounded-md border text-[12px] font-bold transition-all ${
                            isCurrent ? 'ring-2 ring-primary ring-offset-1 shadow-xs' : 'hover:scale-[1.02]'
                          }`}
                          style={{
                            background: opt.bg,
                            color: opt.color,
                            borderColor: isCurrent ? 'var(--color-primary)' : 'transparent',
                          }}
                        >
                          <opt.icon size={14} strokeWidth={2.4} />
                          <span className="truncate">{opt.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* 2. Room Timeline & Movement Summary */}
                <div
                  className="rounded-2xl border p-4 flex flex-col gap-2.5 text-[12.5px]"
                  style={{
                    background: 'color-mix(in srgb, var(--color-muted-surface) 40%, var(--color-surface))',
                    borderColor: 'var(--color-border)',
                  }}
                >
                  <div className="flex items-center justify-between border-b pb-2" style={{ borderColor: 'var(--color-border-subtle)' }}>
                    <span className="text-ink-muted">Active Timeline Status</span>
                    <span className="font-bold text-primary">
                      {selectedRoomModal.event?.type ?? 'Available'}
                    </span>
                  </div>

                  {selectedRoomModal.event?.guestName ? (
                    <div className="flex items-center justify-between border-b pb-2" style={{ borderColor: 'var(--color-border-subtle)' }}>
                      <span className="text-ink-muted">Assigned Guest</span>
                      <div className="flex items-center gap-1.5 font-bold text-ink">
                        <Lucide.User size={13} className="text-primary" />
                        <span>{selectedRoomModal.event.guestName}</span>
                      </div>
                    </div>
                  ) : null}

                  {selectedRoomModal.event?.subLabel ? (
                    <div className="flex items-center justify-between border-b pb-2" style={{ borderColor: 'var(--color-border-subtle)' }}>
                      <span className="text-ink-muted">Movement Info</span>
                      <span className="font-medium text-ink">
                        {selectedRoomModal.event.subLabel}
                      </span>
                    </div>
                  ) : null}

                  <div className="flex items-center justify-between">
                    <span className="text-ink-muted">Scheduled Hours</span>
                    <span className="font-semibold text-ink">
                      {selectedRoomModal.event
                        ? `${selectedRoomModal.event.startHour}:00 - ${selectedRoomModal.event.endHour}:00`
                        : '8:00 AM - 10:00 PM (Full Day)'}
                    </span>
                  </div>
                </div>

                {/* 3. Housekeeping & Inspection Checklist */}
                <div
                  className="rounded-2xl border p-4"
                  style={{ borderColor: 'var(--color-border)', background: 'var(--color-surface)' }}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[13px] font-bold text-ink">Housekeeping & Amenities</span>
                    <span className="text-[11px] font-semibold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">
                      Linen Fresh
                    </span>
                  </div>
                  <p className="text-[12px] text-ink-muted leading-relaxed">
                    Minibar replenished, air conditioning tested at 22°C, electronic lock synchronized.
                  </p>
                </div>
              </div>

              {/* Modal Footer Actions */}
              <div
                className="flex items-center justify-end gap-2.5 p-4 border-t"
                style={{
                  borderColor: 'var(--color-border-subtle)',
                  background: 'color-mix(in srgb, var(--color-muted-surface) 30%, var(--color-surface))',
                }}
              >
                <button
                  type="button"
                  onClick={() => setSelectedRoomModal(null)}
                  className="rounded-md border px-4 py-2 text-[12.5px] font-bold text-ink hover:bg-black/[0.04] transition-colors"
                  style={{ borderColor: 'var(--color-border)' }}
                >
                  Close
                </button>
                <button
                  type="button"
                  onClick={() => {
                    updateRoomStatus(selectedRoomModal.number, 'Inspected');
                    setSelectedRoomModal(null);
                  }}
                  className="pms-btn-primary px-4 py-2 text-[12.5px] font-bold rounded-md shadow-xs"
                >
                  Mark Inspected & Ready
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}
    </div>
  );
}
