import React from 'react';

type EmptyStateType = 'applications' | 'applications-filtered';

interface EmptyStateProps {
  type: EmptyStateType;
  filterLabel?: string;
  onClearFilter?: () => void;
  onAddApplication?: () => void;
}

const illustrations: Record<EmptyStateType, React.ReactNode> = {
  applications: (
    <svg
      aria-hidden="true"
      width="80"
      height="80"
      viewBox="0 0 80 80"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <rect x="10" y="18" width="60" height="44" rx="4" fill="#EEF2FF" stroke="#6366F1" strokeWidth="2" />
      <rect x="20" y="28" width="40" height="4" rx="2" fill="#6366F1" opacity="0.4" />
      <rect x="20" y="37" width="28" height="4" rx="2" fill="#6366F1" opacity="0.3" />
      <rect x="20" y="46" width="34" height="4" rx="2" fill="#6366F1" opacity="0.2" />
      <circle cx="60" cy="56" r="12" fill="#6366F1" />
      <path d="M55 56h10M60 51v10" stroke="white" strokeWidth="2.5" strokeLinecap="round" />
    </svg>
  ),
  'applications-filtered': (
    <svg
      aria-hidden="true"
      width="80"
      height="80"
      viewBox="0 0 80 80"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <rect x="10" y="18" width="60" height="44" rx="4" fill="#F5F3FF" stroke="#8B5CF6" strokeWidth="2" />
      <rect x="20" y="28" width="40" height="4" rx="2" fill="#8B5CF6" opacity="0.3" />
      <rect x="20" y="37" width="20" height="4" rx="2" fill="#8B5CF6" opacity="0.2" />
      <circle cx="40" cy="52" r="10" fill="#EDE9FE" stroke="#8B5CF6" strokeWidth="1.5" />
      <path d="M36 52l3 3 5-5" stroke="#8B5CF6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <line x1="52" y1="28" x2="58" y2="34" stroke="#8B5CF6" strokeWidth="2" strokeLinecap="round" />
      <line x1="52" y1="34" x2="58" y2="28" stroke="#8B5CF6" strokeWidth="2" strokeLinecap="round" />
    </svg>
  ),
};

const content: Record<
  EmptyStateType,
  { heading: string; body: (filterLabel?: string) => string }
> = {
  applications: {
    heading: "You haven't tracked any applications yet",
    body: () =>
      "Start adding jobs you've applied to and track your progress from application to offer.",
  },
  'applications-filtered': {
    heading: 'No applications match this filter',
    body: (filterLabel?: string) =>
      filterLabel
        ? `You don't have any applications with the status "${filterLabel}". Try a different filter or add new applications.`
        : "None of your applications match the selected filter. Try a different filter or add a new application.",
  },
};

export const EmptyState: React.FC<EmptyStateProps> = ({
  type,
  filterLabel,
  onClearFilter,
  onAddApplication,
}) => {
  const { heading, body } = content[type];

  return (
    <div
      role="status"
      aria-label={heading}
      className="flex flex-col items-center justify-center py-20 px-6 text-center"
    >
      <div className="mb-6">{illustrations[type]}</div>

      <h2 className="text-xl font-semibold text-gray-800 mb-2">{heading}</h2>
      <p className="text-gray-500 max-w-sm mb-8">{body(filterLabel)}</p>

      <div className="flex flex-col sm:flex-row gap-3">
        {type === 'applications-filtered' && onClearFilter && (
          <button
            onClick={onClearFilter}
            className="px-5 py-2 text-sm font-medium border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            View all applications
          </button>
        )}
        {onAddApplication && (
          <button
            onClick={onAddApplication}
            className="px-5 py-2 text-sm font-medium bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            {type === 'applications' ? 'Add your first application' : 'Add application'}
          </button>
        )}
      </div>
    </div>
  );
};
