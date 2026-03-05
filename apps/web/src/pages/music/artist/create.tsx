import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { useAuth } from '@/contexts/AuthContext';
import { ProtectedPageShell } from '@/components/layout';
import { Button, Input, TextArea, useToast } from '@embr/ui';
import apiClient from '@/lib/api/client';

export default function CreateArtistPage() {
  const router = useRouter();
  const { user: _user } = useAuth();
  const { showToast } = useToast();

  const [formData, setFormData] = useState({
    stageName: '',
    bio: '',
    profileImage: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [imagePreview, setImagePreview] = useState('');

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Create preview
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
        setFormData((prev) => ({ ...prev, profileImage: reader.result as string }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      // Validate
      if (!formData.stageName.trim()) {
        throw new Error('Stage name is required');
      }

      // Call API to create artist
      const { data: artist } = await apiClient.post('/music/artists', {
        stageName: formData.stageName,
        bio: formData.bio,
        profileImage: formData.profileImage,
      });

      showToast({
        title: 'Artist profile created!',
        description: `Welcome to Embr, ${formData.stageName}!`,
        kind: 'info',
      });

      // Redirect to artist dashboard
      await router.push(`/music/artist/${artist.id}`);
    } catch (err: any) {
      const message = err.response?.data?.message || err.message || 'Failed to create artist profile';
      setError(message);
      showToast({
        title: 'Error',
        description: message,
        kind: 'error',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <ProtectedPageShell
      title="Become an Artist"
      subtitle="Create your artist profile and start sharing music."
      breadcrumbs={[{ label: 'Music', href: '/music' }, { label: 'Create Artist' }]}
      accent="sun"
    >
      <div style={{ maxWidth: '600px', margin: '0 auto' }}>
        <div className="ui-card" data-padding="lg">
          {error && (
            <div
              style={{
                marginBottom: '1rem',
                padding: '0.75rem',
                borderRadius: 'var(--embr-radius-md)',
                border: '1px solid var(--embr-error)',
                backgroundColor: 'color-mix(in srgb, var(--embr-error) 15%, white)',
                color: 'var(--embr-error)',
                fontSize: '0.9rem',
              }}
            >
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} style={{ display: 'grid', gap: '1.2rem' }}>
            {/* Profile Image */}
            <div>
              <label
                htmlFor="profileImage"
                style={{
                  display: 'block',
                  marginBottom: '0.5rem',
                  fontWeight: '600',
                  fontSize: '0.95rem',
                }}
              >
                Profile Image
              </label>
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: imagePreview ? '1fr 1fr' : '1fr',
                  gap: '1rem',
                  alignItems: 'start',
                }}
              >
                <input
                  id="profileImage"
                  type="file"
                  accept="image/*"
                  onChange={handleImageChange}
                  className="ui-field"
                  style={{ padding: '0.6rem' }}
                />
                {imagePreview && (
                  <div
                    style={{
                      width: '120px',
                      height: '120px',
                      borderRadius: '999px',
                      overflow: 'hidden',
                      border: '2px solid var(--embr-border)',
                    }}
                  >
                    <img
                      src={imagePreview}
                      alt="Preview"
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    />
                  </div>
                )}
              </div>
              <p
                style={{
                  marginTop: '0.4rem',
                  fontSize: '0.85rem',
                  color: 'var(--embr-muted-text)',
                }}
              >
                Square image recommended (500x500px minimum)
              </p>
            </div>

            {/* Stage Name */}
            <Input
              id="stageName"
              label="Stage Name"
              placeholder="Your artist name or band name"
              value={formData.stageName}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, stageName: e.target.value }))
              }
              required
            />

            {/* Bio */}
            <TextArea
              id="bio"
              label="Bio"
              placeholder="Tell people about your music, style, and inspiration..."
              value={formData.bio}
              onChange={(e) => setFormData((prev) => ({ ...prev, bio: e.target.value }))}
              maxLength={500}
              hint={`${formData.bio.length}/500 characters`}
            />

            {/* Submit */}
            <div style={{ display: 'flex', gap: '0.6rem', flexWrap: 'wrap', marginTop: '0.5rem' }}>
              <Button type="submit" disabled={loading}>
                {loading ? 'Creating artist profile...' : 'Create Artist Profile'}
              </Button>
              <Link href="/music">
                <Button type="button" variant="secondary" disabled={loading}>
                  Cancel
                </Button>
              </Link>
            </div>
          </form>

          {/* Info Box */}
          <div
            style={{
              marginTop: '2rem',
              padding: '1rem',
              borderRadius: 'var(--embr-radius-md)',
              backgroundColor: 'color-mix(in srgb, var(--embr-sun) 12%, white)',
              border: '1px solid var(--embr-border)',
            }}
          >
            <h3 style={{ margin: '0 0 0.5rem 0', fontSize: '0.95rem', fontWeight: '600' }}>
              What happens next?
            </h3>
            <ul
              style={{
                margin: '0.5rem 0 0 0',
                paddingLeft: '1.2rem',
                color: 'var(--embr-muted-text)',
                fontSize: '0.9rem',
                lineHeight: '1.6',
              }}
            >
              <li>Upload and publish your music</li>
              <li>Set licensing options for your tracks</li>
              <li>Earn money when creators use your music</li>
              <li>Track streams, usage, and revenue</li>
              <li>Build your fanbase</li>
            </ul>
          </div>
        </div>

        {/* Already an artist? */}
        <div style={{ textAlign: 'center', marginTop: '2rem', color: 'var(--embr-muted-text)' }}>
          <p style={{ fontSize: '0.9rem' }}>
            Already have an artist profile?{' '}
            <Link
              href="/music"
              style={{
                color: 'var(--embr-accent)',
                textDecoration: 'underline',
                fontWeight: '600',
              }}
            >
              Go to music discovery
            </Link>
          </p>
        </div>
      </div>
    </ProtectedPageShell>
  );
}
