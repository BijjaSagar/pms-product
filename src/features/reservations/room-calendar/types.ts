export type ReservationStatus =
  | 'Confirmed'
  | 'Pending'
  | 'Tentative'
  | 'Checked-in'
  | 'Checked-out'
  | 'Cancelled'
  | 'No-show';

export type RoomOperationalStatus =
  | 'Available'
  | 'Clean'
  | 'Occupied'
  | 'Dirty'
  | 'Cleaning'
  | 'Inspected'
  | 'Out-of-service'
  | 'Out-of-Order';

export type RoomType =
  | 'Standard'
  | 'Deluxe'
  | 'Superior'
  | 'Executive'
  | 'Family Suite'
  | 'Panorama Suite';

export type BookingSource =
  | 'Direct'
  | 'Booking.com'
  | 'Agoda'
  | 'Expedia'
  | 'Corporate'
  | 'Walk-in'
  | 'OTA';

export interface CalendarRoom {
  id: string;
  number: string;
  floor: number;
  type: RoomType;
  maxOccupancy: number;
  baseRate: number;
  status: RoomOperationalStatus;
  outOfOrderReason?: string;
}

export interface CalendarReservation {
  id: string;
  backendId?: string;
  roomLineId?: string;
  guestName: string;
  guestEmail: string;
  guestPhone: string;
  roomId: string;
  roomNumber: string;
  roomType: RoomType;
  checkInDate: string; // YYYY-MM-DD
  checkOutDate: string; // YYYY-MM-DD
  nights: number;
  status: ReservationStatus;
  bookingSource: BookingSource;
  nightlyRate: number;
  totalAmount: number;
  paymentStatus: 'Paid' | 'Partial' | 'Unpaid' | 'Pending';
  adults: number;
  children: number;
  specialRequests?: string;
  notes?: string;
}

export interface ProposedReservationChange {
  reservation: CalendarReservation;
  originalRoom: CalendarRoom;
  proposedRoom: CalendarRoom;
  originalCheckIn: string;
  proposedCheckIn: string;
  originalCheckOut: string;
  proposedCheckOut: string;
  originalNights: number;
  proposedNights: number;
  originalTotal: number;
  proposedTotal: number;
  priceDifference: number;
  type: 'move-date' | 'move-room' | 'combined' | 'resize-start' | 'resize-end';
}

export interface DragState {
  isDragging: boolean;
  reservationId: string | null;
  dragType: 'move' | 'resize-start' | 'resize-end';
  startX: number;
  startY: number;
  currentX: number;
  currentY: number;
  originRoomId: string;
  originCheckIn: string;
  originCheckOut: string;
  proposedRoomId: string;
  proposedCheckIn: string;
  proposedCheckOut: string;
  isValid: boolean;
  invalidReason?: string;
}

export interface ValidationResult {
  isValid: boolean;
  reason?: string;
  proposedTotal: number;
  priceDifference: number;
  proposedNights: number;
}
