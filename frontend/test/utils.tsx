/**
 * Test utilities and custom render functions
 */

import { ReactElement } from 'react';
import { render, RenderOptions } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter } from 'react-router-dom';
import { AuthProvider } from '../src/contexts/AuthContext';
import { FamilyProvider } from '../src/contexts/FamilyContext';
import { WebSocketProvider } from '../src/contexts/WebSocketContext';

// Create a custom render function that includes all providers
const AllTheProviders = ({ children }: { children: React.ReactNode }) => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        cacheTime: 0,
      },
      mutations: {
        retry: false,
      },
    },
  });

  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AuthProvider>
          <FamilyProvider>
            <WebSocketProvider>
              {children}
            </WebSocketProvider>
          </FamilyProvider>
        </AuthProvider>
      </BrowserRouter>
    </QueryClientProvider>
  );
};

const customRender = (
  ui: ReactElement,
  options?: Omit<RenderOptions, 'wrapper'>
) => render(ui, { wrapper: AllTheProviders, ...options });

// Create a simple render without providers (for isolated component testing)
const simpleRender = (
  ui: ReactElement,
  options?: RenderOptions
) => render(ui, options);

// Re-export everything
export * from '@testing-library/react';
export { customRender as render, simpleRender };
