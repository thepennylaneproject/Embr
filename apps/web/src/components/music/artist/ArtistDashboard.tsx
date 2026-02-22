import React, { useState } from 'react';
import { Upload, BarChart3, TrendingUp, Music, Users, DollarSign } from 'lucide-react';
import { useArtist, useArtistTracks, useArtistRevenue } from '../hooks/useMusic';

interface ArtistDashboardProps {
  artistId: string;
}

/**
 * Artist Dashboard Component
 * Manage tracks, view analytics, and track revenue
 */
export const ArtistDashboard: React.FC<ArtistDashboardProps> = ({ artistId }) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'tracks' | 'analytics' | 'revenue'>('overview');
  const { artist, stats, loading: artistLoading } = useArtist(artistId);
  const { tracks, loading: tracksLoading } = useArtistTracks(artistId);
  const { revenue, loading: revenueLoading } = useArtistRevenue(artistId, 'monthly');

  if (artistLoading) {
    return (
      <div className="w-full h-96 flex items-center justify-center">
        <div className="animate-spin">
          <div className="w-12 h-12 border-4 border-slate-700 border-t-purple-600 rounded-full" />
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-6xl mx-auto p-6">
      {/* Header */}
      <div className="flex gap-6 mb-8 items-start">
        {artist?.profileImage && (
          <img
            src={artist.profileImage}
            alt={artist.stageName}
            className="w-24 h-24 rounded-full object-cover border-4 border-embr-primary-400"
          />
        )}
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-2">
            <h1 className="text-4xl font-bold text-embr-accent-900">{artist?.stageName}</h1>
            {artist?.isVerified && (
              <div className="bg-embr-secondary-400 text-white px-3 py-1 rounded-full text-sm font-semibold">
                ✓ Verified
              </div>
            )}
          </div>
          <p className="text-embr-accent-600 mb-4">{artist?.bio}</p>
          <button className="bg-embr-primary-400 hover:bg-embr-primary-500 text-white px-6 py-2 rounded-lg font-semibold transition">
            <Upload size={16} className="inline mr-2" />
            Upload New Track
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <div className="bg-embr-neutral-100 border border-embr-neutral-200 rounded-lg p-4 hover:border-embr-primary-300 transition">
          <div className="text-embr-accent-600 text-sm mb-2 flex items-center gap-2">
            <Music size={16} />
            Tracks
          </div>
          <div className="text-3xl font-bold text-embr-accent-900">{stats?.totalTracks || 0}</div>
        </div>

        <div className="bg-embr-neutral-100 border border-embr-neutral-200 rounded-lg p-4 hover:border-embr-primary-300 transition">
          <div className="text-embr-accent-600 text-sm mb-2 flex items-center gap-2">
            <TrendingUp size={16} />
            Streams
          </div>
          <div className="text-3xl font-bold text-embr-accent-900">
            {(Number(stats?.totalStreams || 0) / 1000000).toFixed(1)}M
          </div>
        </div>

        <div className="bg-embr-neutral-100 border border-embr-neutral-200 rounded-lg p-4 hover:border-embr-primary-300 transition">
          <div className="text-embr-accent-600 text-sm mb-2 flex items-center gap-2">
            <Users size={16} />
            Using Your Music
          </div>
          <div className="text-3xl font-bold text-embr-accent-900">{stats?.totalUsages || 0}</div>
        </div>

        <div className="bg-embr-neutral-100 border border-embr-neutral-200 rounded-lg p-4 hover:border-embr-primary-300 transition">
          <div className="text-embr-accent-600 text-sm mb-2 flex items-center gap-2">
            <DollarSign size={16} />
            Monthly Revenue
          </div>
          <div className="text-3xl font-bold text-embr-primary-500">
            ${(revenue?.totalRevenue || 0) / 100}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-4 border-b border-embr-neutral-200 mb-6">
        {(['overview', 'tracks', 'analytics', 'revenue'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`pb-3 font-semibold transition border-b-2 ${
              activeTab === tab
                ? 'border-embr-primary-400 text-embr-accent-900'
                : 'border-transparent text-embr-accent-500 hover:text-embr-accent-700'
            }`}
          >
            {tab.charAt(0).toUpperCase() + tab.slice(1)}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="mb-8">
        {/* Overview Tab */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            <div className="bg-gradient-to-br from-purple-900 to-pink-900 border border-purple-700 rounded-lg p-6 text-white">
              <h2 className="text-2xl font-bold mb-4">Welcome Back!</h2>
              <p className="text-slate-200 mb-4">
                Your music is making waves! {stats?.totalUsages || 0} creators are using your tracks in their content.
              </p>
              <button className="bg-white text-purple-900 px-6 py-2 rounded-lg font-semibold hover:bg-slate-100 transition">
                View All Usages
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-slate-800 border border-slate-700 rounded-lg p-6">
                <h3 className="font-bold text-lg mb-4">Most Streamed</h3>
                <div className="space-y-3">
                  {tracks
                    ?.sort((a: any, b: any) => Number(b.streams) - Number(a.streams))
                    .slice(0, 3)
                    .map((track: any) => (
                      <div key={track.id} className="flex justify-between items-center">
                        <span className="truncate">{track.title}</span>
                        <span className="text-slate-400 text-sm">
                          {(Number(track.streams) / 1000000).toFixed(1)}M
                        </span>
                      </div>
                    ))}
                </div>
              </div>

              <div className="bg-slate-800 border border-slate-700 rounded-lg p-6">
                <h3 className="font-bold text-lg mb-4">Most Used</h3>
                <div className="space-y-3">
                  {tracks
                    ?.sort((a: any, b: any) => b.usedInCount - a.usedInCount)
                    .slice(0, 3)
                    .map((track: any) => (
                      <div key={track.id} className="flex justify-between items-center">
                        <span className="truncate">{track.title}</span>
                        <span className="text-slate-400 text-sm">{track.usedInCount} uses</span>
                      </div>
                    ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Tracks Tab */}
        {activeTab === 'tracks' && (
          <div className="space-y-4">
            {tracksLoading ? (
              <div className="text-center py-12">Loading...</div>
            ) : tracks && tracks.length > 0 ? (
              tracks.map((track: any) => (
                <div key={track.id} className="bg-slate-800 border border-slate-700 rounded-lg p-4 flex justify-between items-center hover:border-purple-500 transition">
                  <div className="flex-1">
                    <h3 className="font-bold">{track.title}</h3>
                    <div className="text-sm text-slate-400 flex gap-4 mt-2">
                      <span>{(Number(track.streams) / 1000000).toFixed(1)}M streams</span>
                      <span>{track.usedInCount} uses</span>
                      <span>
                        {track.isPublished ? (
                          <span className="text-green-400">Published</span>
                        ) : (
                          <span className="text-orange-400">Draft</span>
                        )}
                      </span>
                    </div>
                  </div>
                  <button className="bg-purple-600 hover:bg-purple-700 px-4 py-2 rounded-lg transition">
                    Edit
                  </button>
                </div>
              ))
            ) : (
              <div className="text-center py-12 text-slate-400">
                <p>No tracks uploaded yet</p>
              </div>
            )}
          </div>
        )}

        {/* Analytics Tab */}
        {activeTab === 'analytics' && (
          <div className="space-y-6">
            <div className="bg-slate-800 border border-slate-700 rounded-lg p-6">
              <h3 className="font-bold text-lg mb-6 flex items-center gap-2">
                <BarChart3 size={20} />
                Streams Over Time
              </h3>
              <div className="h-64 bg-slate-900 rounded-lg flex items-center justify-center text-slate-400">
                Chart coming soon
              </div>
            </div>

            <div className="bg-slate-800 border border-slate-700 rounded-lg p-6">
              <h3 className="font-bold text-lg mb-6">Geographic Distribution</h3>
              <div className="space-y-3">
                {['United States', 'India', 'United Kingdom', 'Brazil'].map((country) => (
                  <div key={country} className="flex items-center gap-3">
                    <span className="text-sm w-32">{country}</span>
                    <div className="flex-1 h-2 bg-slate-700 rounded-full overflow-hidden">
                      <div
                        className="bg-gradient-to-r from-purple-500 to-pink-500 h-full"
                        style={{ width: Math.random() * 100 + '%' }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Revenue Tab */}
        {activeTab === 'revenue' && (
          <div className="space-y-6">
            {revenueLoading ? (
              <div className="text-center py-12">Loading...</div>
            ) : (
              <>
                <div className="bg-gradient-to-br from-purple-900 to-pink-900 border border-purple-700 rounded-lg p-6 text-white">
                  <div className="text-5xl font-bold mb-2">
                    ${(revenue?.totalRevenue || 0) / 100}
                  </div>
                  <p className="text-slate-200">Total revenue this month</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="bg-slate-800 border border-slate-700 rounded-lg p-6">
                    <h3 className="font-bold text-lg mb-4">Top Earning Tracks</h3>
                    <div className="space-y-4">
                      {revenue?.topUsages?.slice(0, 5).map((usage: any, idx: number) => (
                        <div key={idx} className="flex justify-between items-center pb-3 border-b border-slate-700 last:border-b-0">
                          <span className="text-sm">{usage.contentType}</span>
                          <span className="font-bold text-purple-400">
                            ${Math.round(usage.originalArtistShare) / 100}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="bg-slate-800 border border-slate-700 rounded-lg p-6">
                    <h3 className="font-bold text-lg mb-4">Revenue Breakdown</h3>
                    <div className="space-y-4">
                      <div>
                        <div className="flex justify-between mb-2 text-sm">
                          <span>From Streams</span>
                          <span className="font-bold">$1,200</span>
                        </div>
                        <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
                          <div className="bg-green-500 h-full" style={{ width: '60%' }} />
                        </div>
                      </div>
                      <div>
                        <div className="flex justify-between mb-2 text-sm">
                          <span>From Music Usage</span>
                          <span className="font-bold">$800</span>
                        </div>
                        <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
                          <div className="bg-blue-500 h-full" style={{ width: '40%' }} />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default ArtistDashboard;
