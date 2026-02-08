import apiClient from './client';
import { User, AuthResponse } from '@/types/auth';

const API_PUBLIC_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3003/api';

export const authApi = {
  signup: async (
    email: string,
    username: string,
    password: string,
    fullName?: string,
  ): Promise<AuthResponse> => {
    const response = await apiClient.post('/auth/signup', {
      email,
      username,
      password,
      fullName,
    });
    return response.data;
  },

  login: async (email: string, password: string): Promise<AuthResponse> => {
    const response = await apiClient.post('/auth/login', { email, password });
    return response.data;
  },

  googleLogin: (redirectUrl: string) => {
    if (typeof window !== 'undefined') {
      window.location.href = `${API_PUBLIC_URL}/auth/google?redirect=${encodeURIComponent(redirectUrl)}`;
    }
  },

  logout: async (refreshToken: string): Promise<void> => {
    await apiClient.post('/auth/logout', { refreshToken });
  },

  forgotPassword: async (email: string): Promise<{ message: string }> => {
    const response = await apiClient.post('/auth/forgot-password', { email });
    return response.data;
  },

  resetPassword: async (token: string, newPassword: string): Promise<{ message: string }> => {
    const response = await apiClient.post('/auth/reset-password', {
      token,
      newPassword,
    });
    return response.data;
  },

  changePassword: async (currentPassword: string, newPassword: string): Promise<{ message: string }> => {
    const response = await apiClient.patch('/auth/change-password', {
      currentPassword,
      newPassword,
    });
    return response.data;
  },

  verifyEmail: async (token: string): Promise<{ message: string }> => {
    const response = await apiClient.post('/auth/verify-email', { token });
    return response.data;
  },

  resendVerification: async (email: string): Promise<{ message: string }> => {
    const response = await apiClient.post('/auth/resend-verification', { email });
    return response.data;
  },

  getMe: async (): Promise<User> => {
    const response = await apiClient.get('/auth/me');
    return response.data;
  },
};

export default authApi;
