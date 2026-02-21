import { apiClient } from './client';
import type {
  CreateReportDto,
  UpdateReportDto,
  QueryReportsDto,
  Report,
  CreateModerationActionDto,
  QueryModerationActionsDto,
  ModerationAction,
  BlockUserDto,
  BlockedUser,
  MuteUserDto,
  MutedUser,
  MuteKeywordDto,
  MutedKeyword,
  CreateAppealDto,
  UpdateAppealDto,
  QueryAppealsDto,
  Appeal,
  ContentFilterDto,
  FilterResult,
  CreateContentRuleDto,
  ContentRule,
  QueueStats,
  ModerationStats,
  FilterStats,
} from '@embr/types/safety';

export const safetyApi = {
  // ============================================
  // REPORTS
  // ============================================
  createReport: async (dto: CreateReportDto): Promise<Report> => {
    const { data } = await apiClient.post('/safety/reports', dto);
    return data;
  },

  getReports: async (query?: QueryReportsDto): Promise<{ reports: Report[]; pagination: any }> => {
    const { data } = await apiClient.get('/safety/reports', { params: query });
    return data;
  },

  getReportById: async (reportId: string): Promise<Report> => {
    const { data } = await apiClient.get(`/safety/reports/${reportId}`);
    return data;
  },

  updateReport: async (reportId: string, dto: UpdateReportDto): Promise<Report> => {
    const { data } = await apiClient.put(`/safety/reports/${reportId}`, dto);
    return data;
  },

  bulkUpdateReports: async (
    reportIds: string[],
    updates: UpdateReportDto,
  ): Promise<{ updated: number }> => {
    const { data } = await apiClient.put('/safety/reports/bulk', { reportIds, updates });
    return data;
  },

  getQueueStats: async (): Promise<QueueStats> => {
    const { data } = await apiClient.get('/safety/reports/stats/queue');
    return data;
  },

  // ============================================
  // MODERATION ACTIONS
  // ============================================
  createModerationAction: async (dto: CreateModerationActionDto): Promise<ModerationAction> => {
    const { data } = await apiClient.post('/safety/moderation/actions', dto);
    return data;
  },

  getModerationActions: async (
    query?: QueryModerationActionsDto,
  ): Promise<{ actions: ModerationAction[]; pagination: any }> => {
    const { data } = await apiClient.get('/safety/moderation/actions', { params: query });
    return data;
  },

  getModerationActionById: async (actionId: string): Promise<ModerationAction> => {
    const { data } = await apiClient.get(`/safety/moderation/actions/${actionId}`);
    return data;
  },

  revokeModerationAction: async (actionId: string, reason: string): Promise<ModerationAction> => {
    const { data } = await apiClient.delete(`/safety/moderation/actions/${actionId}`, {
      data: { reason },
    });
    return data;
  },

  getUserModerationHistory: async (userId: string): Promise<{
    actions: ModerationAction[];
    summary: any;
  }> => {
    const { data } = await apiClient.get(`/safety/moderation/users/${userId}/history`);
    return data;
  },

  checkUserRestriction: async (userId: string): Promise<{
    restricted: boolean;
    action: any | null;
  }> => {
    const { data } = await apiClient.get(`/safety/moderation/users/${userId}/restriction`);
    return data;
  },

  getModerationStats: async (days?: number): Promise<ModerationStats> => {
    const { data } = await apiClient.get('/safety/moderation/stats', { params: { days } });
    return data;
  },

  // ============================================
  // BLOCKING & MUTING
  // ============================================
  blockUser: async (dto: BlockUserDto): Promise<BlockedUser> => {
    const { data } = await apiClient.post('/safety/blocking/block', dto);
    return data;
  },

  unblockUser: async (userId: string): Promise<{ success: boolean }> => {
    const { data } = await apiClient.delete(`/safety/blocking/block/${userId}`);
    return data;
  },

  getBlockedUsers: async (): Promise<{ blocks: BlockedUser[]; pagination: any }> => {
    const { data } = await apiClient.get('/safety/blocking/blocked');
    return data;
  },

  checkIfBlocked: async (userId: string): Promise<{ blocked: boolean }> => {
    const { data } = await apiClient.get(`/safety/blocking/check/${userId}`);
    return data;
  },

  muteUser: async (dto: MuteUserDto): Promise<MutedUser> => {
    const { data } = await apiClient.post('/safety/muting/mute', dto);
    return data;
  },

  unmuteUser: async (userId: string): Promise<{ success: boolean }> => {
    const { data } = await apiClient.delete(`/safety/muting/mute/${userId}`);
    return data;
  },

  getMutedUsers: async (): Promise<{ mutes: MutedUser[]; pagination: any }> => {
    const { data } = await apiClient.get('/safety/muting/muted');
    return data;
  },

  checkIfMuted: async (userId: string): Promise<{ muted: boolean }> => {
    const { data } = await apiClient.get(`/safety/muting/check/${userId}`);
    return data;
  },

  addMutedKeyword: async (dto: MuteKeywordDto): Promise<MutedKeyword> => {
    const { data } = await apiClient.post('/safety/muting/keywords', dto);
    return data;
  },

  removeMutedKeyword: async (keywordId: string): Promise<{ success: boolean }> => {
    const { data} = await apiClient.delete(`/safety/muting/keywords/${keywordId}`);
    return data;
  },

  getMutedKeywords: async (): Promise<MutedKeyword[]> => {
    const { data } = await apiClient.get('/safety/muting/keywords');
    return data;
  },

  // ============================================
  // APPEALS
  // ============================================
  createAppeal: async (dto: CreateAppealDto): Promise<Appeal> => {
    const { data } = await apiClient.post('/safety/appeals', dto);
    return data;
  },

  getAppeals: async (query?: QueryAppealsDto): Promise<{ appeals: Appeal[]; pagination: any }> => {
    const { data } = await apiClient.get('/safety/appeals', { params: query });
    return data;
  },

  getAppealById: async (appealId: string): Promise<Appeal> => {
    const { data } = await apiClient.get(`/safety/appeals/${appealId}`);
    return data;
  },

  updateAppeal: async (appealId: string, dto: UpdateAppealDto): Promise<Appeal> => {
    const { data } = await apiClient.put(`/safety/appeals/${appealId}`, dto);
    return data;
  },

  getUserAppeals: async (): Promise<{
    appeals: Appeal[];
    summary: any;
  }> => {
    const { data } = await apiClient.get('/safety/appeals/user/my-appeals');
    return data;
  },

  getAppealStats: async (days?: number): Promise<any> => {
    const { data } = await apiClient.get('/safety/appeals/stats', { params: { days } });
    return data;
  },

  // ============================================
  // CONTENT FILTERING
  // ============================================
  filterContent: async (dto: ContentFilterDto): Promise<FilterResult> => {
    const { data } = await apiClient.post('/safety/filter/check', dto);
    return data;
  },

  getUserSpamScore: async (): Promise<{ score: number; risk: string }> => {
    const { data } = await apiClient.get('/safety/filter/user-score');
    return data;
  },

  createContentRule: async (dto: CreateContentRuleDto): Promise<ContentRule> => {
    const { data } = await apiClient.post('/safety/filter/rules', dto);
    return data;
  },

  getContentRules: async (includeDisabled?: boolean): Promise<ContentRule[]> => {
    const { data } = await apiClient.get('/safety/filter/rules', {
      params: { includeDisabled },
    });
    return data;
  },

  updateContentRule: async (
    ruleId: string,
    updates: Partial<CreateContentRuleDto>,
  ): Promise<ContentRule> => {
    const { data } = await apiClient.put(`/safety/filter/rules/${ruleId}`, updates);
    return data;
  },

  deleteContentRule: async (ruleId: string): Promise<{ success: boolean }> => {
    const { data } = await apiClient.delete(`/safety/filter/rules/${ruleId}`);
    return data;
  },

  getFilterStats: async (days?: number): Promise<FilterStats> => {
    const { data } = await apiClient.get('/safety/filter/stats', { params: { days } });
    return data;
  },
};
