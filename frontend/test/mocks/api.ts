/**
 * Mock API client for testing
 */

import { vi } from 'vitest';
import {
  mockUser,
  mockRecipes,
  mockFamilies,
  mockShoppingLists,
  mockShoppingListItems,
  mockCookingSession,
} from './data';

export const mockApiClient = {
  // Auth
  login: vi.fn().mockResolvedValue({
    access_token: 'mock-access-token',
    refresh_token: 'mock-refresh-token',
    user: mockUser,
  }),
  register: vi.fn().mockResolvedValue({
    access_token: 'mock-access-token',
    refresh_token: 'mock-refresh-token',
    user: mockUser,
  }),
  getCurrentUser: vi.fn().mockResolvedValue(mockUser),
  refreshToken: vi.fn().mockResolvedValue({
    access_token: 'new-mock-access-token',
  }),
  updateProfile: vi.fn().mockResolvedValue(mockUser),
  changePassword: vi.fn().mockResolvedValue(undefined),
  logout: vi.fn(),

  // Families
  getFamilies: vi.fn().mockResolvedValue(mockFamilies),
  getFamily: vi.fn().mockResolvedValue(mockFamilies[0]),
  createFamily: vi.fn().mockResolvedValue(mockFamilies[0]),
  updateFamily: vi.fn().mockResolvedValue(mockFamilies[0]),
  deleteFamily: vi.fn().mockResolvedValue(undefined),
  addFamilyMember: vi.fn().mockResolvedValue(undefined),
  removeFamilyMember: vi.fn().mockResolvedValue(undefined),
  leaveFamily: vi.fn().mockResolvedValue(undefined),

  // Recipes
  getRecipes: vi.fn().mockResolvedValue(mockRecipes),
  getRecipe: vi.fn().mockResolvedValue(mockRecipes[0]),
  createRecipe: vi.fn().mockResolvedValue(mockRecipes[0]),
  updateRecipe: vi.fn().mockResolvedValue(mockRecipes[0]),
  deleteRecipe: vi.fn().mockResolvedValue(undefined),
  assignRecipe: vi.fn().mockResolvedValue(undefined),

  // Shopping Lists
  getShoppingLists: vi.fn().mockResolvedValue(mockShoppingLists),
  getShoppingList: vi.fn().mockResolvedValue(mockShoppingLists[0]),
  createShoppingList: vi.fn().mockResolvedValue(mockShoppingLists[0]),
  updateShoppingList: vi.fn().mockResolvedValue(mockShoppingLists[0]),
  deleteShoppingList: vi.fn().mockResolvedValue(undefined),
  getShoppingListItems: vi.fn().mockResolvedValue(mockShoppingListItems),
  addShoppingListItem: vi.fn().mockResolvedValue(mockShoppingListItems[0]),
  updateShoppingListItem: vi.fn().mockResolvedValue(mockShoppingListItems[0]),
  deleteShoppingListItem: vi.fn().mockResolvedValue(undefined),
  bulkAddShoppingListItems: vi.fn().mockResolvedValue(mockShoppingListItems),
  clearCompletedItems: vi.fn().mockResolvedValue(undefined),

  // Cooking Sessions
  getCookingSessions: vi.fn().mockResolvedValue([mockCookingSession]),
  getCookingSession: vi.fn().mockResolvedValue(mockCookingSession),
  startCookingSession: vi.fn().mockResolvedValue(mockCookingSession),
  endCookingSession: vi.fn().mockResolvedValue(undefined),
  startTimer: vi.fn().mockResolvedValue(undefined),
  pauseTimer: vi.fn().mockResolvedValue(undefined),
  resumeTimer: vi.fn().mockResolvedValue(undefined),
  cancelTimer: vi.fn().mockResolvedValue(undefined),

  // Timeline
  calculateTimeline: vi.fn().mockResolvedValue([]),
};

// Mock the API client module
vi.mock('../../src/services/api', () => ({
  apiClient: mockApiClient,
}));
