import { useRouter } from 'next/router';
import ProtectedRoute from '@/components/auth/auth/ProtectedRoute';
import { DMInbox } from '@/components/messaging/DMInbox';

export default function MessagesThreadPage() {
  const router = useRouter();
  const conversationId = typeof router.query.id === 'string' ? router.query.id : undefined;

  return (
    <ProtectedRoute>
      <main className="min-h-screen bg-gray-50">
        <div className="max-w-6xl mx-auto px-4 py-6 h-[calc(100vh-48px)]">
          <DMInbox
            className="h-full border border-gray-200 rounded-2xl bg-white shadow-sm"
            initialConversationId={conversationId}
            onConversationSelect={(id) => {
              if (id !== conversationId) {
                void router.replace(`/messages/${id}`);
              }
            }}
          />
        </div>
      </main>
    </ProtectedRoute>
  );
}
