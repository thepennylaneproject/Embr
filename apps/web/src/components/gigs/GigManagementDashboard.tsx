import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { gigsApi, applicationsApi, milestonesApi } from '@shared/api/gigs.api';
import {
  Gig,
  Application,
  GigMilestone,
  GigStatus,
  ApplicationStatus,
  MilestoneStatus,
} from '@embr/types';

type DashboardView = 'my-gigs' | 'my-applications' | 'active-work';

export const GigManagementDashboard: React.FC = () => {
  const router = useRouter();
  const [activeView, setActiveView] = useState<DashboardView>('my-gigs');
  const [myGigs, setMyGigs] = useState<Gig[]>([]);
  const [myApplications, setMyApplications] = useState<Application[]>([]);
  const [activeMilestones, setActiveMilestones] = useState<GigMilestone[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, [activeView]);

  const loadData = async () => {
    setLoading(true);
    setError(null);

    try {
      if (activeView === 'my-gigs') {
        const result = await gigsApi.getMyGigs(1, 20);
        setMyGigs(result.gigs);
      } else if (activeView === 'my-applications') {
        const result = await applicationsApi.getMyApplications(1, 20);
        setMyApplications(result.applications);
      } else if (activeView === 'active-work') {
        // Load accepted applications with active milestones
        const result = await applicationsApi.getMyApplications(1, 100);
        const accepted = result.applications.filter(app => app.status === ApplicationStatus.ACCEPTED);
        
        // Load milestones for all accepted applications
        const allMilestones: GigMilestone[] = [];
        for (const app of accepted) {
          const milestones = await milestonesApi.getByApplication(app.id);
          allMilestones.push(...milestones);
        }
        setActiveMilestones(allMilestones);
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const handleCancelGig = async (gigId: string) => {
    if (!confirm('Are you sure you want to cancel this gig?')) return;

    try {
      await gigsApi.cancel(gigId);
      loadData();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to cancel gig');
    }
  };

  const handleCompleteGig = async (gigId: string) => {
    try {
      await gigsApi.complete(gigId);
      loadData();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to complete gig');
    }
  };

  const handleWithdrawApplication = async (applicationId: string) => {
    if (!confirm('Are you sure you want to withdraw this application?')) return;

    try {
      await applicationsApi.withdraw(applicationId);
      loadData();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to withdraw application');
    }
  };

  const handleSubmitMilestone = async (milestoneId: string) => {
    try {
      await milestonesApi.submit(milestoneId);
      loadData();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to submit milestone');
    }
  };

  const getStatusColor = (status: string) => {
    const gigColors: Record<string, string> = {
      [GigStatus.OPEN]: 'bg-green-100 text-green-800',
      [GigStatus.IN_PROGRESS]: 'bg-blue-100 text-blue-800',
      [GigStatus.COMPLETED]: 'bg-gray-100 text-gray-800',
      [GigStatus.CANCELLED]: 'bg-red-100 text-red-800',
    };

    const applicationColors: Record<string, string> = {
      [ApplicationStatus.PENDING]: 'bg-yellow-100 text-yellow-800',
      [ApplicationStatus.ACCEPTED]: 'bg-green-100 text-green-800',
      [ApplicationStatus.REJECTED]: 'bg-red-100 text-red-800',
      [ApplicationStatus.WITHDRAWN]: 'bg-gray-100 text-gray-800',
    };

    const milestoneColors: Record<string, string> = {
      [MilestoneStatus.PENDING]: 'bg-gray-100 text-gray-800',
      [MilestoneStatus.IN_PROGRESS]: 'bg-blue-100 text-blue-800',
      [MilestoneStatus.SUBMITTED]: 'bg-purple-100 text-purple-800',
      [MilestoneStatus.APPROVED]: 'bg-green-100 text-green-800',
      [MilestoneStatus.REJECTED]: 'bg-red-100 text-red-800',
    };

    return (
      gigColors[status] ||
      applicationColors[status] ||
      milestoneColors[status] ||
      'bg-gray-100 text-gray-800'
    );
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Gig Dashboard
          </h1>
          <p className="text-gray-600">Manage your gigs, applications, and active work</p>
        </div>

        {/* Navigation Tabs */}
        <div className="flex gap-4 mb-8 border-b border-gray-200">
          <button
            onClick={() => setActiveView('my-gigs')}
            className={`pb-4 px-4 font-medium transition-colors ${
              activeView === 'my-gigs'
                ? 'border-b-2 border-[#E8998D] text-[#E8998D]'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            My Gigs Posted
          </button>
          <button
            onClick={() => setActiveView('my-applications')}
            className={`pb-4 px-4 font-medium transition-colors ${
              activeView === 'my-applications'
                ? 'border-b-2 border-[#E8998D] text-[#E8998D]'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            My Applications
          </button>
          <button
            onClick={() => setActiveView('active-work')}
            className={`pb-4 px-4 font-medium transition-colors ${
              activeView === 'active-work'
                ? 'border-b-2 border-[#E8998D] text-[#E8998D]'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Active Work
          </button>
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
            <p className="mt-4 text-gray-600">Loading...</p>
          </div>
        ) : (
          <>
            {/* My Gigs View */}
            {activeView === 'my-gigs' && (
              <div className="space-y-4">
                {myGigs.length === 0 ? (
                  <div className="text-center py-12">
                    <p className="text-gray-600 mb-4">You haven't posted any gigs yet</p>
                    <button
                      onClick={() => router.push('/gigs/post')}
                      className="px-6 py-2 bg-[#E8998D] text-white rounded-lg hover:bg-[#d88a7e] transition-colors"
                    >
                      Post Your First Gig
                    </button>
                  </div>
                ) : (
                  myGigs.map((gig) => (
                    <div key={gig.id} className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <h3 className="text-xl font-semibold text-gray-900">{gig.title}</h3>
                            <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(gig.status)}`}>
                              {gig.status}
                            </span>
                          </div>
                          <p className="text-gray-600 text-sm line-clamp-2">{gig.description}</p>
                        </div>
                        <div className="text-right ml-4">
                          <div className="text-lg font-bold text-[#E8998D]">
                            ${gig.budgetMin} - ${gig.budgetMax}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-6 text-sm text-gray-600 mb-4">
                        <span>{gig.applicationsCount} applications</span>
                        <span>{gig.viewsCount} views</span>
                        <span>{gig.estimatedDuration} days</span>
                      </div>

                      <div className="flex gap-3">
                        <button
                          onClick={() => router.push(`/gigs/${gig.id}`)}
                          className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors text-sm"
                        >
                          View Details
                        </button>
                        <button
                          onClick={() => router.push(`/gigs/${gig.id}/applications`)}
                          className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors text-sm"
                        >
                          View Applications
                        </button>
                        {gig.status === GigStatus.IN_PROGRESS && (
                          <button
                            onClick={() => handleCompleteGig(gig.id)}
                            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm"
                          >
                            Mark Complete
                          </button>
                        )}
                        {([GigStatus.OPEN, GigStatus.DRAFT] as GigStatus[]).includes(gig.status) && (
                          <button
                            onClick={() => handleCancelGig(gig.id)}
                            className="px-4 py-2 text-red-600 hover:text-red-700 transition-colors text-sm"
                          >
                            Cancel Gig
                          </button>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}

            {/* My Applications View */}
            {activeView === 'my-applications' && (
              <div className="space-y-4">
                {myApplications.length === 0 ? (
                  <div className="text-center py-12">
                    <p className="text-gray-600 mb-4">You haven't applied to any gigs yet</p>
                    <button
                      onClick={() => router.push('/gigs')}
                      className="px-6 py-2 bg-[#E8998D] text-white rounded-lg hover:bg-[#d88a7e] transition-colors"
                    >
                      Browse Gigs
                    </button>
                  </div>
                ) : (
                  myApplications.map((app) => (
                    <div key={app.id} className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <h3 className="text-xl font-semibold text-gray-900">{app.gig?.title}</h3>
                            <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(app.status)}`}>
                              {app.status}
                            </span>
                          </div>
                          <p className="text-gray-600 text-sm">
                            Applied {new Date(app.createdAt).toLocaleDateString()}
                          </p>
                        </div>
                        <div className="text-right ml-4">
                          <div className="text-lg font-bold text-[#E8998D]">
                            ${app.proposedBudget}
                          </div>
                          <div className="text-sm text-gray-600">{app.proposedTimeline} days</div>
                        </div>
                      </div>

                      <div className="bg-gray-50 p-4 rounded-lg mb-4">
                        <p className="text-sm text-gray-700 line-clamp-3">{app.coverLetter}</p>
                      </div>

                      <div className="flex gap-3">
                        <button
                          onClick={() => router.push(`/gigs/${app.gigId}`)}
                          className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors text-sm"
                        >
                          View Gig
                        </button>
                        <button
                          onClick={() => router.push(`/applications/${app.id}`)}
                          className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors text-sm"
                        >
                          View Application
                        </button>
                        {app.status === ApplicationStatus.PENDING && (
                          <button
                            onClick={() => handleWithdrawApplication(app.id)}
                            className="px-4 py-2 text-red-600 hover:text-red-700 transition-colors text-sm"
                          >
                            Withdraw
                          </button>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}

            {/* Active Work View */}
            {activeView === 'active-work' && (
              <div className="space-y-4">
                {activeMilestones.length === 0 ? (
                  <div className="text-center py-12">
                    <p className="text-gray-600">No active milestones</p>
                  </div>
                ) : (
                  activeMilestones.map((milestone) => (
                    <div key={milestone.id} className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <h3 className="text-lg font-semibold text-gray-900">{milestone.title}</h3>
                            <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(milestone.status)}`}>
                              {milestone.status}
                            </span>
                          </div>
                          <p className="text-gray-600 text-sm mb-2">{milestone.description}</p>
                          <p className="text-sm text-gray-500">
                            Due: {new Date(milestone.dueDate).toLocaleDateString()}
                          </p>
                        </div>
                        <div className="text-right ml-4">
                          <div className="text-lg font-bold text-[#E8998D]">
                            ${milestone.amount}
                          </div>
                        </div>
                      </div>

                      {milestone.feedback && (
                        <div className="bg-blue-50 p-4 rounded-lg mb-4">
                          <p className="text-sm font-medium text-blue-900 mb-1">Feedback:</p>
                          <p className="text-sm text-blue-800">{milestone.feedback}</p>
                        </div>
                      )}

                      <div className="flex gap-3">
                        {milestone.status === MilestoneStatus.PENDING && (
                          <button
                            onClick={() => handleSubmitMilestone(milestone.id)}
                            className="px-4 py-2 bg-[#E8998D] text-white rounded-lg hover:bg-[#d88a7e] transition-colors text-sm"
                          >
                            Submit for Review
                          </button>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};
