import ProtectedRoute from '@/components/auth/auth/ProtectedRoute';
import { CreatorRevenueDashboard } from '@/components/music/dashboard/CreatorRevenueDashboard';

export default function MusicDashboardPage() {
  return (
    <ProtectedRoute>
      <main className="min-h-screen bg-embr-neutral-50">
        <CreatorRevenueDashboard />
      </main>
    </ProtectedRoute>
  );
}
