/**
 * Enhanced Test Utilities for StudyFlow AI
 * Comprehensive testing infrastructure with mocks, factories, and helpers
 */

import React, { ReactElement } from 'react';
import { render, RenderOptions, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BrowserRouter, MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from '@/components/ui/toaster';
import { Toaster as Sonner } from '@/components/ui/sonner';
import { TooltipProvider } from '@/components/ui/tooltip';
import { AuthProvider } from '@/hooks/useAuth';
import { SecurityProvider } from '@/hooks/useSecurity';
import { vi } from 'vitest';

// Import mock from separate file
import { mockSupabaseClient } from './__mocks__/supabase';

// Export for use in tests
export { mockSupabaseClient };

// Global mock setup
vi.mock('@/integrations/supabase/client', () => ({
  supabase: mockSupabaseClient,
}));

// Create a test query client with shorter defaults for tests
function createTestQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: false, // Turn off retries for tests
        gcTime: 0, // Don't cache during tests
        staleTime: 0,
        networkMode: 'offlineFirst', // Prevent hanging on network calls
      },
      mutations: {
        retry: false,
        networkMode: 'offlineFirst',
      },
    },
    logger: {
      log: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
    },
  });
}

interface CustomRenderOptions extends Omit<RenderOptions, 'wrapper'> {
  /**
   * Optional initial route for MemoryRouter
   */
  initialEntries?: string[];
  /**
   * Whether to use MemoryRouter instead of BrowserRouter
   * Useful for testing specific routes
   */
  useMemoryRouter?: boolean;
  /**
   * Mock user data for authenticated tests
   */
  user?: any;
  /**
   * Custom query client instance
   */
  queryClient?: QueryClient;
  /**
   * Whether to wrap with SecurityProvider
   */
  withSecurity?: boolean;
}

interface AllTheProvidersProps extends CustomRenderOptions {
  children: React.ReactNode;
}

// Enhanced wrapper component with all providers
function AllTheProviders({
  children,
  initialEntries = ['/'],
  useMemoryRouter = false,
  user = null,
  queryClient,
  withSecurity = true,
}: AllTheProvidersProps) {
  const testQueryClient = queryClient || createTestQueryClient();

  const RouterComponent = useMemoryRouter ? MemoryRouter : BrowserRouter;
  const routerProps = useMemoryRouter ? { initialEntries } : {};

  // Mock authenticated user if provided
  if (user) {
    mockSupabaseClient.auth.getUser.mockResolvedValue({
      data: { user },
      error: null,
    });
    mockSupabaseClient.auth.getSession.mockResolvedValue({
      data: { session: { user, access_token: 'mock-token' } },
      error: null,
    });
  }

  const providers = (
    <QueryClientProvider client={testQueryClient}>
      <RouterComponent {...routerProps}>
        <AuthProvider>
          <TooltipProvider>
            {children}
            <Toaster />
            <Sonner />
          </TooltipProvider>
        </AuthProvider>
      </RouterComponent>
    </QueryClientProvider>
  );

  return withSecurity ? (
    <SecurityProvider>{providers}</SecurityProvider>
  ) : (
    providers
  );
}

// Enhanced custom render function
const customRender = (
  ui: ReactElement,
  options: CustomRenderOptions = {}
) => {
  const { initialEntries, useMemoryRouter, user, queryClient, withSecurity, ...renderOptions } = options;
  
  return render(ui, {
    wrapper: (props) => (
      <AllTheProviders
        {...props}
        initialEntries={initialEntries}
        useMemoryRouter={useMemoryRouter}
        user={user}
        queryClient={queryClient}
        withSecurity={withSecurity}
      />
    ),
    ...renderOptions,
  });
};

// Re-export everything from React Testing Library
export * from '@testing-library/react';
export { customRender as render, userEvent, waitFor, screen };

// Export additional utilities
export { createTestQueryClient };

// =============================================================================
// TEST DATA FACTORIES
// =============================================================================

export const createMockUser = (overrides: Partial<any> = {}) => ({
  id: 'test-user-id',
  email: 'test@example.com',
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  email_confirmed_at: new Date().toISOString(),
  user_metadata: {},
  app_metadata: {},
  ...overrides,
});

export const createMockProfile = (overrides: Partial<any> = {}) => ({
  id: 'test-profile-id',
  user_id: 'test-user-id',
  display_name: 'Test User',
  full_name: 'Test Full Name',
  avatar_url: null,
  bio: 'Test bio',
  location: 'Test Location',
  timezone: 'UTC',
  language: 'en',
  setup_completed: true,
  preferences: {},
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  ...overrides,
});

export const createMockTask = (overrides: Partial<any> = {}) => ({
  id: 'test-task-id',
  user_id: 'test-user-id',
  title: 'Test Task',
  description: 'Test task description',
  priority: 'medium' as const,
  status: 'pending' as const,
  due_date: new Date(Date.now() + 86400000).toISOString(), // Tomorrow
  completed_at: null,
  tags: [],
  estimated_time: 60, // 1 hour in minutes
  actual_time: null,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  ...overrides,
});

export const createMockSubject = (overrides: Partial<any> = {}) => ({
  id: 'test-subject-id',
  user_id: 'test-user-id',
  name: 'Test Subject',
  code: 'TEST101',
  color: '#3B82F6',
  icon: '📚',
  credits: 3,
  instructor: 'Test Instructor',
  room: 'Room 101',
  description: 'Test subject description',
  semester: 'Fall 2024',
  schedule: {},
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  ...overrides,
});

export const createMockStudySession = (overrides: Partial<any> = {}) => ({
  id: 'test-session-id',
  user_id: 'test-user-id',
  subject_id: 'test-subject-id',
  start_time: new Date().toISOString(),
  end_time: new Date(Date.now() + 1800000).toISOString(), // 30 minutes later
  duration: 1800, // 30 minutes in seconds
  session_type: 'pomodoro' as const,
  notes: 'Test session notes',
  mood_before: 'neutral' as const,
  mood_after: 'good' as const,
  focus_rating: 4,
  productivity_rating: 4,
  break_time: 300, // 5 minutes
  created_at: new Date().toISOString(),
  ...overrides,
});

export const createMockGoal = (overrides: Partial<any> = {}) => ({
  id: 'test-goal-id',
  user_id: 'test-user-id',
  title: 'Test Goal',
  description: 'Test goal description',
  target_value: 100,
  current_value: 50,
  unit: 'hours',
  category: 'study',
  priority: 'high' as const,
  deadline: new Date(Date.now() + 7 * 86400000).toISOString(), // 1 week from now
  status: 'active' as const,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  ...overrides,
});

export const createMockFlashcard = (overrides: Partial<any> = {}) => ({
  id: 'test-flashcard-id',
  user_id: 'test-user-id',
  subject_id: 'test-subject-id',
  question: 'Test Question?',
  answer: 'Test Answer',
  difficulty: 'medium' as const,
  tags: ['test', 'sample'],
  last_reviewed: null,
  next_review: new Date().toISOString(),
  review_count: 0,
  correct_count: 0,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  ...overrides,
});

// =============================================================================
// AI-SPECIFIC TEST FACTORIES
// =============================================================================

export const createMockAIResponse = (overrides: Partial<any> = {}) => ({
  id: 'test-response-id',
  content: 'This is a test AI response.',
  type: 'text' as const,
  timestamp: new Date().toISOString(),
  metadata: {
    model: 'test-model',
    tokens: 20,
    confidence: 0.95,
  },
  ...overrides,
});

export const createMockChatMessage = (overrides: Partial<any> = {}) => ({
  id: 'test-message-id',
  role: 'user' as const,
  content: 'Test message content',
  timestamp: new Date().toISOString(),
  metadata: {},
  ...overrides,
});

export const createMockChatSession = (overrides: Partial<any> = {}) => ({
  id: 'test-session-id',
  user_id: 'test-user-id',
  title: 'Test Chat Session',
  messages: [
    createMockChatMessage({ role: 'user', content: 'Hello' }),
    createMockChatMessage({ role: 'assistant', content: 'Hi there!' }),
  ],
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  ...overrides,
});

// =============================================================================
// UTILITY FUNCTIONS FOR TESTING
// =============================================================================

/**
 * Waits for any pending promises to resolve
 */
export const waitForLoadingToFinish = () => 
  new Promise(resolve => setTimeout(resolve, 0));

/**
 * Creates a standardized Supabase response mock
 */
export const mockSupabaseResponse = <T,>(data: T, error: any = null) => ({
  data,
  error,
  count: Array.isArray(data) ? data.length : null,
  status: error ? 400 : 200,
  statusText: error ? 'Bad Request' : 'OK',
});

/**
 * Creates a mock error response
 */
export const createMockError = (message = 'Test error', code = 'TEST_ERROR') => ({
  message,
  code,
  details: null,
  hint: null,
});

/**
 * Simulates a network delay for async operations
 */
export const simulateNetworkDelay = (ms = 100) =>
  new Promise(resolve => setTimeout(resolve, ms));

/**
 * Helper to mock API calls with realistic delays
 */
export const mockAsyncOperation = async <T,>(
  data: T,
  delay = 100,
  shouldFail = false
): Promise<{ data: T | null; error: any }> => {
  await simulateNetworkDelay(delay);
  
  if (shouldFail) {
    return { data: null, error: createMockError('Operation failed') };
  }
  
  return { data, error: null };
};

/**
 * Helper to create mock FormData for file uploads
 */
export const createMockFormData = (fields: Record<string, any> = {}) => {
  const formData = new FormData();
  Object.entries(fields).forEach(([key, value]) => {
    formData.append(key, value);
  });
  return formData;
};

/**
 * Helper to create mock File objects
 */
export const createMockFile = (
  name = 'test.txt',
  content = 'test content',
  type = 'text/plain'
) => {
  return new File([content], name, { type });
};

// =============================================================================
// CUSTOM MATCHERS AND ASSERTIONS
// =============================================================================

/**
 * Custom matcher to check if an element has accessible attributes
 */
export const toBeAccessible = (element: HTMLElement) => {
  const hasAriaLabel = element.hasAttribute('aria-label');
  const hasAriaLabelledBy = element.hasAttribute('aria-labelledby');
  const hasAriaDescribedBy = element.hasAttribute('aria-describedby');
  const hasTitle = element.hasAttribute('title');
  
  const isAccessible = hasAriaLabel || hasAriaLabelledBy || hasAriaDescribedBy || hasTitle;
  
  return {
    pass: isAccessible,
    message: () => `Expected element to have accessibility attributes`,
  };
};

/**
 * Helper to find elements by test ID with better error messages
 */
export const getByTestId = (testId: string) => {
  try {
    return screen.getByTestId(testId);
  } catch (error) {
    throw new Error(
      `Unable to find element with test ID "${testId}". ` +
      `Available test IDs: ${screen.getAllByTestId(/.*/).map(el => el.getAttribute('data-testid')).join(', ')}`
    );
  }
};

/**
 * Helper to wait for element to appear with custom timeout
 */
export const waitForElement = async (
  testId: string,
  timeout = 5000
) => {
  return await screen.findByTestId(testId, {}, { timeout });
};

// =============================================================================
// MOCK PROVIDERS AND CONTEXTS
// =============================================================================

/**
 * Mock implementation of useAuth hook for testing
 */
export const createMockAuthContext = (overrides: Partial<any> = {}) => ({
  user: null,
  profile: null,
  loading: false,
  signIn: vi.fn(),
  signUp: vi.fn(),
  signOut: vi.fn(),
  updateProfile: vi.fn(),
  resetPassword: vi.fn(),
  ...overrides,
});

/**
 * Mock implementation of useSecurity hook for testing
 */
export const createMockSecurityContext = (overrides: Partial<any> = {}) => ({
  securityLevel: 'standard' as const,
  violations: [],
  checkSecurity: vi.fn(),
  reportViolation: vi.fn(),
  clearViolations: vi.fn(),
  ...overrides,
});

// =============================================================================
// SETUP AND TEARDOWN HELPERS
// =============================================================================

/**
 * Reset all mocks to their initial state
 */
export const resetAllMocks = () => {
  vi.clearAllMocks();
  // Reset Supabase client mocks
  Object.values(mockSupabaseClient.auth).forEach(mock => {
    if (vi.isMockFunction(mock)) {
      mock.mockClear();
    }
  });
};

/**
 * Setup common mock implementations for tests
 */
export const setupCommonMocks = () => {
  // Mock successful database operations by default
  mockSupabaseClient.from().select().mockResolvedValue(mockSupabaseResponse([]));
  mockSupabaseClient.from().insert().mockResolvedValue(mockSupabaseResponse({}));
  mockSupabaseClient.from().update().mockResolvedValue(mockSupabaseResponse({}));
  mockSupabaseClient.from().delete().mockResolvedValue(mockSupabaseResponse({}));
  
  // Mock successful auth operations by default
  mockSupabaseClient.auth.getUser.mockResolvedValue(mockSupabaseResponse(null));
  mockSupabaseClient.auth.getSession.mockResolvedValue(mockSupabaseResponse({ session: null }));
};
