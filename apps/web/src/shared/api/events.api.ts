import apiClient from '@/lib/api/client';
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

export const eventsApi = {
  async createEvent(input: CreateEventInput): Promise<Event> {
    const { data } = await apiClient.post('/events', input);
    return data;
  },

  async publishEvent(id: string): Promise<Event> {
    const { data } = await apiClient.post(`/events/${id}/publish`);
    return data;
  },

  async getEvents(params?: EventSearchParams): Promise<PaginatedEvents> {
    const { data } = await apiClient.get('/events', { params });
    return data;
  },

  async getMyEvents(): Promise<Event[]> {
    const { data } = await apiClient.get('/events/mine');
    return data;
  },

  async getEvent(id: string): Promise<Event> {
    const { data } = await apiClient.get(`/events/${id}`);
    return data;
  },

  async updateEvent(id: string, input: UpdateEventInput): Promise<Event> {
    const { data } = await apiClient.put(`/events/${id}`, input);
    return data;
  },

  async cancelEvent(id: string): Promise<Event> {
    const { data } = await apiClient.patch(`/events/${id}/cancel`);
    return data;
  },

  async deleteEvent(id: string): Promise<void> {
    await apiClient.delete(`/events/${id}`);
  },

  async rsvp(id: string, input: RsvpInput): Promise<EventAttendee> {
    const { data } = await apiClient.post(`/events/${id}/rsvp`, input);
    return data;
  },

  async cancelRsvp(id: string): Promise<{ success: boolean }> {
    const { data } = await apiClient.delete(`/events/${id}/rsvp`);
    return data;
  },

  async getAttendees(id: string, cursor?: string, limit?: number) {
    const { data } = await apiClient.get(`/events/${id}/attendees`, { params: { cursor, limit } });
    return data;
  },

  async createRecap(id: string, input: CreateEventRecapInput): Promise<EventRecap> {
    const { data } = await apiClient.post(`/events/${id}/recap`, input);
    return data;
  },

  async getRecap(id: string): Promise<EventRecap> {
    const { data } = await apiClient.get(`/events/${id}/recap`);
    return data;
  },
};
