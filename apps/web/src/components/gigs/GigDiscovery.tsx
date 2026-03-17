import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/router';
import { gigsApi } from '@shared/api/gigs.api';
import { GigCard } from './GigCard';
import {
  Gig,
  GigCategory,
  GigBudgetType,
  GigExperienceLevel,
  GigSearchParams,
} from '@embr/types';

const CATEGORIES = [
  { value: '', label: 'All Categories' },
  { value: GigCategory.VIDEO_EDITING, label: 'Video Editing' },
  { value: GigCategory.GRAPHIC_DESIGN, label: 'Graphic Design' },
  { value: GigCategory.WRITING, label: 'Writing' },
  { value: GigCategory.MUSIC_AUDIO, label: 'Music & Audio' },
  { value: GigCategory.ANIMATION, label: 'Animation' },
  { value: GigCategory.PHOTOGRAPHY, label: 'Photography' },
  { value: GigCategory.SOCIAL_MEDIA, label: 'Social Media' },
  { value: GigCategory.CONSULTING, label: 'Consulting' },
  { value: GigCategory.WEB_DEV, label: 'Web Dev' },
  { value: GigCategory.VOICE_OVER, label: 'Voice Over' },
  { value: GigCategory.OTHER, label: 'Other' },
];

export const GigDiscovery: React.FC = () => {
  const router = useRouter();
  const [gigs, setGigs] = useState<Gig[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [totalPages, setTotalPages] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);

  const [filters, setFilters] = useState<GigSearchParams>({
    query: '',
    category: undefined,
    budgetMin: undefined,
    budgetMax: undefined,
    budgetType: undefined,
    experienceLevel: undefined,
    skills: [],
    sortBy: 'recent',
    page: 1,
    limit: 12,
  });

  const [showFilters, setShowFilters] = useState(false);

  // searchGigs is memoized so the useEffect below only re-fires when the
  // search parameters actually change, not on every render.
  const searchGigs = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const result = await gigsApi.search({
        ...filters,
        page: currentPage,
      });

      setGigs(result.gigs);
      setTotalPages(result.totalPages);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to load gigs');
    } finally {
      setLoading(false);
    }
  }, [filters, currentPage]);

  useEffect(() => {
    searchGigs();
  }, [searchGigs]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setCurrentPage(1);
    searchGigs();
  };

  const handleFilterChange = (key: keyof GigSearchParams, value: any) => {
    setFilters({ ...filters, [key]: value });
  };

  const clearFilters = () => {
    setFilters({
      query: '',
      category: undefined,
      budgetMin: undefined,
      budgetMax: undefined,
      budgetType: undefined,
      experienceLevel: undefined,
      skills: [],
      sortBy: 'recent',
      page: 1,
      limit: 12,
    });
    setCurrentPage(1);
  };

  const handlePageChange = (newPage: number) => {
    setCurrentPage(newPage);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Find Your Next Gig
          </h1>
          <p className="text-gray-600">
            Browse thousands of creative opportunities
          </p>
        </div>

        {/* Search Bar */}
        <form onSubmit={handleSearch} className="mb-6">
          <div className="flex gap-4">
            <div className="flex-1 relative">
              <input
                type="text"
                value={filters.query}
                onChange={(e) => handleFilterChange('query', e.target.value)}
                placeholder="Search for gigs..."
                className="w-full px-4 py-3 pl-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#E8998D] focus:border-transparent"
              />
              <svg
                className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                />
              </svg>
            </div>
            
            <button
              type="button"
              onClick={() => setShowFilters(!showFilters)}
              className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors flex items-center gap-2"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
              </svg>
              Filters
            </button>
            
            <button
              type="submit"
              className="px-8 py-3 bg-[#E8998D] text-white rounded-lg hover:bg-[#d88a7e] transition-colors font-medium"
            >
              Search
            </button>
          </div>
        </form>

        {/* Filters Panel */}
        {showFilters && (
          <div className="bg-white p-6 rounded-lg shadow-sm mb-6 border border-gray-200">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
              {/* Category */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Category
                </label>
                <select
                  value={filters.category || ''}
                  onChange={(e) => handleFilterChange('category', e.target.value || undefined)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#E8998D]"
                >
                  {CATEGORIES.map(cat => (
                    <option key={cat.value} value={cat.value}>{cat.label}</option>
                  ))}
                </select>
              </div>

              {/* Budget Type */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Budget Type
                </label>
                <select
                  value={filters.budgetType || ''}
                  onChange={(e) => handleFilterChange('budgetType', e.target.value || undefined)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#E8998D]"
                >
                  <option value="">All Types</option>
                  <option value={GigBudgetType.FIXED}>Fixed Price</option>
                  <option value={GigBudgetType.HOURLY}>Hourly Rate</option>
                  <option value={GigBudgetType.MILESTONE}>Milestone-Based</option>
                </select>
              </div>

              {/* Experience Level */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Experience Level
                </label>
                <select
                  value={filters.experienceLevel || ''}
                  onChange={(e) => handleFilterChange('experienceLevel', e.target.value || undefined)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#E8998D]"
                >
                  <option value="">All Levels</option>
                  <option value={GigExperienceLevel.BEGINNER}>Beginner</option>
                  <option value={GigExperienceLevel.INTERMEDIATE}>Intermediate</option>
                  <option value={GigExperienceLevel.EXPERT}>Expert</option>
                </select>
              </div>
            </div>

            {/* Budget Range */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Min Budget ($)
                </label>
                <input
                  type="number"
                  value={filters.budgetMin || ''}
                  onChange={(e) => handleFilterChange('budgetMin', e.target.value ? parseInt(e.target.value) : undefined)}
                  placeholder="Min"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#E8998D]"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Max Budget ($)
                </label>
                <input
                  type="number"
                  value={filters.budgetMax || ''}
                  onChange={(e) => handleFilterChange('budgetMax', e.target.value ? parseInt(e.target.value) : undefined)}
                  placeholder="Max"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#E8998D]"
                />
              </div>
            </div>

            <div className="flex justify-between items-center">
              <button
                type="button"
                onClick={clearFilters}
                className="text-sm text-gray-600 hover:text-gray-900"
              >
                Clear all filters
              </button>
              <button
                type="button"
                onClick={() => { searchGigs(); setShowFilters(false); }}
                className="px-6 py-2 bg-[#E8998D] text-white rounded-lg hover:bg-[#d88a7e] transition-colors"
              >
                Apply Filters
              </button>
            </div>
          </div>
        )}

        {/* Sort and Results Count */}
        <div className="flex items-center justify-between mb-6">
          <div className="text-sm text-gray-600">
            {gigs.length > 0 && `Showing ${gigs.length} gigs`}
          </div>
          <select
            value={filters.sortBy}
            onChange={(e) => handleFilterChange('sortBy', e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#E8998D] text-sm"
          >
            <option value="recent">Most Recent</option>
            <option value="budget_high">Highest Budget</option>
            <option value="budget_low">Lowest Budget</option>
            <option value="deadline">Deadline</option>
          </select>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
            {error}
          </div>
        )}

        {/* Loading State */}
        {loading ? (
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-gray-200 border-t-[#E8998D]" />
            <p className="mt-4 text-gray-600">Loading gigs...</p>
          </div>
        ) : gigs.length === 0 ? (
          <div className="text-center py-12">
            <svg className="mx-auto h-24 w-24 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <h3 className="mt-4 text-lg font-medium text-gray-900">No gigs found</h3>
            <p className="mt-2 text-gray-600">Try adjusting your search or filters</p>
          </div>
        ) : (
          <>
            {/* Gigs Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {gigs.map((gig) => (
                <GigCard
                  key={gig.id}
                  gig={gig}
                  onClick={() => router.push(`/gigs/${gig.id}`)}
                />
              ))}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex justify-center gap-2 mt-8">
                <button
                  onClick={() => handlePageChange(currentPage - 1)}
                  disabled={currentPage === 1}
                  className="px-4 py-2 border border-gray-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                >
                  Previous
                </button>
                
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  const pageNum = currentPage <= 3 ? i + 1 : currentPage - 2 + i;
                  if (pageNum > totalPages) return null;
                  return (
                    <button
                      key={pageNum}
                      onClick={() => handlePageChange(pageNum)}
                      className={`px-4 py-2 border rounded-lg ${
                        currentPage === pageNum
                          ? 'bg-[#E8998D] text-white border-[#E8998D]'
                          : 'border-gray-300 hover:bg-gray-50'
                      }`}
                    >
                      {pageNum}
                    </button>
                  );
                })}
                
                <button
                  onClick={() => handlePageChange(currentPage + 1)}
                  disabled={currentPage === totalPages}
                  className="px-4 py-2 border border-gray-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                >
                  Next
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};
