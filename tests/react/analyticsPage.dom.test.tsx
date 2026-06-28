import { fireEvent, render, screen, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import AnalyticsPage from '../../src/pages/AnalyticsPage';
import type { Task, TaskCategory, TaskSession } from '../../src/lib/types';

const mockState = vi.hoisted(() => ({
  tasks: [] as Task[],
  categories: [] as TaskCategory[],
  sessions: [] as TaskSession[],
}));

vi.mock('../../src/contexts/TaskContext', () => ({
  useTasks: () => ({
    tasks: mockState.tasks,
    categories: mockState.categories,
    sessions: mockState.sessions,
  }),
}));

function category(overrides: Partial<TaskCategory> = {}): TaskCategory {
  return {
    id: 'cat-1',
    user_id: 'user-1',
    name: '開発',
    color: '#3b82f6',
    created_at: '2026-06-27T00:00:00.000Z',
    ...overrides,
  };
}

function task(overrides: Partial<Task> = {}): Task {
  return {
    id: 'task-1',
    user_id: 'user-1',
    title: '分析対象タスク',
    category_id: 'cat-1',
    priority: 'medium',
    difficulty: 1,
    quantity: 1,
    time_per_unit: 60,
    scheduled_start: '2026-06-27T00:00:00.000Z',
    scheduled_end: '2026-06-27T01:00:00.000Z',
    parent_task_id: null,
    notes: '',
    status: 'completed',
    completed_at: '2026-06-27T01:00:00.000Z',
    actual_start: '2026-06-27T00:00:00.000Z',
    actual_end: '2026-06-27T01:30:00.000Z',
    actual_time: 90,
    actual_memo: '',
    suspended_at: null,
    start_delay_factor: null,
    start_early_factor: null,
    duration_over_factor: '見積不足',
    duration_short_factor: null,
    track_actual: true,
    recurrence_group_id: null,
    created_at: '2026-06-27T00:00:00.000Z',
    updated_at: '2026-06-27T00:00:00.000Z',
    ...overrides,
  };
}

function session(overrides: Partial<TaskSession> = {}): TaskSession {
  return {
    id: 'session-1',
    task_id: 'task-1',
    user_id: 'user-1',
    session_start: '2026-06-27T00:00:00.000Z',
    session_end: '2026-06-27T01:30:00.000Z',
    created_at: '2026-06-27T00:00:00.000Z',
    ...overrides,
  };
}

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date('2026-06-27T03:00:00.000Z'));
  mockState.tasks = [];
  mockState.categories = [];
  mockState.sessions = [];
});

describe('AnalyticsPage React DOM', () => {
  it('TC-CB-084〜TC-CB-087 TD034 TV034 TA006 R006 表示時だけ時間小数第1位と割合整数に丸める', () => {
    mockState.categories = [category()];
    mockState.tasks = [
      task({
        actual_start: '2026-06-27T00:00:00.000Z',
        actual_end: '2026-06-27T01:30:00.000Z',
        actual_time: 90,
      }),
      task({
        id: 'task-2',
        status: 'not_started',
        actual_start: null,
        actual_end: null,
        actual_time: 0,
        completed_at: null,
      }),
    ];
    mockState.sessions = [session()];

    const { container } = render(<AnalyticsPage />);

    expect(container).toHaveTextContent('50%');
    expect(container).toHaveTextContent('1.5h');
    expect(container).toHaveTextContent('開発');
    expect(container.textContent).not.toContain('1.50h');
  });

  it('TC-CB-091〜TC-CB-092 TD035 TV035 TA006 R006 空データとカテゴリなしをゼロ/未入力として表示する', () => {
    const { rerender, container } = render(<AnalyticsPage />);

    expect(container).toHaveTextContent('0%');
    expect(container).toHaveTextContent('0h');

    mockState.tasks = [
      task({
        id: 'no-category',
        category_id: null,
        title: 'カテゴリなし',
      }),
    ];
    rerender(<AnalyticsPage />);

    expect(container).toHaveTextContent('100%');
    expect(container).toHaveTextContent('1.5h');
  });

  it('TC-CB-093〜TC-CB-096 TD036 TV036 TA006 R006 全期間・月別・日別表示を切り替えて同一データの合計を保つ', async () => {
    mockState.categories = [category()];
    mockState.tasks = [task()];
    mockState.sessions = [session()];

    const { container } = render(<AnalyticsPage />);
    expect(container).toHaveTextContent('1.5h');

    const periodSelect = screen.getByRole('combobox');
    fireEvent.change(periodSelect, { target: { value: 'all' } });
    expect(container).toHaveTextContent('1.5h');

    const monthButton = Array.from(container.querySelectorAll('div.cursor-pointer')).find(node =>
      node.textContent?.includes('06')
    );
    expect(monthButton).toBeTruthy();
    fireEvent.click(monthButton as HTMLElement);
    expect(container).toHaveTextContent('1.5h');

    fireEvent.click(screen.getByRole('button', { name: /戻|謌ｻ/ }));
    expect(within(container).getByRole('combobox')).toHaveValue('all');
  });
});
