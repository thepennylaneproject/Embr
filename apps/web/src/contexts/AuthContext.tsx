import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { authApi } from '@/lib/api/auth';
import { User } from '@/types/auth';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  signup: (email: string, username: string, password: string, fullName?: string) => Promise<void>;
  logout: () => Promise<void>;
  updateUser: (user: User) => void;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

function hasWindow() {
  return typeof window !== 'undefined';
}

/**
 * Decode JWT token to get expiry time
 * Returns expiry time in milliseconds, or null if invalid
 */
function getTokenExpiry(token: string): number | null {
  try {
    // JWT format: header.payload.signature
    const parts = token.split('.');
    if (parts.length !== 3) return null;

    // Decode payload (base64url)
    const decoded = atob(parts[1].replace(/-/g, '+').replace(/_/g, '/'));
    const payload = JSON.parse(decoded);

    // exp is in seconds, convert to milliseconds
    return payload.exp ? payload.exp * 1000 : null;
  } catch {
    return null;
  }
}

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshTimer, setRefreshTimer] = useState<NodeJS.Timeout | null>(null);

  const checkAuth = useCallback(async () => {
    if (!hasWindow()) {
      setLoading(false);
      return;
    }

    try {
      // Tokens are stored in httpOnly cookies, so we just check if user is authenticated
      // by attempting to fetch user data. The API will use the cookies automatically.
      const userData = await authApi.getMe();
      setUser(userData);
    } catch (error: any) {
      // 401 is expected when not logged in; only log other failures
      if (error?.response?.status !== 401) {
        console.error('Auth check failed:', error);
      }
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Refresh access token before expiry
   * Called proactively to prevent 401 errors mid-session
   */
  const refreshAccessToken = useCallback(async () => {
    try {
      // Attempt to refresh the token via API
      // The API uses the refresh token from httpOnly cookie
      await authApi.refreshToken();
      console.log('Token refreshed successfully');
    } catch (error) {
      console.error('Token refresh failed, user may need to re-login:', error);
      setUser(null);
    }
  }, []);

  /**
   * Set up proactive token refresh timer
   * Refresh token 1 minute before it expires
   */
  const _scheduleTokenRefresh = useCallback(
    (token: string | null) => {
      // Clear existing timer
      if (refreshTimer) {
        clearTimeout(refreshTimer);
        setRefreshTimer(null);
      }

      if (!token || !hasWindow()) return;

      const expiry = getTokenExpiry(token);
      if (!expiry) return;

      // Refresh 60 seconds before expiry
      const refreshTime = expiry - Date.now() - 60000;

      if (refreshTime <= 0) {
        // Token already expires soon, refresh immediately
        refreshAccessToken();
      } else {
        // Schedule refresh for later
        const timer = setTimeout(() => {
          refreshAccessToken();
        }, refreshTime);

        setRefreshTimer(timer);
      }
    },
    [refreshTimer, refreshAccessToken],
  );

  useEffect(() => {
    checkAuth();

    // Cleanup on unmount
    return () => {
      if (refreshTimer) {
        clearTimeout(refreshTimer);
      }
    };
  }, [checkAuth, refreshTimer, _scheduleTokenRefresh]);

  /**
   * Set up token refresh on user login
   * Note: httpOnly cookies are set by the API, so we can't access the token directly
   * Instead, we'll use a shorter refresh interval as a fallback
   */
  useEffect(() => {
    if (!user || !hasWindow()) return;

    // As a fallback mechanism, refresh token every 10 minutes
    // This handles cases where the token doesn't include exp or is inaccessible
    const fallbackTimer = setInterval(() => {
      refreshAccessToken();
    }, 10 * 60 * 1000);

    return () => {
      if (fallbackTimer) clearInterval(fallbackTimer);
    };
  }, [user, refreshAccessToken]);

  const login = async (email: string, password: string) => {
    const response = await authApi.login(email, password);
    // Tokens are now in httpOnly cookies; no need to store in localStorage
    // Response contains just the user data
    setUser(response.user);
  };

  const signup = async (email: string, username: string, password: string, fullName?: string) => {
    await authApi.signup(email, username, password, fullName);
    // After signup, user must verify email before getting access tokens
    // Don't set user; let them navigate to verification page
    // User will be logged in automatically after email verification
  };

  const logout = async () => {
    try {
      // Call logout API to invalidate the refresh token on server
      // Refresh token is in httpOnly cookie; API will use it automatically
      await authApi.logout();
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      // Clear refresh timer
      if (refreshTimer) {
        clearTimeout(refreshTimer);
        setRefreshTimer(null);
      }
      // Tokens are in httpOnly cookies and will be cleared by API
      // Clear user state locally
      setUser(null);
    }
  };

  const updateUser = (userData: User) => {
    setUser(userData);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        login,
        signup,
        logout,
        updateUser,
        isAuthenticated: Boolean(user),
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
