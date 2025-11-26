/**
 * useRealtimeSync - Supabase Real-Time Subscription Hook
 * Port of turkey project's real-time sync pattern
 *
 * Features:
 * - Automatic subscription on mount
 * - Cleanup on unmount
 * - Type-safe event handlers
 * - Family-based room isolation
 * - Feature flag controlled activation
 * - Fallback polling mechanism when Realtime fails
 */

import { useEffect, useRef, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { isFeatureEnabled } from '../../config/featureFlags';
import type {
  RealtimeChannel,
  RealtimePostgresChangesPayload,
} from '@supabase/supabase-js';

export interface RealtimeHandlers<T> {
  onInsert?: (payload: T) => void;
  onUpdate?: (payload: T) => void;
  onDelete?: (payload: { id: string }) => void;
}

export interface UseRealtimeSyncOptions<T> {
  table: string;
  familyId?: string;
  handlers: RealtimeHandlers<T>;
  enabled?: boolean;
  /**
   * Fallback polling interval in milliseconds (default: 5000)
   * Set to 0 to disable fallback polling
   */
  pollingInterval?: number;
  /**
   * Function to fetch data when using fallback polling
   */
  fetchData?: () => Promise<T[]>;
}

/**
 * Subscribe to real-time changes on a Supabase table
 * @param options - Configuration and handlers
 * @returns Cleanup function
 */
export function useRealtimeSync<T extends { id: string }>({
  table,
  familyId,
  handlers,
  enabled = true,
  pollingInterval = 5000,
  fetchData,
}: UseRealtimeSyncOptions<T>): void {
  const { onInsert, onUpdate, onDelete } = handlers;
  const [isRealtimeConnected, setIsRealtimeConnected] = useState(false);
  const lastDataRef = useRef<Map<string, T>>(new Map());
  const pollingTimerRef = useRef<number | null>(null);

  useEffect(() => {
    // Check if Supabase features are enabled
    const supabaseEnabled =
      isFeatureEnabled('supabase_timers') ||
      isFeatureEnabled('supabase_shopping');

    if (!enabled || !supabaseEnabled) {
      console.log('Real-time sync disabled:', { table, familyId, supabaseEnabled });
      return;
    }

    // Create channel name (include family_id for isolation)
    const channelName = familyId ? `${table}:${familyId}` : table;

    // Subscribe to table changes
    const channel: RealtimeChannel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table,
          ...(familyId && { filter: `family_id=eq.${familyId}` }),
        },
        (payload: RealtimePostgresChangesPayload<T>) => {
          if (onInsert && payload.new) {
            setIsRealtimeConnected(true);
            onInsert(payload.new as T);
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table,
          ...(familyId && { filter: `family_id=eq.${familyId}` }),
        },
        (payload: RealtimePostgresChangesPayload<T>) => {
          if (onUpdate && payload.new) {
            setIsRealtimeConnected(true);
            onUpdate(payload.new as T);
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table,
          ...(familyId && { filter: `family_id=eq.${familyId}` }),
        },
        (payload: RealtimePostgresChangesPayload<T>) => {
          if (onDelete && payload.old) {
            setIsRealtimeConnected(true);
            onDelete({ id: (payload.old as T).id });
          }
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          console.log(`Realtime connected for ${table}`);
          setIsRealtimeConnected(true);
        } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
          console.warn(`Realtime connection failed for ${table}, falling back to polling`);
          setIsRealtimeConnected(false);
        }
      });

    // Cleanup on unmount
    return () => {
      channel.unsubscribe();
    };
  }, [table, familyId, enabled, onInsert, onUpdate, onDelete]);

  // Fallback polling mechanism
  useEffect(() => {
    // Only enable polling if:
    // 1. Polling is configured (interval > 0)
    // 2. fetchData function is provided
    // 3. Realtime is not connected
    if (pollingInterval === 0 || !fetchData || isRealtimeConnected) {
      return;
    }

    console.log(`Starting fallback polling for ${table} (${pollingInterval}ms)`);

    const poll = async () => {
      try {
        const currentData = await fetchData();
        const currentMap = new Map(currentData.map((item) => [item.id, item]));

        // Check for new/updated items
        currentData.forEach((item) => {
          const lastItem = lastDataRef.current.get(item.id);

          if (!lastItem) {
            // New item
            if (onInsert) {
              onInsert(item);
            }
          } else {
            // Check if updated (compare by updated_at if available)
            const hasChanged = JSON.stringify(lastItem) !== JSON.stringify(item);
            if (hasChanged && onUpdate) {
              onUpdate(item);
            }
          }
        });

        // Check for deleted items
        lastDataRef.current.forEach((_lastItem, id) => {
          if (!currentMap.has(id) && onDelete) {
            onDelete({ id });
          }
        });

        // Update ref
        lastDataRef.current = currentMap;
      } catch (error) {
        console.error(`Polling error for ${table}:`, error);
      }
    };

    // Initial poll
    poll();

    // Set up interval
    pollingTimerRef.current = window.setInterval(poll, pollingInterval);

    return () => {
      if (pollingTimerRef.current) {
        clearInterval(pollingTimerRef.current);
        pollingTimerRef.current = null;
      }
    };
  }, [
    table,
    pollingInterval,
    fetchData,
    isRealtimeConnected,
    onInsert,
    onUpdate,
    onDelete,
  ]);
}

/**
 * Subscribe to kitchen timer changes for a family
 * Uses new kitchen_timers table (family-level timers)
 * @param familyId - Family ID
 * @param handlers - Event handlers
 */
export function useKitchenTimerSync<T extends { id: string }>(
  familyId: string | null,
  handlers: RealtimeHandlers<T>
): void {
  useRealtimeSync({
    table: 'kitchen_timers',
    familyId: familyId || undefined,
    handlers,
    enabled: !!familyId && isFeatureEnabled('supabase_timers'),
  });
}

/**
 * Subscribe to recipe changes for a family
 * @param familyId - Family ID
 * @param handlers - Event handlers
 */
export function useRecipeSync<T extends { id: string }>(
  familyId: string | null,
  handlers: RealtimeHandlers<T>
): void {
  useRealtimeSync({
    table: 'recipes',
    familyId: familyId || undefined,
    handlers,
    enabled: !!familyId,
  });
}

/**
 * Subscribe to shopping list item changes for a family
 * @param familyId - Family ID
 * @param handlers - Event handlers
 */
export function useShoppingListSync<T extends { id: string }>(
  familyId: string | null,
  handlers: RealtimeHandlers<T>
): void {
  useRealtimeSync({
    table: 'shopping_list_items',
    familyId: familyId || undefined,
    handlers,
    enabled: !!familyId && isFeatureEnabled('supabase_shopping'),
  });
}

/**
 * Batch sync hook - subscribe to multiple tables at once
 * @param familyId - Family ID
 * @param tables - Array of table configurations
 */
export function useBatchRealtimeSync<T extends { id: string }>(
  familyId: string | null,
  tables: Array<{
    table: string;
    handlers: RealtimeHandlers<T>;
  }>
): void {
  useEffect(() => {
    if (!familyId) return;

    // Check if any Supabase features are enabled
    const supabaseEnabled =
      isFeatureEnabled('supabase_timers') ||
      isFeatureEnabled('supabase_shopping');

    if (!supabaseEnabled) {
      console.log('Batch real-time sync disabled - no Supabase features enabled');
      return;
    }

    const channels: RealtimeChannel[] = [];

    tables.forEach(({ table, handlers }) => {
      const { onInsert, onUpdate, onDelete } = handlers;
      const channelName = `${table}:${familyId}`;

      const channel = supabase
        .channel(channelName)
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table,
            filter: `family_id=eq.${familyId}`,
          },
          (payload: RealtimePostgresChangesPayload<T>) => {
            if (onInsert && payload.new) {
              onInsert(payload.new as T);
            }
          }
        )
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table,
            filter: `family_id=eq.${familyId}`,
          },
          (payload: RealtimePostgresChangesPayload<T>) => {
            if (onUpdate && payload.new) {
              onUpdate(payload.new as T);
            }
          }
        )
        .on(
          'postgres_changes',
          {
            event: 'DELETE',
            schema: 'public',
            table,
            filter: `family_id=eq.${familyId}`,
          },
          (payload: RealtimePostgresChangesPayload<T>) => {
            if (onDelete && payload.old) {
              onDelete({ id: (payload.old as T).id });
            }
          }
        )
        .subscribe();

      channels.push(channel);
    });

    // Cleanup all channels
    return () => {
      channels.forEach((channel) => channel.unsubscribe());
    };
  }, [familyId, tables]);
}
