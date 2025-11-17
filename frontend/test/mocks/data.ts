/**
 * Mock data fixtures for testing
 */

import type { User, Family, Recipe, ShoppingList, ShoppingListItem, CookingSession } from '../../src/types';

export const mockUser: User = {
  id: 1,
  email: 'test@example.com',
  first_name: 'Test',
  last_name: 'User',
  full_name: 'Test User',
  is_active: true,
  created_at: '2025-01-01T00:00:00Z',
  updated_at: '2025-01-01T00:00:00Z',
};

export const mockFamily: Family = {
  id: 1,
  name: 'Test Family',
  description: 'A test family',
  member_count: 2,
  created_at: '2025-01-01T00:00:00Z',
  updated_at: '2025-01-01T00:00:00Z',
};

export const mockRecipe: Recipe = {
  id: 1,
  name: 'Test Recipe',
  description: 'A delicious test recipe',
  prep_time: 15,
  cook_time: 30,
  total_time: 45,
  servings: 4,
  image_url: 'https://example.com/image.jpg',
  source_url: 'https://example.com/recipe',
  family_id: 1,
  assigned_to_id: 1,
  ingredients: [
    {
      id: 1,
      recipe_id: 1,
      name: 'Ingredient 1',
      quantity: '2 cups',
      order: 0,
      created_at: '2025-01-01T00:00:00Z',
      updated_at: '2025-01-01T00:00:00Z',
    },
  ],
  steps: [
    {
      id: 1,
      recipe_id: 1,
      instruction: 'Step 1: Do something',
      order: 0,
      estimated_time: 10,
      created_at: '2025-01-01T00:00:00Z',
      updated_at: '2025-01-01T00:00:00Z',
    },
  ],
  timers: [
    {
      id: 1,
      recipe_id: 1,
      name: 'Cook timer',
      duration: 30,
      step_order: 0,
      created_at: '2025-01-01T00:00:00Z',
      updated_at: '2025-01-01T00:00:00Z',
    },
  ],
  created_at: '2025-01-01T00:00:00Z',
  updated_at: '2025-01-01T00:00:00Z',
};

export const mockShoppingList: ShoppingList = {
  id: 1,
  name: 'Weekly Groceries',
  family_id: 1,
  is_active: true,
  total_items: 5,
  checked_items: 2,
  completion_percentage: 40,
  created_at: '2025-01-01T00:00:00Z',
  updated_at: '2025-01-01T00:00:00Z',
};

export const mockShoppingListItem: ShoppingListItem = {
  id: 1,
  shopping_list_id: 1,
  name: 'Milk',
  quantity: '1 gallon',
  category: 'Dairy',
  notes: 'Whole milk',
  checked: false,
  added_by_id: 1,
  added_by: mockUser,
  created_at: '2025-01-01T00:00:00Z',
  updated_at: '2025-01-01T00:00:00Z',
};

export const mockCookingSession: CookingSession = {
  id: 1,
  recipe_id: 1,
  family_id: 1,
  started_by_id: 1,
  started_at: '2025-01-01T12:00:00Z',
  completed_at: null,
  recipe: mockRecipe,
  timers: [],
  created_at: '2025-01-01T12:00:00Z',
  updated_at: '2025-01-01T12:00:00Z',
};

export const mockRecipes = [mockRecipe];
export const mockFamilies = [mockFamily];
export const mockShoppingLists = [mockShoppingList];
export const mockShoppingListItems = [mockShoppingListItem];
