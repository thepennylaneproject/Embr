import { useState, useCallback } from 'react';
import { safetyApi } from '@shared/api/safety.api';
import { getApiErrorMessage } from '@/lib/api/error';
import type {
  CreateReportDto,
  UpdateReportDto,
  QueryReportsDto,
  BlockUserDto,
  MuteUserDto,
  MuteKeywordDto,
  CreateAppealDto,
} from '@shared/types/safety.types';

export function useSafety() {
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // State
  const [reports, setReports] = useState<any[]>([]);
  const [queueStats, setQueueStats] = useState<any>(null);
  const [blockedUsers, setBlockedUsers] = useState<any[]>([]);
  const [mutedUsers, setMutedUsers] = useState<any[]>([]);
  const [mutedKeywords, setMutedKeywords] = useState<any[]>([]);
  const [appeals, setAppeals] = useState<any[]>([]);

  // Reports
  const createReport = useCallback(async (dto: CreateReportDto) => {
    setIsSubmitting(true);
    setError(null);
    
    try {
      const report = await safetyApi.createReport(dto);
      return report;
    } catch (err: any) {
      setError(getApiErrorMessage(err, 'Could not submit your report. Please try again.'));
      throw err;
    } finally {
      setIsSubmitting(false);
    }
  }, []);

  const fetchReports = useCallback(async (query?: QueryReportsDto) => {
    setIsLoading(true);
    setError(null);
    
    try {
      const data = await safetyApi.getReports(query);
      setReports(data.reports);
      return data;
    } catch (err: any) {
      setError(getApiErrorMessage(err, 'Could not load reports. Please refresh.'));
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const updateReport = useCallback(async (reportId: string, dto: UpdateReportDto) => {
    setIsSubmitting(true);
    setError(null);
    
    try {
      const report = await safetyApi.updateReport(reportId, dto);
      setReports((prev) => prev.map((r) => (r.id === reportId ? report : r)));
      return report;
    } catch (err: any) {
      setError(getApiErrorMessage(err, 'Could not update the report. Please try again.'));
      throw err;
    } finally {
      setIsSubmitting(false);
    }
  }, []);

  const fetchQueueStats = useCallback(async () => {
    try {
      const stats = await safetyApi.getQueueStats();
      setQueueStats(stats);
      return stats;
    } catch (err: any) {
      setError(getApiErrorMessage(err, 'Could not load queue stats. Please refresh.'));
      throw err;
    }
  }, []);

  // Blocking
  const blockUser = useCallback(async (dto: BlockUserDto) => {
    setIsSubmitting(true);
    setError(null);
    
    try {
      const block = await safetyApi.blockUser(dto);
      setBlockedUsers((prev) => [block, ...prev]);
      return block;
    } catch (err: any) {
      setError(getApiErrorMessage(err, 'Could not block this user. Please try again.'));
      throw err;
    } finally {
      setIsSubmitting(false);
    }
  }, []);

  const unblockUser = useCallback(async (userId: string) => {
    setIsSubmitting(true);
    setError(null);
    
    try {
      await safetyApi.unblockUser(userId);
      setBlockedUsers((prev) => prev.filter((b) => b.user.id !== userId));
    } catch (err: any) {
      setError(getApiErrorMessage(err, 'Could not unblock this user. Please try again.'));
      throw err;
    } finally {
      setIsSubmitting(false);
    }
  }, []);

  const fetchBlockedUsers = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const data = await safetyApi.getBlockedUsers();
      setBlockedUsers(data.blocks);
      return data;
    } catch (err: any) {
      setError(getApiErrorMessage(err, 'Could not load blocked users. Please refresh.'));
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Muting
  const muteUser = useCallback(async (dto: MuteUserDto) => {
    setIsSubmitting(true);
    setError(null);
    
    try {
      const mute = await safetyApi.muteUser(dto);
      setMutedUsers((prev) => [mute, ...prev]);
      return mute;
    } catch (err: any) {
      setError(getApiErrorMessage(err, 'Could not mute this user. Please try again.'));
      throw err;
    } finally {
      setIsSubmitting(false);
    }
  }, []);

  const unmuteUser = useCallback(async (userId: string) => {
    setIsSubmitting(true);
    setError(null);
    
    try {
      await safetyApi.unmuteUser(userId);
      setMutedUsers((prev) => prev.filter((m) => m.user.id !== userId));
    } catch (err: any) {
      setError(getApiErrorMessage(err, 'Could not unmute this user. Please try again.'));
      throw err;
    } finally {
      setIsSubmitting(false);
    }
  }, []);

  const fetchMutedUsers = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const data = await safetyApi.getMutedUsers();
      setMutedUsers(data.mutes);
      return data;
    } catch (err: any) {
      setError(getApiErrorMessage(err, 'Could not load muted users. Please refresh.'));
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Keywords
  const addMutedKeyword = useCallback(async (dto: MuteKeywordDto) => {
    setIsSubmitting(true);
    setError(null);
    
    try {
      const keyword = await safetyApi.addMutedKeyword(dto);
      setMutedKeywords((prev) => [keyword, ...prev]);
      return keyword;
    } catch (err: any) {
      setError(getApiErrorMessage(err, 'Could not add the keyword. Please try again.'));
      throw err;
    } finally {
      setIsSubmitting(false);
    }
  }, []);

  const removeMutedKeyword = useCallback(async (keywordId: string) => {
    setIsSubmitting(true);
    setError(null);
    
    try {
      await safetyApi.removeMutedKeyword(keywordId);
      setMutedKeywords((prev) => prev.filter((k) => k.id !== keywordId));
    } catch (err: any) {
      setError(getApiErrorMessage(err, 'Could not remove the keyword. Please try again.'));
      throw err;
    } finally {
      setIsSubmitting(false);
    }
  }, []);

  const fetchMutedKeywords = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const keywords = await safetyApi.getMutedKeywords();
      setMutedKeywords(keywords);
      return keywords;
    } catch (err: any) {
      setError(getApiErrorMessage(err, 'Could not load muted keywords. Please refresh.'));
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Appeals
  const createAppeal = useCallback(async (dto: CreateAppealDto) => {
    setIsSubmitting(true);
    setError(null);
    
    try {
      const appeal = await safetyApi.createAppeal(dto);
      setAppeals((prev) => [appeal, ...prev]);
      return appeal;
    } catch (err: any) {
      setError(getApiErrorMessage(err, 'Could not submit your appeal. Please try again.'));
      throw err;
    } finally {
      setIsSubmitting(false);
    }
  }, []);

  const fetchAppeals = useCallback(async (query?: any) => {
    setIsLoading(true);
    setError(null);
    
    try {
      const data = await safetyApi.getAppeals(query);
      setAppeals(data.appeals);
      return data;
    } catch (err: any) {
      setError(getApiErrorMessage(err, 'Could not load appeals. Please refresh.'));
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const filterContent = useCallback(async (content: string) => {
    try {
      const result = await safetyApi.filterContent({ content });
      return result;
    } catch (err: any) {
      setError(getApiErrorMessage(err, 'Content filter check failed. Please try again.'));
      throw err;
    }
  }, []);

  return {
    // State
    isLoading,
    isSubmitting,
    error,
    reports,
    queueStats,
    blockedUsers,
    mutedUsers,
    mutedKeywords,
    appeals,
    
    // Reports
    createReport,
    fetchReports,
    updateReport,
    fetchQueueStats,
    
    // Blocking
    blockUser,
    unblockUser,
    fetchBlockedUsers,
    
    // Muting
    muteUser,
    unmuteUser,
    fetchMutedUsers,
    
    // Keywords
    addMutedKeyword,
    removeMutedKeyword,
    fetchMutedKeywords,
    
    // Appeals
    createAppeal,
    fetchAppeals,
    
    // Content Filtering
    filterContent,
  };
}
