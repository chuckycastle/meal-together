/**
 * useTaskState - Generic React Hook for Task State Management
 * Port of turkey project's state management with React TypeScript
 *
 * Features:
 * - Type-safe state access
 * - Automatic re-rendering on changes
 * - Observer pattern integration
 * - Cleanup on unmount
 */

import { useState, useEffect, useCallback } from 'react';
import { TaskStateManager } from '../../state/TaskStateManager';

export interface UseTaskStateResult<T extends { id: string }> {
  state: Map<string, T>;
  get: (id: string) => T | undefined;
  getAll: () => T[];
  set: (id: string, item: T) => void;
  setMany: (items: T[]) => void;
  delete: (id: string) => void;
  clear: () => void;
  has: (id: string) => boolean;
  size: number;
  filter: (predicate: (item: T) => boolean) => T[];
  find: (predicate: (item: T) => boolean) => T | undefined;
  map: <R>(mapper: (item: T) => R) => R[];
  sort: (comparator: (a: T, b: T) => number) => T[];
}

/**
 * Generic hook for TaskStateManager
 * @param stateManager - Instance of TaskStateManager
 * @returns State and operations
 */
export function useTaskState<T extends { id: string }>(
  stateManager: TaskStateManager<T>
): UseTaskStateResult<T> {
  // Local state synchronized with state manager
  const [state, setState] = useState<Map<string, T>>(
    stateManager.getAllAsMap()
  );

  // Subscribe to state changes
  useEffect(() => {
    const unsubscribe = stateManager.subscribe((newState) => {
      setState(new Map(newState));
    });

    return () => {
      unsubscribe();
    };
  }, [stateManager]);

  // Get single item
  const get = useCallback(
    (id: string) => {
      return stateManager.get(id);
    },
    [stateManager]
  );

  // Get all items
  const getAll = useCallback(() => {
    return stateManager.getAll();
  }, [stateManager]);

  // Set single item
  const set = useCallback(
    (id: string, item: T) => {
      stateManager.set(id, item);
    },
    [stateManager]
  );

  // Set multiple items
  const setMany = useCallback(
    (items: T[]) => {
      stateManager.setMany(items);
    },
    [stateManager]
  );

  // Delete item
  const deleteItem = useCallback(
    (id: string) => {
      stateManager.delete(id);
    },
    [stateManager]
  );

  // Clear all items
  const clear = useCallback(() => {
    stateManager.clear();
  }, [stateManager]);

  // Check if item exists
  const has = useCallback(
    (id: string) => {
      return stateManager.has(id);
    },
    [stateManager]
  );

  // Filter items
  const filter = useCallback(
    (predicate: (item: T) => boolean) => {
      return stateManager.filter(predicate);
    },
    [stateManager]
  );

  // Find single item
  const find = useCallback(
    (predicate: (item: T) => boolean) => {
      return stateManager.find(predicate);
    },
    [stateManager]
  );

  // Map over items
  const mapItems = useCallback(
    <R,>(mapper: (item: T) => R) => {
      return stateManager.map(mapper);
    },
    [stateManager]
  );

  // Sort items
  const sort = useCallback(
    (comparator: (a: T, b: T) => number) => {
      return stateManager.sort(comparator);
    },
    [stateManager]
  );

  return {
    state,
    get,
    getAll,
    set,
    setMany,
    delete: deleteItem,
    clear,
    has,
    size: state.size,
    filter,
    find,
    map: mapItems,
    sort,
  };
}
