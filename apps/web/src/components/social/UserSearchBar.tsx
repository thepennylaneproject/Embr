import React, { useState, useRef, useEffect } from 'react';
import { useUserSearch } from '@/hooks/useUserSearch';
import { FollowButtonCompact } from './FollowButton';
import type { SearchUser } from '@shared/types/social.types';

interface UserSearchBarProps {
  onUserSelect?: (user: SearchUser) => void;
  placeholder?: string;
  showFilters?: boolean;
  autoFocus?: boolean;
}

export const UserSearchBar: React.FC<UserSearchBarProps> = ({
  onUserSelect,
  placeholder = 'Search creators...',
  showFilters = false,
  autoFocus = false,
}) => {
  const [query, setQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [filters, setFilters] = useState({
    location: '',
    skills: [] as string[],
    verified: undefined as boolean | undefined,
    availability: undefined as 'available' | 'busy' | undefined,
  });
  
  const { users, loading, searchUsers, reset } = useUserSearch();
  const searchRef = useRef<HTMLDivElement>(null);

  // Perform search — debouncing is handled inside useUserSearch.searchUsers
  useEffect(() => {
    if (query.trim()) {
      searchUsers({
        query,
        ...filters,
      }, true);
      setIsOpen(true);
    } else {
      reset();
      setIsOpen(false);
    }
  }, [query, filters, searchUsers, reset]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleUserClick = (user: SearchUser) => {
    setIsOpen(false);
    setQuery('');
    onUserSelect?.(user);
  };

  return (
    <div ref={searchRef} className="relative w-full max-w-2xl">
      {/* Search Input */}
      <div className="relative">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => query && setIsOpen(true)}
          placeholder={placeholder}
          autoFocus={autoFocus}
          className="
            w-full px-4 py-3 pl-12
            bg-white border-2 border-gray-200
            rounded-full
            focus:outline-none focus:border-[#E8998D]
            transition-colors
          "
        />
        
        {/* Search Icon */}
        <svg
          className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400"
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

        {/* Loading Spinner */}
        {loading && (
          <div className="absolute right-4 top-1/2 -translate-y-1/2">
            <svg className="animate-spin h-5 w-5 text-[#E8998D]" viewBox="0 0 24 24">
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
                fill="none"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              />
            </svg>
          </div>
        )}
      </div>

      {/* Filters (Optional) */}
      {showFilters && (
        <div className="mt-2 flex gap-2 flex-wrap">
          <button
            onClick={() => setFilters(f => ({ ...f, verified: !f.verified }))}
            className={`
              px-3 py-1 rounded-full text-sm
              ${filters.verified 
                ? 'bg-[#E8998D] text-white' 
                : 'bg-gray-100 text-gray-600'
              }
            `}
          >
            ✓ Verified
          </button>
          <button
            onClick={() => setFilters(f => ({ 
              ...f, 
              availability: f.availability === 'available' ? undefined : 'available' 
            }))}
            className={`
              px-3 py-1 rounded-full text-sm
              ${filters.availability === 'available'
                ? 'bg-[#E8998D] text-white' 
                : 'bg-gray-100 text-gray-600'
              }
            `}
          >
            Available Now
          </button>
        </div>
      )}

      {/* Results Dropdown */}
      {isOpen && users.length > 0 && (
        <div className="absolute z-50 w-full mt-2 bg-white rounded-2xl shadow-lg border border-gray-200 max-h-96 overflow-y-auto">
          {users.map((user) => (
            <div
              key={user.id}
              onClick={() => handleUserClick(user)}
              className="
                flex items-center gap-3 p-3
                hover:bg-[#F4F1F1] cursor-pointer
                transition-colors
                border-b border-gray-100 last:border-0
              "
            >
              {/* Avatar */}
              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-[#E8998D] to-[#C9ADA7] flex-shrink-0">
                {user.profile?.avatarUrl ? (
                  <img
                    src={user.profile.avatarUrl}
                    alt={user.username}
                    className="w-full h-full rounded-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-white text-lg font-semibold">
                    {user.username[0].toUpperCase()}
                  </div>
                )}
              </div>

              {/* User Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="font-semibold text-gray-900 truncate">
                    {user.displayName || user.username}
                  </p>
                  {user.profile?.isVerified && (
                    <svg className="w-4 h-4 text-[#E8998D]" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" />
                    </svg>
                  )}
                </div>
                <p className="text-sm text-gray-500 truncate">@{user.username}</p>
                {user.profile?.bio && (
                  <p className="text-xs text-gray-600 truncate mt-1">{user.profile.bio}</p>
                )}
                <div className="flex items-center gap-3 mt-1 text-xs text-gray-500">
                  <span>{user.profile?.followerCount?.toLocaleString() || '0'} followers</span>
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
      )}

      {/* No Results */}
      {isOpen && !loading && query && users.length === 0 && (
        <div className="absolute z-50 w-full mt-2 bg-white rounded-2xl shadow-lg border border-gray-200 p-8 text-center">
          <p className="text-gray-500">No users found for "{query}"</p>
        </div>
      )}
    </div>
  );
};
