import React from 'react';
import { useRouter } from 'next/router';
import { ProtectedPageShell } from '@/components/layout';
import { EventForm } from '@/components/events/EventForm';
import { useEvents } from '@/hooks/useEvents';
import type { CreateEventInput } from '@embr/types';

export default function CreateEventPage() {
  const router = useRouter();
  const { groupId, linkedMutualAidId } = router.query;
  const { createEvent, publishEvent, loading, error } = useEvents();

  const handleSubmit = async (input: CreateEventInput) => {
    const event = await createEvent(input);
    await publishEvent(event.id);
    router.push(`/events/${event.id}`);
  };

  return (
    <ProtectedPageShell>
      <div style={{ maxWidth: '680px', margin: '0 auto' }}>
        <div style={{ marginBottom: '1.5rem' }}>
          <h1 style={{ margin: 0, fontWeight: '800', fontSize: '1.5rem' }}>Host an Event</h1>
          <p style={{ margin: '0.25rem 0 0', color: 'var(--embr-muted-text)', fontSize: '0.95rem' }}>
            Skill shares, teach-ins, meetups, fundraisers — you set the terms.
          </p>
        </div>
        <EventForm
          defaultGroupId={groupId as string | undefined}
          defaultLinkedMutualAidId={linkedMutualAidId as string | undefined}
          onSubmit={handleSubmit}
          loading={loading}
          error={error}
        />
      </div>
    </ProtectedPageShell>
  );
}
