import React, { useState } from 'react';
import { useApplications } from '../hooks/useApplications';
import { EmptyState } from '../components/EmptyState';
import { ApplicationCard } from '../components/ApplicationCard';
import { Application, ApplicationStatus, FilterOption } from '../types/application';

// line 22: FILTER_OPTIONS defines the 8 status filter tabs for the applications view
const FILTER_OPTIONS: FilterOption[] = [
  { value: 'all', label: 'All' },
  { value: 'applied', label: 'Applied' },
  { value: 'reviewing', label: 'Reviewing' },
  { value: 'interviewing', label: 'Interviewing' },
  { value: 'in_review', label: 'In Review' },
  { value: 'offer', label: 'Offers' },
  { value: 'accepted', label: 'Accepted' },
  { value: 'rejected', label: 'Rejected' },
];

function filterApplications(
  applications: Application[],
  status: ApplicationStatus
): Application[] {
  if (status === 'all') return applications;
  return applications.filter((app) => app.status === status);
}

export const ApplicationsPage: React.FC = () => {
  const { applications, loading, error, refetch } = useApplications();
  const [activeFilter, setActiveFilter] = useState<ApplicationStatus>('all');

  const filtered = filterApplications(applications, activeFilter);

  const activeFilterLabel =
    FILTER_OPTIONS.find((o) => o.value === activeFilter)?.label ?? '';

  const handleClearFilter = () => setActiveFilter('all');

  const handleAddApplication = () => {
    // TODO: wire to application creation flow
    alert('Add application flow coming soon.');
  };

  return (
    <main className="min-h-screen bg-gray-50">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-10">
        {/* Page header */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900">Applications</h1>
          <p className="text-gray-500 mt-1 text-sm">
            Track every role you've applied to, from first submission to final decision.
          </p>
        </div>

        {/* Error banner — shown when the data fetch fails */}
        {error && (
          <div
            role="alert"
            className="mb-6 flex items-start gap-3 p-4 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700"
          >
            <svg
              aria-hidden="true"
              className="shrink-0 mt-0.5"
              width="16"
              height="16"
              viewBox="0 0 16 16"
              fill="currentColor"
            >
              <path
                fillRule="evenodd"
                d="M8 1a7 7 0 100 14A7 7 0 008 1zm-.75 4a.75.75 0 011.5 0v3.5a.75.75 0 01-1.5 0V5zm.75 6.5a.75.75 0 100-1.5.75.75 0 000 1.5z"
                clipRule="evenodd"
              />
            </svg>
            <div className="flex-1">
              <span className="font-medium">Could not load applications.</span>{' '}
              {error}
            </div>
            <button
              onClick={refetch}
              className="shrink-0 font-medium underline hover:no-underline focus:outline-none focus:ring-2 focus:ring-red-500 rounded"
            >
              Retry
            </button>
          </div>
        )}

        {/* Filter tabs */}
        <div
          role="tablist"
          aria-label="Filter applications by status"
          className="flex gap-1 flex-wrap mb-6"
        >
          {FILTER_OPTIONS.map((option) => {
            const count =
              option.value === 'all'
                ? applications.length
                : applications.filter((a) => a.status === option.value).length;

            return (
              <button
                key={option.value}
                role="tab"
                aria-selected={activeFilter === option.value}
                onClick={() => setActiveFilter(option.value)}
                className={`px-3.5 py-1.5 rounded-full text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                  activeFilter === option.value
                    ? 'bg-indigo-600 text-white'
                    : 'bg-white border border-gray-200 text-gray-600 hover:border-indigo-300 hover:text-indigo-600'
                }`}
              >
                {option.label}
                {!loading && count > 0 && (
                  <span
                    className={`ml-1.5 text-xs ${
                      activeFilter === option.value ? 'opacity-75' : 'text-gray-400'
                    }`}
                  >
                    {count}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Content area */}
        {loading ? (
          /* Loading skeleton */
          <div
            aria-label="Loading applications…"
            role="status"
            className="space-y-4"
          >
            {[1, 2, 3].map((n) => (
              <div
                key={n}
                className="bg-white border border-gray-200 rounded-xl p-5 animate-pulse"
              >
                <div className="flex justify-between gap-4">
                  <div className="flex-1 space-y-2">
                    <div className="h-4 bg-gray-200 rounded w-2/5" />
                    <div className="h-3 bg-gray-200 rounded w-1/4" />
                  </div>
                  <div className="h-6 bg-gray-200 rounded-full w-20" />
                </div>
                <div className="mt-4 h-3 bg-gray-100 rounded w-1/3" />
              </div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          /* Empty states: differentiate globally empty vs filter-empty */
          applications.length === 0 ? (
            <EmptyState
              type="applications"
              onAddApplication={handleAddApplication}
            />
          ) : (
            <EmptyState
              type="applications-filtered"
              filterLabel={activeFilterLabel}
              onClearFilter={handleClearFilter}
              onAddApplication={handleAddApplication}
            />
          )
        ) : (
          /* Application list */
          <div
            role="list"
            aria-label={`${filtered.length} application${filtered.length !== 1 ? 's' : ''}`}
            className="space-y-4"
          >
            {filtered.map((app) => (
              <div key={app.id} role="listitem">
                <ApplicationCard application={app} />
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
};

export default ApplicationsPage;
