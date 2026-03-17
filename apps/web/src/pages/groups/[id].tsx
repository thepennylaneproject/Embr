import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import { ProtectedPageShell } from '@/components/layout';
import { GroupHeader } from '@/components/groups/GroupHeader';
import { MemberList } from '@/components/groups/MemberList';
import { EventCard } from '@/components/events/EventCard';
import { ActionAlertBanner } from '@/components/organizing/ActionAlertBanner';
import { PollCard } from '@/components/organizing/PollCard';
import { CreatePollForm } from '@/components/organizing/CreatePollForm';
import { TreasuryPanel } from '@/components/organizing/TreasuryPanel';
import { useGroups } from '@/hooks/useGroups';
import { useEvents } from '@/hooks/useEvents';
import { useOrganizing } from '@/hooks/useOrganizing';
import { useAuth } from '@/contexts/AuthContext';
import { PageState } from '@/components/ui/PageState';
import type { Group, GroupMember, Event, ActionAlert, Poll, GroupTreasury } from '@embr/types';
import { groupsApi } from '@shared/api/groups.api';

type Tab = 'feed' | 'events' | 'alerts' | 'polls' | 'members' | 'about' | 'mutual-aid' | 'shop';

export default function GroupDetailPage() {
  const router = useRouter();
  const { id } = router.query;
  const { user } = useAuth();
  const { joinGroup, leaveGroup } = useGroups();
  const { getEvents, loading: eventsLoading } = useEvents();
  const { getAlerts, deactivateAlert, createPoll, getPolls, vote, closePoll, getTreasury, contribute, disburse, loading: orgLoading, error: orgError } = useOrganizing();

  const [group, setGroup] = useState<Group | null>(null);
  const [posts, setPosts] = useState<any[]>([]);
  const [members, setMembers] = useState<GroupMember[]>([]);
  const [events, setEvents] = useState<Event[]>([]);
  const [alerts, setAlerts] = useState<ActionAlert[]>([]);
  const [polls, setPolls] = useState<Poll[]>([]);
  const [treasury, setTreasury] = useState<GroupTreasury | null>(null);
  const [tab, setTab] = useState<Tab>('feed');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const [showCreatePoll, setShowCreatePoll] = useState(false);
  const [actionFeedback, setActionFeedback] = useState('');

  const loadGroup = async () => {
    if (!id) return;
    const g = await groupsApi.findBySlug(id as string);
    setGroup(g);
  };

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    groupsApi.findBySlug(id as string)
      .then((g) => { setGroup(g); setLoading(false); })
      .catch((e) => { setError(e.response?.data?.message || 'Group not found'); setLoading(false); });
  }, [id]);

  useEffect(() => {
    if (!group || tab !== 'feed') return;
    groupsApi.getPosts(group.id).then((r) => setPosts(r.items || []));
  }, [group, tab]);

  useEffect(() => {
    if (!group || tab !== 'members') return;
    groupsApi.getMembers(group.id).then((r) => setMembers(r.items || []));
  }, [group, tab]);

  useEffect(() => {
    if (!group || tab !== 'events') return;
    getEvents({ groupId: group.id }).then((r) => setEvents(r.items));
  }, [group, tab]);

  useEffect(() => {
    if (!group || tab !== 'alerts') return;
    getAlerts(group.id).then(setAlerts);
  }, [group, tab]);

  useEffect(() => {
    if (!group || tab !== 'polls') return;
    getPolls(group.id).then(setPolls);
  }, [group, tab]);

  useEffect(() => {
    if (!group || tab !== 'about') return;
    getTreasury(group.id).then(setTreasury).catch(() => {});
  }, [group, tab]);

  const handleJoin = async () => {
    if (!group) return;
    setActionLoading(true);
    try {
      const result = await joinGroup(group.id);
      setActionFeedback(
        result?.status === 'pending'
          ? 'Join request sent. A moderator will review it.'
          : 'You joined the group.',
      );
      await loadGroup();
    } catch (e: any) {
      setActionFeedback(e.response?.data?.message || 'Failed to join');
    } finally {
      setActionLoading(false);
    }
  };

  const handleLeave = async () => {
    if (!group || !confirm('Leave this group?')) return;
    setActionLoading(true);
    try {
      await leaveGroup(group.id);
      setActionFeedback('You left the group.');
      await loadGroup();
    } catch (e: any) {
      setActionFeedback(e.response?.data?.message || 'Failed to leave');
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) return <ProtectedPageShell><PageState type="loading" title="Loading group..." /></ProtectedPageShell>;
  if (error || !group) return <ProtectedPageShell><PageState type="empty" title="Group not found" description={error} /></ProtectedPageShell>;

  const isMember = !!group.membershipRole;
  const isModOrAdmin = group.membershipRole === 'MODERATOR' || group.membershipRole === 'ADMIN';
  const isAdmin = group.membershipRole === 'ADMIN';

  const tabs: { key: Tab; label: string }[] = [
    { key: 'feed', label: 'Feed' },
    { key: 'events', label: 'Events' },
    { key: 'alerts', label: '🔔 Alerts' },
    { key: 'polls', label: 'Polls' },
    { key: 'members', label: `Members (${group.memberCount})` },
    { key: 'about', label: 'About' },
    { key: 'mutual-aid', label: 'Mutual Aid' },
    { key: 'shop', label: 'Shop' },
  ];

  return (
    <ProtectedPageShell>
      <GroupHeader
        group={group}
        onJoin={handleJoin}
        onLeave={handleLeave}
        actionLoading={actionLoading}
        currentUserId={user?.id}
      />
      {actionFeedback && (
        <div style={{ marginBottom: '1rem', fontSize: '0.88rem', color: 'var(--embr-muted-text)' }}>
          {actionFeedback}
        </div>
      )}

      {/* Tab nav */}
      <div style={{ display: 'flex', gap: '0', borderBottom: '1px solid var(--embr-border)', marginBottom: '1.5rem', overflowX: 'auto' }}>
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            style={{
              padding: '0.625rem 1.1rem',
              border: 'none',
              background: 'none',
              cursor: 'pointer',
              fontWeight: tab === t.key ? '700' : '500',
              fontSize: '0.875rem',
              color: tab === t.key ? 'var(--embr-accent)' : 'var(--embr-muted-text)',
              borderBottom: tab === t.key ? '2px solid var(--embr-accent)' : '2px solid transparent',
              whiteSpace: 'nowrap',
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Feed tab */}
      {tab === 'feed' && (
        <div>
          {isMember && (
            <div style={{ marginBottom: '1.25rem', padding: '0.875rem', borderRadius: 'var(--embr-radius-md)', border: '1px solid var(--embr-border)', background: 'var(--embr-bg)' }}>
              <Link href={`/create?groupId=${group.id}`}>
                <div style={{ color: 'var(--embr-muted-text)', fontSize: '0.9rem', cursor: 'pointer' }}>
                  Share something with the group...
                </div>
              </Link>
            </div>
          )}
          {posts.length === 0 ? (
            <PageState type="empty" title="No posts yet" description="Be the first to share something with this group." />
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {posts.map((post: any) => (
                <div key={post.id} style={{ padding: '1rem', background: 'var(--embr-surface)', border: '1px solid var(--embr-border)', borderRadius: 'var(--embr-radius-md)' }}>
                  <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '0.625rem' }}>
                    <div
                      role={post.author?.profile?.avatarUrl ? 'img' : undefined}
                      aria-label={post.author?.profile?.avatarUrl ? `${post.author?.profile?.displayName || post.author?.username || 'Author'} avatar` : undefined}
                      style={{ width: '36px', height: '36px', borderRadius: '50%', background: 'var(--embr-warm-1)', flexShrink: 0, backgroundImage: post.author?.profile?.avatarUrl ? `url(${post.author.profile.avatarUrl})` : undefined, backgroundSize: 'cover' }}
                    />
                    <div>
                      <Link href={`/${post.author?.username}`} style={{ textDecoration: 'none', fontWeight: '600', fontSize: '0.875rem', color: 'var(--embr-text)' }}>
                        {post.author?.profile?.displayName || post.author?.username}
                      </Link>
                      <div style={{ fontSize: '0.75rem', color: 'var(--embr-muted-text)' }}>
                        {new Date(post.createdAt).toLocaleDateString()}
                      </div>
                    </div>
                  </div>
                  <p style={{ margin: 0, fontSize: '0.9rem', lineHeight: 1.6 }}>{post.content}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Events tab */}
      {tab === 'events' && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: '700' }}>Group Events</h3>
            <Link href={`/events/create?groupId=${group.id}`}>
              <button
                disabled={!isMember}
                title={!isMember ? 'Join the group to host an event.' : undefined}
                style={{ padding: '0.4rem 0.875rem', borderRadius: 'var(--embr-radius-md)', border: 'none', background: 'var(--embr-accent)', color: '#fff', cursor: isMember ? 'pointer' : 'not-allowed', opacity: isMember ? 1 : 0.55, fontSize: '0.82rem', fontWeight: '700' }}
              >
                + Host Event
              </button>
            </Link>
          </div>
          {eventsLoading ? (
            <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--embr-muted-text)' }}>Loading...</div>
          ) : events.length === 0 ? (
            <PageState type="empty" title="No events yet" description="Host your first group event — skill share, meetup, or fundraiser." />
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: '1rem' }}>
              {events.map((e) => <EventCard key={e.id} event={e} />)}
            </div>
          )}
        </div>
      )}

      {/* Alerts tab */}
      {tab === 'alerts' && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: '700' }}>Action Alerts</h3>
            {isModOrAdmin && (
              <Link href={`/groups/${group.slug}/alerts/create`}>
                <button style={{ padding: '0.4rem 0.875rem', borderRadius: 'var(--embr-radius-md)', border: 'none', background: 'var(--embr-accent)', color: '#fff', cursor: 'pointer', fontSize: '0.82rem', fontWeight: '700' }}>
                  + Post Alert
                </button>
              </Link>
            )}
          </div>
          {orgLoading ? (
            <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--embr-muted-text)' }}>Loading...</div>
          ) : alerts.length === 0 ? (
            <PageState type="empty" title="No active alerts" description="Moderators can post urgent action alerts to the group." />
          ) : (
            <div>
              {alerts.map((alert) => (
                <ActionAlertBanner
                  key={alert.id}
                  alert={alert}
                  canManage={isModOrAdmin}
                  onDeactivate={async (alertId) => {
                    await deactivateAlert(group.id, alertId);
                    setAlerts((prev) => prev.filter((a) => a.id !== alertId));
                  }}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Polls tab */}
      {tab === 'polls' && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: '700' }}>Polls</h3>
            {isMember && !showCreatePoll && (
              <button onClick={() => setShowCreatePoll(true)} style={{ padding: '0.4rem 0.875rem', borderRadius: 'var(--embr-radius-md)', border: 'none', background: 'var(--embr-accent)', color: '#fff', cursor: 'pointer', fontSize: '0.82rem', fontWeight: '700' }}>
                + Create Poll
              </button>
            )}
          </div>

          {showCreatePoll && (
            <div style={{ padding: '1rem', borderRadius: 'var(--embr-radius-lg)', border: '1px solid var(--embr-border)', background: 'var(--embr-surface)', marginBottom: '1.25rem' }}>
              <h4 style={{ margin: '0 0 0.875rem', fontWeight: '700' }}>New Poll</h4>
              <CreatePollForm
                onSubmit={async (input) => {
                  const poll = await createPoll(group.id, input);
                  setPolls((prev) => [poll, ...prev]);
                  setShowCreatePoll(false);
                }}
                onCancel={() => setShowCreatePoll(false)}
                loading={orgLoading}
                error={orgError}
              />
            </div>
          )}

          {orgLoading && polls.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--embr-muted-text)' }}>Loading...</div>
          ) : polls.length === 0 ? (
            <PageState type="empty" title="No polls yet" description="Create a poll to gather the group's opinion." />
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {polls.map((poll) => (
                <PollCard
                  key={poll.id}
                  poll={poll}
                  groupId={group.id}
                  onVote={async (pollId, optionIds) => {
                    const updated = await vote(group.id, pollId, { optionIds });
                    setPolls((prev) => prev.map((p) => p.id === pollId ? updated : p));
                  }}
                  onClose={isModOrAdmin ? async (pollId) => {
                    const updated = await closePoll(group.id, pollId);
                    setPolls((prev) => prev.map((p) => p.id === pollId ? updated : p));
                  } : undefined}
                  canManage={isModOrAdmin}
                  currentUserId={user?.id}
                  loading={orgLoading}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Members tab */}
      {tab === 'members' && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: '700' }}>Members</h3>
            <Link href={`/groups/${group.slug}/members`} style={{ fontSize: '0.875rem', color: 'var(--embr-accent)', textDecoration: 'none' }}>
              View all →
            </Link>
          </div>
          <MemberList
            members={members.slice(0, 20)}
            currentUserId={user?.id}
            currentUserRole={group.membershipRole}
          />
        </div>
      )}

      {/* About tab */}
      {tab === 'about' && (
        <div style={{ maxWidth: '600px' }}>
          {group.description && (
            <div style={{ marginBottom: '1.5rem' }}>
              <h3 style={{ margin: '0 0 0.625rem', fontSize: '1rem', fontWeight: '700' }}>About</h3>
              <p style={{ margin: 0, lineHeight: 1.7, color: 'var(--embr-muted-text)' }}>{group.description}</p>
            </div>
          )}
          {group.rules.length > 0 && (
            <div style={{ marginBottom: '2rem' }}>
              <h3 style={{ margin: '0 0 0.625rem', fontSize: '1rem', fontWeight: '700' }}>Community Rules</h3>
              <ol style={{ margin: 0, paddingLeft: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {group.rules.map((rule, i) => (
                  <li key={i} style={{ fontSize: '0.9rem', lineHeight: 1.6, color: 'var(--embr-text)' }}>{rule}</li>
                ))}
              </ol>
            </div>
          )}

          {/* Treasury sub-panel */}
          {isMember && (
            <div>
              <h3 style={{ margin: '0 0 0.875rem', fontSize: '1rem', fontWeight: '700' }}>Group Treasury</h3>
              <TreasuryPanel
                treasury={treasury}
                groupId={group.id}
                isAdmin={isAdmin}
                onContribute={async (amount, description) => {
                  const updated = await contribute(group.id, { amount, description });
                  setTreasury(updated);
                }}
                onDisburse={async (amount, purpose, pollId) => {
                  const updated = await disburse(group.id, { amount, purpose, pollId });
                  setTreasury(updated);
                }}
                loading={orgLoading}
                error={orgError}
              />
            </div>
          )}
        </div>
      )}

      {/* Mutual Aid tab */}
      {tab === 'mutual-aid' && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: '700' }}>Mutual Aid</h3>
            <Link href={`/mutual-aid?groupId=${group.id}`}>
              <button style={{ padding: '0.4rem 0.875rem', borderRadius: 'var(--embr-radius-md)', border: '1px solid var(--embr-border)', background: 'transparent', cursor: 'pointer', fontSize: '0.82rem', fontWeight: '600' }}>
                View All
              </button>
            </Link>
          </div>
          <Link href={`/mutual-aid/post?groupId=${group.id}`}>
            <button style={{ padding: '0.5rem 1.25rem', borderRadius: 'var(--embr-radius-md)', border: 'none', background: 'var(--embr-accent)', color: '#fff', cursor: 'pointer', fontWeight: '600', fontSize: '0.875rem', marginBottom: '1rem' }}>
              + Post Request or Offer
            </button>
          </Link>
          <iframe
            src={`/mutual-aid?groupId=${group.id}&embed=1`}
            style={{ width: '100%', border: 'none', minHeight: '400px' }}
            title="Mutual Aid"
          />
        </div>
      )}

      {/* Shop tab */}
      {tab === 'shop' && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: '700' }}>Group Shop</h3>
            <Link href={`/marketplace?groupId=${group.id}`}>
              <button style={{ padding: '0.4rem 0.875rem', borderRadius: 'var(--embr-radius-md)', border: '1px solid var(--embr-border)', background: 'transparent', cursor: 'pointer', fontSize: '0.82rem', fontWeight: '600' }}>
                View All
              </button>
            </Link>
          </div>
          <Link href={`/marketplace/sell?groupId=${group.id}`}>
            <button style={{ padding: '0.5rem 1.25rem', borderRadius: 'var(--embr-radius-md)', border: 'none', background: 'var(--embr-accent)', color: '#fff', cursor: 'pointer', fontWeight: '600', fontSize: '0.875rem', marginBottom: '1rem' }}>
              + List Item
            </button>
          </Link>
          <p style={{ color: 'var(--embr-muted-text)', fontSize: '0.9rem' }}>
            Group members can buy and sell goods here. <Link href={`/marketplace?groupId=${group.id}`} style={{ color: 'var(--embr-accent)' }}>Browse listings →</Link>
          </p>
        </div>
      )}
    </ProtectedPageShell>
  );
}
