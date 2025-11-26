/**
 * Supabase Authentication Service
 * New authentication implementation using Supabase Auth
 */

import { supabase } from '../../lib/supabase';
import { userService } from '../user/userService';
import type { User, LoginRequest, RegisterRequest } from '../../types';

export interface AuthResponse {
  access_token: string;
  refresh_token: string;
  user: User;
}

export const supabaseAuthService = {
  async login(credentials: LoginRequest): Promise<AuthResponse> {
    const { data, error } = await supabase.auth.signInWithPassword({
      email: credentials.email,
      password: credentials.password,
    });

    if (error) throw error;
    if (!data.session || !data.user) {
      throw new Error('No session returned from login');
    }

    // Get internal user from public.users table
    const internalUser = await userService.getInternalUser();

    // Map to our User type with internal ID
    const user: User = {
      id: internalUser.id, // Use internal users.id, not auth.users.id
      email: internalUser.email,
      first_name: internalUser.first_name,
      last_name: internalUser.last_name,
      is_active: true,
      created_at: data.user.created_at,
      updated_at: data.user.updated_at || data.user.created_at,
    };

    return {
      access_token: data.session.access_token,
      refresh_token: data.session.refresh_token,
      user,
    };
  },

  async register(userData: RegisterRequest): Promise<AuthResponse> {
    const { data, error } = await supabase.auth.signUp({
      email: userData.email,
      password: userData.password,
      options: {
        data: {
          first_name: userData.first_name,
          last_name: userData.last_name,
        },
      },
    });

    if (error) throw error;
    if (!data.session || !data.user) {
      throw new Error('No session returned from registration');
    }

    // Ensure user exists in public.users table and get internal ID
    const internalUserId = await userService.ensureUserExists(
      data.user.id,
      userData.email,
      userData.first_name,
      userData.last_name
    );

    const user: User = {
      id: internalUserId, // Use internal users.id, not auth.users.id
      email: userData.email,
      first_name: userData.first_name,
      last_name: userData.last_name,
      is_active: true,
      created_at: data.user.created_at,
      updated_at: data.user.updated_at || data.user.created_at,
    };

    return {
      access_token: data.session.access_token,
      refresh_token: data.session.refresh_token,
      user,
    };
  },

  async logout(): Promise<void> {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;

    // Clear cached internal user ID
    userService.clearCache();
  },

  async getCurrentUser(): Promise<User> {
    const {
      data: { session },
      error,
    } = await supabase.auth.getSession();

    if (error) throw error;
    if (!session) throw new Error('No active session');

    // Get internal user from public.users table
    const internalUser = await userService.getInternalUser();

    const user: User = {
      id: internalUser.id, // Use internal users.id, not auth.users.id
      email: internalUser.email,
      first_name: internalUser.first_name,
      last_name: internalUser.last_name,
      is_active: true,
      created_at: session.user.created_at,
      updated_at: session.user.updated_at || session.user.created_at,
    };

    return user;
  },

  async refreshToken(): Promise<string | null> {
    const {
      data: { session },
      error,
    } = await supabase.auth.refreshSession();

    if (error) {
      console.error('Token refresh failed:', error);
      return null;
    }

    return session?.access_token || null;
  },

  getAccessToken(): string | null {
    // Supabase handles tokens internally via session storage
    return null;
  },

  getRefreshToken(): string | null {
    // Supabase handles tokens internally via session storage
    return null;
  },

  setAccessToken(_token: string): void {
    // Not used with Supabase - sessions are managed internally
    console.warn('setAccessToken called but Supabase manages sessions internally');
  },
};
