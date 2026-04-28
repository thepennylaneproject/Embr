import React, { useState, useRef } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import { ProtectedPageShell } from '@/components/layout';
import { Button, Input, TextArea, useToast } from '@embr/ui';
import { Music, Upload, X, Image } from 'lucide-react';
import apiClient from '@/lib/api/client';
import { getMusicGateServerSideProps } from '@/lib/musicGate';

export const getServerSideProps = getMusicGateServerSideProps;

const GENRES = [
  'Hip-Hop', 'R&B', 'Pop', 'Electronic', 'House', 'Techno', 'Trap',
  'Lo-Fi', 'Jazz', 'Soul', 'Rock', 'Indie', 'Ambient', 'Classical',
  'Reggaeton', 'Afrobeats', 'Gospel', 'Country', 'Other',
];

const KEYS = [
  'C Major', 'C Minor', 'C# Major', 'C# Minor',
  'D Major', 'D Minor', 'D# Major', 'D# Minor',
  'E Major', 'E Minor',
  'F Major', 'F Minor', 'F# Major', 'F# Minor',
  'G Major', 'G Minor', 'G# Major', 'G# Minor',
  'A Major', 'A Minor', 'A# Major', 'A# Minor',
  'B Major', 'B Minor',
];

const LICENSING_OPTIONS = [
  { value: 'free', label: 'Free', description: 'Anyone can use your track at no cost' },
  { value: 'commercial', label: 'Commercial', description: 'Creators pay a fee to use your track in monetized content' },
  { value: 'exclusive', label: 'Exclusive', description: 'One buyer gets exclusive rights to use your track' },
  { value: 'restricted', label: 'Restricted', description: 'Track is not available for licensing by others' },
];

interface UploadFormData {
  title: string;
  genre: string;
  bpm: string;
  key: string;
  description: string;
  licensingModel: string;
  price: string;
  allowRemix: boolean;
  allowMonetize: boolean;
  attributionRequired: boolean;
}

export default function MusicUploadPage() {
  const router = useRouter();
  const { trackId } = router.query; // present when editing
  const isEditing = Boolean(trackId);
  const { showToast } = useToast();

  const audioInputRef = useRef<HTMLInputElement>(null);
  const coverInputRef = useRef<HTMLInputElement>(null);

  const [formData, setFormData] = useState<UploadFormData>({
    title: '',
    genre: 'Hip-Hop',
    bpm: '',
    key: 'C Major',
    description: '',
    licensingModel: 'free',
    price: '0',
    allowRemix: false,
    allowMonetize: true,
    attributionRequired: false,
  });

  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [coverPreview, setCoverPreview] = useState('');
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');

  const handleAudioChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('audio/')) {
      setError('Please upload an audio file (MP3, WAV, FLAC, etc.)');
      return;
    }
    setAudioFile(file);
    setError('');
  };

  const handleCoverChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setError('Please upload an image file for cover art');
      return;
    }
    setCoverFile(file);
    const reader = new FileReader();
    reader.onloadend = () => setCoverPreview(reader.result as string);
    reader.readAsDataURL(file);
    setError('');
  };

  const handleSubmit = async (e: React.FormEvent, publish = false) => {
    e.preventDefault();
    setError('');

    if (!isEditing && !audioFile) {
      setError('Please select an audio file to upload');
      return;
    }

    if (!formData.title.trim()) {
      setError('Track title is required');
      return;
    }

    setUploading(true);

    try {
      const body = new FormData();
      body.append('title', formData.title);
      body.append('genre', formData.genre);
      body.append('description', formData.description);
      body.append('licensingModel', formData.licensingModel);
      const priceInCents = Math.round(parseFloat(formData.price || '0') * 100);
      body.append('price', String(priceInCents));
      body.append('allowRemix', String(formData.allowRemix));
      body.append('allowMonetize', String(formData.allowMonetize));
      body.append('attributionRequired', String(formData.attributionRequired));
      if (formData.bpm) body.append('bpm', formData.bpm);
      if (formData.key) body.append('key', formData.key);
      if (audioFile) body.append('audio', audioFile);
      if (coverFile) body.append('coverArt', coverFile);
      if (publish) body.append('publish', 'true');

      let track: any;
      if (isEditing) {
        const { data } = await apiClient.patch(`/music/tracks/${trackId}`, body, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
        track = data;
        showToast({ title: 'Track updated!', kind: 'info' });
      } else {
        const { data } = await apiClient.post('/music/tracks', body, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
        track = data;
        showToast({
          title: publish ? 'Track published!' : 'Track saved as draft',
          description: publish ? 'Your track is now live on Embr.' : 'You can publish it any time from your dashboard.',
          kind: 'info',
        });
      }

      await router.push(`/music/artist/${track.artistId || track.artist?.id}`);
    } catch (err: any) {
      const msg = err.response?.data?.message || err.message || 'Upload failed';
      setError(msg);
      showToast({ title: 'Upload failed', description: msg, kind: 'error' });
    } finally {
      setUploading(false);
    }
  };

  return (
    <ProtectedPageShell>
      <div style={{ maxWidth: '700px', margin: '0 auto' }}>
        {/* Page header */}
        <div style={{ marginBottom: '2rem' }}>
          <h1 style={{ margin: '0 0 0.3rem', fontWeight: '700', fontSize: '1.6rem' }}>
            {isEditing ? 'Edit Track' : 'Upload a Track'}
          </h1>
          <p style={{ margin: 0, color: 'var(--embr-muted-text)' }}>
            {isEditing ? 'Update your track details.' : 'Share your music with creators on Embr.'}
          </p>
        </div>

        {error && (
          <div style={{
            marginBottom: '1.5rem', padding: '0.875rem 1rem',
            borderRadius: 'var(--embr-radius-md)',
            border: '1px solid var(--embr-error)',
            background: 'color-mix(in srgb, var(--embr-error) 10%, white)',
            color: 'var(--embr-error)', fontSize: '0.9rem',
          }}>
            {error}
          </div>
        )}

        <form onSubmit={(e) => handleSubmit(e, false)} style={{ display: 'grid', gap: '1.5rem' }}>
          {/* Audio File */}
          {!isEditing && (
            <div className="ui-card" data-padding="lg">
              <h2 style={{ margin: '0 0 1rem', fontSize: '1rem', fontWeight: '600' }}>Audio File *</h2>
              <input
                ref={audioInputRef}
                type="file"
                accept="audio/*"
                onChange={handleAudioChange}
                style={{ display: 'none' }}
              />
              {audioFile ? (
                <div style={{
                  display: 'flex', alignItems: 'center', gap: '0.75rem',
                  padding: '0.875rem', borderRadius: 'var(--embr-radius-md)',
                  background: 'color-mix(in srgb, var(--embr-accent) 8%, white)',
                  border: '1px solid var(--embr-accent)',
                }}>
                  <Music size={20} style={{ color: 'var(--embr-accent)', flexShrink: 0 }} />
                  <div style={{ flex: 1, overflow: 'hidden' }}>
                    <div style={{ fontWeight: '600', fontSize: '0.9rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{audioFile.name}</div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--embr-muted-text)' }}>{(audioFile.size / (1024 * 1024)).toFixed(1)} MB</div>
                  </div>
                  <button type="button" onClick={() => setAudioFile(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '0.25rem' }}>
                    <X size={18} style={{ color: 'var(--embr-muted-text)' }} />
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => audioInputRef.current?.click()}
                  style={{
                    width: '100%', padding: '2rem', borderRadius: 'var(--embr-radius-md)',
                    border: '2px dashed var(--embr-border)', background: 'none',
                    cursor: 'pointer', display: 'flex', flexDirection: 'column',
                    alignItems: 'center', gap: '0.75rem', color: 'var(--embr-muted-text)',
                    transition: 'border-color 0.2s',
                  }}
                  onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.borderColor = 'var(--embr-accent)'; }}
                  onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.borderColor = 'var(--embr-border)'; }}
                >
                  <Upload size={28} />
                  <span style={{ fontWeight: '600', fontSize: '0.95rem' }}>Click to select audio file</span>
                  <span style={{ fontSize: '0.8rem' }}>MP3, WAV, FLAC, AIFF supported</span>
                </button>
              )}
            </div>
          )}

          {/* Cover Art */}
          <div className="ui-card" data-padding="lg">
            <h2 style={{ margin: '0 0 1rem', fontSize: '1rem', fontWeight: '600' }}>Cover Art</h2>
            <input
              ref={coverInputRef}
              type="file"
              accept="image/*"
              onChange={handleCoverChange}
              style={{ display: 'none' }}
            />
            <div style={{ display: 'flex', gap: '1rem', alignItems: 'flex-start' }}>
              <div
                onClick={() => coverInputRef.current?.click()}
                style={{
                  width: '120px', height: '120px', borderRadius: 'var(--embr-radius-md)',
                  border: '2px dashed var(--embr-border)', overflow: 'hidden',
                  cursor: 'pointer', flexShrink: 0, display: 'flex',
                  alignItems: 'center', justifyContent: 'center',
                  background: coverPreview ? 'none' : 'var(--embr-bg)',
                }}
              >
                {coverPreview ? (
                  <img src={coverPreview} alt="Cover" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                ) : (
                  <Image size={28} style={{ color: 'var(--embr-muted-text)' }} />
                )}
              </div>
              <div style={{ flex: 1 }}>
                <Button type="button" variant="secondary" onClick={() => coverInputRef.current?.click()}>
                  {coverPreview ? 'Change Cover Art' : 'Upload Cover Art'}
                </Button>
                <p style={{ margin: '0.5rem 0 0', fontSize: '0.8rem', color: 'var(--embr-muted-text)' }}>
                  Square image recommended (1000×1000px minimum). JPG, PNG supported.
                </p>
              </div>
            </div>
          </div>

          {/* Track Details */}
          <div className="ui-card" data-padding="lg" style={{ display: 'grid', gap: '1.2rem' }}>
            <h2 style={{ margin: 0, fontSize: '1rem', fontWeight: '600' }}>Track Details</h2>

            <Input
              id="title"
              label="Title *"
              placeholder="e.g., Summer Vibes"
              value={formData.title}
              onChange={(e) => setFormData((p) => ({ ...p, title: e.target.value }))}
              required
            />

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '0.4rem', fontWeight: '600', fontSize: '0.9rem' }}>Genre</label>
                <select
                  value={formData.genre}
                  onChange={(e) => setFormData((p) => ({ ...p, genre: e.target.value }))}
                  className="ui-field"
                  style={{ width: '100%' }}
                >
                  {GENRES.map((g) => <option key={g} value={g}>{g}</option>)}
                </select>
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '0.4rem', fontWeight: '600', fontSize: '0.9rem' }}>Key</label>
                <select
                  value={formData.key}
                  onChange={(e) => setFormData((p) => ({ ...p, key: e.target.value }))}
                  className="ui-field"
                  style={{ width: '100%' }}
                >
                  {KEYS.map((k) => <option key={k} value={k}>{k}</option>)}
                </select>
              </div>
            </div>

            <Input
              id="bpm"
              label="BPM"
              type="number"
              placeholder="e.g., 120"
              value={formData.bpm}
              onChange={(e) => setFormData((p) => ({ ...p, bpm: e.target.value }))}
              hint="Beats per minute — helps creators match tempo"
            />

            <TextArea
              id="description"
              label="Description"
              placeholder="Describe the vibe, story, or inspiration behind this track..."
              value={formData.description}
              onChange={(e) => setFormData((p) => ({ ...p, description: e.target.value }))}
              maxLength={1000}
              hint={`${formData.description.length}/1000`}
            />
          </div>

          {/* Licensing */}
          <div className="ui-card" data-padding="lg" style={{ display: 'grid', gap: '1rem' }}>
            <h2 style={{ margin: 0, fontSize: '1rem', fontWeight: '600' }}>Licensing</h2>

            <div style={{ display: 'grid', gap: '0.6rem' }}>
              {LICENSING_OPTIONS.map((opt) => (
                <label
                  key={opt.value}
                  style={{
                    display: 'flex', alignItems: 'flex-start', gap: '0.75rem',
                    padding: '0.875rem', borderRadius: 'var(--embr-radius-md)',
                    border: `2px solid ${formData.licensingModel === opt.value ? 'var(--embr-accent)' : 'var(--embr-border)'}`,
                    background: formData.licensingModel === opt.value ? 'color-mix(in srgb, var(--embr-accent) 6%, white)' : 'none',
                    cursor: 'pointer', transition: 'all 0.15s',
                  }}
                >
                  <input
                    type="radio"
                    name="licensingModel"
                    value={opt.value}
                    checked={formData.licensingModel === opt.value}
                    onChange={() => setFormData((p) => ({ ...p, licensingModel: opt.value }))}
                    style={{ marginTop: '2px', accentColor: 'var(--embr-accent)' }}
                  />
                  <div>
                    <div style={{ fontWeight: '600', fontSize: '0.9rem' }}>{opt.label}</div>
                    <div style={{ fontSize: '0.82rem', color: 'var(--embr-muted-text)', marginTop: '0.15rem' }}>{opt.description}</div>
                  </div>
                </label>
              ))}
            </div>

            {(formData.licensingModel === 'commercial' || formData.licensingModel === 'exclusive') && (
              <Input
                id="price"
                label="License Price (USD)"
                type="number"
                placeholder="e.g., 25"
                value={formData.price}
                onChange={(e) => setFormData((p) => ({ ...p, price: e.target.value }))}
                hint="Set the price creators pay to license this track"
              />
            )}

            {formData.licensingModel !== 'restricted' && (
              <div style={{ display: 'grid', gap: '0.75rem', paddingTop: '0.25rem' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', cursor: 'pointer', fontSize: '0.9rem' }}>
                  <input
                    type="checkbox"
                    checked={formData.allowRemix}
                    onChange={(e) => setFormData((p) => ({ ...p, allowRemix: e.target.checked }))}
                    style={{ accentColor: 'var(--embr-accent)' }}
                  />
                  Allow remixes and derivative works
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', cursor: 'pointer', fontSize: '0.9rem' }}>
                  <input
                    type="checkbox"
                    checked={formData.allowMonetize}
                    onChange={(e) => setFormData((p) => ({ ...p, allowMonetize: e.target.checked }))}
                    style={{ accentColor: 'var(--embr-accent)' }}
                  />
                  Allow use in monetized content
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', cursor: 'pointer', fontSize: '0.9rem' }}>
                  <input
                    type="checkbox"
                    checked={formData.attributionRequired}
                    onChange={(e) => setFormData((p) => ({ ...p, attributionRequired: e.target.checked }))}
                    style={{ accentColor: 'var(--embr-accent)' }}
                  />
                  Require attribution/credit
                </label>
              </div>
            )}
          </div>

          {/* Actions */}
          <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', justifyContent: 'flex-end', paddingBottom: '2rem' }}>
            <Link href="/music">
              <Button type="button" variant="secondary" disabled={uploading}>
                Cancel
              </Button>
            </Link>
            {!isEditing && (
              <Button type="submit" variant="secondary" disabled={uploading}>
                {uploading ? 'Saving...' : 'Save as Draft'}
              </Button>
            )}
            <Button
              type="button"
              disabled={uploading}
              onClick={(e: React.MouseEvent) => handleSubmit(e as any, true)}
            >
              {uploading ? 'Uploading...' : isEditing ? 'Save Changes' : 'Upload & Publish'}
            </Button>
          </div>
        </form>
      </div>
    </ProtectedPageShell>
  );
}
