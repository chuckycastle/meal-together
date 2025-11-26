/**
 * Unified Authentication Service
 * Switches between Flask and Supabase auth based on feature flags
 */

import { isFeatureEnabled } from '../../config/featureFlags';
import { flaskAuthService } from './flaskAuthService';
import { supabaseAuthService } from './supabaseAuthService';
import type { User, LoginRequest, RegisterRequest } from '../../types';

export interface AuthResponse {
  access_token: string;
  refresh_token: string;
  user: User;
}

export interface AuthService {
  login(credentials: LoginRequest): Promise<AuthResponse>;
  register(userData: RegisterRequest): Promise<AuthResponse>;
  logout(): Promise<void>;
  getCurrentUser(): Promise<User>;
  refreshToken(): Promise<string | null>;
  getAccessToken(): string | null;
  getRefreshToken(): string | null;
  setAccessToken(token: string): void;
}

/**
 * Get the active auth service based on feature flags
 */
function getAuthService(): AuthService {
  const useSupabaseAuth = isFeatureEnabled('supabase_auth');
  return useSupabaseAuth ? supabaseAuthService : flaskAuthService;
}

/**
 * Unified auth service that delegates to the appropriate implementation
 */
export const authService: AuthService = {
  async login(credentials: LoginRequest): Promise<AuthResponse> {
    return getAuthService().login(credentials);
  },

  async register(userData: RegisterRequest): Promise<AuthResponse> {
    return getAuthService().register(userData);
  },

  async logout(): Promise<void> {
    return getAuthService().logout();
  },

  async getCurrentUser(): Promise<User> {
    return getAuthService().getCurrentUser();
  },

  async refreshToken(): Promise<string | null> {
    return getAuthService().refreshToken();
  },

  getAccessToken(): string | null {
    return getAuthService().getAccessToken();
  },

  getRefreshToken(): string | null {
    return getAuthService().getRefreshToken();
  },

  setAccessToken(token: string): void {
    return getAuthService().setAccessToken(token);
  },
};

// Export for backward compatibility
export { flaskAuthService, supabaseAuthService };
