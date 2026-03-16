import { useState, useCallback, useEffect } from 'react';
import { useDebounce } from '@/hooks/useDebounce';

// ============================================
// TYPES FOR MUSIC API RESPONSES
// ============================================

export interface ArtistProfile {
  id?: string;
  profileImage?: string;
  stageName?: string;
  isVerified?: boolean;
  bio?: string;
  [key: string]: unknown;
}

export interface ArtistStats {
  totalTracks?: number;
  totalStreams?: number;
  totalUsages?: number;
  [key: string]: unknown;
}

export interface ArtistRevenueData {
  totalRevenue?: number;
  usages?: number;
  topUsages?: Array<{ creatorShare?: number; [key: string]: unknown }>;
  [key: string]: unknown;
}

export interface LicensingCheckResult {
  allowed?: boolean;
  reason?: string;
  licensingModel?: string;
  allowRemix?: boolean;
  allowMonetize?: boolean;
  attributionRequired?: boolean;
  [key: string]: unknown;
}

// ============================================
// CUSTOM HOOKS FOR MUSIC API
// ============================================

/**
 * Hook for managing artist profile
 */
export const useArtist = (artistId: string) => {
  const [artist, setArtist] = useState<ArtistProfile | null>(null);
  const [stats, setStats] = useState<ArtistStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchArtist = async () => {
      try {
        const response = await fetch(`/api/music/artists/${artistId}`);
        if (!response.ok) throw new Error('Failed to fetch artist');
        const data = await response.json();
        setArtist(data);
        setStats(data.stats);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setLoading(false);
      }
    };

    fetchArtist();
  }, [artistId]);

  return { artist, stats, loading, error };
};

/**
 * Hook for fetching artist's tracks
 */
export const useArtistTracks = (artistId: string) => {
  const [tracks, setTracks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchTracks = async () => {
      try {
        const response = await fetch(`/api/music/artists/${artistId}/tracks`);
        if (!response.ok) throw new Error('Failed to fetch tracks');
        const data = await response.json();
        setTracks(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setLoading(false);
      }
    };

    fetchTracks();
  }, [artistId]);

  return { tracks, loading, error };
};

/**
 * Hook for track details
 */
export const useTrack = (trackId: string) => {
  const [track, setTrack] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchTrack = async () => {
      try {
        const response = await fetch(`/api/music/tracks/${trackId}`);
        if (!response.ok) throw new Error('Failed to fetch track');
        const data = await response.json();
        setTrack(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setLoading(false);
      }
    };

    fetchTrack();
  }, [trackId]);

  return { track, loading, error };
};

/**
 * Hook for searching tracks (or loading featured tracks when no query is provided)
 */
export const useSearchTracks = (query: string, limit = 20) => {
  const [results, setResults] = useState<Record<string, unknown>[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Debounce the query so we don't fire a fetch on every keystroke
  const debouncedQuery = useDebounce(query, 300);

  const fetchTracks = useCallback(async (searchQuery: string) => {
    setLoading(true);
    try {
      const url = searchQuery.trim()
        ? `/api/music/search?q=${encodeURIComponent(searchQuery)}&limit=${limit}`
        : `/api/music/tracks?limit=${limit}&sort=popular`;
      const response = await fetch(url);
      if (!response.ok) throw new Error('Failed to fetch tracks');
      const data = await response.json();
      setResults(Array.isArray(data) ? data : data.data || data.tracks || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, [limit]);

  useEffect(() => {
    fetchTracks(debouncedQuery);
  }, [debouncedQuery, fetchTracks]);

  return { results, loading, error, search: fetchTracks };
};

/**
 * Hook for checking licensing
 */
export const useLicensing = (trackId: string, creatorId: string) => {
  const [licensing, setLicensing] = useState<LicensingCheckResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const checkLicensing = async () => {
      try {
        const response = await fetch(
          `/api/music/licensing/check?trackId=${trackId}&creatorId=${creatorId}`
        );
        if (!response.ok) throw new Error('Licensing check failed');
        const data = await response.json();
        setLicensing(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setLoading(false);
      }
    };

    if (trackId && creatorId) {
      checkLicensing();
    }
  }, [trackId, creatorId]);

  return { licensing, loading, error };
};

/**
 * Hook for recording music usage
 */
export const useRecordUsage = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const recordUsage = useCallback(
    async (trackId: string, contentType: string, contentId: string, creatorId: string) => {
      setLoading(true);
      try {
        const response = await fetch('/api/music/licensing/usage', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ trackId, contentType, contentId, creatorId }),
        });

        if (!response.ok) throw new Error('Failed to record usage');
        const data = await response.json();
        return data;
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Unknown error';
        setError(message);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    []
  );

  return { recordUsage, loading, error };
};

/**
 * Hook for recording stream plays
 */
export const useRecordStream = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const recordStream = useCallback(async (trackId: string, durationPlayed: number) => {
    setLoading(true);
    try {
      const response = await fetch('/api/music/stream', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          trackId,
          durationPlayed,
          quality: 'high',
        }),
      });

      if (!response.ok) throw new Error('Failed to record stream');
      return await response.json();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      setError(message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  return { recordStream, loading, error };
};

/**
 * Hook for track usage history
 */
export const useTrackUsageHistory = (trackId: string) => {
  const [usages, setUsages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchUsages = async () => {
      try {
        const response = await fetch(`/api/music/tracks/${trackId}/usages?limit=50`);
        if (!response.ok) throw new Error('Failed to fetch usages');
        const data = await response.json();
        setUsages(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setLoading(false);
      }
    };

    if (trackId) {
      fetchUsages();
    }
  }, [trackId]);

  return { usages, loading, error };
};

/**
 * Hook for revenue reports
 */
export const useArtistRevenue = (artistId: string, period: 'daily' | 'weekly' | 'monthly' = 'monthly') => {
  const [revenue, setRevenue] = useState<ArtistRevenueData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchRevenue = async () => {
      try {
        const response = await fetch(`/api/music/artists/${artistId}/revenue?period=${period}`);
        if (!response.ok) throw new Error('Failed to fetch revenue');
        const data = await response.json();
        setRevenue(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setLoading(false);
      }
    };

    if (artistId) {
      fetchRevenue();
    }
  }, [artistId, period]);

  return { revenue, loading, error };
};

/**
 * Hook for creator revenue (from using music)
 */
export const useCreatorRevenue = (
  creatorId: string,
  period: 'daily' | 'weekly' | 'monthly' = 'monthly'
) => {
  const [revenue, setRevenue] = useState<ArtistRevenueData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchRevenue = async () => {
      try {
        const response = await fetch(`/api/music/creators/${creatorId}/revenue?period=${period}`);
        if (!response.ok) throw new Error('Failed to fetch revenue');
        const data = await response.json();
        setRevenue(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setLoading(false);
      }
    };

    if (creatorId) {
      fetchRevenue();
    }
  }, [creatorId, period]);

  return { revenue, loading, error };
};
