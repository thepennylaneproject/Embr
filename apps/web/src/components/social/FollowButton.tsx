import React from 'react';
import { useFollow } from '@/hooks/useFollow';

interface FollowButtonProps {
  userId: string;
  initialIsFollowing?: boolean;
  onFollowChange?: (isFollowing: boolean) => void;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'primary' | 'outline';
  className?: string;
}

export const FollowButton: React.FC<FollowButtonProps> = ({
  userId,
  initialIsFollowing = false,
  onFollowChange,
  size = 'md',
  variant = 'primary',
  className = '',
}) => {
  const { isFollowing, loading, error, follow, unfollow, setIsFollowing } = useFollow();
  const [showError, setShowError] = React.useState(false);

  React.useEffect(() => {
    setIsFollowing(initialIsFollowing);
  }, [initialIsFollowing, setIsFollowing]);

  React.useEffect(() => {
    if (error) {
      setShowError(true);
      const timer = setTimeout(() => setShowError(false), 5000); // Hide error after 5 seconds
      return () => clearTimeout(timer);
    }
  }, [error]);

  const handleClick = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (loading) return;

    const success = isFollowing
      ? await unfollow(userId)
      : await follow(userId);

    if (success && onFollowChange) {
      onFollowChange(!isFollowing);
    }
  };

  // Size classes
  const sizeClasses = {
    sm: 'px-3 py-1 text-sm',
    md: 'px-4 py-2 text-base',
    lg: 'px-6 py-3 text-lg',
  };

  // Variant classes
  const variantClasses = {
    primary: isFollowing
      ? 'bg-gray-200 text-gray-700 hover:bg-gray-300'
      : 'bg-[#E8998D] text-white hover:bg-[#d88a7e]',
    outline: isFollowing
      ? 'border-2 border-gray-300 text-gray-700 hover:bg-gray-50'
      : 'border-2 border-[#E8998D] text-[#E8998D] hover:bg-[#E8998D] hover:text-white',
  };

  return (
    <div className="relative inline-block group">
      <button
        onClick={handleClick}
        disabled={loading}
        title={error || undefined}
        className={`
          ${sizeClasses[size]}
          ${error ? 'bg-red-100 text-red-700 border-2 border-red-300' : variantClasses[variant]}
          rounded-full
          font-medium
          transition-all
          duration-200
          disabled:opacity-50
          disabled:cursor-not-allowed
          flex
          items-center
          justify-center
          gap-2
          ${className}
        `}
      >
        {loading ? (
          <>
            <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
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
            <span>{isFollowing ? 'Unfollowing...' : 'Following...'}</span>
          </>
        ) : error ? (
          <>
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
            </svg>
            <span>Error</span>
          </>
        ) : (
          <span>{isFollowing ? 'Following' : 'Follow'}</span>
        )}
      </button>

      {/* Error tooltip */}
      {showError && error && (
        <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 bg-red-600 text-white text-sm rounded whitespace-nowrap z-50 pointer-events-none">
          {error}
          <div className="absolute top-full left-1/2 transform -translate-x-1/2 border-4 border-transparent border-t-red-600"></div>
        </div>
      )}
    </div>
  );
};

// Compact version for use in lists/grids
interface FollowButtonCompactProps {
  userId: string;
  initialIsFollowing?: boolean;
  onFollowChange?: (isFollowing: boolean) => void;
}

export const FollowButtonCompact: React.FC<FollowButtonCompactProps> = ({
  userId,
  initialIsFollowing = false,
  onFollowChange,
}) => {
  const { isFollowing, loading, error, follow, unfollow, setIsFollowing } = useFollow();
  const [showError, setShowError] = React.useState(false);

  React.useEffect(() => {
    setIsFollowing(initialIsFollowing);
  }, [initialIsFollowing, setIsFollowing]);

  React.useEffect(() => {
    if (error) {
      setShowError(true);
      const timer = setTimeout(() => setShowError(false), 5000);
      return () => clearTimeout(timer);
    }
  }, [error]);

  const handleClick = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (loading) return;

    const success = isFollowing
      ? await unfollow(userId)
      : await follow(userId);

    if (success && onFollowChange) {
      onFollowChange(!isFollowing);
    }
  };

  return (
    <div className="relative inline-block">
      <button
        onClick={handleClick}
        disabled={loading}
        title={error || undefined}
        className={`
          px-3 py-1 text-xs rounded-full font-medium transition-all
          ${error
            ? 'bg-red-100 text-red-600 border border-red-300'
            : isFollowing
            ? 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            : 'bg-[#E8998D] text-white hover:bg-[#d88a7e]'
          }
          disabled:opacity-50 disabled:cursor-not-allowed
        `}
      >
        {loading ? '...' : isFollowing ? '✓ Following' : '+ Follow'}
      </button>

      {showError && error && (
        <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-1 px-2 py-1 bg-red-600 text-white text-xs rounded whitespace-nowrap z-50">
          {error}
        </div>
      )}
    </div>
  );
};
