import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { useRouter } from 'next/router';
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

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  const checkAuth = useCallback(async () => {
    if (!hasWindow()) {
      setLoading(false);
      return;
    }

    try {
      const accessToken = localStorage.getItem('accessToken');
      if (accessToken) {
        const userData = await authApi.getMe();
        setUser(userData);
      }
    } catch (error) {
      console.error('Auth check failed:', error);
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  const login = async (email: string, password: string) => {
    const response = await authApi.login(email, password);

    if (hasWindow()) {
      localStorage.setItem('accessToken', response.accessToken);
      localStorage.setItem('refreshToken', response.refreshToken);
    }

    setUser(response.user);
    await router.push('/feed');
  };

  const signup = async (email: string, username: string, password: string, fullName?: string) => {
    const response = await authApi.signup(email, username, password, fullName);

    if (hasWindow()) {
      localStorage.setItem('accessToken', response.accessToken);
      localStorage.setItem('refreshToken', response.refreshToken);
    }

    setUser(response.user);
    await router.push('/feed');
  };

  const logout = async () => {
    try {
      if (hasWindow()) {
        const refreshToken = localStorage.getItem('refreshToken');
        if (refreshToken) {
          await authApi.logout(refreshToken);
        }
      }
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      if (hasWindow()) {
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
      }
      setUser(null);
      await router.push('/auth/login');
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
