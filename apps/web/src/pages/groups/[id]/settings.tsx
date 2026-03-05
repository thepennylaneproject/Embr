import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import { ProtectedPageShell } from '@/components/layout';
import { useGroups } from '@/hooks/useGroups';
import { useAuth } from '@/contexts/AuthContext';
import { PageState } from '@/components/ui/PageState';
import type { Group } from '@embr/types';
import { groupsApi } from '@shared/api/groups.api';

export default function GroupSettingsPage() {
  const router = useRouter();
  const { id } = router.query;
  const { user } = useAuth();
  const { updateGroup, deleteGroup, loading } = useGroups();

  const [group, setGroup] = useState<Group | null>(null);
  const [pageLoading, setPageLoading] = useState(true);
  const [form, setForm] = useState({ name: '', description: '', type: '', category: '' });
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');

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
    if (!group || !confirm(`Delete "${group.name}" permanently? This cannot be undone.`)) return;
    try {
      await deleteGroup(group.id);
      router.push('/groups');
    } catch (e: any) {
      alert(e.response?.data?.message || 'Failed to delete group');
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
          <button onClick={handleDelete} style={{ padding: '0.5rem 1.25rem', borderRadius: 'var(--embr-radius-md)', border: '2px solid #ef4444', background: 'transparent', color: '#ef4444', cursor: 'pointer', fontWeight: '700', fontSize: '0.875rem' }}>
            Delete Group
          </button>
        </div>
      </div>
    </ProtectedPageShell>
  );
}
