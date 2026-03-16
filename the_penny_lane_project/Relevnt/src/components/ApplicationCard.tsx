import React from 'react';
import { Application } from '../types/application';

const STATUS_STYLES: Record<Application['status'], string> = {
  applied: 'bg-blue-100 text-blue-700',
  reviewing: 'bg-yellow-100 text-yellow-700',
  interviewing: 'bg-purple-100 text-purple-700',
  in_review: 'bg-orange-100 text-orange-700',
  offer: 'bg-teal-100 text-teal-700',
  accepted: 'bg-green-100 text-green-700',
  rejected: 'bg-red-100 text-red-700',
};

const STATUS_LABELS: Record<Application['status'], string> = {
  applied: 'Applied',
  reviewing: 'Reviewing',
  interviewing: 'Interviewing',
  in_review: 'In Review',
  offer: 'Offer',
  accepted: 'Accepted',
  rejected: 'Rejected',
};

interface ApplicationCardProps {
  application: Application;
}

export const ApplicationCard: React.FC<ApplicationCardProps> = ({ application }) => {
  const appliedDate = new Date(application.appliedAt).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

  return (
    <article className="bg-white border border-gray-200 rounded-xl p-5 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-gray-900 truncate">{application.role}</h3>
          <p className="text-sm text-gray-600 mt-0.5">{application.companyName}</p>
          {application.location && (
            <p className="text-xs text-gray-400 mt-1">{application.location}</p>
          )}
        </div>
        <span
          className={`shrink-0 text-xs font-medium px-2.5 py-1 rounded-full ${
            STATUS_STYLES[application.status]
          }`}
        >
          {STATUS_LABELS[application.status]}
        </span>
      </div>

      <div className="flex items-center gap-4 mt-4 text-xs text-gray-400">
        <span>Applied {appliedDate}</span>
        {application.salary && <span>{application.salary}</span>}
      </div>

      {application.notes && (
        <p className="mt-3 text-sm text-gray-600 line-clamp-2">{application.notes}</p>
      )}
    </article>
  );
};
