import ProtectedRoute from '@/components/auth/auth/ProtectedRoute';
import { DMInbox } from '@/components/messaging/DMInbox';

export default function MessagesPage() {
  return (
    <ProtectedRoute>
      <main className="min-h-screen bg-gray-50">
        <div className="max-w-6xl mx-auto px-4 py-6 h-[calc(100vh-48px)]">
          <DMInbox className="h-full border border-gray-200 rounded-2xl bg-white shadow-sm" />
        </div>
      </main>
    </ProtectedRoute>
  );
}
