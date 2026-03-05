import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import { ProtectedPageShell } from '@/components/layout';
import { UrgencyBadge } from '@/components/mutual-aid/UrgencyBadge';
import { ResponseModal } from '@/components/mutual-aid/ResponseModal';
import { useMutualAid } from '@/hooks/useMutualAid';
import { useAuth } from '@/contexts/AuthContext';
import { PageState } from '@/components/ui/PageState';
import type { MutualAidPost } from '@embr/types';
import { MUTUAL_AID_CATEGORY_LABELS, MUTUAL_AID_CATEGORY_ICONS } from '@embr/types';

export default function MutualAidDetailPage() {
  const router = useRouter();
  const { id } = router.query;
  const { user } = useAuth();
  const { getPost, respond, acceptResponse, completeResponse, declineResponse, markFulfilled, loading } = useMutualAid();

  const [post, setPost] = useState<MutualAidPost | null>(null);
  const [pageLoading, setPageLoading] = useState(true);
  const [error, setError] = useState('');
  const [showResponseModal, setShowResponseModal] = useState(false);
  const [responseLoading, setResponseLoading] = useState(false);

  const loadPost = async () => {
    if (!id) return;
    setPageLoading(true);
    try {
      const p = await getPost(id as string);
      setPost(p);
    } catch (e: any) {
      setError(e.response?.data?.message || 'Post not found');
    } finally {
      setPageLoading(false);
    }
  };

  useEffect(() => { loadPost(); }, [id]);

  const handleRespond = async (message: string) => {
    setResponseLoading(true);
    try {
      await respond(id as string, message);
      setShowResponseModal(false);
      await loadPost();
    } finally {
      setResponseLoading(false);
    }
  };

  const handleAccept = async (responseId: string) => {
    await acceptResponse(id as string, responseId);
    await loadPost();
  };

  const handleComplete = async (responseId: string) => {
    await completeResponse(id as string, responseId);
    await loadPost();
  };

  const handleFulfill = async () => {
    await markFulfilled(id as string);
    await loadPost();
  };

  if (pageLoading) return <ProtectedPageShell><PageState type="loading" title="Loading..." /></ProtectedPageShell>;
  if (error || !post) return <ProtectedPageShell><PageState type="empty" title="Not found" description={error} /></ProtectedPageShell>;

  const isAuthor = post.authorId === user?.id;
  const isActive = post.status === 'OPEN' || post.status === 'IN_PROGRESS';
  const userHasResponded = post.responses?.some((r) => r.responderId === user?.id);

  return (
    <ProtectedPageShell>
      <div style={{ maxWidth: '700px', margin: '0 auto' }}>
        {/* Back link */}
        <Link href="/mutual-aid" style={{ fontSize: '0.875rem', color: 'var(--embr-muted-text)', textDecoration: 'none', display: 'block', marginBottom: '1.25rem' }}>
          ← Back to Mutual Aid
        </Link>

        {/* Post */}
        <div style={{ background: 'var(--embr-surface)', border: '1px solid var(--embr-border)', borderRadius: 'var(--embr-radius-lg)', padding: '1.5rem', marginBottom: '1.5rem' }}>
          {/* Type + category */}
          <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap' }}>
            <span style={{
              fontSize: '0.78rem', fontWeight: '700', padding: '0.25rem 0.75rem', borderRadius: '999px',
              background: post.type === 'REQUEST' ? '#f5f3ff' : '#ecfeff',
              color: post.type === 'REQUEST' ? '#7c3aed' : '#0891b2',
            }}>
              {post.type === 'REQUEST' ? '🙏 Needs Help' : '🤝 Offering'}
            </span>
            <span style={{ fontSize: '1rem' }}>{MUTUAL_AID_CATEGORY_ICONS[post.category]}</span>
            <span style={{ fontSize: '0.875rem', color: 'var(--embr-muted-text)' }}>{MUTUAL_AID_CATEGORY_LABELS[post.category]}</span>
            <UrgencyBadge urgency={post.urgency} size="md" />
            <span style={{ fontSize: '0.78rem', color: 'var(--embr-muted-text)', marginLeft: 'auto' }}>
              {post.status.charAt(0) + post.status.slice(1).toLowerCase().replace('_', ' ')}
            </span>
          </div>

          <h1 style={{ margin: '0 0 1rem', fontSize: '1.375rem', fontWeight: '800', lineHeight: 1.35 }}>{post.title}</h1>
          <p style={{ margin: '0 0 1.25rem', fontSize: '0.95rem', lineHeight: 1.7, color: 'var(--embr-muted-text)' }}>{post.description}</p>

          {/* Meta */}
          <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', fontSize: '0.85rem', color: 'var(--embr-muted-text)', marginBottom: '1.25rem' }}>
            {post.quantity && <span>📦 {post.quantity}</span>}
            {post.location && <span>📍 {post.location}</span>}
            {post.isRemote && <span>🌐 Remote / Online</span>}
            {post.expiresAt && <span>⏱ Expires {new Date(post.expiresAt).toLocaleDateString()}</span>}
            {post.group && <Link href={`/groups/${post.group.slug}`} style={{ color: 'var(--embr-accent)', textDecoration: 'none' }}>🏘 {post.group.name}</Link>}
          </div>

          {/* Author */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.75rem' }}>
            <Link href={`/${post.author?.username}`} style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', textDecoration: 'none' }}>
              <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: 'var(--embr-warm-1)', flexShrink: 0, backgroundImage: post.author?.profile?.avatarUrl ? `url(${post.author.profile.avatarUrl})` : undefined, backgroundSize: 'cover', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: '700', fontSize: '0.875rem' }}>
                {!post.author?.profile?.avatarUrl && (post.author?.profile?.displayName || post.author?.username || '?')[0].toUpperCase()}
              </div>
              <div>
                <div style={{ fontWeight: '600', fontSize: '0.875rem', color: 'var(--embr-text)' }}>{post.author?.profile?.displayName || post.author?.username}</div>
                <div style={{ fontSize: '0.75rem', color: 'var(--embr-muted-text)' }}>{new Date(post.createdAt).toLocaleDateString()}</div>
              </div>
            </Link>

            <div style={{ display: 'flex', gap: '0.5rem' }}>
              {isAuthor && isActive && (
                <button onClick={handleFulfill} style={{ padding: '0.4rem 0.875rem', borderRadius: 'var(--embr-radius-md)', border: '1px solid #22c55e', background: '#f0fdf4', color: '#16a34a', cursor: 'pointer', fontWeight: '600', fontSize: '0.82rem' }}>
                  Mark Fulfilled
                </button>
              )}
              {!isAuthor && isActive && !userHasResponded && (
                <button onClick={() => setShowResponseModal(true)} style={{ padding: '0.4rem 1.25rem', borderRadius: 'var(--embr-radius-md)', border: 'none', background: 'var(--embr-accent)', color: '#fff', cursor: 'pointer', fontWeight: '700', fontSize: '0.875rem' }}>
                  Respond
                </button>
              )}
              {!isAuthor && userHasResponded && (
                <span style={{ fontSize: '0.82rem', color: '#22c55e', fontWeight: '600' }}>✓ You responded</span>
              )}
            </div>
          </div>
        </div>

        {/* Responses */}
        <div>
          <h2 style={{ margin: '0 0 1rem', fontSize: '1rem', fontWeight: '700' }}>
            Responses ({post.responses?.length ?? 0})
          </h2>
          {(!post.responses || post.responses.length === 0) ? (
            <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--embr-muted-text)', background: 'var(--embr-bg)', borderRadius: 'var(--embr-radius-md)' }}>
              No responses yet. {!isAuthor && isActive && 'Be the first to help!'}
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>
              {post.responses.map((response) => (
                <div key={response.id} style={{
                  padding: '1rem', background: 'var(--embr-surface)', border: `1px solid ${response.status === 'ACCEPTED' ? '#22c55e' : response.status === 'COMPLETED' ? '#6b7280' : 'var(--embr-border)'}`,
                  borderRadius: 'var(--embr-radius-md)',
                }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '0.75rem', marginBottom: '0.625rem' }}>
                    <Link href={`/${response.responder?.username}`} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', textDecoration: 'none' }}>
                      <div style={{ width: '30px', height: '30px', borderRadius: '50%', background: 'var(--embr-warm-1)', flexShrink: 0 }} />
                      <span style={{ fontWeight: '600', fontSize: '0.875rem', color: 'var(--embr-text)' }}>
                        {response.responder?.profile?.displayName || response.responder?.username}
                      </span>
                    </Link>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <span style={{ fontSize: '0.75rem', padding: '0.15rem 0.5rem', borderRadius: '999px', background: response.status === 'ACCEPTED' ? '#dcfce7' : response.status === 'COMPLETED' ? '#f3f4f6' : '#f1f5f9', color: response.status === 'ACCEPTED' ? '#16a34a' : response.status === 'COMPLETED' ? '#6b7280' : '#64748b', fontWeight: '600' }}>
                        {response.status.charAt(0) + response.status.slice(1).toLowerCase()}
                      </span>
                      {isAuthor && response.status === 'PENDING' && (
                        <div style={{ display: 'flex', gap: '0.375rem' }}>
                          <button onClick={() => handleAccept(response.id)} style={{ padding: '0.25rem 0.625rem', borderRadius: 'var(--embr-radius-sm)', border: 'none', background: '#22c55e', color: '#fff', cursor: 'pointer', fontSize: '0.75rem', fontWeight: '600' }}>Accept</button>
                          <button onClick={() => completeResponse(id as string, response.id).then(loadPost)} style={{ padding: '0.25rem 0.625rem', borderRadius: 'var(--embr-radius-sm)', border: '1px solid var(--embr-border)', background: 'transparent', cursor: 'pointer', fontSize: '0.75rem', fontWeight: '600' }}>Complete</button>
                        </div>
                      )}
                    </div>
                  </div>
                  <p style={{ margin: 0, fontSize: '0.875rem', lineHeight: 1.6, color: 'var(--embr-text)' }}>{response.message}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {showResponseModal && (
        <ResponseModal
          postTitle={post.title}
          onSubmit={handleRespond}
          onClose={() => setShowResponseModal(false)}
          loading={responseLoading}
        />
      )}
    </ProtectedPageShell>
  );
}
