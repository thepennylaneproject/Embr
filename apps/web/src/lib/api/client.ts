import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';
import { trackReliabilityEvent } from '@/lib/reliability';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3003/api';

function buildLoginRedirectPath() {
  if (typeof window === 'undefined') {
    return '/auth/login';
  }

  const currentPath = `${window.location.pathname || ''}${window.location.search || ''}`;
  const encodedPath = encodeURIComponent(currentPath || '/');
  return `/auth/login?next=${encodedPath}`;
}

export const apiClient = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true, // Always send cookies with requests
});

apiClient.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    // Tokens are now sent via httpOnly cookies automatically
    // withCredentials: true ensures cookies are included in every request
    return config;
  },
  (error) => Promise.reject(error),
);

apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean };

    if (error.response?.status === 401 && originalRequest && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        trackReliabilityEvent('auth_401_retry_started');
        // Attempt to refresh tokens via API
        // The API will set new httpOnly cookies in the response
        await axios.post(
          `${API_URL}/auth/refresh`,
          {}, // No need to send refreshToken in body - it's in cookies
          { withCredentials: true }, // Ensure cookies are sent
        );

        // Cookies are now set by the response; retry original request
        trackReliabilityEvent('auth_401_retry_succeeded');
        return apiClient(originalRequest);
      } catch (refreshError) {
        trackReliabilityEvent('auth_401_retry_failed');
        // Only redirect to login if not already on an auth page (avoids refresh loop on /auth/login)
        if (typeof window !== 'undefined') {
          const path = window.location.pathname || '';
          const isAuthPage = path.startsWith('/auth/');
          if (!isAuthPage) {
            window.location.href = buildLoginRedirectPath();
          }
        }
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  },
);

export default apiClient;
