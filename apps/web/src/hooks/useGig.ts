import { useState, useCallback } from 'react';
import { gigsApi, applicationsApi, escrowApi, milestonesApi } from '@shared/api/gigs.api';
import type {
  Gig,
  GigWithDetails,
  Application,
  ApplicationWithDetails,
  Escrow,
  GigMilestone,
  CreateGigData,
  UpdateGigData,
  CreateApplicationData,
  GigSearchParams,
} from '@embr/types';

interface UseGigResult {
  gig: GigWithDetails | null;
  loading: boolean;
  error: string | null;
  fetchGig: (gigId: string) => Promise<void>;
  updateGig: (gigId: string, data: UpdateGigData) => Promise<void>;
  cancelGig: (gigId: string) => Promise<void>;
  completeGig: (gigId: string) => Promise<void>;
}

export const useGig = (): UseGigResult => {
  const [gig, setGig] = useState<GigWithDetails | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchGig = useCallback(async (gigId: string) => {
    setLoading(true);
    setError(null);
    try {
      const result = await gigsApi.getById(gigId);
      setGig(result);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to fetch gig');
    } finally {
      setLoading(false);
    }
  }, []);

  const updateGig = useCallback(async (gigId: string, data: UpdateGigData) => {
    setLoading(true);
    setError(null);
    try {
      const result = await gigsApi.update(gigId, data);
      setGig((prev) => prev ? { ...prev, ...result } : null);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to update gig');
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const cancelGig = useCallback(async (gigId: string) => {
    setLoading(true);
    setError(null);
    try {
      await gigsApi.cancel(gigId);
      if (gig) {
        setGig({ ...gig, status: 'CANCELLED' as any });
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to cancel gig');
      throw err;
    } finally {
      setLoading(false);
    }
  }, [gig]);

  const completeGig = useCallback(async (gigId: string) => {
    setLoading(true);
    setError(null);
    try {
      await gigsApi.complete(gigId);
      if (gig) {
        setGig({ ...gig, status: 'COMPLETED' as any });
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to complete gig');
      throw err;
    } finally {
      setLoading(false);
    }
  }, [gig]);

  return {
    gig,
    loading,
    error,
    fetchGig,
    updateGig,
    cancelGig,
    completeGig,
  };
};

interface UseApplicationResult {
  application: ApplicationWithDetails | null;
  loading: boolean;
  error: string | null;
  fetchApplication: (applicationId: string) => Promise<void>;
  submitApplication: (data: CreateApplicationData) => Promise<string>;
  acceptApplication: (applicationId: string) => Promise<void>;
  rejectApplication: (applicationId: string) => Promise<void>;
  withdrawApplication: (applicationId: string) => Promise<void>;
}

export const useApplication = (): UseApplicationResult => {
  const [application, setApplication] = useState<ApplicationWithDetails | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchApplication = useCallback(async (applicationId: string) => {
    setLoading(true);
    setError(null);
    try {
      const result = await applicationsApi.getById(applicationId);
      setApplication(result);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to fetch application');
    } finally {
      setLoading(false);
    }
  }, []);

  const submitApplication = useCallback(async (data: CreateApplicationData): Promise<string> => {
    setLoading(true);
    setError(null);
    try {
      const result = await applicationsApi.create(data);
      return result.id;
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to submit application');
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const acceptApplication = useCallback(async (applicationId: string) => {
    setLoading(true);
    setError(null);
    try {
      await applicationsApi.accept(applicationId);
      if (application) {
        setApplication({ ...application, status: 'ACCEPTED' as any });
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to accept application');
      throw err;
    } finally {
      setLoading(false);
    }
  }, [application]);

  const rejectApplication = useCallback(async (applicationId: string) => {
    setLoading(true);
    setError(null);
    try {
      await applicationsApi.reject(applicationId);
      if (application) {
        setApplication({ ...application, status: 'REJECTED' as any });
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to reject application');
      throw err;
    } finally {
      setLoading(false);
    }
  }, [application]);

  const withdrawApplication = useCallback(async (applicationId: string) => {
    setLoading(true);
    setError(null);
    try {
      await applicationsApi.withdraw(applicationId);
      if (application) {
        setApplication({ ...application, status: 'WITHDRAWN' as any });
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to withdraw application');
      throw err;
    } finally {
      setLoading(false);
    }
  }, [application]);

  return {
    application,
    loading,
    error,
    fetchApplication,
    submitApplication,
    acceptApplication,
    rejectApplication,
    withdrawApplication,
  };
};

interface UseMilestonesResult {
  milestones: GigMilestone[];
  loading: boolean;
  error: string | null;
  fetchMilestones: (applicationId: string) => Promise<void>;
  submitMilestone: (milestoneId: string) => Promise<void>;
  approveMilestone: (milestoneId: string, feedback?: string) => Promise<void>;
  rejectMilestone: (milestoneId: string, feedback: string) => Promise<void>;
}

export const useMilestones = (): UseMilestonesResult => {
  const [milestones, setMilestones] = useState<GigMilestone[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchMilestones = useCallback(async (applicationId: string) => {
    setLoading(true);
    setError(null);
    try {
      const result = await milestonesApi.getByApplication(applicationId);
      setMilestones(result);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to fetch milestones');
    } finally {
      setLoading(false);
    }
  }, []);

  const submitMilestone = useCallback(async (milestoneId: string) => {
    setLoading(true);
    setError(null);
    try {
      const result = await milestonesApi.submit(milestoneId);
      setMilestones((prev) =>
        prev.map((m) => (m.id === milestoneId ? result : m))
      );
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to submit milestone');
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const approveMilestone = useCallback(async (milestoneId: string, feedback?: string) => {
    setLoading(true);
    setError(null);
    try {
      const result = await milestonesApi.approve(milestoneId, feedback);
      setMilestones((prev) =>
        prev.map((m) => (m.id === milestoneId ? result : m))
      );
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to approve milestone');
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const rejectMilestone = useCallback(async (milestoneId: string, feedback: string) => {
    setLoading(true);
    setError(null);
    try {
      const result = await milestonesApi.reject(milestoneId, feedback);
      setMilestones((prev) =>
        prev.map((m) => (m.id === milestoneId ? result : m))
      );
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to reject milestone');
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    milestones,
    loading,
    error,
    fetchMilestones,
    submitMilestone,
    approveMilestone,
    rejectMilestone,
  };
};
