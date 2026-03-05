import React, { useState, useEffect, useCallback } from 'react';
import { Input } from '@embr/ui';
import apiClient from '@/lib/api/client';

interface Track {
  id: string;
  title: string;
  artistName: string;
  duration: number;
  imageUrl?: string;
}

interface MusicSelectorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (track: Track) => void;
  selectedTrackId?: string;
}

/**
 * Music Selector Modal
 * Allows users to search and select tracks to add to posts
 */
export const MusicSelectorModal: React.FC<MusicSelectorModalProps> = ({
  isOpen,
  onClose,
  onSelect,
  selectedTrackId,
}) => {
  const [search, setSearch] = useState('');
  const [tracks, setTracks] = useState<Track[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Search for tracks (or load popular on empty query)
  const searchTracks = useCallback(async (query: string) => {
    setLoading(true);
    setError('');

    try {
      const url = query.trim()
        ? `/music/search?q=${encodeURIComponent(query)}&limit=30`
        : `/music/tracks?limit=30&sort=popular`;
      const { data } = await apiClient.get(url);
      setTracks(Array.isArray(data) ? data : data.data || data.tracks || []);
    } catch (err) {
      setError('Failed to search tracks. Try again.');
      setTracks([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!isOpen) return;
    const timer = setTimeout(() => {
      searchTracks(search);
    }, search ? 300 : 0);

    return () => clearTimeout(timer);
  }, [search, searchTracks, isOpen]);

  if (!isOpen) return null;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(41, 50, 65, 0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 40,
        padding: '1rem',
      }}
      onClick={onClose}
    >
      <div
        className="ui-card"
        data-padding="lg"
        style={{
          width: 'min(500px, 100%)',
          maxHeight: '80vh',
          overflow: 'auto',
          backgroundColor: 'color-mix(in srgb, var(--embr-bg) 92%, white)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <h2 style={{ margin: 0, fontSize: '1.2rem', fontWeight: '700' }}>
            🎵 Add Music to Post
          </h2>
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              fontSize: '1.5rem',
              cursor: 'pointer',
              padding: 0,
            }}
          >
            ✕
          </button>
        </div>

        <Input
          placeholder="Search tracks, artists..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          autoFocus
          style={{ marginBottom: '1rem' }}
        />

        {error && (
          <div
            style={{
              padding: '0.75rem',
              backgroundColor: 'color-mix(in srgb, var(--embr-error) 15%, white)',
              border: '1px solid var(--embr-error)',
              borderRadius: 'var(--embr-radius-md)',
              color: 'var(--embr-error)',
              fontSize: '0.9rem',
              marginBottom: '1rem',
            }}
          >
            {error}
          </div>
        )}

        {loading && (
          <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--embr-muted-text)' }}>
            Searching...
          </div>
        )}

        {!loading && search && tracks.length === 0 && (
          <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--embr-muted-text)' }}>
            No tracks found. Try a different search.
          </div>
        )}

        {!loading && !search && tracks.length === 0 && (
          <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--embr-muted-text)' }}>
            No tracks available yet
          </div>
        )}

        {tracks.length > 0 && (
          <div style={{ display: 'grid', gap: '0.75rem' }}>
            {tracks.map((track) => (
              <button
                key={track.id}
                onClick={() => {
                  onSelect(track);
                  onClose();
                }}
                style={{
                  display: 'flex',
                  gap: '1rem',
                  alignItems: 'center',
                  padding: '0.75rem',
                  border: selectedTrackId === track.id ? '2px solid var(--embr-accent)' : '1px solid var(--embr-border)',
                  borderRadius: 'var(--embr-radius-md)',
                  backgroundColor: selectedTrackId === track.id ? 'color-mix(in srgb, var(--embr-accent) 12%, white)' : 'transparent',
                  cursor: 'pointer',
                  transition: 'all 120ms ease',
                  textAlign: 'left',
                  background: 'none',
                }}
                onMouseEnter={(e) => {
                  if (selectedTrackId !== track.id) {
                    (e.target as HTMLElement).style.backgroundColor = 'color-mix(in srgb, var(--embr-accent) 6%, white)';
                  }
                }}
                onMouseLeave={(e) => {
                  if (selectedTrackId !== track.id) {
                    (e.target as HTMLElement).style.backgroundColor = 'transparent';
                  }
                }}
              >
                {track.imageUrl && (
                  <img
                    src={track.imageUrl}
                    alt={track.title}
                    style={{
                      width: '50px',
                      height: '50px',
                      borderRadius: 'var(--embr-radius-sm)',
                      objectFit: 'cover',
                      flexShrink: 0,
                    }}
                  />
                )}
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: '600', color: 'var(--embr-text)' }}>
                    {track.title}
                  </div>
                  <div style={{ fontSize: '0.9rem', color: 'var(--embr-muted-text)' }}>
                    {track.artistName}
                  </div>
                </div>
                {selectedTrackId === track.id && (
                  <div style={{ color: 'var(--embr-accent)', fontWeight: '700' }}>
                    ✓
                  </div>
                )}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
