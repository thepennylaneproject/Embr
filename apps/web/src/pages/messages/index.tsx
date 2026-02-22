import { ProtectedPageShell } from '@/components/layout';
import { DMInbox } from '@/components/messaging/DMInbox';

export default function MessagesPage() {
  return (
    <ProtectedPageShell
      title="Messages"
      subtitle="Connect and chat with other creators."
      breadcrumbs={[{ label: 'Messages' }]}
    >
      <DMInbox className="border border-gray-200 rounded-2xl bg-white shadow-sm" style={{ minHeight: '600px' }} />
    </ProtectedPageShell>
  );
}
