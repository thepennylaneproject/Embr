import { useState, useCallback } from 'react';
import { organizingApi } from '@shared/api/organizing.api';
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

export function useOrganizing() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const wrap = async <T>(fn: () => Promise<T>): Promise<T> => {
    setLoading(true);
    setError(null);
    try {
      return await fn();
    } catch (e: any) {
      const msg = e.response?.data?.message || 'Something went wrong';
      setError(Array.isArray(msg) ? msg[0] : msg);
      throw e;
    } finally {
      setLoading(false);
    }
  };

  const createAlert = useCallback((groupId: string, input: CreateAlertInput): Promise<ActionAlert> =>
    wrap(() => organizingApi.createAlert(groupId, input)), []);

  const getAlerts = useCallback((groupId: string, includeInactive?: boolean): Promise<ActionAlert[]> =>
    wrap(() => organizingApi.getAlerts(groupId, includeInactive)), []);

  const deactivateAlert = useCallback((groupId: string, alertId: string): Promise<ActionAlert> =>
    wrap(() => organizingApi.deactivateAlert(groupId, alertId)), []);

  const createPoll = useCallback((groupId: string, input: CreatePollInput): Promise<Poll> =>
    wrap(() => organizingApi.createPoll(groupId, input)), []);

  const getPolls = useCallback((groupId: string): Promise<Poll[]> =>
    wrap(() => organizingApi.getPolls(groupId)), []);

  const vote = useCallback((groupId: string, pollId: string, input: VoteInput): Promise<Poll> =>
    wrap(() => organizingApi.vote(groupId, pollId, input)), []);

  const closePoll = useCallback((groupId: string, pollId: string): Promise<Poll> =>
    wrap(() => organizingApi.closePoll(groupId, pollId)), []);

  const getPollResults = useCallback((groupId: string, pollId: string): Promise<Poll> =>
    wrap(() => organizingApi.getPollResults(groupId, pollId)), []);

  const getTreasury = useCallback((groupId: string): Promise<GroupTreasury> =>
    wrap(() => organizingApi.getTreasury(groupId)), []);

  const contribute = useCallback((groupId: string, input: ContributeInput): Promise<GroupTreasury> =>
    wrap(() => organizingApi.contribute(groupId, input)), []);

  const disburse = useCallback((groupId: string, input: DisburseInput): Promise<GroupTreasury> =>
    wrap(() => organizingApi.disburse(groupId, input)), []);

  return {
    loading,
    error,
    createAlert,
    getAlerts,
    deactivateAlert,
    createPoll,
    getPolls,
    vote,
    closePoll,
    getPollResults,
    getTreasury,
    contribute,
    disburse,
  };
}
