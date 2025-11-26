/**
 * TypeScript types for MealTogether application
 * Matches backend SQLAlchemy models
 */

// ============================================================================
// Pagination
// ============================================================================

export interface PaginationMeta {
  page: number;
  per_page: number;
  total: number;
  total_pages: number;
  has_next: boolean;
  has_prev: boolean;
}

export interface PaginatedResponse<T> {
  items: T[];
  pagination: PaginationMeta;
}

// ============================================================================
// User & Authentication
// ============================================================================

export interface User {
  id: number;
  email: string;
  first_name: string;
  last_name: string;
  full_name: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface AuthTokens {
  access_token: string;
  refresh_token: string;
  user: User;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  email: string;
  password: string;
  first_name: string;
  last_name: string;
}

// ============================================================================
// Family & Members
// ============================================================================

export const FamilyRole = {
  OWNER: 'owner',
  ADMIN: 'admin',
  MEMBER: 'member',
} as const;

export type FamilyRole = typeof FamilyRole[keyof typeof FamilyRole];

export interface Family {
  id: number;
  name: string;
  description?: string;
  member_count: number;
  members?: FamilyMember[];
  created_at: string;
  updated_at: string;
}

export interface FamilyMember {
  id: number;
  family_id: number;
  user_id: number;
  role: FamilyRole;
  user?: User;
  created_at: string;
  updated_at: string;
}

export interface CreateFamilyRequest {
  name: string;
  description?: string;
}

export interface AddMemberRequest {
  email: string;
  role?: FamilyRole;
}

// ============================================================================
// Recipe
// ============================================================================

export interface Recipe {
  id: number;
  name: string;
  description?: string;
  prep_time: number; // minutes
  cook_time: number; // minutes
  total_time: number; // computed
  servings: number;
  image_url?: string;
  source_url?: string;
  family_id?: number;
  assigned_to_id?: number;
  assigned_to?: User;
  ingredients?: Ingredient[];
  steps?: CookingStep[];
  timers?: RecipeTimer[];
  created_at: string;
  updated_at: string;
}

export interface Ingredient {
  id: number;
  recipe_id: number;
  name: string;
  quantity?: string;
  order: number;
  created_at: string;
  updated_at: string;
}

export interface CookingStep {
  id: number;
  recipe_id: number;
  instruction: string;
  order: number;
  estimated_time?: number; // minutes
  created_at: string;
  updated_at: string;
}

export interface RecipeTimer {
  id: number;
  recipe_id: number;
  name: string;
  duration: number; // seconds
  step_order?: number;
  created_at: string;
  updated_at: string;
}

export interface CreateRecipeRequest {
  name: string;
  description?: string;
  prep_time: number;
  cook_time: number;
  servings?: number;
  image_url?: string;
  source_url?: string;
  assigned_to_id?: number;
  ingredients?: Array<{
    name: string;
    quantity?: string;
  }>;
  steps?: Array<{
    instruction: string;
    estimated_time?: number;
  }>;
  timers?: Array<{
    name: string;
    duration: number;
    step_order?: number;
  }>;
}

// ============================================================================
// Shopping List
// ============================================================================

export interface ShoppingList {
  id: number;
  name: string;
  family_id: number;
  is_active: boolean;
  total_items: number;
  checked_items: number;
  completion_percentage: number;
  items?: ShoppingListItem[];
  created_at: string;
  updated_at: string;
}

export interface ShoppingListItem {
  id: number;
  shopping_list_id: number;
  name: string;
  quantity?: string;
  category?: string;
  notes?: string;
  checked: boolean;
  version: number; // For optimistic locking
  added_by_id: number;
  added_by?: User;
  checked_by_id?: number;
  checked_by?: User;
  checked_at?: string;
  created_at: string;
  updated_at: string;
}

export interface CreateShoppingListRequest {
  name?: string;
}

export interface AddShoppingListItemRequest {
  name: string;
  quantity?: string;
  category?: string;
  notes?: string;
}

export interface BulkAddItemsRequest {
  items: Array<{
    name: string;
    quantity?: string;
    category?: string;
    notes?: string;
  }>;
}

// ============================================================================
// Cooking Session & Timers
// ============================================================================

export interface CookingSession {
  id: number;
  recipe_id: number;
  recipe?: Recipe;
  family_id: number;
  started_by_id: number;
  started_by?: User;
  target_time?: string;
  actual_start_time?: string;
  completed_at?: string;
  is_active: boolean;
  is_completed: boolean;
  duration: number; // minutes
  active_timers?: ActiveTimer[];
  created_at: string;
  updated_at: string;
}

export interface ActiveTimer {
  id: number;
  cooking_session_id: number;
  name: string;
  duration: number; // total duration in seconds
  started_at: string;
  paused_at?: string;
  remaining_time: number; // seconds
  completed_at?: string;
  is_active: boolean;
  is_paused: boolean;
  is_running: boolean;
  is_completed: boolean;
  created_at: string;
  updated_at: string;
}

export interface StartCookingSessionRequest {
  recipe_id: number;
  target_time?: string;
}

export interface CreateTimelineRequest {
  recipe_ids: number[];
  target_time: string; // ISO 8601 format
}

export interface TimelineResponse {
  target_time: string;
  timeline: Array<{
    recipe: Recipe;
    start_time: string;
  }>;
}

export interface StartTimerRequest {
  name: string;
  duration: number; // seconds
}

// ============================================================================
// Kitchen Timers (Supabase Realtime)
// ============================================================================

export interface KitchenTimer {
  id: string;
  family_id: string;
  session_id: string | null;
  name: string;
  default_seconds: number;
  remaining_seconds: number;
  status: 'idle' | 'running' | 'paused' | 'finished';
  assigned_to_id: string | null;
  started_by_id: string | null;
  end_at: string | null;
  last_sync_at: string | null;
  sync_source: string | null;
  channel_id: string | null;
  created_at: string;
  updated_at: string;
}

// ============================================================================
// Supabase Realtime Types
// ============================================================================

export interface RealtimePayload<T> {
  eventType: 'INSERT' | 'UPDATE' | 'DELETE';
  new: T | null;
  old: T | null;
  schema: string;
  table: string;
  commit_timestamp: string;
}

export interface RealtimeChannel {
  subscribe: () => void;
  unsubscribe: () => void;
}

export type RealtimeStatus =
  | 'connecting'
  | 'connected'
  | 'disconnected'
  | 'error';

export interface RealtimeConnectionInfo {
  status: RealtimeStatus;
  error?: Error;
  lastConnectedAt?: Date;
  reconnectAttempts?: number;
}

// ============================================================================
// WebSocket Events
// ============================================================================

export interface WebSocketAuthenticateEvent {
  token: string;
}

export interface WebSocketJoinFamilyEvent {
  family_id: number;
}

export interface WebSocketShoppingItemAddedEvent {
  item: ShoppingListItem;
}

export interface WebSocketShoppingItemUpdatedEvent {
  item: ShoppingListItem;
}

export interface WebSocketShoppingItemDeletedEvent {
  item_id: number;
  list_id: number;
}

export interface WebSocketTimerEvent {
  timer: ActiveTimer;
  session_id: number;
  family_id: number;
}

export interface WebSocketUserJoinedEvent {
  user_id: number;
  family_id: number;
}

export interface WebSocketUserLeftEvent {
  user_id: number;
  family_id: number;
}

export interface WebSocketTypingEvent {
  user: User;
  location: string; // 'shopping_list', 'recipe', etc.
  item_id?: number;
}

// ============================================================================
// API Response Types
// ============================================================================

export interface ApiResponse<T> {
  data?: T;
  message?: string;
  error?: string;
}

export interface ApiError {
  error: string;
  message?: string;
  status?: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
}

// ============================================================================
// Form Types
// ============================================================================

export interface LoginFormData {
  email: string;
  password: string;
}

export interface RegisterFormData {
  email: string;
  password: string;
  confirm_password: string;
  first_name: string;
  last_name: string;
}

export interface RecipeFormData {
  name: string;
  description?: string;
  prep_time: number;
  cook_time: number;
  servings: number;
  image_url?: string;
  source_url?: string;
  assigned_to_id?: number;
  ingredients: Array<{
    name: string;
    quantity?: string;
  }>;
  steps: Array<{
    instruction: string;
    estimated_time?: number;
  }>;
  timers: Array<{
    name: string;
    duration: number;
    step_order?: number;
  }>;
}

export interface FamilyFormData {
  name: string;
  description?: string;
}

export interface ShoppingItemFormData {
  name: string;
  quantity?: string;
  category?: string;
  notes?: string;
}

export interface TimerFormData {
  name: string;
  duration: number;
}

// ============================================================================
// UI State Types
// ============================================================================

export interface Dialog {
  type: 'none' | 'confirm' | 'input' | 'select';
  title?: string;
  message?: string;
  onConfirm?: () => void;
  onCancel?: () => void;
}

export interface Toast {
  id: string;
  type: 'success' | 'error' | 'info' | 'warning';
  message: string;
  duration?: number;
}

export interface LoadingState {
  isLoading: boolean;
  message?: string;
}

export interface ErrorState {
  hasError: boolean;
  message?: string;
  error?: Error | ApiError;
}
