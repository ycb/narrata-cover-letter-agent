/**
 * Centralized Test Utilities
 * 
 * Purpose: Standardize test setup across all component and integration tests
 * 
 * Key Features:
 * - QueryClient wrapper for React Query hooks
 * - Auth context mocking
 * - Supabase mocking utilities
 * - Custom render functions
 * 
 * Usage:
 * ```typescript
 * import { renderWithProviders } from '@/tests/utils/test-utils';
 * 
 * test('my component', () => {
 *   renderWithProviders(<MyComponent />);
 *   // assertions...
 * });
 * ```
 */

import React from 'react';
import { render, type RenderOptions } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { vi } from 'vitest';

// ============================================================================
// Query Client Setup
// ============================================================================

/**
 * Create a fresh QueryClient for each test
 * - Disables retries for faster test execution
 * - Disables caching to avoid test pollution
 * - Sets short stale time for predictable behavior
 */
export function createTestQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        gcTime: 0,
        staleTime: 0,
      },
      mutations: {
        retry: false,
      },
    },
    logger: {
      log: () => {},
      warn: () => {},
      error: () => {},
    },
  });
}

// ============================================================================
// Test Providers
// ============================================================================

interface TestProvidersProps {
  children: React.ReactNode;
  queryClient?: QueryClient;
}

/**
 * Minimal provider wrapper with QueryClient
 * Use this for tests that only need React Query
 */
export function QueryClientWrapper({ children, queryClient }: TestProvidersProps) {
  const client = queryClient || createTestQueryClient();
  
  return (
    <QueryClientProvider client={client}>
      {children}
    </QueryClientProvider>
  );
}

/**
 * Full provider wrapper with QueryClient + Auth + UserGoals
 * Use this for tests that need full app context
 */
export function AllProvidersWrapper({ children, queryClient }: TestProvidersProps) {
  const client = queryClient || createTestQueryClient();
  
  const mockUser = {
    id: 'test-user-123',
    email: 'test@example.com',
  };

  const mockAuthContext = {
    user: mockUser,
    session: null,
    isLoading: false,
    signOut: vi.fn(),
  };

  // Note: AuthProvider and UserGoalsProvider need to be imported
  // This is a minimal version - extend as needed
  return (
    <QueryClientProvider client={client}>
      {children}
    </QueryClientProvider>
  );
}

// ============================================================================
// Custom Render Functions
// ============================================================================

interface CustomRenderOptions extends Omit<RenderOptions, 'wrapper'> {
  queryClient?: QueryClient;
}

/**
 * Render component with QueryClient wrapper
 * 
 * @example
 * ```typescript
 * renderWithQueryClient(<MyComponent />);
 * ```
 */
export function renderWithQueryClient(
  ui: React.ReactElement,
  options?: CustomRenderOptions
) {
  const { queryClient, ...renderOptions } = options || {};
  
  return render(ui, {
    wrapper: ({ children }) => (
      <QueryClientWrapper queryClient={queryClient}>
        {children}
      </QueryClientWrapper>
    ),
    ...renderOptions,
  });
}

/**
 * Render component with all providers (QueryClient + Auth + UserGoals)
 * 
 * @example
 * ```typescript
 * renderWithProviders(<MyComponent />);
 * ```
 */
export function renderWithProviders(
  ui: React.ReactElement,
  options?: CustomRenderOptions
) {
  const { queryClient, ...renderOptions } = options || {};
  
  return render(ui, {
    wrapper: ({ children }) => (
      <AllProvidersWrapper queryClient={queryClient}>
        {children}
      </AllProvidersWrapper>
    ),
    ...renderOptions,
  });
}

// ============================================================================
// Test Mocks & Utilities
// ============================================================================

/**
 * Mock Supabase client for testing
 * 
 * @example
 * ```typescript
 * const mockSupabase = createMockSupabase({
 *   from: {
 *     select: { data: mockData, error: null }
 *   }
 * });
 * ```
 */
export function createMockSupabase(overrides: any = {}) {
  return {
    from: vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({ data: null, error: null }),
        neq: vi.fn().mockResolvedValue({ data: null, error: null }),
        in: vi.fn().mockResolvedValue({ data: null, error: null }),
        order: vi.fn().mockResolvedValue({ data: null, error: null }),
        single: vi.fn().mockResolvedValue({ data: null, error: null }),
        ...overrides.select,
      }),
      insert: vi.fn().mockReturnValue({
        select: vi.fn().mockResolvedValue({ data: null, error: null }),
        ...overrides.insert,
      }),
      update: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          select: vi.fn().mockResolvedValue({ data: null, error: null }),
        }),
        ...overrides.update,
      }),
      delete: vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({ data: null, error: null }),
        ...overrides.delete,
      }),
      ...overrides.from,
    }),
    auth: {
      getUser: vi.fn().mockResolvedValue({
        data: { user: { id: 'test-user-123', email: 'test@example.com' } },
        error: null,
      }),
      ...overrides.auth,
    },
    rpc: vi.fn().mockResolvedValue({ data: null, error: null }),
    ...overrides,
  };
}

/**
 * Mock feature flags for testing
 * 
 * @example
 * ```typescript
 * mockFeatureFlags({
 *   isDraftReadinessEnabled: true,
 *   isAPhaseInsightsEnabled: true,
 * });
 * ```
 */
export function mockFeatureFlags(flags: Record<string, boolean>) {
  return vi.mock('@/lib/flags', () => {
    const actual = vi.importActual('@/lib/flags');
    return {
      ...actual,
      ...Object.entries(flags).reduce((acc, [key, value]) => {
        acc[key] = () => value;
        return acc;
      }, {} as Record<string, () => boolean>),
    };
  });
}

/**
 * Wait for React Query to settle (all queries resolved)
 * 
 * @example
 * ```typescript
 * await waitForQueryToSettle(queryClient);
 * ```
 */
export async function waitForQueryToSettle(queryClient: QueryClient) {
  await queryClient.refetchQueries();
  await new Promise(resolve => setTimeout(resolve, 0));
}

// ============================================================================
// Re-exports from @testing-library/react
// ============================================================================

export * from '@testing-library/react';
export { default as userEvent } from '@testing-library/user-event';












