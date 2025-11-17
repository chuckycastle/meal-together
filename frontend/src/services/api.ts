/**
 * API Client Service
 * Handles all HTTP requests to the backend API
 */

import axios from 'axios';
import type { AxiosInstance, AxiosError, InternalAxiosRequestConfig } from 'axios';
import type {
  User,
  AuthTokens,
  LoginRequest,
  RegisterRequest,
  Family,
  CreateFamilyRequest,
  AddMemberRequest,
  Recipe,
  CreateRecipeRequest,
  ShoppingList,
  CreateShoppingListRequest,
  ShoppingListItem,
  AddShoppingListItemRequest,
  BulkAddItemsRequest,
  CookingSession,
  StartCookingSessionRequest,
  CreateTimelineRequest,
  TimelineResponse,
  StartTimerRequest,
  ActiveTimer,
  ApiError,
} from '../types';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

class ApiClient {
  private client: AxiosInstance;
  private refreshing: boolean = false;
  private refreshSubscribers: Array<(token: string) => void> = [];

  constructor() {
    this.client = axios.create({
      baseURL: API_BASE_URL,
      headers: {
        'Content-Type': 'application/json',
      },
      timeout: 30000,
    });

    this.setupInterceptors();
  }

  private setupInterceptors(): void {
    // Request interceptor - add auth token
    this.client.interceptors.request.use(
      (config: InternalAxiosRequestConfig) => {
        const token = this.getAccessToken();
        if (token && config.headers) {
          config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
      },
      (error) => Promise.reject(error)
    );

    // Response interceptor - handle errors and token refresh
    this.client.interceptors.response.use(
      (response) => response,
      async (error: AxiosError<ApiError>) => {
        const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean };

        // Handle 401 Unauthorized
        if (error.response?.status === 401 && !originalRequest._retry) {
          if (this.refreshing) {
            // Wait for token refresh
            return new Promise((resolve) => {
              this.refreshSubscribers.push((token: string) => {
                if (originalRequest.headers) {
                  originalRequest.headers.Authorization = `Bearer ${token}`;
                }
                resolve(this.client(originalRequest));
              });
            });
          }

          originalRequest._retry = true;
          this.refreshing = true;

          try {
            const newToken = await this.refreshToken();
            this.refreshing = false;
            this.onRefreshed(newToken);
            this.refreshSubscribers = [];

            if (originalRequest.headers) {
              originalRequest.headers.Authorization = `Bearer ${newToken}`;
            }
            return this.client(originalRequest);
          } catch (refreshError) {
            this.refreshing = false;
            this.clearTokens();
            window.location.href = '/login';
            return Promise.reject(refreshError);
          }
        }

        return Promise.reject(this.formatError(error));
      }
    );
  }

  private onRefreshed(token: string): void {
    this.refreshSubscribers.forEach((callback) => callback(token));
  }

  private formatError(error: AxiosError<ApiError>): ApiError {
    if (error.response?.data) {
      return {
        error: error.response.data.error || 'An error occurred',
        message: error.response.data.message,
        status: error.response.status,
      };
    }
    return {
      error: error.message || 'Network error',
      status: error.response?.status,
    };
  }

  // ============================================================================
  // Token Management
  // ============================================================================

  private getAccessToken(): string | null {
    return localStorage.getItem('access_token');
  }

  private getRefreshToken(): string | null {
    return localStorage.getItem('refresh_token');
  }

  private setTokens(accessToken: string, refreshToken: string): void {
    localStorage.setItem('access_token', accessToken);
    localStorage.setItem('refresh_token', refreshToken);
  }

  private clearTokens(): void {
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
  }

  private async refreshToken(): Promise<string> {
    const refreshToken = this.getRefreshToken();
    if (!refreshToken) {
      throw new Error('No refresh token available');
    }

    const response = await axios.post<{ access_token: string }>(
      `${API_BASE_URL}/api/auth/refresh`,
      {},
      {
        headers: {
          Authorization: `Bearer ${refreshToken}`,
        },
      }
    );

    const { access_token } = response.data;
    localStorage.setItem('access_token', access_token);
    return access_token;
  }

  // ============================================================================
  // Authentication
  // ============================================================================

  async login(data: LoginRequest): Promise<AuthTokens> {
    const response = await this.client.post<AuthTokens>('/api/auth/login', data);
    this.setTokens(response.data.access_token, response.data.refresh_token);
    return response.data;
  }

  async register(data: RegisterRequest): Promise<AuthTokens> {
    const response = await this.client.post<AuthTokens>('/api/auth/register', data);
    this.setTokens(response.data.access_token, response.data.refresh_token);
    return response.data;
  }

  async getCurrentUser(): Promise<User> {
    const response = await this.client.get<{ user: User }>('/api/auth/me');
    return response.data.user;
  }

  async updateProfile(data: Partial<User>): Promise<User> {
    const response = await this.client.put<{ user: User }>('/api/auth/me', data);
    return response.data.user;
  }

  async changePassword(currentPassword: string, newPassword: string): Promise<void> {
    await this.client.post('/api/auth/change-password', {
      current_password: currentPassword,
      new_password: newPassword,
    });
  }

  logout(): void {
    this.clearTokens();
  }

  // ============================================================================
  // Families
  // ============================================================================

  async getFamilies(): Promise<Family[]> {
    const response = await this.client.get<{ families: Family[] }>('/api/families');
    return response.data.families;
  }

  async getFamily(familyId: number): Promise<Family> {
    const response = await this.client.get<{ family: Family }>(`/api/families/${familyId}`);
    return response.data.family;
  }

  async createFamily(data: CreateFamilyRequest): Promise<Family> {
    const response = await this.client.post<{ family: Family }>('/api/families', data);
    return response.data.family;
  }

  async updateFamily(familyId: number, data: Partial<CreateFamilyRequest>): Promise<Family> {
    const response = await this.client.put<{ family: Family }>(`/api/families/${familyId}`, data);
    return response.data.family;
  }

  async deleteFamily(familyId: number): Promise<void> {
    await this.client.delete(`/api/families/${familyId}`);
  }

  async addFamilyMember(familyId: number, data: AddMemberRequest): Promise<void> {
    await this.client.post(`/api/families/${familyId}/members`, data);
  }

  async updateMemberRole(familyId: number, memberId: number, role: string): Promise<void> {
    await this.client.put(`/api/families/${familyId}/members/${memberId}`, { role });
  }

  async removeFamilyMember(familyId: number, memberId: number): Promise<void> {
    await this.client.delete(`/api/families/${familyId}/members/${memberId}`);
  }

  async leaveFamily(familyId: number): Promise<void> {
    await this.client.post(`/api/families/${familyId}/leave`);
  }

  // ============================================================================
  // Recipes
  // ============================================================================

  async getRecipes(familyId: number): Promise<Recipe[]> {
    const response = await this.client.get<{ recipes: Recipe[] }>(
      `/api/families/${familyId}/recipes`
    );
    return response.data.recipes;
  }

  async getRecipe(familyId: number, recipeId: number): Promise<Recipe> {
    const response = await this.client.get<{ recipe: Recipe }>(
      `/api/families/${familyId}/recipes/${recipeId}`
    );
    return response.data.recipe;
  }

  async createRecipe(familyId: number, data: CreateRecipeRequest): Promise<Recipe> {
    const response = await this.client.post<{ recipe: Recipe }>(
      `/api/families/${familyId}/recipes`,
      data
    );
    return response.data.recipe;
  }

  async updateRecipe(
    familyId: number,
    recipeId: number,
    data: Partial<CreateRecipeRequest>
  ): Promise<Recipe> {
    const response = await this.client.put<{ recipe: Recipe }>(
      `/api/families/${familyId}/recipes/${recipeId}`,
      data
    );
    return response.data.recipe;
  }

  async deleteRecipe(familyId: number, recipeId: number): Promise<void> {
    await this.client.delete(`/api/families/${familyId}/recipes/${recipeId}`);
  }

  async assignRecipe(familyId: number, recipeId: number, userId: number): Promise<Recipe> {
    const response = await this.client.post<{ recipe: Recipe }>(
      `/api/families/${familyId}/recipes/${recipeId}/assign`,
      { user_id: userId }
    );
    return response.data.recipe;
  }

  // ============================================================================
  // Shopping Lists
  // ============================================================================

  async getShoppingLists(familyId: number, activeOnly: boolean = true): Promise<ShoppingList[]> {
    const response = await this.client.get<{ shopping_lists: ShoppingList[] }>(
      `/api/families/${familyId}/shopping-lists`,
      { params: { active_only: activeOnly } }
    );
    return response.data.shopping_lists;
  }

  async getShoppingList(familyId: number, listId: number): Promise<ShoppingList> {
    const response = await this.client.get<{ shopping_list: ShoppingList }>(
      `/api/families/${familyId}/shopping-lists/${listId}`
    );
    return response.data.shopping_list;
  }

  async createShoppingList(
    familyId: number,
    data: CreateShoppingListRequest
  ): Promise<ShoppingList> {
    const response = await this.client.post<{ shopping_list: ShoppingList }>(
      `/api/families/${familyId}/shopping-lists`,
      data
    );
    return response.data.shopping_list;
  }

  async updateShoppingList(
    familyId: number,
    listId: number,
    data: Partial<CreateShoppingListRequest>
  ): Promise<ShoppingList> {
    const response = await this.client.put<{ shopping_list: ShoppingList }>(
      `/api/families/${familyId}/shopping-lists/${listId}`,
      data
    );
    return response.data.shopping_list;
  }

  async deleteShoppingList(familyId: number, listId: number): Promise<void> {
    await this.client.delete(`/api/families/${familyId}/shopping-lists/${listId}`);
  }

  async addShoppingItem(
    familyId: number,
    listId: number,
    data: AddShoppingListItemRequest
  ): Promise<ShoppingListItem> {
    const response = await this.client.post<{ item: ShoppingListItem }>(
      `/api/families/${familyId}/shopping-lists/${listId}/items`,
      data
    );
    return response.data.item;
  }

  async updateShoppingItem(
    familyId: number,
    listId: number,
    itemId: number,
    data: Partial<AddShoppingListItemRequest> & { checked?: boolean }
  ): Promise<ShoppingListItem> {
    const response = await this.client.put<{ item: ShoppingListItem }>(
      `/api/families/${familyId}/shopping-lists/${listId}/items/${itemId}`,
      data
    );
    return response.data.item;
  }

  async deleteShoppingItem(familyId: number, listId: number, itemId: number): Promise<void> {
    await this.client.delete(`/api/families/${familyId}/shopping-lists/${listId}/items/${itemId}`);
  }

  async bulkAddItems(
    familyId: number,
    listId: number,
    data: BulkAddItemsRequest
  ): Promise<ShoppingListItem[]> {
    const response = await this.client.post<{ items: ShoppingListItem[] }>(
      `/api/families/${familyId}/shopping-lists/${listId}/items/bulk`,
      data
    );
    return response.data.items;
  }

  // ============================================================================
  // Cooking Sessions & Timeline
  // ============================================================================

  async calculateTimeline(familyId: number, data: CreateTimelineRequest): Promise<TimelineResponse> {
    const response = await this.client.post<TimelineResponse>(
      `/api/families/${familyId}/cooking-sessions/timeline`,
      data
    );
    return response.data;
  }

  async startCookingSession(
    familyId: number,
    data: StartCookingSessionRequest
  ): Promise<CookingSession> {
    const response = await this.client.post<{ session: CookingSession }>(
      `/api/families/${familyId}/cooking-sessions`,
      data
    );
    return response.data.session;
  }

  async getActiveSessions(familyId: number): Promise<CookingSession[]> {
    const response = await this.client.get<{ sessions: CookingSession[] }>(
      `/api/families/${familyId}/cooking-sessions`
    );
    return response.data.sessions;
  }

  async getCookingSession(familyId: number, sessionId: number): Promise<CookingSession> {
    const response = await this.client.get<{ session: CookingSession }>(
      `/api/families/${familyId}/cooking-sessions/${sessionId}`
    );
    return response.data.session;
  }

  async completeCookingSession(familyId: number, sessionId: number): Promise<CookingSession> {
    const response = await this.client.post<{ session: CookingSession }>(
      `/api/families/${familyId}/cooking-sessions/${sessionId}/complete`
    );
    return response.data.session;
  }

  // ============================================================================
  // Timers
  // ============================================================================

  async startTimer(familyId: number, sessionId: number, data: StartTimerRequest): Promise<ActiveTimer> {
    const response = await this.client.post<{ timer: ActiveTimer }>(
      `/api/families/${familyId}/cooking-sessions/${sessionId}/timers`,
      data
    );
    return response.data.timer;
  }

  async pauseTimer(familyId: number, sessionId: number, timerId: number): Promise<ActiveTimer> {
    const response = await this.client.post<{ timer: ActiveTimer }>(
      `/api/families/${familyId}/cooking-sessions/${sessionId}/timers/${timerId}/pause`
    );
    return response.data.timer;
  }

  async resumeTimer(familyId: number, sessionId: number, timerId: number): Promise<ActiveTimer> {
    const response = await this.client.post<{ timer: ActiveTimer }>(
      `/api/families/${familyId}/cooking-sessions/${sessionId}/timers/${timerId}/resume`
    );
    return response.data.timer;
  }

  async cancelTimer(familyId: number, sessionId: number, timerId: number): Promise<ActiveTimer> {
    const response = await this.client.post<{ timer: ActiveTimer }>(
      `/api/families/${familyId}/cooking-sessions/${sessionId}/timers/${timerId}/cancel`
    );
    return response.data.timer;
  }
}

// Export singleton instance
export const apiClient = new ApiClient();
export default apiClient;
