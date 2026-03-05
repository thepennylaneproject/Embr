import React from 'react';
import { useRouter } from 'next/router';
import { ProtectedPageShell } from '@/components/layout';
import { CreateMutualAidForm } from '@/components/mutual-aid/CreateMutualAidForm';
import { useMutualAid } from '@/hooks/useMutualAid';

export default function PostMutualAidPage() {
  const { createPost, loading } = useMutualAid();
  const router = useRouter();
  const { groupId } = router.query;

  return (
    <ProtectedPageShell>
      <div style={{ maxWidth: '600px', margin: '0 auto', padding: '0 0 3rem' }}>
        <CreateMutualAidForm
          onSubmit={createPost}
          loading={loading}
          defaultGroupId={groupId as string}
        />
      </div>
    </ProtectedPageShell>
  );
}
