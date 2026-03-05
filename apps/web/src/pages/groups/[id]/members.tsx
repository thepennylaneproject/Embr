import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import { ProtectedPageShell } from '@/components/layout';
import { MemberList } from '@/components/groups/MemberList';
import { useGroups } from '@/hooks/useGroups';
import { useAuth } from '@/contexts/AuthContext';
import { PageState } from '@/components/ui/PageState';
import type { Group, GroupMember, GroupJoinRequest } from '@embr/types';
import { groupsApi } from '@shared/api/groups.api';

export default function GroupMembersPage() {
  const router = useRouter();
  const { id } = router.query;
  const { user } = useAuth();
  const { getMembers, getJoinRequests, approveJoinRequest, rejectJoinRequest } = useGroups();

  const [group, setGroup] = useState<Group | null>(null);
  const [members, setMembers] = useState<GroupMember[]>([]);
  const [requests, setRequests] = useState<GroupJoinRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'members' | 'requests'>('members');

  useEffect(() => {
    if (!id) return;
    groupsApi.findBySlug(id as string).then(async (g) => {
      setGroup(g);
      const m = await getMembers(g.id);
      setMembers(m.items);
      if (g.membershipRole === 'ADMIN' || g.membershipRole === 'MODERATOR') {
        const r = await getJoinRequests(g.id);
        setRequests(r);
      }
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [id]);

  if (loading) return <ProtectedPageShell><PageState type="loading" title="Loading..." /></ProtectedPageShell>;
  if (!group) return <ProtectedPageShell><PageState type="empty" title="Group not found" /></ProtectedPageShell>;

  const canManageRequests = group.membershipRole === 'ADMIN' || group.membershipRole === 'MODERATOR';

  return (
    <ProtectedPageShell>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem' }}>
        <Link href={`/groups/${group.slug}`} style={{ color: 'var(--embr-muted-text)', textDecoration: 'none', fontSize: '0.875rem' }}>
          ← {group.name}
        </Link>
      </div>

      <h1 style={{ margin: '0 0 1.5rem', fontSize: '1.25rem', fontWeight: '800' }}>
        Members ({group.memberCount})
      </h1>

      {canManageRequests && (
        <div style={{ display: 'flex', gap: '0', borderBottom: '1px solid var(--embr-border)', marginBottom: '1.5rem' }}>
          {[{ key: 'members', label: 'Members' }, { key: 'requests', label: `Requests (${requests.length})` }].map((t) => (
            <button
              key={t.key}
              onClick={() => setActiveTab(t.key as any)}
              style={{
                padding: '0.625rem 1.25rem', border: 'none', background: 'none', cursor: 'pointer',
                fontWeight: activeTab === t.key ? '700' : '500',
                color: activeTab === t.key ? 'var(--embr-accent)' : 'var(--embr-muted-text)',
                borderBottom: activeTab === t.key ? '2px solid var(--embr-accent)' : '2px solid transparent',
                fontSize: '0.875rem',
              }}
            >
              {t.label}
            </button>
          ))}
        </div>
      )}

      {activeTab === 'members' && (
        <MemberList
          members={members}
          currentUserId={user?.id}
          currentUserRole={group.membershipRole}
        />
      )}

      {activeTab === 'requests' && canManageRequests && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {requests.length === 0 ? (
            <PageState type="empty" title="No pending requests" description="All caught up!" />
          ) : requests.map((req) => (
            <div key={req.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.875rem', borderRadius: 'var(--embr-radius-md)', border: '1px solid var(--embr-border)', background: 'var(--embr-bg)', gap: '0.75rem', flexWrap: 'wrap' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: 'var(--embr-warm-1)', flexShrink: 0 }} />
                <div>
                  <div style={{ fontWeight: '600', fontSize: '0.9rem' }}>{req.user?.profile?.displayName || req.user?.username}</div>
                  {req.message && <div style={{ fontSize: '0.82rem', color: 'var(--embr-muted-text)', marginTop: '0.2rem' }}>{req.message}</div>}
                </div>
              </div>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button
                  onClick={async () => { await approveJoinRequest(group.id, req.id); setRequests(requests.filter((r) => r.id !== req.id)); }}
                  style={{ padding: '0.4rem 0.875rem', borderRadius: 'var(--embr-radius-md)', border: 'none', background: '#22c55e', color: '#fff', cursor: 'pointer', fontWeight: '600', fontSize: '0.82rem' }}
                >
                  Approve
                </button>
                <button
                  onClick={async () => { await rejectJoinRequest(group.id, req.id); setRequests(requests.filter((r) => r.id !== req.id)); }}
                  style={{ padding: '0.4rem 0.875rem', borderRadius: 'var(--embr-radius-md)', border: '1px solid var(--embr-border)', background: 'transparent', cursor: 'pointer', fontWeight: '600', fontSize: '0.82rem' }}
                >
                  Reject
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </ProtectedPageShell>
  );
}
