/**
 * Authentication Context
 * Manages user authentication state and token handling
 */

import { createContext, useContext, useEffect, useState, useCallback, useMemo } from 'react';
import type { ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { authService } from '../services/auth';
import { supabase } from '../lib/supabase';
import { isFeatureEnabled } from '../config/featureFlags';
import type { User, LoginRequest, RegisterRequest } from '../types';

interface AuthContextValue {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (credentials: LoginRequest) => Promise<void>;
  register: (userData: RegisterRequest) => Promise<void>;
  logout: () => void;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const navigate = useNavigate();

  // Load user from token on mount and listen to auth state changes
  useEffect(() => {
    const useSupabaseAuth = isFeatureEnabled('supabase_auth');

    const loadUser = async () => {
      if (useSupabaseAuth) {
        // For Supabase, check session directly
        try {
          const { data: { session } } = await supabase.auth.getSession();
          if (session) {
            const userData = await authService.getCurrentUser();
            setUser(userData);
          }
        } catch (error) {
          console.error('Failed to load Supabase session:', error);
        } finally {
          setIsLoading(false);
        }
      } else {
        // For Flask, check localStorage token
        const token = authService.getAccessToken();
        if (!token) {
          setIsLoading(false);
          return;
        }

        try {
          const userData = await authService.getCurrentUser();
          setUser(userData);
        } catch (error) {
          console.error('Failed to load user:', error);
          await authService.logout();
        } finally {
          setIsLoading(false);
        }
      }
    };

    loadUser();

    // Set up Supabase auth state listener if using Supabase auth
    if (useSupabaseAuth) {
      const { data: { subscription } } = supabase.auth.onAuthStateChange(
        async (event, session) => {
          console.log('Auth state changed:', event, session?.user?.email);

          if (event === 'SIGNED_IN' && session) {
            try {
              const userData = await authService.getCurrentUser();
              setUser(userData);
            } catch (error) {
              console.error('Failed to load user after sign in:', error);
              setUser(null);
            }
          } else if (event === 'SIGNED_OUT') {
            setUser(null);
          } else if (event === 'TOKEN_REFRESHED' && session) {
            // Optionally refresh user data on token refresh
            try {
              const userData = await authService.getCurrentUser();
              setUser(userData);
            } catch (error) {
              console.error('Failed to refresh user data:', error);
            }
          } else if (event === 'USER_UPDATED' && session) {
            // Refresh user data when user profile is updated
            try {
              const userData = await authService.getCurrentUser();
              setUser(userData);
            } catch (error) {
              console.error('Failed to update user data:', error);
            }
          }
        }
      );

      // Cleanup subscription on unmount
      return () => {
        subscription.unsubscribe();
      };
    }
  }, []);

  const login = useCallback(async (credentials: LoginRequest): Promise<void> => {
    setIsLoading(true);
    try {
      const response = await authService.login(credentials);
      setUser(response.user);
      navigate('/');
    } catch (error) {
      setIsLoading(false);
      throw error;
    }
    setIsLoading(false);
  }, [navigate]);

  const register = useCallback(async (userData: RegisterRequest): Promise<void> => {
    setIsLoading(true);
    try {
      const response = await authService.register(userData);
      setUser(response.user);
      navigate('/');
    } catch (error) {
      setIsLoading(false);
      throw error;
    }
    setIsLoading(false);
  }, [navigate]);

  const logout = useCallback(async () => {
    await authService.logout();
    setUser(null);
    navigate('/login');
  }, [navigate]);

  const refreshUser = useCallback(async (): Promise<void> => {
    try {
      const userData = await authService.getCurrentUser();
      setUser(userData);
    } catch (error) {
      console.error('Failed to refresh user:', error);
      logout();
    }
  }, [logout]);

  const value: AuthContextValue = useMemo(() => ({
    user,
    isAuthenticated: !!user,
    isLoading,
    login,
    register,
    logout,
    refreshUser,
  }), [user, isLoading, login, register, logout, refreshUser]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = (): AuthContextValue => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};

// Helper functions to get tokens (delegates to auth service)
export const getAccessToken = (): string | null => {
  return authService.getAccessToken();
};

export const getRefreshToken = (): string | null => {
  return authService.getRefreshToken();
};

export const setAccessToken = (token: string): void => {
  authService.setAccessToken(token);
};

export default AuthContext;
