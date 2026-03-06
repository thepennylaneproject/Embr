import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import { ProtectedPageShell } from '@/components/layout';
import { useGroups } from '@/hooks/useGroups';
import { useAuth } from '@/contexts/AuthContext';
import { PageState } from '@/components/ui/PageState';
import { useToast } from '@embr/ui';
import type { Group } from '@embr/types';
import { groupsApi } from '@shared/api/groups.api';

export default function GroupSettingsPage() {
  const router = useRouter();
  const { id } = router.query;
  const { user } = useAuth();
  const { updateGroup, deleteGroup, loading } = useGroups();
  const { showToast } = useToast();

  const [group, setGroup] = useState<Group | null>(null);
  const [pageLoading, setPageLoading] = useState(true);
  const [form, setForm] = useState({ name: '', description: '', type: '', category: '' });
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');
  const [deleteError, setDeleteError] = useState('');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  useEffect(() => {
    if (!id) return;
    groupsApi.findBySlug(id as string).then((g) => {
      setGroup(g);
      setForm({ name: g.name, description: g.description || '', type: g.type, category: g.category || '' });
      if (g.membershipRole !== 'ADMIN' && g.createdById !== user?.id) {
        router.push(`/groups/${g.slug}`);
      }
      setPageLoading(false);
    }).catch(() => setPageLoading(false));
  }, [id]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!group) return;
    setError('');
    try {
      await updateGroup(group.id, form as any);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (e: any) {
      setError(e.response?.data?.message || 'Failed to save');
    }
  };

  const handleDelete = async () => {
    if (!group) return;
    setDeleteError('');
    try {
      await deleteGroup(group.id);
      router.push('/groups');
    } catch (e: any) {
      setDeleteError(e.response?.data?.message || 'Failed to delete group. Please try again or contact support.');
      showToast({ title: 'Could not delete group', description: 'Please try again.', kind: 'error' });
    }
  };

  if (pageLoading) return <ProtectedPageShell><PageState type="loading" title="Loading..." /></ProtectedPageShell>;
  if (!group) return <ProtectedPageShell><PageState type="empty" title="Group not found" /></ProtectedPageShell>;

  const inputStyle: React.CSSProperties = { width: '100%', padding: '0.625rem 0.75rem', borderRadius: 'var(--embr-radius-md)', border: '1px solid var(--embr-border)', background: 'var(--embr-bg)', color: 'var(--embr-text)', fontSize: '0.9rem', boxSizing: 'border-box' };
  const labelStyle: React.CSSProperties = { display: 'block', fontSize: '0.85rem', fontWeight: '600', marginBottom: '0.375rem' };

  return (
    <ProtectedPageShell>
      <div style={{ maxWidth: '560px', margin: '0 auto' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem' }}>
          <Link href={`/groups/${group.slug}`} style={{ color: 'var(--embr-muted-text)', textDecoration: 'none', fontSize: '0.875rem' }}>← {group.name}</Link>
        </div>

        <h1 style={{ margin: '0 0 2rem', fontSize: '1.25rem', fontWeight: '800' }}>Group Settings</h1>

        <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', marginBottom: '3rem' }}>
          <div>
            <label style={labelStyle}>Group Name</label>
            <input style={inputStyle} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
          </div>
          <div>
            <label style={labelStyle}>Description</label>
            <textarea style={{ ...inputStyle, minHeight: '100px', resize: 'vertical' }} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          </div>
          <div>
            <label style={labelStyle}>Privacy</label>
            <select style={inputStyle} value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>
              <option value="PUBLIC">Public</option>
              <option value="PRIVATE">Private</option>
              <option value="SECRET">Secret</option>
            </select>
          </div>

          {error && <div style={{ padding: '0.75rem', borderRadius: 'var(--embr-radius-md)', background: '#fef2f2', color: '#dc2626', fontSize: '0.875rem' }}>{error}</div>}
          {saved && <div style={{ padding: '0.75rem', borderRadius: 'var(--embr-radius-md)', background: '#f0fdf4', color: '#16a34a', fontSize: '0.875rem' }}>Settings saved!</div>}

          <button type="submit" disabled={loading} style={{ padding: '0.625rem 1.5rem', borderRadius: 'var(--embr-radius-md)', border: 'none', background: 'var(--embr-accent)', color: '#fff', fontWeight: '700', cursor: 'pointer', alignSelf: 'flex-start', opacity: loading ? 0.7 : 1 }}>
            {loading ? 'Saving...' : 'Save Changes'}
          </button>
        </form>

        <div style={{ borderTop: '1px solid var(--embr-border)', paddingTop: '2rem' }}>
          <h2 style={{ margin: '0 0 0.75rem', fontSize: '1rem', fontWeight: '700', color: '#ef4444' }}>Danger Zone</h2>
          <p style={{ margin: '0 0 1rem', fontSize: '0.875rem', color: 'var(--embr-muted-text)' }}>
            Permanently delete this group and all its content. This cannot be undone.
          </p>
          {!showDeleteConfirm ? (
            <button onClick={() => setShowDeleteConfirm(true)} style={{ padding: '0.5rem 1.25rem', borderRadius: 'var(--embr-radius-md)', border: '2px solid #ef4444', background: 'transparent', color: '#ef4444', cursor: 'pointer', fontWeight: '700', fontSize: '0.875rem' }}>
              Delete Group
            </button>
          ) : (
            <div style={{ padding: '1rem', borderRadius: 'var(--embr-radius-md)', border: '1px solid #ef4444', background: '#fef2f2' }}>
              <p style={{ margin: '0 0 1rem', fontSize: '0.875rem', color: '#dc2626', fontWeight: '600' }}>
                Are you sure you want to delete "{group.name}" permanently? This cannot be undone.
              </p>
              {deleteError && (
                <p style={{ margin: '0 0 0.75rem', fontSize: '0.875rem', color: '#dc2626' }}>{deleteError}</p>
              )}
              <div style={{ display: 'flex', gap: '0.75rem' }}>
                <button onClick={() => { setShowDeleteConfirm(false); setDeleteError(''); }} style={{ padding: '0.5rem 1.25rem', borderRadius: 'var(--embr-radius-md)', border: '1px solid var(--embr-border)', background: 'transparent', cursor: 'pointer', fontWeight: '600', fontSize: '0.875rem' }}>
                  Cancel
                </button>
                <button onClick={handleDelete} style={{ padding: '0.5rem 1.25rem', borderRadius: 'var(--embr-radius-md)', border: 'none', background: '#ef4444', color: '#fff', cursor: 'pointer', fontWeight: '700', fontSize: '0.875rem' }}>
                  Yes, Delete Group
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </ProtectedPageShell>
  );
}
