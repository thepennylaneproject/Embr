import { useState, useCallback } from 'react';
import { groupsApi } from '@shared/api/groups.api';
import { getApiErrorMessage } from '@/lib/api/error';
import type {
  Group,
  GroupMember,
  CreateGroupInput,
  UpdateGroupInput,
  GroupSearchParams,
  PaginatedGroups,
} from '@embr/types';

export function useGroups() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const createGroup = useCallback(async (input: CreateGroupInput) => {
    setLoading(true);
    setError(null);
    try {
      return await groupsApi.create(input);
    } catch (e: any) {
      setError(getApiErrorMessage(e, 'Failed to create group'));
      throw e;
    } finally {
      setLoading(false);
    }
  }, []);

  const getGroups = useCallback(async (params?: GroupSearchParams): Promise<PaginatedGroups> => {
    setLoading(true);
    setError(null);
    try {
      return await groupsApi.findAll(params);
    } catch (e: any) {
      setError(getApiErrorMessage(e, 'Failed to load groups'));
      throw e;
    } finally {
      setLoading(false);
    }
  }, []);

  const getGroup = useCallback(async (slug: string): Promise<Group> => {
    setLoading(true);
    setError(null);
    try {
      return await groupsApi.findBySlug(slug);
    } catch (e: any) {
      setError(getApiErrorMessage(e, 'Failed to load group'));
      throw e;
    } finally {
      setLoading(false);
    }
  }, []);

  const getMyGroups = useCallback(async (): Promise<Group[]> => {
    setLoading(true);
    try {
      return await groupsApi.getMyGroups();
    } catch (e: any) {
      setError(getApiErrorMessage(e, 'Failed to load your groups'));
      throw e;
    } finally {
      setLoading(false);
    }
  }, []);

  const updateGroup = useCallback(async (id: string, input: UpdateGroupInput): Promise<Group> => {
    setLoading(true);
    try {
      return await groupsApi.update(id, input);
    } catch (e: any) {
      setError(getApiErrorMessage(e, 'Failed to update group'));
      throw e;
    } finally {
      setLoading(false);
    }
  }, []);

  const deleteGroup = useCallback(async (id: string): Promise<void> => {
    setLoading(true);
    try {
      await groupsApi.delete(id);
    } catch (e: any) {
      setError(getApiErrorMessage(e, 'Failed to delete group'));
      throw e;
    } finally {
      setLoading(false);
    }
  }, []);

  const joinGroup = useCallback(async (groupId: string, message?: string) => {
    setLoading(true);
    try {
      return await groupsApi.join(groupId, message);
    } catch (e: any) {
      setError(getApiErrorMessage(e, 'Failed to join group'));
      throw e;
    } finally {
      setLoading(false);
    }
  }, []);

  const leaveGroup = useCallback(async (groupId: string) => {
    setLoading(true);
    try {
      return await groupsApi.leave(groupId);
    } catch (e: any) {
      setError(getApiErrorMessage(e, 'Failed to leave group'));
      throw e;
    } finally {
      setLoading(false);
    }
  }, []);

  const getMembers = useCallback(async (groupId: string, cursor?: string) => {
    return groupsApi.getMembers(groupId, cursor);
  }, []);

  const getJoinRequests = useCallback(async (groupId: string) => {
    return groupsApi.getJoinRequests(groupId);
  }, []);

  const approveJoinRequest = useCallback(async (groupId: string, requestId: string) => {
    return groupsApi.approveJoinRequest(groupId, requestId);
  }, []);

  const rejectJoinRequest = useCallback(async (groupId: string, requestId: string) => {
    return groupsApi.rejectJoinRequest(groupId, requestId);
  }, []);

  const inviteMember = useCallback(async (groupId: string, userId: string) => {
    return groupsApi.invite(groupId, userId);
  }, []);

  return {
    loading,
    error,
    createGroup,
    getGroups,
    getGroup,
    getMyGroups,
    updateGroup,
    deleteGroup,
    joinGroup,
    leaveGroup,
    getMembers,
    getJoinRequests,
    approveJoinRequest,
    rejectJoinRequest,
    inviteMember,
  };
}
