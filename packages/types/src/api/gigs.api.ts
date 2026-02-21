import { apiClient } from './client';
import type {
  Gig,
  GigWithDetails,
  PaginatedGigs,
  GigStats,
  Application,
  ApplicationWithDetails,
  PaginatedApplications,
  Escrow,
  GigMilestone,
  CreateGigData,
  UpdateGigData,
  GigSearchParams,
  CreateApplicationData,
  FundEscrowData,
  ReleaseMilestoneData,
} from '../types/gig.types';

// ============================================================================
// GIGS API
// ============================================================================

export const gigsApi = {
  /**
   * Create a new gig
   */
  create: async (data: CreateGigData): Promise<Gig> => {
    const response = await apiClient.post('/gigs', data);
    return response.data;
  },

  /**
   * Publish a draft gig
   */
  publish: async (gigId: string): Promise<Gig> => {
    const response = await apiClient.post(`/gigs/${gigId}/publish`);
    return response.data;
  },

  /**
   * Search and filter gigs
   */
  search: async (params: GigSearchParams): Promise<PaginatedGigs> => {
    const response = await apiClient.get('/gigs', { params });
    return response.data;
  },

  /**
   * Get a specific gig
   */
  getById: async (gigId: string): Promise<GigWithDetails> => {
    const response = await apiClient.get(`/gigs/${gigId}`);
    return response.data;
  },

  /**
   * Get current user's gigs
   */
  getMyGigs: async (page = 1, limit = 20): Promise<PaginatedGigs> => {
    const response = await apiClient.get('/gigs/my-gigs', {
      params: { page, limit },
    });
    return response.data;
  },

  /**
   * Get gigs by a specific creator
   */
  getByCreator: async (creatorId: string, page = 1, limit = 20): Promise<PaginatedGigs> => {
    const response = await apiClient.get(`/gigs/creator/${creatorId}`, {
      params: { page, limit },
    });
    return response.data;
  },

  /**
   * Get recommended gigs
   */
  getRecommended: async (limit = 10): Promise<Gig[]> => {
    const response = await apiClient.get('/gigs/recommended', {
      params: { limit },
    });
    return response.data;
  },

  /**
   * Get gig statistics
   */
  getStats: async (): Promise<GigStats> => {
    const response = await apiClient.get('/gigs/stats');
    return response.data;
  },

  /**
   * Update a gig
   */
  update: async (gigId: string, data: UpdateGigData): Promise<Gig> => {
    const response = await apiClient.put(`/gigs/${gigId}`, data);
    return response.data;
  },

  /**
   * Cancel a gig
   */
  cancel: async (gigId: string): Promise<Gig> => {
    const response = await apiClient.post(`/gigs/${gigId}/cancel`);
    return response.data;
  },

  /**
   * Mark gig as completed
   */
  complete: async (gigId: string): Promise<Gig> => {
    const response = await apiClient.post(`/gigs/${gigId}/complete`);
    return response.data;
  },

  /**
   * Delete a gig
   */
  delete: async (gigId: string): Promise<void> => {
    await apiClient.delete(`/gigs/${gigId}`);
  },
};

// ============================================================================
// APPLICATIONS API
// ============================================================================

export const applicationsApi = {
  /**
   * Submit a new application
   */
  create: async (data: CreateApplicationData): Promise<Application> => {
    const response = await apiClient.post('/applications', data);
    return response.data;
  },

  /**
   * Get current user's applications
   */
  getMyApplications: async (page = 1, limit = 20): Promise<PaginatedApplications> => {
    const response = await apiClient.get('/applications/my-applications', {
      params: { page, limit },
    });
    return response.data;
  },

  /**
   * Get applications for a specific gig
   */
  getByGig: async (gigId: string, page = 1, limit = 20): Promise<PaginatedApplications> => {
    const response = await apiClient.get(`/applications/gig/${gigId}`, {
      params: { page, limit },
    });
    return response.data;
  },

  /**
   * Get application details
   */
  getById: async (applicationId: string): Promise<ApplicationWithDetails> => {
    const response = await apiClient.get(`/applications/${applicationId}`);
    return response.data;
  },

  /**
   * Get application statistics
   */
  getStats: async () => {
    const response = await apiClient.get('/applications/stats');
    return response.data;
  },

  /**
   * Accept an application
   */
  accept: async (applicationId: string): Promise<Application> => {
    const response = await apiClient.post(`/applications/${applicationId}/accept`);
    return response.data;
  },

  /**
   * Reject an application
   */
  reject: async (applicationId: string): Promise<Application> => {
    const response = await apiClient.post(`/applications/${applicationId}/reject`);
    return response.data;
  },

  /**
   * Withdraw an application
   */
  withdraw: async (applicationId: string): Promise<Application> => {
    const response = await apiClient.post(`/applications/${applicationId}/withdraw`);
    return response.data;
  },
};

// ============================================================================
// ESCROW API
// ============================================================================

export const escrowApi = {
  /**
   * Get escrow by application
   */
  getByApplication: async (applicationId: string): Promise<Escrow | null> => {
    const response = await apiClient.get(`/escrow/application/${applicationId}`);
    return response.data;
  },

  /**
   * Get escrow details
   */
  getById: async (escrowId: string): Promise<Escrow> => {
    const response = await apiClient.get(`/escrow/${escrowId}`);
    return response.data;
  },

  /**
   * Fund an escrow
   */
  fund: async (escrowId: string, data: FundEscrowData): Promise<Escrow> => {
    const response = await apiClient.post(`/escrow/${escrowId}/fund`, data);
    return response.data;
  },

  /**
   * Release milestone payment
   */
  releaseMilestone: async (escrowId: string, data: ReleaseMilestoneData) => {
    const response = await apiClient.post(`/escrow/${escrowId}/release-milestone`, data);
    return response.data;
  },

  /**
   * Get released amount
   */
  getReleasedAmount: async (escrowId: string): Promise<number> => {
    const response = await apiClient.get(`/escrow/${escrowId}/released-amount`);
    return response.data.amount;
  },
};

// ============================================================================
// MILESTONES API
// ============================================================================

export const milestonesApi = {
  /**
   * Get milestones for an application
   */
  getByApplication: async (applicationId: string): Promise<GigMilestone[]> => {
    const response = await apiClient.get(`/milestones/application/${applicationId}`);
    return response.data;
  },

  /**
   * Submit a milestone
   */
  submit: async (milestoneId: string): Promise<GigMilestone> => {
    const response = await apiClient.post(`/milestones/${milestoneId}/submit`);
    return response.data;
  },

  /**
   * Approve a milestone
   */
  approve: async (milestoneId: string, feedback?: string): Promise<GigMilestone> => {
    const response = await apiClient.post(`/milestones/${milestoneId}/approve`, { feedback });
    return response.data;
  },

  /**
   * Reject a milestone
   */
  reject: async (milestoneId: string, feedback: string): Promise<GigMilestone> => {
    const response = await apiClient.post(`/milestones/${milestoneId}/reject`, { feedback });
    return response.data;
  },
};
