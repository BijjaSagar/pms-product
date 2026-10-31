import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import * as Lucide from 'lucide-react';
import { toast } from '../../utils/toast';
import { TONE_VARS } from '../../theme/tone';
import type { Tone } from '../../theme/tone';
import { Button, IconButton, ListItem } from '../../components/primitives';

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

const STATUS_TONES: Record<StatusType, Tone> = {
  Available: 'success',
  Occupied: 'info',
  Arriving: 'info',
  Departing: 'warning',
  Dirty: 'warning',
  Cleaning: 'info',
  Inspected: 'success',
  'Out-of-service': 'danger',
};

const STATUS_PILLS = (
  [
    { id: 'Available', label: 'Available' },
    { id: 'Occupied', label: 'Occupied' },
    { id: 'Arriving', label: 'Arriving' },
    { id: 'Departing', label: 'Departing' },
    { id: 'Dirty', label: 'Dirty' },
    { id: 'Cleaning', label: 'Cleaning' },
    { id: 'Inspected', label: 'Inspected' },
    { id: 'Out-of-service', label: 'Out of service' },
  ] satisfies { id: StatusType; label: string }[]
).map((pill) => {
  const vars = TONE_VARS[STATUS_TONES[pill.id]];
  return {
    ...pill,
    color: vars.text,
    bg: vars.bg,
    border: vars.border,
    dot: vars.text,
  };
});

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

export function StatusTimeline() {
  const [roomsData, setRoomsData] = useState<RoomTimelineRow[]>(INITIAL_ROOMS_DATA);
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
      case 'Inspected': {
        const vars = TONE_VARS.success;
        return { bg: vars.bg, color: vars.text, border: vars.border };
      }
      case 'Occupied':
      case 'Arriving':
      case 'Cleaning': {
        const vars = TONE_VARS.info;
        return { bg: vars.bg, color: vars.text, border: vars.border };
      }
      case 'Departing':
      case 'Dirty': {
        const vars = TONE_VARS.warning;
        return { bg: vars.bg, color: vars.text, border: vars.border };
      }
      case 'Maintenance':
      case 'Out-of-service': {
        const vars = TONE_VARS.danger;
        return { bg: vars.bg, color: vars.text, border: vars.border };
      }
      default:
        return {
          bg: 'var(--color-muted-surface)',
          color: 'var(--color-ink)',
          border: 'var(--color-border)',
        };
    }
  };

  return (
    <div className="flex flex-col gap-4">
      {/* ================= TOOLBAR: STATUS PILLS & DATE CONTROLS ================= */}
      <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
        {/* Status Legend Filter Pills */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1" aria-label="Status filters">
          {STATUS_PILLS.map((pill) => {
            const isFilterActive = selectedStatus === pill.id;
            return (
              <Button variant="secondary"
                key={pill.id}
                type="button"
                onClick={() => setSelectedStatus(isFilterActive ? null : pill.id)}
                className={`flex items-center gap-2 whitespace-nowrap transition-all shadow-2xs ${isFilterActive ? 'ring-2 ring-primary ring-offset-1 scale-105' : 'hover:opacity-90'
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
              </Button>
            );
          })}
        </div>

        {/* Date Controls */}
        <div className="flex items-center gap-2 flex-wrap shrink-0">
          {/* Date Selector Button */}
          <Button variant="secondary"
            type="button"
            onClick={() => toast('Date picker dialog', { tone: 'info' })}
            className="flex items-center gap-2 transition-colors"
            style={{ borderColor: 'var(--color-border)', background: 'var(--color-surface)' }}
          >
            <Lucide.Calendar size={15} className="text-ink-secondary" />
            <span>{currentDate}</span>
          </Button>

          {/* Today Button */}
          <Button variant="secondary"
            type="button"
            onClick={() => {
              setCurrentDate('Oct 16, 2026');
              toast('Jumped to Today', { tone: 'success' });
            }}
            className="transition-colors"
            style={{ borderColor: 'var(--color-border)', background: 'var(--color-surface)' }}
          >
            Today
          </Button>


        </div>
      </div>

      {/* ================= TIMELINE HOURLY VIEW ================= */}
      <div
        className="rounded-2xl border shadow-sm overflow-hidden"
        style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}
      >
        {/* Scrollable Timeline Grid */}
        <div className="overflow-x-auto">
          <div className="min-w-[880px]">
            {/* TIMELINE TIME HEADER */}
            <div
              className="grid grid-cols-[160px_repeat(8,1fr)] items-center border-b text-label font-bold"
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
                  <ListItem
                    type="button"
                    onClick={() => toggleFloor(floorNum)}
                    className="flex w-full items-center gap-2 text-left font-bold text-label transition-colors hover:bg-ink/[0.02]"
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
                    <span className="text-label font-medium text-ink-muted ml-1">
                      ({floorRooms.length} rooms)
                    </span>
                  </ListItem>

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
                          className="grid grid-cols-[160px_1fr] items-center border-b last:border-b-0 min-h-[46px] hover:bg-ink/[0.01] transition-colors"
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
                            <span className="text-label font-bold text-ink group-hover:text-primary transition-colors">
                              {room.number}
                            </span>
                            <span
                              className="rounded px-2 py-0.5 text-label font-bold uppercase tracking-wider"
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
                                      <span className="text-label font-bold truncate">
                                        {ev.label}
                                      </span>
                                      {ev.subLabel ? (
                                        <span className="text-label opacity-80 font-medium truncate">
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

      {/* ================= ULTRA-LUXURY ROOM DETAIL & STATUS MODAL (PORTALED TO BODY) ================= */}
      {selectedRoomModal &&
        typeof document !== 'undefined' &&
        createPortal(
          <div
            className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 bg-ink/60 backdrop-blur-md pms-animate-fade-in"
            onClick={() => setSelectedRoomModal(null)}
            role="dialog"
            aria-modal="true"
          >
            <div
              className="relative w-full max-w-lg overflow-hidden rounded-3xl border shadow-2xl backdrop-blur-2xl pms-animate-pop"
              style={{
                background: 'var(--color-surface)',
                borderColor: 'var(--color-border)',
                boxShadow: 'var(--shadow-2xl), 0 0 0 1px var(--color-border)',
              }}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Gradient Accent Bar */}
              <div className="h-1.5 w-full bg-gradient-to-r from-primary via-primary-hover to-dark-accent" />

              {/* Modal Header */}
              <div
                className="flex items-center justify-between p-5 border-b"
                style={{ borderColor: 'var(--color-border-subtle)' }}
              >
                <div className="flex items-center gap-3">
                  <div
                    className="flex h-11 w-11 items-center justify-center rounded-2xl text-title font-bold text-white shadow-md"
                    style={{ background: 'var(--color-primary)' }}
                  >
                    {selectedRoomModal.number}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className="text-body font-bold text-ink tracking-tight">
                        Room {selectedRoomModal.number}
                      </h2>
                      <span
                        className="rounded-full px-2.5 py-0.5 text-micro font-bold uppercase tracking-wider bg-muted-surface text-primary border border-primary/20"
                      >
                        {selectedRoomModal.type} Category
                      </span>
                    </div>
                    <p className="text-label text-ink-muted mt-0.5">
                      Floor {selectedRoomModal.floor} · Main Wing · High Speed WiFi
                    </p>
                  </div>
                </div>

                <IconButton variant="ghost"
                  type="button"
                  onClick={() => setSelectedRoomModal(null)}
                  className="transition-colors"
                  aria-label="Close dialog"
                >
                  <Lucide.X size={19} />
                </IconButton>
              </div>

              {/* Modal Body */}
              <div className="p-5 flex flex-col gap-4 max-h-[calc(85vh-130px)] overflow-y-auto">
                {/* 1. Quick Change Status Chips */}
                <div>
                  <p className="text-label font-bold uppercase tracking-wider text-ink-muted mb-2">
                    Quick Change Room Status
                  </p>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { type: 'Available' as const, label: 'Available', icon: Lucide.CheckCircle2, color: TONE_VARS.success.text, bg: TONE_VARS.success.bg },
                      { type: 'Occupied' as const, label: 'Occupied', icon: Lucide.Luggage, color: TONE_VARS.info.text, bg: TONE_VARS.info.bg },
                      { type: 'Cleaning' as const, label: 'Cleaning', icon: Lucide.Sparkles, color: TONE_VARS.info.text, bg: TONE_VARS.info.bg },
                      { type: 'Dirty' as const, label: 'Dirty', icon: Lucide.AlertCircle, color: TONE_VARS.warning.text, bg: TONE_VARS.warning.bg },
                      { type: 'Inspected' as const, label: 'Inspected', icon: Lucide.ShieldCheck, color: TONE_VARS.success.text, bg: TONE_VARS.success.bg },
                      { type: 'Maintenance' as const, label: 'Out of Service', icon: Lucide.Wrench, color: TONE_VARS.danger.text, bg: TONE_VARS.danger.bg },
                    ].map((opt) => {
                      const isCurrent = (selectedRoomModal.event?.type ?? 'Available') === opt.type;
                      return (
                        <Button variant="secondary"
                          key={opt.type}
                          type="button"
                          onClick={() => updateRoomStatus(selectedRoomModal.number, opt.type)}
                          className={`flex items-center gap-1.5 border transition-all ${isCurrent ? 'ring-2 ring-primary ring-offset-1 shadow-xs' : 'hover:scale-[1.02]'
 }`}
                          style={{
                            background: opt.bg,
                            color: opt.color,
                            borderColor: isCurrent ? 'var(--color-primary)' : 'transparent',
                          }}
                        >
                          <opt.icon size={14} strokeWidth={2.4} />
                          <span className="truncate">{opt.label}</span>
                        </Button>
                      );
                    })}
                  </div>
                </div>

                {/* 2. Room Timeline & Movement Summary */}
                <div
                  className="rounded-2xl border p-4 flex flex-col gap-2.5 text-label"
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
                    <span className="text-body font-bold text-ink">Housekeeping & Amenities</span>
                    <span className="text-label font-semibold text-success-text bg-success-bg px-2 py-0.5 rounded-full">
                      Linen Fresh
                    </span>
                  </div>
                  <p className="text-label text-ink-muted leading-relaxed">
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
                <Button variant="secondary"
                  type="button"
                  onClick={() => setSelectedRoomModal(null)}
                  className="transition-colors"
                  style={{ borderColor: 'var(--color-border)' }}
                >
                  Close
                </Button>
                <Button variant="primary"
                  type="button"
                  onClick={() => {
                    updateRoomStatus(selectedRoomModal.number, 'Inspected');
                    setSelectedRoomModal(null);
                  }}
                >
                  Mark Inspected & Ready
                </Button>
              </div>
            </div>
          </div>,
          document.body
        )}
    </div>
  );
}
