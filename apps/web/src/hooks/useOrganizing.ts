import { useState, useCallback } from 'react';
import { organizingApi } from '@shared/api/organizing.api';
import { getApiErrorMessage } from '@/lib/api/error';
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

  const wrap = async <T>(fn: () => Promise<T>, fallback: string): Promise<T> => {
    setLoading(true);
    setError(null);
    try {
      return await fn();
    } catch (e: any) {
      const msg = getApiErrorMessage(e, fallback);
      setError(msg);
      throw e;
    } finally {
      setLoading(false);
    }
  };

  const createAlert = useCallback((groupId: string, input: CreateAlertInput): Promise<ActionAlert> =>
    wrap(() => organizingApi.createAlert(groupId, input), 'Could not create the alert. Please try again.'), []);

  const getAlerts = useCallback((groupId: string, includeInactive?: boolean): Promise<ActionAlert[]> =>
    wrap(() => organizingApi.getAlerts(groupId, includeInactive), 'Could not load alerts. Please refresh.'), []);

  const deactivateAlert = useCallback((groupId: string, alertId: string): Promise<ActionAlert> =>
    wrap(() => organizingApi.deactivateAlert(groupId, alertId), 'Could not deactivate the alert. Please try again.'), []);

  const createPoll = useCallback((groupId: string, input: CreatePollInput): Promise<Poll> =>
    wrap(() => organizingApi.createPoll(groupId, input), 'Could not create the poll. Please try again.'), []);

  const getPolls = useCallback((groupId: string): Promise<Poll[]> =>
    wrap(() => organizingApi.getPolls(groupId), 'Could not load polls. Please refresh.'), []);

  const vote = useCallback((groupId: string, pollId: string, input: VoteInput): Promise<Poll> =>
    wrap(() => organizingApi.vote(groupId, pollId, input), 'Could not submit your vote. Please try again.'), []);

  const closePoll = useCallback((groupId: string, pollId: string): Promise<Poll> =>
    wrap(() => organizingApi.closePoll(groupId, pollId), 'Could not close the poll. Please try again.'), []);

  const getPollResults = useCallback((groupId: string, pollId: string): Promise<Poll> =>
    wrap(() => organizingApi.getPollResults(groupId, pollId), 'Could not load poll results. Please refresh.'), []);

  const getTreasury = useCallback((groupId: string): Promise<GroupTreasury> =>
    wrap(() => organizingApi.getTreasury(groupId), 'Could not load treasury info. Please refresh.'), []);

  const contribute = useCallback((groupId: string, input: ContributeInput): Promise<GroupTreasury> =>
    wrap(() => organizingApi.contribute(groupId, input), 'Could not process the contribution. Please try again.'), []);

  const disburse = useCallback((groupId: string, input: DisburseInput): Promise<GroupTreasury> =>
    wrap(() => organizingApi.disburse(groupId, input), 'Could not process the disbursement. Please try again.'), []);

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
