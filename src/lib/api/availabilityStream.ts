import { useEffect, useRef } from 'react';

const API_BASE = (import.meta.env.VITE_API_BASE_URL || '/api/v1').replace(/\/$/, '');

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
 * Subscribes to the gateway's Server-Sent Events stream of availability changes.
 *
 * The browser sends the session cookie automatically, so the stream is already
 * scoped to the caller's active property. The handler is held in a ref so a
 * caller can pass a fresh closure each render without re-opening the stream.
 * `EventSource` reconnects on its own if the connection drops.
 */
export function useAvailabilityStream(onEvent: (event: BookingEvent) => void): void {
  const handler = useRef(onEvent);

  // Keep the latest callback without re-opening the stream each render.
  useEffect(() => {
    handler.current = onEvent;
  }, [onEvent]);

  useEffect(() => {
    const source = new EventSource(`${API_BASE}/availability/stream`, { withCredentials: true });
    source.onmessage = (message) => {
      try {
        handler.current(JSON.parse(message.data) as BookingEvent);
      } catch {
        // Ignore a malformed frame; the next event or a manual refresh recovers.
      }
    };
    // `onerror` is intentionally left to EventSource's built-in retry.
    return () => source.close();
  }, []);
}
