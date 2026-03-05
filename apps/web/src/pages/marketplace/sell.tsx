import React from 'react';
import { useRouter } from 'next/router';
import { ProtectedPageShell } from '@/components/layout';
import { CreateListingForm } from '@/components/marketplace/CreateListingForm';
import { useMarketplace } from '@/hooks/useMarketplace';

export default function SellPage() {
  const { createListing, publishListing, loading } = useMarketplace();
  const router = useRouter();
  const { groupId } = router.query;

  return (
    <ProtectedPageShell>
      <div style={{ maxWidth: '600px', margin: '0 auto', padding: '0 0 3rem' }}>
        <CreateListingForm
          onSubmit={createListing}
          onPublish={publishListing}
          loading={loading}
          defaultGroupId={groupId as string}
        />
      </div>
    </ProtectedPageShell>
  );
}
