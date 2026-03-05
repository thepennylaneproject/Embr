import { useRouter } from 'next/router';
import { ProtectedPageShell } from '@/components/layout';
import { GigPostForm } from '@/components/gigs/GigPostForm';

export default function PostGigPage() {
  const router = useRouter();

  const handleSuccess = (gigId: string) => {
    router.push(`/gigs/${gigId}`);
  };

  const handleCancel = () => {
    router.push('/gigs/manage');
  };

  return (
    <ProtectedPageShell>
      <GigPostForm onSuccess={handleSuccess} onCancel={handleCancel} />
    </ProtectedPageShell>
  );
}
