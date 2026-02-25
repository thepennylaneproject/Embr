import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3003/api';

function getStorageItem(key: string) {
  if (typeof window === 'undefined') {
    return null;
  }
  return localStorage.getItem(key);
}

function setStorageItem(key: string, value: string) {
  if (typeof window !== 'undefined') {
    localStorage.setItem(key, value);
  }
}

function clearAuthStorage() {
  if (typeof window !== 'undefined') {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
  }
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
        // Attempt to refresh tokens via API
        // The API will set new httpOnly cookies in the response
        const response = await axios.post(
          `${API_URL}/auth/refresh`,
          {}, // No need to send refreshToken in body - it's in cookies
          { withCredentials: true }, // Ensure cookies are sent
        );

        // Cookies are now set by the response; retry original request
        return apiClient(originalRequest);
      } catch (refreshError) {
        // Clear any client-side storage and redirect to login
        clearAuthStorage();
        if (typeof window !== 'undefined') {
          window.location.href = '/auth/login';
        }
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  },
);

export default apiClient;
