import { useRouter } from 'next/router';
import { ProtectedPageShell } from '@/components/layout';
import { DMInbox } from '@/components/messaging/DMInbox';

export default function MessagesThreadPage() {
  const router = useRouter();
  const conversationId = typeof router.query.id === 'string' ? router.query.id : undefined;

  return (
    <ProtectedPageShell
      title="Message"
      breadcrumbs={[{ label: 'Messages', href: '/messages' }, { label: 'Thread' }]}
    >
      <DMInbox
        className="min-h-[600px] border border-gray-200 rounded-2xl bg-white shadow-sm"
        initialConversationId={conversationId}
        onConversationSelect={(id) => {
          if (id !== conversationId) {
            void router.replace(`/messages/${id}`);
          }
        }}
      />
    </ProtectedPageShell>
  );
}
