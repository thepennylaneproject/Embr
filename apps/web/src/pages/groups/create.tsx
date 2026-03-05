import React from 'react';
import { ProtectedPageShell } from '@/components/layout';
import { CreateGroupForm } from '@/components/groups/CreateGroupForm';
import { useGroups } from '@/hooks/useGroups';

export default function CreateGroupPage() {
  const { createGroup, loading } = useGroups();

  return (
    <ProtectedPageShell>
      <div style={{ maxWidth: '600px', margin: '0 auto', padding: '0 0 3rem' }}>
        <CreateGroupForm onSubmit={createGroup} loading={loading} />
      </div>
    </ProtectedPageShell>
  );
}
