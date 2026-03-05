import apiClient from '@/lib/api/client';
import type {
  ActionAlert,
  CreateAlertInput,
  Poll,
  CreatePollInput,
  VoteInput,
  GroupTreasury,
  ContributeInput,
  DisburseInput,
} from '@embr/types';

export const organizingApi = {
  async createAlert(groupId: string, input: CreateAlertInput): Promise<ActionAlert> {
    const { data } = await apiClient.post(`/groups/${groupId}/alerts`, input);
    return data;
  },

  async getAlerts(groupId: string, includeInactive = false): Promise<ActionAlert[]> {
    const { data } = await apiClient.get(`/groups/${groupId}/alerts`, {
      params: { includeInactive },
    });
    return data;
  },

  async deactivateAlert(groupId: string, alertId: string): Promise<ActionAlert> {
    const { data } = await apiClient.patch(`/groups/${groupId}/alerts/${alertId}/deactivate`);
    return data;
  },

  async createPoll(groupId: string, input: CreatePollInput): Promise<Poll> {
    const { data } = await apiClient.post(`/groups/${groupId}/polls`, input);
    return data;
  },

  async getPolls(groupId: string): Promise<Poll[]> {
    const { data } = await apiClient.get(`/groups/${groupId}/polls`);
    return data;
  },

  async vote(groupId: string, pollId: string, input: VoteInput): Promise<Poll> {
    const { data } = await apiClient.post(`/groups/${groupId}/polls/${pollId}/vote`, input);
    return data;
  },

  async closePoll(groupId: string, pollId: string): Promise<Poll> {
    const { data } = await apiClient.patch(`/groups/${groupId}/polls/${pollId}/close`);
    return data;
  },

  async getPollResults(groupId: string, pollId: string): Promise<Poll> {
    const { data } = await apiClient.get(`/groups/${groupId}/polls/${pollId}/results`);
    return data;
  },

  async getTreasury(groupId: string): Promise<GroupTreasury> {
    const { data } = await apiClient.get(`/groups/${groupId}/treasury`);
    return data;
  },

  async contribute(groupId: string, input: ContributeInput): Promise<GroupTreasury> {
    const { data } = await apiClient.post(`/groups/${groupId}/treasury/contribute`, input);
    return data;
  },

  async disburse(groupId: string, input: DisburseInput): Promise<GroupTreasury> {
    const { data } = await apiClient.post(`/groups/${groupId}/treasury/disburse`, input);
    return data;
  },
};
