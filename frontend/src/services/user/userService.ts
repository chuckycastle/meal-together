/**
 * User Service
 * Maps Supabase auth user IDs to internal user IDs
 */

import { supabase } from '../../lib/supabase';

interface InternalUser {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
}

class UserService {
  private internalUserIdCache: string | null = null;

  /**
   * Get the internal user ID (public.users.id) from Supabase auth
   * Uses auth.uid() which works within RLS context
   */
  async getInternalUserId(): Promise<string> {
    if (this.internalUserIdCache) {
      return this.internalUserIdCache;
    }

    const { data: { user: authUser } } = await supabase.auth.getUser();

    if (!authUser) {
      throw new Error('No authenticated user');
    }

    // Query public.users table using auth.uid() in RLS context
    const { data, error } = await supabase
      .from('users')
      .select('id')
      .eq('id', authUser.id)
      .single();

    if (error) {
      throw new Error(`Failed to fetch internal user ID: ${error.message}`);
    }

    if (!data) {
      throw new Error('User not found in public.users table');
    }

    this.internalUserIdCache = data.id;
    return data.id;
  }

  /**
   * Get full internal user profile
   */
  async getInternalUser(): Promise<InternalUser> {
    const { data: { user: authUser } } = await supabase.auth.getUser();

    if (!authUser) {
      throw new Error('No authenticated user');
    }

    const { data, error } = await supabase
      .from('users')
      .select('id, email, first_name, last_name')
      .eq('id', authUser.id)
      .single();

    if (error) {
      throw new Error(`Failed to fetch internal user: ${error.message}`);
    }

    if (!data) {
      throw new Error('User not found in public.users table');
    }

    return data as InternalUser;
  }

  /**
   * Clear the cached internal user ID
   * Call this on logout or when user data might have changed
   */
  clearCache(): void {
    this.internalUserIdCache = null;
  }

  /**
   * Check if user exists in public.users table
   * Used during registration to sync auth.users with public.users
   */
  async ensureUserExists(authUserId: string, email: string, firstName: string, lastName: string): Promise<string> {
    // First check if user already exists
    const { data: existingUser } = await supabase
      .from('users')
      .select('id')
      .eq('id', authUserId)
      .single();

    if (existingUser) {
      this.internalUserIdCache = existingUser.id;
      return existingUser.id;
    }

    // Insert new user into public.users table
    const { data, error } = await supabase
      .from('users')
      .insert({
        id: authUserId, // Use same UUID as auth.users for consistency
        email,
        first_name: firstName,
        last_name: lastName,
      })
      .select('id')
      .single();

    if (error) {
      throw new Error(`Failed to create user in public.users: ${error.message}`);
    }

    this.internalUserIdCache = data.id;
    return data.id;
  }
}

export const userService = new UserService();
