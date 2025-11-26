/**
 * Flask Authentication Service
 * Original authentication implementation using Flask backend
 */

import { apiClient } from '../api';
import type { User, LoginRequest, RegisterRequest } from '../../types';

export interface AuthResponse {
  access_token: string;
  refresh_token: string;
  user: User;
}

const ACCESS_TOKEN_KEY = 'access_token';
const REFRESH_TOKEN_KEY = 'refresh_token';

export const flaskAuthService = {
  async login(credentials: LoginRequest): Promise<AuthResponse> {
    const response = await apiClient.login(credentials);
    if (
      'access_token' in response &&
      'refresh_token' in response &&
      typeof response.access_token === 'string' &&
      typeof response.refresh_token === 'string'
    ) {
      localStorage.setItem(ACCESS_TOKEN_KEY, response.access_token);
      localStorage.setItem(REFRESH_TOKEN_KEY, response.refresh_token);
      return response as AuthResponse;
    }
    throw new Error('Invalid login response');
  },

  async register(userData: RegisterRequest): Promise<AuthResponse> {
    const response = await apiClient.register(userData);
    if (
      'access_token' in response &&
      'refresh_token' in response &&
      typeof response.access_token === 'string' &&
      typeof response.refresh_token === 'string'
    ) {
      localStorage.setItem(ACCESS_TOKEN_KEY, response.access_token);
      localStorage.setItem(REFRESH_TOKEN_KEY, response.refresh_token);
      return response as AuthResponse;
    }
    throw new Error('Invalid register response');
  },

  async logout(): Promise<void> {
    localStorage.removeItem(ACCESS_TOKEN_KEY);
    localStorage.removeItem(REFRESH_TOKEN_KEY);
  },

  async getCurrentUser(): Promise<User> {
    return await apiClient.getCurrentUser();
  },

  async refreshToken(): Promise<string | null> {
    const refreshToken = localStorage.getItem(REFRESH_TOKEN_KEY);
    if (!refreshToken) return null;

    try {
      // TODO: Fix refreshToken method access
      // const response = await apiClient.refreshToken();
      // if ('access_token' in response && typeof response.access_token === 'string') {
      //   localStorage.setItem(ACCESS_TOKEN_KEY, response.access_token);
      //   return response.access_token;
      // }
      return null;
    } catch (error) {
      console.error('Token refresh failed:', error);
      return null;
    }
  },

  getAccessToken(): string | null {
    return localStorage.getItem(ACCESS_TOKEN_KEY);
  },

  getRefreshToken(): string | null {
    return localStorage.getItem(REFRESH_TOKEN_KEY);
  },

  setAccessToken(token: string): void {
    localStorage.setItem(ACCESS_TOKEN_KEY, token);
  },
};
