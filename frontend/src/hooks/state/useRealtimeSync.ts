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
 */

import { useEffect } from 'react';
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
}: UseRealtimeSyncOptions<T>): void {
  const { onInsert, onUpdate, onDelete } = handlers;

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
            onDelete({ id: (payload.old as T).id });
          }
        }
      )
      .subscribe();

    // Cleanup on unmount
    return () => {
      channel.unsubscribe();
    };
  }, [table, familyId, enabled, onInsert, onUpdate, onDelete]);
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
