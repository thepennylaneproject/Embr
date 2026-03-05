import React, { useState } from 'react';
import { useRouter } from 'next/router';
import { UserSearchBar } from '@/components/social/UserSearchBar';
import { TrendingCreators } from '@/components/social/TrendingCreators';
import { SuggestedUsers } from '@/components/social/SuggestedUsers';
import { useUserSearch } from '@/hooks/useUserSearch';
import { FollowButtonCompact } from '@/components/social/FollowButton';
import type { SearchUser, TrendingCreator, RecommendedUser } from '@shared/types/social.types';

type Tab = 'trending' | 'suggested' | 'search';

const DiscoveryPage: React.FC = () => {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<Tab>('trending');
  const { users, loading, hasMore, loadMore } = useUserSearch();

  const handleUserClick = (user: SearchUser | TrendingCreator | RecommendedUser) => {
    // Navigate to user profile using Next.js router for client-side navigation
    router.push(`/profile/${user.username}`);
  };

  return (
    <div className="min-h-screen bg-[#F4F1F1]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">Discover</h1>
          <p className="text-gray-600">Find amazing creators and connect with the community</p>
        </div>

        {/* Search Bar */}
        <div className="mb-8">
          <UserSearchBar
            onUserSelect={handleUserClick}
            placeholder="Search for creators..."
            showFilters={true}
          />
        </div>

        {/* Tabs */}
        <div className="flex gap-4 mb-6 border-b border-gray-200">
          {[
            { id: 'trending' as Tab, label: 'Trending', icon: '🔥' },
            { id: 'suggested' as Tab, label: 'For You', icon: '✨' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`
                px-6 py-3 font-semibold transition-all
                ${activeTab === tab.id
                  ? 'text-[#E8998D] border-b-2 border-[#E8998D]'
                  : 'text-gray-500 hover:text-gray-700'
                }
              `}
            >
              <span className="mr-2">{tab.icon}</span>
              {tab.label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-2">
            {activeTab === 'trending' && (
              <TrendingCreators
                timeframe="week"
                limit={20}
                showTimeframeToggle={true}
                onCreatorClick={handleUserClick}
              />
            )}

            {activeTab === 'suggested' && (
              <div className="space-y-6">
                {/* Multiple suggestion contexts */}
                <SuggestedUsers
                  context="mutual_connections"
                  limit={5}
                  onUserClick={handleUserClick}
                />
                
                <SuggestedUsers
                  context="similar_interests"
                  limit={5}
                  onUserClick={handleUserClick}
                />

                <SuggestedUsers
                  context="trending"
                  limit={5}
                  onUserClick={handleUserClick}
                />
              </div>
            )}

            {activeTab === 'search' && (
              <div className="bg-white rounded-2xl p-6 border border-gray-200">
                <h3 className="text-xl font-bold text-gray-900 mb-4">Search Results</h3>
                
                {loading && users.length === 0 ? (
                  <div className="space-y-4">
                    {[...Array(5)].map((_, i) => (
                      <div key={i} className="flex items-center gap-4 animate-pulse">
                        <div className="w-16 h-16 rounded-full bg-gray-200" />
                        <div className="flex-1">
                          <div className="h-5 bg-gray-200 rounded w-32 mb-2" />
                          <div className="h-4 bg-gray-200 rounded w-48" />
                        </div>
                      </div>
                    ))}
                  </div>
                ) : users.length > 0 ? (
                  <>
                    <div className="space-y-4">
                      {users.map((user) => (
                        <div
                          key={user.id}
                          onClick={() => handleUserClick(user)}
                          className="flex items-center gap-4 p-4 hover:bg-[#F4F1F1] rounded-xl cursor-pointer transition-colors"
                        >
                          {/* Avatar */}
                          <div className="w-16 h-16 rounded-full bg-gradient-to-br from-[#E8998D] to-[#C9ADA7] flex-shrink-0">
                            {user.profile?.avatarUrl ? (
                              <img
                                src={user.profile.avatarUrl}
                                alt={user.username}
                                className="w-full h-full rounded-full object-cover"
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-white text-xl font-bold">
                                {user.username[0].toUpperCase()}
                              </div>
                            )}
                          </div>

                          {/* User Info */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <p className="font-bold text-gray-900 truncate">
                                {user.displayName || user.username}
                              </p>
                              {user.profile?.isVerified && (
                                <svg className="w-5 h-5 text-[#E8998D]" fill="currentColor" viewBox="0 0 20 20">
                                  <path d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" />
                                </svg>
                              )}
                            </div>
                            <p className="text-sm text-gray-500 truncate">@{user.username}</p>
                            
                            {user.profile?.bio && (
                              <p className="text-sm text-gray-600 line-clamp-2 mt-1">
                                {user.profile.bio}
                              </p>
                            )}

                            {user.profile?.location && (
                              <p className="text-xs text-gray-500 mt-1">📍 {user.profile.location}</p>
                            )}

                            <div className="flex items-center gap-3 mt-2 text-sm text-gray-500">
                              <span>{(user as any).stats?.followers?.toLocaleString() || (user as any).profile?.followerCount?.toLocaleString() || '0'} followers</span>
                              <span>•</span>
                              <span>{(user as any).stats?.posts?.toLocaleString() || '0'} posts</span>
                            </div>
                          </div>

                          {/* Follow Button */}
                          <FollowButtonCompact
                            userId={user.id}
                            initialIsFollowing={user.isFollowing}
                          />
                        </div>
                      ))}
                    </div>

                    {/* Load More */}
                    {hasMore && (
                      <button
                        onClick={loadMore}
                        disabled={loading}
                        className="w-full mt-6 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium rounded-xl transition-colors disabled:opacity-50"
                      >
                        {loading ? 'Loading...' : 'Load More'}
                      </button>
                    )}
                  </>
                ) : (
                  <div className="text-center py-12">
                    <div className="text-6xl mb-4">🔍</div>
                    <p className="text-gray-500">No results found. Try a different search.</p>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Categories */}
            <div className="bg-white rounded-2xl p-6 border border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Browse by Category</h3>
              <div className="space-y-2">
                {[
                  { name: 'Design', emoji: '🎨', count: '12.5K' },
                  { name: 'Photography', emoji: '📸', count: '8.2K' },
                  { name: 'Music', emoji: '🎵', count: '15.1K' },
                  { name: 'Writing', emoji: '✍️', count: '6.8K' },
                  { name: 'Video', emoji: '🎥', count: '9.3K' },
                  { name: 'Development', emoji: '💻', count: '11.4K' },
                ].map((category) => (
                  <button
                    key={category.name}
                    className="w-full flex items-center justify-between p-3 hover:bg-[#F4F1F1] rounded-lg transition-colors text-left"
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-2xl">{category.emoji}</span>
                      <span className="font-medium text-gray-900">{category.name}</span>
                    </div>
                    <span className="text-sm text-gray-500">{category.count}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Stats */}
            <div className="bg-white rounded-2xl p-6 border border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Platform Stats</h3>
              <div className="space-y-4">
                <div>
                  <p className="text-sm text-gray-500">Active Creators</p>
                  <p className="text-2xl font-bold text-[#E8998D]">50,000+</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Posts Today</p>
                  <p className="text-2xl font-bold text-[#E8998D]">125K</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Gigs Available</p>
                  <p className="text-2xl font-bold text-[#E8998D]">3,200</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DiscoveryPage;
