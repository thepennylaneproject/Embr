/**
 * GigDiscoveryNew Component
 * Clean, minimal gigs discovery following DESIGN_SYSTEM
 * Job board aesthetic - scannable, not overwhelming
 */

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { gigsApi } from '@shared/api/gigs.api';
import { Gig, GigCategory, GigSearchParams } from '@shared/types/gig.types';

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
    limit: 20,
  });

  useEffect(() => {
    searchGigs();
  }, [filters.category, filters.sortBy, currentPage]);

  const searchGigs = async () => {
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
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setCurrentPage(1);
    searchGigs();
  };

  const handleCategoryChange = (category: string) => {
    setFilters({ ...filters, category: category || undefined });
    setCurrentPage(1);
  };

  const handleSortChange = (sortBy: string) => {
    setFilters({ ...filters, sortBy });
    setCurrentPage(1);
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
      limit: 20,
    });
    setCurrentPage(1);
  };

  return (
    <div>
      {/* SEARCH & FILTERS - Minimal, clean */}
      <div style={{ marginBottom: '64px' }}>
        <form onSubmit={handleSearch} style={{ marginBottom: '24px' }}>
          <input
            type="text"
            value={filters.query}
            onChange={(e) => setFilters({ ...filters, query: e.target.value })}
            placeholder="Search opportunities..."
            style={{
              width: '100%',
              padding: '12px 16px',
              fontSize: '16px',
              border: '1px solid #e0e0e0',
              borderRadius: '6px',
              marginBottom: '16px',
            }}
          />

          <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
            <select
              value={filters.category || ''}
              onChange={(e) => handleCategoryChange(e.target.value)}
              style={{
                padding: '8px 12px',
                fontSize: '14px',
                border: '1px solid #e0e0e0',
                borderRadius: '6px',
                backgroundColor: 'white',
              }}
            >
              {CATEGORIES.map((cat) => (
                <option key={cat.value} value={cat.value}>
                  {cat.label}
                </option>
              ))}
            </select>

            <select
              value={filters.sortBy}
              onChange={(e) => handleSortChange(e.target.value)}
              style={{
                padding: '8px 12px',
                fontSize: '14px',
                border: '1px solid #e0e0e0',
                borderRadius: '6px',
                backgroundColor: 'white',
              }}
            >
              <option value="recent">Most Recent</option>
              <option value="budget_high">Highest Budget</option>
              <option value="budget_low">Lowest Budget</option>
              <option value="deadline">Deadline</option>
            </select>

            {(filters.category || filters.query) && (
              <button
                type="button"
                onClick={clearFilters}
                style={{
                  padding: '8px 12px',
                  fontSize: '14px',
                  color: '#E8998D',
                  backgroundColor: 'transparent',
                  border: 'none',
                  cursor: 'pointer',
                  textDecoration: 'underline',
                }}
              >
                Clear filters
              </button>
            )}
          </div>
        </form>

        <p style={{ fontSize: '14px', color: '#999' }}>
          {gigs.length > 0 ? `Showing ${gigs.length} opportunities` : 'Loading...'}
        </p>
      </div>

      {/* ERROR STATE */}
      {error && (
        <div style={{ padding: '16px', backgroundColor: '#fee2e2', borderLeft: '4px solid #ef4444', marginBottom: '32px', borderRadius: '4px' }}>
          <p style={{ fontSize: '14px', color: '#991b1b', margin: 0 }}>{error}</p>
        </div>
      )}

      {/* LOADING STATE */}
      {loading && (
        <div style={{ textAlign: 'center', padding: '64px 0' }}>
          <p style={{ fontSize: '16px', color: '#999' }}>Loading opportunities...</p>
        </div>
      )}

      {/* EMPTY STATE */}
      {!loading && gigs.length === 0 && (
        <div style={{ textAlign: 'center', padding: '64px 32px' }}>
          <p style={{ fontSize: '16px', color: '#999', marginBottom: '16px' }}>No opportunities found.</p>
          <p style={{ fontSize: '14px', color: '#ccc' }}>Try adjusting your search or filters.</p>
        </div>
      )}

      {/* GIGS LIST - Job board style, scannable */}
      {!loading && gigs.length > 0 && (
        <div>
          <div style={{ display: 'grid', gap: '16px', marginBottom: '48px' }}>
            {gigs.map((gig) => (
              <div
                key={gig.id}
                onClick={() => router.push(`/gigs/${gig.id}`)}
                style={{
                  padding: '24px',
                  backgroundColor: '#f5f5f5',
                  border: '1px solid #e0e0e0',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  transition: 'all 200ms',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = '#ffffff';
                  e.currentTarget.style.borderColor = '#E8998D';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = '#f5f5f5';
                  e.currentTarget.style.borderColor = '#e0e0e0';
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                  <div>
                    <h3 style={{ fontSize: '18px', fontWeight: 600, color: '#000', margin: '0 0 4px 0' }}>
                      {gig.title}
                    </h3>
                    <p style={{ fontSize: '14px', color: '#999', margin: 0 }}>
                      {gig.clientName || 'Creator'} • {gig.category}
                    </p>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <p style={{ fontSize: '20px', fontWeight: 700, color: '#000', margin: 0 }}>
                      ${gig.budget}
                    </p>
                    <p style={{ fontSize: '12px', color: '#999', margin: '4px 0 0 0' }}>
                      {gig.budgetType === 'hourly' ? '/hr' : 'fixed'}
                    </p>
                  </div>
                </div>

                <p style={{ fontSize: '16px', color: '#333', lineHeight: '1.6', marginBottom: '16px', margin: 0 }}>
                  {gig.description}
                </p>

                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                  {gig.skills?.slice(0, 3).map((skill) => (
                    <span
                      key={skill}
                      style={{
                        fontSize: '12px',
                        padding: '4px 8px',
                        backgroundColor: '#f0f0f0',
                        borderRadius: '4px',
                        color: '#666',
                      }}
                    >
                      {skill}
                    </span>
                  ))}
                  {(gig.skills?.length || 0) > 3 && (
                    <span style={{ fontSize: '12px', color: '#999', padding: '4px 0' }}>
                      +{gig.skills!.length - 3} more
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* PAGINATION - Minimal */}
          {totalPages > 1 && (
            <div style={{ display: 'flex', justifyContent: 'center', gap: '8px', marginBottom: '32px' }}>
              <button
                onClick={() => {
                  setCurrentPage((p) => Math.max(1, p - 1));
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
                disabled={currentPage === 1}
                style={{
                  padding: '8px 12px',
                  fontSize: '14px',
                  backgroundColor: currentPage === 1 ? '#f5f5f5' : 'transparent',
                  border: '1px solid #e0e0e0',
                  borderRadius: '4px',
                  cursor: currentPage === 1 ? 'not-allowed' : 'pointer',
                  color: currentPage === 1 ? '#ccc' : '#333',
                }}
              >
                ← Previous
              </button>

              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                const pageNum = currentPage <= 3 ? i + 1 : currentPage - 2 + i;
                if (pageNum > totalPages) return null;
                return (
                  <button
                    key={pageNum}
                    onClick={() => {
                      setCurrentPage(pageNum);
                      window.scrollTo({ top: 0, behavior: 'smooth' });
                    }}
                    style={{
                      padding: '8px 12px',
                      fontSize: '14px',
                      backgroundColor: currentPage === pageNum ? '#E8998D' : '#f5f5f5',
                      color: currentPage === pageNum ? 'white' : '#333',
                      border: '1px solid #e0e0e0',
                      borderRadius: '4px',
                      cursor: 'pointer',
                    }}
                  >
                    {pageNum}
                  </button>
                );
              })}

              <button
                onClick={() => {
                  setCurrentPage((p) => Math.min(totalPages, p + 1));
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
                disabled={currentPage === totalPages}
                style={{
                  padding: '8px 12px',
                  fontSize: '14px',
                  backgroundColor: currentPage === totalPages ? '#f5f5f5' : 'transparent',
                  border: '1px solid #e0e0e0',
                  borderRadius: '4px',
                  cursor: currentPage === totalPages ? 'not-allowed' : 'pointer',
                  color: currentPage === totalPages ? '#ccc' : '#333',
                }}
              >
                Next →
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default GigDiscovery;
