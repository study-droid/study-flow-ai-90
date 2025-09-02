/**
 * useTasks Hook Tests
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useTasks } from './useTasks';
import { supabase } from '@/integrations/supabase/client';

// Mock Supabase
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    auth: {
      getUser: vi.fn(),
    },
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      insert: vi.fn().mockReturnThis(),
      update: vi.fn().mockReturnThis(),
      delete: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      single: vi.fn(),
    })),
  },
}));

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });
  
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
};

describe('useTasks Hook', () => {
  const mockUser = { id: 'test-user-id', email: 'test@example.com' };
  const mockTasks = [
    {
      id: 'task-1',
      user_id: 'test-user-id',
      title: 'Complete homework',
      description: 'Math assignment',
      priority: 'high',
      status: 'pending',
      due_date: '2024-12-31T23:59:59Z',
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z',
    },
    {
      id: 'task-2',
      user_id: 'test-user-id',
      title: 'Study for exam',
      description: 'Physics final',
      priority: 'urgent',
      status: 'in_progress',
      due_date: '2024-12-25T23:59:59Z',
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z',
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    (supabase.auth.getUser as any).mockResolvedValue({
      data: { user: mockUser },
      error: null,
    });
  });

  describe('Loading Tasks', () => {
    it('should load tasks on mount', async () => {
      const fromMock = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({ data: mockTasks, error: null }),
      };
      (supabase.from as any).mockReturnValue(fromMock);

      const { result } = renderHook(() => useTasks(), {
        wrapper: createWrapper(),
      });

      expect(result.current.loading).toBe(true);

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.tasks).toEqual(mockTasks);
      expect(supabase.from).toHaveBeenCalledWith('tasks');
      expect(fromMock.eq).toHaveBeenCalledWith('user_id', mockUser.id);
    });

    it('should handle loading error', async () => {
      const error = new Error('Failed to load tasks');
      const fromMock = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({ data: null, error }),
      };
      (supabase.from as any).mockReturnValue(fromMock);

      const { result } = renderHook(() => useTasks(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.tasks).toEqual([]);
    });

    it('should return empty array when no user', async () => {
      (supabase.auth.getUser as any).mockResolvedValue({
        data: { user: null },
        error: null,
      });

      const { result } = renderHook(() => useTasks(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.tasks).toEqual([]);
      expect(supabase.from).not.toHaveBeenCalled();
    });
  });

  describe('Creating Tasks', () => {
    it('should create a new task', async () => {
      const newTask = {
        title: 'New Task',
        description: 'Task description',
        priority: 'medium' as const,
        status: 'pending' as const,
        due_date: '2024-12-31T23:59:59Z',
      };

      const createdTask = { ...newTask, id: 'new-task-id', user_id: mockUser.id };

      const fromMock = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({ data: [], error: null }),
        insert: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: createdTask, error: null }),
      };
      (supabase.from as any).mockReturnValue(fromMock);

      const { result } = renderHook(() => useTasks(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      await act(async () => {
        await result.current.createTask(newTask);
      });

      expect(fromMock.insert).toHaveBeenCalledWith({
        ...newTask,
        user_id: mockUser.id,
      });
    });

    it('should handle create error', async () => {
      const error = new Error('Failed to create task');
      const fromMock = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({ data: [], error: null }),
        insert: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: null, error }),
      };
      (supabase.from as any).mockReturnValue(fromMock);

      const { result } = renderHook(() => useTasks(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      await expect(
        act(async () => {
          await result.current.createTask({
            title: 'Test',
            priority: 'low',
            status: 'pending',
          });
        })
      ).rejects.toThrow('Failed to create task');
    });
  });

  describe('Updating Tasks', () => {
    it('should update an existing task', async () => {
      const updates = { title: 'Updated Title', status: 'completed' as const };
      const updatedTask = { ...mockTasks[0], ...updates };

      const fromMock = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({ data: mockTasks, error: null }),
        update: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: updatedTask, error: null }),
      };
      (supabase.from as any).mockReturnValue(fromMock);

      const { result } = renderHook(() => useTasks(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      await act(async () => {
        await result.current.updateTask('task-1', updates);
      });

      expect(fromMock.update).toHaveBeenCalledWith(updates);
      expect(fromMock.eq).toHaveBeenCalledWith('id', 'task-1');
    });

    it('should toggle task completion', async () => {
      const fromMock = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({ data: mockTasks, error: null }),
        update: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: { ...mockTasks[0], status: 'completed' },
          error: null,
        }),
      };
      (supabase.from as any).mockReturnValue(fromMock);

      const { result } = renderHook(() => useTasks(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      await act(async () => {
        await result.current.toggleTaskComplete('task-1');
      });

      expect(fromMock.update).toHaveBeenCalledWith({ status: 'completed' });
    });
  });

  describe('Deleting Tasks', () => {
    it('should delete a task', async () => {
      const fromMock = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({ data: mockTasks, error: null }),
        delete: vi.fn().mockReturnThis(),
      };
      
      // Setup delete mock to resolve successfully
      fromMock.eq.mockResolvedValueOnce({ error: null });
      (supabase.from as any).mockReturnValue(fromMock);

      const { result } = renderHook(() => useTasks(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      await act(async () => {
        await result.current.deleteTask('task-1');
      });

      expect(fromMock.delete).toHaveBeenCalled();
      expect(fromMock.eq).toHaveBeenCalledWith('id', 'task-1');
    });
  });

  describe('Task Filtering and Sorting', () => {
    it('should get tasks by status', async () => {
      const fromMock = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({ data: mockTasks, error: null }),
      };
      (supabase.from as any).mockReturnValue(fromMock);

      const { result } = renderHook(() => useTasks(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      const pendingTasks = result.current.getTasksByStatus('pending');
      expect(pendingTasks).toHaveLength(1);
      expect(pendingTasks[0].status).toBe('pending');

      const inProgressTasks = result.current.getTasksByStatus('in_progress');
      expect(inProgressTasks).toHaveLength(1);
      expect(inProgressTasks[0].status).toBe('in_progress');
    });

    it('should get tasks by priority', async () => {
      const fromMock = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({ data: mockTasks, error: null }),
      };
      (supabase.from as any).mockReturnValue(fromMock);

      const { result } = renderHook(() => useTasks(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      const highPriorityTasks = result.current.getTasksByPriority('high');
      expect(highPriorityTasks).toHaveLength(1);
      expect(highPriorityTasks[0].priority).toBe('high');

      const urgentTasks = result.current.getTasksByPriority('urgent');
      expect(urgentTasks).toHaveLength(1);
      expect(urgentTasks[0].priority).toBe('urgent');
    });

    it('should get overdue tasks', async () => {
      const pastDate = new Date('2020-01-01').toISOString();
      const futureDate = new Date('2030-01-01').toISOString();
      
      const tasksWithDates = [
        { ...mockTasks[0], due_date: pastDate, status: 'pending' },
        { ...mockTasks[1], due_date: futureDate, status: 'pending' },
      ];

      const fromMock = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({ data: tasksWithDates, error: null }),
      };
      (supabase.from as any).mockReturnValue(fromMock);

      const { result } = renderHook(() => useTasks(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      const overdueTasks = result.current.getOverdueTasks();
      expect(overdueTasks).toHaveLength(1);
      expect(overdueTasks[0].due_date).toBe(pastDate);
    });
  });
});