import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { useAuth } from '@/contexts/AuthContext';
import { usersApi } from '@/lib/api/users';
import ProtectedRoute from '@/components/auth/auth/ProtectedRoute';
import { AppShell } from '@/components/layout/AppShell';
import { Button, Card, Input, PageState, TextArea, useToast } from '@/components/ui';

export default function EditProfilePage() {
  const { user, updateUser } = useAuth();
  const { showToast } = useToast();
  const router = useRouter();

  const [formData, setFormData] = useState({ displayName: '', bio: '', website: '', location: '' });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (user?.profile) {
      setFormData({
        displayName: user.profile.displayName || '',
        bio: user.profile.bio || '',
        website: user.profile.website || '',
        location: user.profile.location || '',
      });
    }
  }, [user]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError('');
    setSaving(true);

    try {
      const updatedUser = await usersApi.updateProfile(formData);
      updateUser(updatedUser);
      showToast({
        title: 'Profile saved',
        description: 'Your profile details were updated.',
        kind: 'info',
      });
      await router.push('/profile');
    } catch (err: any) {
      const message = err.response?.data?.message || 'Failed to update profile.';
      setError(message);
      showToast({ title: 'Save failed', description: message, kind: 'error' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <ProtectedRoute>
      <AppShell title="Edit Profile" subtitle="Update the information shown on your public profile." accent="warm2">
        {!user ? (
          <Card padding="lg">
            <PageState title="Loading profile" description="Fetching your current profile values." />
          </Card>
        ) : (
          <Card padding="lg" style={{ width: 'min(680px, 100%)' }}>
            <form onSubmit={handleSubmit} noValidate style={{ display: 'grid', gap: '0.95rem' }}>
              <Input
                id="displayName"
                label="Display name"
                value={formData.displayName}
                onChange={(event) => setFormData((prev) => ({ ...prev, displayName: event.target.value }))}
              />

              <TextArea
                id="bio"
                label="Bio"
                value={formData.bio}
                maxLength={500}
                hint={`${formData.bio.length}/500 characters`}
                onChange={(event) => setFormData((prev) => ({ ...prev, bio: event.target.value }))}
              />

              <Input
                id="website"
                label="Website"
                type="url"
                value={formData.website}
                onChange={(event) => setFormData((prev) => ({ ...prev, website: event.target.value }))}
              />

              <Input
                id="location"
                label="Location"
                value={formData.location}
                onChange={(event) => setFormData((prev) => ({ ...prev, location: event.target.value }))}
              />

              {error ? <p className="ui-error-text">{error}</p> : null}

              <div style={{ display: 'flex', gap: '0.6rem', flexWrap: 'wrap' }}>
                <Button type="submit" disabled={saving}>
                  {saving ? 'Saving...' : 'Save changes'}
                </Button>
                <Button type="button" variant="secondary" onClick={() => router.push('/profile')}>
                  Cancel
                </Button>
              </div>
            </form>
          </Card>
        )}
      </AppShell>
    </ProtectedRoute>
  );
}
