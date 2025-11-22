/**
 * React Query Client Configuration
 */

import { QueryClient } from '@tanstack/react-query';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes - data stays fresh for 5 min
      gcTime: 1000 * 60 * 10, // 10 minutes - keep in cache for 10 min
      refetchOnWindowFocus: false, // Disabled - rely on WebSocket for updates
      refetchOnReconnect: true, // Keep enabled for network recovery
      retry: 2, // Reduced from 3 to 2 attempts
    },
    mutations: {
      retry: 0, // Don't retry mutations automatically
    },
  },
});
