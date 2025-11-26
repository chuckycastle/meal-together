/**
 * TaskStateManager - Generic State Container
 * Port of turkey project's state.js with React TypeScript enhancements
 *
 * Key Features (from turkey):
 * - Map-based storage for O(1) lookups
 * - Observer pattern for reactive updates
 * - Automatic listener notifications on state changes
 * - Type-safe state management
 */

import type { StateListener } from './types';

export class TaskStateManager<T extends { id: string }> {
  private _state: Map<string, T>;
  private _listeners: Set<StateListener<Map<string, T>>>;

  constructor() {
    this._state = new Map();
    this._listeners = new Set();
  }

  /**
   * Get state by ID
   * @param id - Unique identifier
   * @returns State object or undefined
   */
  get(id: string): T | undefined {
    return this._state.get(id);
  }

  /**
   * Get all state items as array
   * @returns Array of all state items
   */
  getAll(): T[] {
    return Array.from(this._state.values());
  }

  /**
   * Get all state items as Map
   * @returns Map of all state items
   */
  getAllAsMap(): Map<string, T> {
    return new Map(this._state);
  }

  /**
   * Set or update state for an item
   * @param id - Unique identifier
   * @param state - State object
   */
  set(id: string, state: T): void {
    this._state.set(id, state);
    this.notifyListeners();
  }

  /**
   * Batch update multiple items
   * @param items - Array of state items
   */
  setMany(items: T[]): void {
    items.forEach(item => {
      this._state.set(item.id, item);
    });
    this.notifyListeners();
  }

  /**
   * Delete state by ID
   * @param id - Unique identifier
   */
  delete(id: string): void {
    this._state.delete(id);
    this.notifyListeners();
  }

  /**
   * Clear all state
   */
  clear(): void {
    this._state.clear();
    this.notifyListeners();
  }

  /**
   * Check if state exists
   * @param id - Unique identifier
   * @returns true if state exists
   */
  has(id: string): boolean {
    return this._state.has(id);
  }

  /**
   * Get count of items
   * @returns Number of items in state
   */
  get size(): number {
    return this._state.size;
  }

  /**
   * Subscribe to state changes (Observer pattern from turkey)
   * @param listener - Callback function
   * @returns Unsubscribe function
   */
  subscribe(listener: StateListener<Map<string, T>>): () => void {
    this._listeners.add(listener);

    // Return unsubscribe function
    return () => {
      this._listeners.delete(listener);
    };
  }

  /**
   * Notify all listeners of state change
   * @private
   */
  private notifyListeners(): void {
    const stateCopy = new Map(this._state);
    this._listeners.forEach(listener => {
      listener(stateCopy);
    });
  }

  /**
   * Filter items by predicate
   * @param predicate - Filter function
   * @returns Filtered array of items
   */
  filter(predicate: (item: T) => boolean): T[] {
    return this.getAll().filter(predicate);
  }

  /**
   * Find single item by predicate
   * @param predicate - Filter function
   * @returns First matching item or undefined
   */
  find(predicate: (item: T) => boolean): T | undefined {
    return this.getAll().find(predicate);
  }

  /**
   * Map over items
   * @param mapper - Map function
   * @returns Mapped array
   */
  map<R>(mapper: (item: T) => R): R[] {
    return this.getAll().map(mapper);
  }

  /**
   * Sort items by comparator
   * @param comparator - Sort function
   * @returns Sorted array
   */
  sort(comparator: (a: T, b: T) => number): T[] {
    return this.getAll().sort(comparator);
  }
}

// Singleton instances for different entity types
// (Can be instantiated per component if needed)
export const createStateManager = <T extends { id: string }>() => {
  return new TaskStateManager<T>();
};
