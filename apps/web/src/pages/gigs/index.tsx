import ProtectedRoute from '@/components/auth/auth/ProtectedRoute';
import { GigDiscovery } from '@/components/gigs/GigDiscovery';

export default function GigsPage() {
  return (
    <ProtectedRoute>
      <GigDiscovery />
    </ProtectedRoute>
  );
}
