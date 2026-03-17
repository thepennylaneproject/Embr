import { useState, useCallback } from 'react';
import { eventsApi } from '@shared/api/events.api';
import { getApiErrorMessage } from '@/lib/api/error';
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

  const wrap = async <T>(fn: () => Promise<T>, fallback: string): Promise<T> => {
    setLoading(true);
    setError(null);
    try {
      return await fn();
    } catch (e: any) {
      const msg = getApiErrorMessage(e, fallback);
      setError(msg);
      throw e;
    } finally {
      setLoading(false);
    }
  };

  const getEvents = useCallback((params?: EventSearchParams): Promise<PaginatedEvents> =>
    wrap(() => eventsApi.getEvents(params), 'Could not load events. Please refresh.'), []);

  const getMyEvents = useCallback((): Promise<Event[]> =>
    wrap(() => eventsApi.getMyEvents(), 'Could not load your events. Please refresh.'), []);

  const getEvent = useCallback((id: string): Promise<Event> =>
    wrap(() => eventsApi.getEvent(id), 'Could not load this event. Please refresh.'), []);

  const createEvent = useCallback((input: CreateEventInput): Promise<Event> =>
    wrap(() => eventsApi.createEvent(input), 'Could not create the event. Please try again.'), []);

  const publishEvent = useCallback((id: string): Promise<Event> =>
    wrap(() => eventsApi.publishEvent(id), 'Could not publish the event. Please try again.'), []);

  const updateEvent = useCallback((id: string, input: UpdateEventInput): Promise<Event> =>
    wrap(() => eventsApi.updateEvent(id, input), 'Could not update the event. Please try again.'), []);

  const cancelEvent = useCallback((id: string): Promise<Event> =>
    wrap(() => eventsApi.cancelEvent(id), 'Could not cancel the event. Please try again.'), []);

  const deleteEvent = useCallback((id: string): Promise<void> =>
    wrap(() => eventsApi.deleteEvent(id), 'Could not delete the event. Please try again.'), []);

  const rsvp = useCallback((id: string, input: RsvpInput): Promise<EventAttendee> =>
    wrap(() => eventsApi.rsvp(id, input), 'Could not save your RSVP. Please try again.'), []);

  const cancelRsvp = useCallback((id: string) =>
    wrap(() => eventsApi.cancelRsvp(id), 'Could not cancel your RSVP. Please try again.'), []);

  const getAttendees = useCallback((id: string, cursor?: string, limit?: number) =>
    wrap(() => eventsApi.getAttendees(id, cursor, limit), 'Could not load attendees. Please refresh.'), []);

  const createRecap = useCallback((id: string, input: CreateEventRecapInput): Promise<EventRecap> =>
    wrap(() => eventsApi.createRecap(id, input), 'Could not create the recap. Please try again.'), []);

  const getRecap = useCallback((id: string): Promise<EventRecap> =>
    wrap(() => eventsApi.getRecap(id), 'Could not load the recap. Please refresh.'), []);

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
