/**
 * State Management Type Definitions
 * Based on turkey project's state.js pattern
 */

// Generic state listener function type
export type StateListener<T> = (state: T) => void;

// Timer state from turkey project's three-state system
export type TimerStatus = 'idle' | 'running' | 'paused' | 'finished';

// Timer state structure (enhanced from turkey)
export interface TimerState {
  id: string;
  cookingSessionId: string;
  name: string;
  defaultSeconds: number; // Original duration (immutable)
  remainingSeconds: number; // Current remaining time (mutable)
  status: TimerStatus;
  endAt: Date | null; // Precision timestamp for accuracy
  startedBy: string | null;
  createdAt: Date;
  updatedAt: Date;
}

// Recipe state for filtering and assignment
export interface RecipeState {
  id: string;
  familyId: string;
  name: string;
  assignedTo: string | null;
  targetStartTime: Date | null;
  targetCompletionTime: Date | null;
  status: 'pending' | 'in_progress' | 'completed';
}

// Shopping list item state
export interface ShoppingItemState {
  id: string;
  shoppingListId: string;
  name: string;
  checked: boolean;
  addedBy: string | null;
  checkedBy: string | null;
  category: string | null;
}

// Filter types (from turkey)
export type RecipeFilter = 'all' | 'mine' | 'active' | 'due-soon';
export type TimerFilter = 'all' | 'running' | 'finished';

// User preferences (from turkey)
export interface UserPreferences {
  soundEnabled: boolean;
  theme: 'light' | 'dark';
  name: string | null;
  defaultFilter: RecipeFilter;
}
