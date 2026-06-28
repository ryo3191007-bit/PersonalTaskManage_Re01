import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import TaskCard from '../../src/components/tasks/TaskCard';
import SettingsPage from '../../src/pages/SettingsPage';
import type { Task, TaskCategory } from '../../src/lib/types';

const mockState = vi.hoisted(() => ({
  sessions: [],
  deleteTask: vi.fn(),
  categories: [] as TaskCategory[],
  user: { id: 'user-1', email: 'current@example.test' },
  updateAccount: vi.fn(),
}));

vi.mock('../../src/contexts/TaskContext', () => ({
  useTasks: () => ({
    sessions: mockState.sessions,
    deleteTask: mockState.deleteTask,
    categories: mockState.categories,
    createCategory: vi.fn(),
    updateCategory: vi.fn(),
    deleteCategory: vi.fn(),
  }),
}));

vi.mock('../../src/contexts/AuthContext', () => ({
  useAuth: () => ({
    user: mockState.user,
    updateAccount: mockState.updateAccount,
  }),
}));

function category(overrides: Partial<TaskCategory> = {}): TaskCategory {
  return {
    id: 'cat-1',
    user_id: 'user-1',
    name: '<img src=x onerror=window.__xssCategory=1>',
    color: '#3b82f6',
    created_at: '2026-06-27T00:00:00.000Z',
    ...overrides,
  };
}

function task(overrides: Partial<Task> = {}): Task {
  return {
    id: 'task-1',
    user_id: 'user-1',
    title: '<script>window.__xssTitle=1</script>',
    category_id: 'cat-1',
    category: category(),
    priority: 'medium',
    difficulty: 1,
    quantity: 1,
    time_per_unit: 60,
    scheduled_start: '2026-06-27T00:00:00.000Z',
    scheduled_end: '2026-06-27T01:00:00.000Z',
    parent_task_id: null,
    notes: '<img src=x onerror=window.__xssNotes=1>',
    status: 'not_started',
    completed_at: null,
    actual_start: null,
    actual_end: null,
    actual_time: 0,
    actual_memo: '',
    suspended_at: null,
    start_delay_factor: null,
    start_early_factor: null,
    duration_over_factor: null,
    duration_short_factor: null,
    track_actual: true,
    recurrence_group_id: null,
    created_at: '2026-06-27T00:00:00.000Z',
    updated_at: '2026-06-27T00:00:00.000Z',
    ...overrides,
  };
}

beforeEach(() => {
  vi.unstubAllGlobals();
  mockState.sessions = [];
  mockState.deleteTask.mockReset();
  mockState.categories = [];
  mockState.updateAccount.mockReset();
});

describe('Phase4 React escaped display', () => {
  it('TC-CB-322 TD082 TV082 TA017 R015 task title script-like text is displayed as text', () => {
    const onEdit = vi.fn();
    const probe = { title: 0 };
    vi.stubGlobal('__xssTitle', probe.title);

    render(<TaskCard task={task()} onEdit={onEdit} />);

    expect(screen.getByText('<script>window.__xssTitle=1</script>')).toBeInTheDocument();
    expect((globalThis as unknown as { __xssTitle: number }).__xssTitle).toBe(0);
  });

  it('TC-CB-323 TD082 TV082 TA017 R015 task memo html-like text is displayed as text', () => {
    vi.stubGlobal('__xssNotes', 0);

    render(<TaskCard task={task()} onEdit={vi.fn()} />);

    expect(screen.getByText('<img src=x onerror=window.__xssNotes=1>')).toBeInTheDocument();
    expect((globalThis as unknown as { __xssNotes: number }).__xssNotes).toBe(0);
  });

  it('TC-CB-324 TD082 TV082 TA017 R015 category name html-like text is displayed as text', () => {
    vi.stubGlobal('__xssCategory', 0);
    mockState.categories = [category()];

    render(<SettingsPage />);

    expect(screen.getByText('<img src=x onerror=window.__xssCategory=1>')).toBeInTheDocument();
    expect((globalThis as unknown as { __xssCategory: number }).__xssCategory).toBe(0);
  });
});
