import { useEffect, useRef } from 'react';

/** One availability change pushed from the booking service. */
export interface BookingEvent {
  type: 'hold' | 'release' | 'booked' | 'cancelled' | 'ping';
  propertyId: string;
  roomId: string | null;
  nights: string[];
  holdId: string | null;
  userId: string | null;
  at: string;
}

/**
 * Availability-change subscription.
 *
 * This build is fully static, so there is no live booking service to subscribe
 * to. The hook is kept (with the same signature) so callers need no changes; it
 * simply keeps a reference to the latest handler and never fires.
 */
export function useAvailabilityStream(onEvent: (event: BookingEvent) => void): void {
  const handler = useRef(onEvent);

  useEffect(() => {
    handler.current = onEvent;
  }, [onEvent]);

  useEffect(() => {
    // No stream in a static build. Availability is recomputed on every render
    // from the in-memory store instead.
  }, []);
}
