import React, { useState } from 'react';
import { Search, Play, Heart, Share2, Lock, Unlock } from 'lucide-react';
import { useSearchTracks } from '../hooks/useMusic';

interface TrackDiscoveryProps {
  onTrackSelect?: (trackId: string) => void;
  onUseTrack?: (trackId: string) => void;
}

/**
 * Track Discovery Component
 * Search, browse, and discover music
 */
export const TrackDiscovery: React.FC<TrackDiscoveryProps> = ({ onTrackSelect, onUseTrack }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const { results, loading, search } = useSearchTracks(searchQuery, 50);

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    const query = e.target.value;
    setSearchQuery(query);
  };

  const getLicensingBadge = (licensingModel: string) => {
    const styles: Record<string, { bg: string; text: string; icon: React.ReactNode }> = {
      restricted: { bg: 'bg-red-900', text: 'text-red-100', icon: <Lock size={12} /> },
      free: { bg: 'bg-blue-900', text: 'text-blue-100', icon: <Unlock size={12} /> },
      commercial: { bg: 'bg-green-900', text: 'text-green-100', icon: <Unlock size={12} /> },
      exclusive: { bg: 'bg-purple-900', text: 'text-purple-100', icon: <Lock size={12} /> },
    };
    return styles[licensingModel] || styles.restricted;
  };

  return (
    <div className="w-full max-w-6xl mx-auto p-6">
      {/* Search Header */}
      <div className="mb-8">
        <h1 className="text-4xl font-bold mb-6 bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
          Discover Music
        </h1>

        {/* Search Bar */}
        <div className="relative">
          <Search className="absolute left-4 top-3 text-slate-400" size={20} />
          <input
            type="text"
            placeholder="Search tracks, artists, genres..."
            value={searchQuery}
            onChange={handleSearch}
            className="w-full pl-12 pr-4 py-3 bg-slate-800 border border-slate-700 rounded-lg focus:outline-none focus:border-purple-500 text-white placeholder-slate-400 transition"
          />
        </div>
      </div>

      {/* Results */}
      {loading && searchQuery && (
        <div className="text-center py-12">
          <div className="inline-block animate-spin">
            <div className="w-8 h-8 border-4 border-slate-700 border-t-purple-600 rounded-full" />
          </div>
          <p className="text-slate-400 mt-4">Searching...</p>
        </div>
      )}

      {!loading && searchQuery && results.length === 0 && (
        <div className="text-center py-12 text-slate-400">
          <p className="text-lg">No tracks found</p>
          <p className="text-sm">Try searching with different keywords</p>
        </div>
      )}

      {!searchQuery && (
        <div className="text-center py-12 text-slate-400">
          <p className="text-lg">Start searching to discover amazing music</p>
        </div>
      )}

      {/* Track Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {results.map((track: any) => {
          const licensing = getLicensingBadge(track.licensingModel);

          return (
            <div
              key={track.id}
              className="bg-slate-800 border border-slate-700 rounded-lg overflow-hidden hover:border-purple-500 transition group"
            >
              {/* Album Art */}
              <div className="relative aspect-square bg-slate-900 overflow-hidden">
                {track.videoThumbnailUrl && (
                  <img
                    src={track.videoThumbnailUrl}
                    alt={track.title}
                    className="w-full h-full object-cover group-hover:scale-110 transition"
                  />
                )}
                <div className="absolute inset-0 bg-black/40 group-hover:bg-black/20 transition flex items-center justify-center">
                  <button
                    onClick={() => onTrackSelect?.(track.id)}
                    className="bg-purple-600 hover:bg-purple-700 p-3 rounded-full transform scale-0 group-hover:scale-100 transition"
                  >
                    <Play size={24} fill="white" />
                  </button>
                </div>

                {/* Licensing Badge */}
                <div className={`absolute top-2 right-2 ${licensing.bg} ${licensing.text} px-2 py-1 rounded-full text-xs font-semibold flex items-center gap-1`}>
                  {licensing.icon}
                  {track.licensingModel.charAt(0).toUpperCase() + track.licensingModel.slice(1)}
                </div>

                {/* Used Count */}
                <div className="absolute bottom-2 left-2 bg-black/60 text-white text-xs px-2 py-1 rounded-full">
                  Used {track.usedInCount} times
                </div>
              </div>

              {/* Track Info */}
              <div className="p-4">
                <h3 className="font-bold text-white truncate mb-1">{track.title}</h3>
                <p className="text-sm text-slate-400 truncate mb-4">
                  {track.artist?.stageName || 'Unknown Artist'}
                  {track.artist?.isVerified && <span className="ml-1">✓</span>}
                </p>

                {/* Stats */}
                <div className="flex gap-4 text-xs text-slate-400 mb-4 border-t border-slate-700 pt-3">
                  <div>
                    <div className="font-semibold text-white">{(track.streams / 1000000).toFixed(1)}M</div>
                    <div>Streams</div>
                  </div>
                  <div>
                    <div className="font-semibold text-white">{(track.downloads / 1000).toFixed(0)}K</div>
                    <div>Downloads</div>
                  </div>
                  <div>
                    <div className="font-semibold text-white">{(track.likeCount / 1000).toFixed(0)}K</div>
                    <div>Likes</div>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex gap-2">
                  <button className="flex-1 bg-slate-700 hover:bg-slate-600 px-3 py-2 rounded-lg text-sm font-semibold transition flex items-center justify-center gap-2">
                    <Heart size={16} />
                    Like
                  </button>
                  {track.licensingModel !== 'restricted' && (
                    <button
                      onClick={() => onUseTrack?.(track.id)}
                      className="flex-1 bg-purple-600 hover:bg-purple-700 px-3 py-2 rounded-lg text-sm font-semibold text-white transition flex items-center justify-center gap-2"
                    >
                      <Unlock size={16} />
                      Use
                    </button>
                  )}
                  <button className="flex-1 bg-slate-700 hover:bg-slate-600 px-3 py-2 rounded-lg text-sm font-semibold transition flex items-center justify-center gap-2">
                    <Share2 size={16} />
                    Share
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default TrackDiscovery;
