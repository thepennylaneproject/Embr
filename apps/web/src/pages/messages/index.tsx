import { ProtectedPageShell } from '@/components/layout';
import { DMInbox } from '@/components/messaging/DMInbox';
import { copy } from '@/lib/copy';

export default function MessagesPage() {
  return (
    <ProtectedPageShell
      title={copy.dashboard.messages.title}
      subtitle={copy.dashboard.messages.subtitle}
      breadcrumbs={[{ label: copy.dashboard.messages.title }]}
    >
      <DMInbox className="min-h-[600px] border border-gray-200 rounded-2xl bg-white shadow-sm" />
    </ProtectedPageShell>
  );
}
