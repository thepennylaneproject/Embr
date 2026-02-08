import Link from 'next/link';
import ProtectedRoute from '@/components/auth/auth/ProtectedRoute';
import { FeedTabs, PostCreator } from '@/components/content';
import { useAuth } from '@/contexts/AuthContext';

export default function FeedPage() {
  const { user, loading } = useAuth();

  return (
    <ProtectedRoute>
      <main className="min-h-screen bg-gray-50">
        <div className="max-w-3xl mx-auto px-4 py-8">
          <header className="mb-6 flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Feed</h1>
              <p className="text-sm text-gray-500">
                Stay up to date with what&apos;s new from creators.
              </p>
            </div>
            {user && (
              <Link
                href="/profile"
                className="flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900"
              >
                <img
                  src={user.profile?.avatarUrl || '/default-avatar.png'}
                  alt={user.profile?.displayName || user.username}
                  className="w-8 h-8 rounded-full object-cover"
                />
                <span className="hidden sm:inline">@{user.username}</span>
              </Link>
            )}
          </header>

          <section aria-live="polite" aria-busy={loading}>
            <PostCreator className="mb-6" />
            <FeedTabs />
          </section>
        </div>
      </main>
    </ProtectedRoute>
  );
}
