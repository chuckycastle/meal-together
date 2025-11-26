/**
 * Realtime Context
 * Manages Supabase Realtime connection and channel subscriptions
 */

import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import type { ReactNode } from 'react';
import { RealtimeChannel } from '@supabase/supabase-js';
import { getSupabase } from '../lib/supabase';
import { isFeatureEnabled } from '../config/featureFlags';
import type { RealtimeConnectionInfo } from '../types';

interface RealtimeContextValue {
  connectionInfo: RealtimeConnectionInfo;
  subscribe: (channelName: string, config: ChannelConfig) => () => void;
  unsubscribe: (channelName: string) => void;
  getChannel: (channelName: string) => RealtimeChannel | null;
}

interface ChannelConfig {
  event?: string;
  schema?: string;
  table?: string;
  filter?: string;
  callback: (payload: any) => void;
}

const RealtimeContext = createContext<RealtimeContextValue | undefined>(undefined);

interface RealtimeProviderProps {
  children: ReactNode;
}

export const RealtimeProvider: React.FC<RealtimeProviderProps> = ({ children }) => {
  const [connectionInfo, setConnectionInfo] = useState<RealtimeConnectionInfo>({
    status: 'disconnected',
    reconnectAttempts: 0,
  });
  const [channels, setChannels] = useState<Map<string, RealtimeChannel>>(new Map());

  // Monitor connection status
  useEffect(() => {
    // Only initialize if Realtime features are enabled
    const hasRealtimeFeatures =
      isFeatureEnabled('supabase_timers') || isFeatureEnabled('supabase_shopping');

    if (!hasRealtimeFeatures) {
      return;
    }

    setConnectionInfo((prev) => ({ ...prev, status: 'connecting' }));

    try {
      const supabase = getSupabase();

      // Test connection by subscribing to a presence channel
      const presenceChannel = supabase.channel('presence-test');

      presenceChannel
        .on('presence', { event: 'sync' }, () => {
          setConnectionInfo({
            status: 'connected',
            lastConnectedAt: new Date(),
            reconnectAttempts: 0,
          });
        })
        .subscribe((status) => {
          if (status === 'SUBSCRIBED') {
            setConnectionInfo({
              status: 'connected',
              lastConnectedAt: new Date(),
              reconnectAttempts: 0,
            });
          } else if (status === 'CHANNEL_ERROR') {
            setConnectionInfo((prev) => ({
              status: 'error',
              error: new Error('Failed to connect to Realtime'),
              reconnectAttempts: (prev.reconnectAttempts || 0) + 1,
            }));
          } else if (status === 'TIMED_OUT') {
            setConnectionInfo((prev) => ({
              status: 'error',
              error: new Error('Connection timed out'),
              reconnectAttempts: (prev.reconnectAttempts || 0) + 1,
            }));
          } else if (status === 'CLOSED') {
            setConnectionInfo({
              status: 'disconnected',
              reconnectAttempts: 0,
            });
          }
        });

      return () => {
        presenceChannel.unsubscribe();
      };
    } catch (error) {
      console.error('Failed to initialize Realtime:', error);
      setConnectionInfo({
        status: 'error',
        error: error as Error,
      });
    }
  }, []);

  // Subscribe to a channel
  const subscribe = useCallback(
    (channelName: string, config: ChannelConfig) => {
      const supabase = getSupabase();
      const channel = supabase.channel(channelName);

      // Configure channel based on config
      if (config.table) {
        (channel as any).on(
          'postgres_changes',
          {
            event: config.event || '*',
            schema: config.schema || 'public',
            table: config.table,
            filter: config.filter,
          },
          config.callback
        );
      } else {
        // Custom event subscription - for presence or broadcast events
        (channel as any).on(config.event || 'sync', {}, config.callback);
      }

      channel.subscribe();

      // Store channel reference
      setChannels((prev) => {
        const newChannels = new Map(prev);
        newChannels.set(channelName, channel);
        return newChannels;
      });

      // Return unsubscribe function
      return () => {
        channel.unsubscribe();
        setChannels((prev) => {
          const newChannels = new Map(prev);
          newChannels.delete(channelName);
          return newChannels;
        });
      };
    },
    []
  );

  // Unsubscribe from a channel
  const unsubscribe = useCallback((channelName: string) => {
    const channel = channels.get(channelName);
    if (channel) {
      channel.unsubscribe();
      setChannels((prev) => {
        const newChannels = new Map(prev);
        newChannels.delete(channelName);
        return newChannels;
      });
    }
  }, [channels]);

  // Get channel reference
  const getChannel = useCallback(
    (channelName: string) => {
      return channels.get(channelName) || null;
    },
    [channels]
  );

  const value: RealtimeContextValue = {
    connectionInfo,
    subscribe,
    unsubscribe,
    getChannel,
  };

  return <RealtimeContext.Provider value={value}>{children}</RealtimeContext.Provider>;
};

export const useRealtime = (): RealtimeContextValue => {
  const context = useContext(RealtimeContext);
  if (!context) {
    throw new Error('useRealtime must be used within RealtimeProvider');
  }
  return context;
};

export default RealtimeContext;
