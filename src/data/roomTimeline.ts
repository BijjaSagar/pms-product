/* Demo timeline for the room status board. Hours run from 8 (8 AM) to 22 (10 PM); halves are half-hours. */

export type TimelineStatus =
  | 'Available'
  | 'Occupied'
  | 'Arriving'
  | 'Departing'
  | 'Dirty'
  | 'Cleaning'
  | 'Inspected'
  | 'Out-of-service'
  | 'Maintenance';

export type TimelineIcon = 'luggage' | 'clock' | 'user';

export interface TimelineEvent {
  id: string;
  status: TimelineStatus;
  label: string;
  subLabel?: string;
  guestName?: string;
  startHour: number;
  endHour: number;
  icon?: TimelineIcon;
}

export interface RoomTimelineRow {
  number: string;
  /* Room type code as the timeline shows it; the rooms page shows the inventory name instead. */
  type: string;
  floor: number;
  events: TimelineEvent[];
}

const FULL_DAY = { startHour: 8, endHour: 22 } as const;

export const ROOM_TIMELINE_SEED: RoomTimelineRow[] = [
  {
    number: '101',
    type: 'STD',
    floor: 1,
    events: [{ id: '101-available', status: 'Available', label: 'Available', ...FULL_DAY }],
  },
  {
    number: '102',
    type: 'STD',
    floor: 1,
    events: [
      {
        id: '102-guest',
        status: 'Occupied',
        label: 'Rahul Lal',
        guestName: 'Rahul Lal',
        subLabel: 'Check-in 10:00 AM',
        startHour: 10.5,
        endHour: 19.5,
        icon: 'luggage',
      },
    ],
  },
  {
    number: '103',
    type: 'DLX',
    floor: 1,
    events: [
      { id: '103-dirty', status: 'Dirty', label: 'Dirty', startHour: 8, endHour: 14 },
      { id: '103-cleaning', status: 'Cleaning', label: 'Cleaning', startHour: 14, endHour: 21 },
    ],
  },
  {
    number: '104',
    type: 'DLX',
    floor: 1,
    events: [
      { id: '104-cleaning', status: 'Cleaning', label: 'Cleaning', startHour: 8, endHour: 13 },
      { id: '104-available', status: 'Available', label: 'Available', startHour: 13, endHour: 22 },
    ],
  },
  {
    number: '105',
    type: 'SUI',
    floor: 1,
    events: [{ id: '105-available', status: 'Available', label: 'Available', ...FULL_DAY }],
  },
  {
    number: '201',
    type: 'DLX',
    floor: 2,
    events: [
      {
        id: '201-guest',
        status: 'Occupied',
        label: 'Riya Sharma',
        guestName: 'Riya Sharma',
        subLabel: 'Check-in 3:00 PM',
        startHour: 14.5,
        endHour: 20.5,
        icon: 'luggage',
      },
    ],
  },
  {
    number: '202',
    type: 'DLX',
    floor: 2,
    events: [{ id: '202-available', status: 'Available', label: 'Available', ...FULL_DAY }],
  },
  {
    number: '203',
    type: 'DLX',
    floor: 2,
    events: [
      {
        id: '203-checkout',
        status: 'Departing',
        label: 'Check-out 11:00 AM',
        startHour: 9,
        endHour: 13,
        icon: 'clock',
      },
      { id: '203-cleaning', status: 'Cleaning', label: 'Cleaning', startHour: 18, endHour: 21 },
    ],
  },
  {
    number: '204',
    type: 'SUP',
    floor: 2,
    events: [{ id: '204-occupied', status: 'Occupied', label: 'Occupied', ...FULL_DAY }],
  },
  {
    number: '205',
    type: 'SUP',
    floor: 2,
    events: [{ id: '205-available', status: 'Available', label: 'Available', ...FULL_DAY }],
  },
  {
    number: '301',
    type: 'STD',
    floor: 3,
    events: [{ id: '301-maintenance', status: 'Maintenance', label: 'Maintenance', ...FULL_DAY }],
  },
  {
    number: '302',
    type: 'STD',
    floor: 3,
    events: [{ id: '302-available', status: 'Available', label: 'Available', ...FULL_DAY }],
  },
  {
    number: '303',
    type: 'DLX',
    floor: 3,
    events: [
      {
        id: '303-arriving',
        status: 'Arriving',
        label: 'Arriving 4:00 PM',
        startHour: 16,
        endHour: 19.5,
        icon: 'user',
      },
    ],
  },
  {
    number: '304',
    type: 'DLX',
    floor: 3,
    events: [{ id: '304-occupied', status: 'Occupied', label: 'Occupied', ...FULL_DAY }],
  },
  {
    number: '305',
    type: 'SUI',
    floor: 3,
    events: [{ id: '305-available', status: 'Available', label: 'Available', ...FULL_DAY }],
  },
];
