import { useState, useCallback } from 'react';
import { eventsApi } from '@shared/api/events.api';
import type {
  Event,
  EventAttendee,
  EventRecap,
  CreateEventInput,
  UpdateEventInput,
  RsvpInput,
  CreateEventRecapInput,
  EventSearchParams,
  PaginatedEvents,
} from '@embr/types';

export function useEvents() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const wrap = async <T>(fn: () => Promise<T>): Promise<T> => {
    setLoading(true);
    setError(null);
    try {
      return await fn();
    } catch (e: any) {
      const msg = e.response?.data?.message || 'Something went wrong';
      setError(Array.isArray(msg) ? msg[0] : msg);
      throw e;
    } finally {
      setLoading(false);
    }
  };

  const getEvents = useCallback((params?: EventSearchParams): Promise<PaginatedEvents> =>
    wrap(() => eventsApi.getEvents(params)), []);

  const getMyEvents = useCallback((): Promise<Event[]> =>
    wrap(() => eventsApi.getMyEvents()), []);

  const getEvent = useCallback((id: string): Promise<Event> =>
    wrap(() => eventsApi.getEvent(id)), []);

  const createEvent = useCallback((input: CreateEventInput): Promise<Event> =>
    wrap(() => eventsApi.createEvent(input)), []);

  const publishEvent = useCallback((id: string): Promise<Event> =>
    wrap(() => eventsApi.publishEvent(id)), []);

  const updateEvent = useCallback((id: string, input: UpdateEventInput): Promise<Event> =>
    wrap(() => eventsApi.updateEvent(id, input)), []);

  const cancelEvent = useCallback((id: string): Promise<Event> =>
    wrap(() => eventsApi.cancelEvent(id)), []);

  const deleteEvent = useCallback((id: string): Promise<void> =>
    wrap(() => eventsApi.deleteEvent(id)), []);

  const rsvp = useCallback((id: string, input: RsvpInput): Promise<EventAttendee> =>
    wrap(() => eventsApi.rsvp(id, input)), []);

  const cancelRsvp = useCallback((id: string) =>
    wrap(() => eventsApi.cancelRsvp(id)), []);

  const getAttendees = useCallback((id: string, cursor?: string, limit?: number) =>
    wrap(() => eventsApi.getAttendees(id, cursor, limit)), []);

  const createRecap = useCallback((id: string, input: CreateEventRecapInput): Promise<EventRecap> =>
    wrap(() => eventsApi.createRecap(id, input)), []);

  const getRecap = useCallback((id: string): Promise<EventRecap> =>
    wrap(() => eventsApi.getRecap(id)), []);

  return {
    loading,
    error,
    getEvents,
    getMyEvents,
    getEvent,
    createEvent,
    publishEvent,
    updateEvent,
    cancelEvent,
    deleteEvent,
    rsvp,
    cancelRsvp,
    getAttendees,
    createRecap,
    getRecap,
  };
}
