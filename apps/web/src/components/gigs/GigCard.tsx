import React from 'react';
import { Gig, GigCategory, GigBudgetType } from '@embr/types';

interface GigCardProps {
  gig: Gig;
  onClick?: () => void;
}

const CATEGORY_LABELS: Record<GigCategory, string> = {
  [GigCategory.VIDEO_EDITING]: 'Video Editing',
  [GigCategory.GRAPHIC_DESIGN]: 'Graphic Design',
  [GigCategory.WRITING]: 'Writing',
  [GigCategory.MUSIC_AUDIO]: 'Music & Audio',
  [GigCategory.ANIMATION]: 'Animation',
  [GigCategory.PHOTOGRAPHY]: 'Photography',
  [GigCategory.SOCIAL_MEDIA]: 'Social Media',
  [GigCategory.CONSULTING]: 'Consulting',
  [GigCategory.WEB_DEV]: 'Web Dev',
  [GigCategory.VOICE_OVER]: 'Voice Over',
  [GigCategory.OTHER]: 'Other',
};

export const GigCard: React.FC<GigCardProps> = ({ gig, onClick }) => {
  const formatBudget = () => {
    const { budgetType, budgetMin, budgetMax, currency } = gig;
    const symbol = currency === 'USD' ? '$' : currency;

    if (budgetType === GigBudgetType.FIXED) {
      return budgetMin === budgetMax
        ? `${symbol}${budgetMin.toLocaleString()}`
        : `${symbol}${budgetMin.toLocaleString()} - ${symbol}${budgetMax.toLocaleString()}`;
    }

    if (budgetType === GigBudgetType.HOURLY) {
      return `${symbol}${budgetMin}-${budgetMax}/hr`;
    }

    return `${symbol}${budgetMin.toLocaleString()} - ${symbol}${budgetMax.toLocaleString()}`;
  };

  const formatTimeAgo = (date: Date | string) => {
    const now = new Date();
    const diffMs = now.getTime() - new Date(date).getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return new Date(date).toLocaleDateString();
  };

  return (
    <div
      onClick={onClick}
      className="bg-white border border-gray-200 rounded-lg p-6 hover:shadow-lg transition-shadow cursor-pointer"
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1">
          <h3 className="text-lg font-semibold text-gray-900 mb-1 hover:text-[#E8998D] transition-colors">
            {gig.title}
          </h3>
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <span
              className="px-2 py-1 rounded-full text-xs font-medium"
              style={{ backgroundColor: '#F4F1F1', color: '#9A8C98' }}
            >
              {CATEGORY_LABELS[gig.category]}
            </span>
            <span>·</span>
            <span>{formatTimeAgo(gig.createdAt)}</span>
          </div>
        </div>
        
        <div className="text-right">
          <div className="text-lg font-bold text-[#E8998D]">
            {formatBudget()}
          </div>
          <div className="text-xs text-gray-500">
            {gig.budgetType === GigBudgetType.MILESTONE ? 'Milestone' : 
             gig.budgetType === GigBudgetType.HOURLY ? 'Hourly' : 'Fixed'}
          </div>
        </div>
      </div>

      {/* Description */}
      <p className="text-gray-700 text-sm mb-4 line-clamp-2">
        {gig.description}
      </p>

      {/* Skills */}
      <div className="flex flex-wrap gap-2 mb-4">
        {gig.skills.slice(0, 5).map((skill, idx) => (
          <span
            key={idx}
            className="px-2 py-1 text-xs rounded"
            style={{ backgroundColor: '#F4F1F1', color: '#9A8C98' }}
          >
            {skill}
          </span>
        ))}
        {gig.skills.length > 5 && (
          <span className="px-2 py-1 text-xs text-gray-500">
            +{gig.skills.length - 5} more
          </span>
        )}
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between pt-4 border-t border-gray-100">
        <div className="flex items-center gap-4 text-sm text-gray-600">
          <div className="flex items-center gap-1">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span>{gig.estimatedDuration} days</span>
          </div>
          
          <div className="flex items-center gap-1">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <span>{gig.applicationsCount} proposals</span>
          </div>

          <div className="flex items-center gap-1">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
            </svg>
            <span>{gig.viewsCount} views</span>
          </div>
        </div>

        {gig.creator && (
          <div className="flex items-center gap-2">
            <img
              src={gig.creator.avatar || `https://ui-avatars.com/api/?name=${gig.creator.displayName}&background=E8998D&color=fff`}
              alt={gig.creator.displayName}
              className="w-8 h-8 rounded-full"
            />
            <div className="text-sm">
              <div className="font-medium text-gray-900">{gig.creator.displayName}</div>
              {gig.creator.verified && (
                <div className="flex items-center gap-1 text-[#E8998D]">
                  <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  <span className="text-xs">Verified</span>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
