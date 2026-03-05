import { ProtectedPageShell } from '@/components/layout';
import { GigManagementDashboard } from '@/components/gigs/GigManagementDashboard';

export default function ManageGigsPage() {
  return (
    <ProtectedPageShell>
      <GigManagementDashboard />
    </ProtectedPageShell>
  );
}
