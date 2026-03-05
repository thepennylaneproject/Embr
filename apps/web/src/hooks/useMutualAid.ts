import { useState, useCallback } from 'react';
import { mutualAidApi } from '@shared/api/mutual-aid.api';
import type {
  MutualAidPost,
  CreateMutualAidPostInput,
  UpdateMutualAidPostInput,
  MutualAidSearchParams,
  PaginatedMutualAidPosts,
} from '@embr/types';

export function useMutualAid() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const createPost = useCallback(async (input: CreateMutualAidPostInput): Promise<MutualAidPost> => {
    setLoading(true);
    setError(null);
    try {
      return await mutualAidApi.create(input);
    } catch (e: any) {
      const msg = e.response?.data?.message || 'Failed to create post';
      setError(msg);
      throw e;
    } finally {
      setLoading(false);
    }
  }, []);

  const getPosts = useCallback(async (params?: MutualAidSearchParams): Promise<PaginatedMutualAidPosts> => {
    setLoading(true);
    setError(null);
    try {
      return await mutualAidApi.findAll(params);
    } catch (e: any) {
      setError(e.response?.data?.message || 'Failed to load posts');
      throw e;
    } finally {
      setLoading(false);
    }
  }, []);

  const getPost = useCallback(async (id: string): Promise<MutualAidPost> => {
    setLoading(true);
    try {
      return await mutualAidApi.findOne(id);
    } catch (e: any) {
      setError(e.response?.data?.message || 'Failed to load post');
      throw e;
    } finally {
      setLoading(false);
    }
  }, []);

  const updatePost = useCallback(async (id: string, input: UpdateMutualAidPostInput): Promise<MutualAidPost> => {
    setLoading(true);
    try {
      return await mutualAidApi.update(id, input);
    } catch (e: any) {
      setError(e.response?.data?.message || 'Failed to update post');
      throw e;
    } finally {
      setLoading(false);
    }
  }, []);

  const deletePost = useCallback(async (id: string): Promise<void> => {
    setLoading(true);
    try {
      await mutualAidApi.delete(id);
    } catch (e: any) {
      setError(e.response?.data?.message || 'Failed to delete post');
      throw e;
    } finally {
      setLoading(false);
    }
  }, []);

  const markFulfilled = useCallback(async (id: string): Promise<MutualAidPost> => {
    setLoading(true);
    try {
      return await mutualAidApi.markFulfilled(id);
    } catch (e: any) {
      setError(e.response?.data?.message || 'Failed to mark as fulfilled');
      throw e;
    } finally {
      setLoading(false);
    }
  }, []);

  const respond = useCallback(async (postId: string, message: string) => {
    setLoading(true);
    try {
      return await mutualAidApi.respond(postId, message);
    } catch (e: any) {
      setError(e.response?.data?.message || 'Failed to respond');
      throw e;
    } finally {
      setLoading(false);
    }
  }, []);

  const acceptResponse = useCallback(async (postId: string, responseId: string) => {
    return mutualAidApi.acceptResponse(postId, responseId);
  }, []);

  const completeResponse = useCallback(async (postId: string, responseId: string) => {
    return mutualAidApi.completeResponse(postId, responseId);
  }, []);

  const declineResponse = useCallback(async (postId: string, responseId: string) => {
    return mutualAidApi.declineResponse(postId, responseId);
  }, []);

  return {
    loading,
    error,
    createPost,
    getPosts,
    getPost,
    updatePost,
    deletePost,
    markFulfilled,
    respond,
    acceptResponse,
    completeResponse,
    declineResponse,
  };
}
