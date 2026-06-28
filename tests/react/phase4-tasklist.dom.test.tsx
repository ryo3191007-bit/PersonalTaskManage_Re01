import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import TaskListPage from '../../src/pages/TaskListPage';
import type { Task, TaskSession } from '../../src/lib/types';

const mockState = vi.hoisted(() => ({
  tasks: [] as Task[],
  sessions: [] as TaskSession[],
  deleteTask: vi.fn(),
}));

vi.mock('../../src/contexts/TaskContext', () => ({
  useTasks: () => ({
    tasks: mockState.tasks,
    categories: [],
    sessions: mockState.sessions,
    loading: false,
    updateTask: vi.fn(),
    deleteTask: mockState.deleteTask,
    suspendTask: vi.fn(),
    resumeTask: vi.fn(),
    createSession: vi.fn(),
    updateSession: vi.fn(),
  }),
}));

function task(overrides: Partial<Task> = {}): Task {
  return {
    id: 'task-1',
    user_id: 'user-1',
    title: '一覧タスク',
    category_id: null,
    priority: 'medium',
    difficulty: 1,
    quantity: 1,
    time_per_unit: 60,
    scheduled_start: '2026-06-28T00:00:00.000Z',
    scheduled_end: '2026-06-28T01:00:00.000Z',
    parent_task_id: null,
    notes: '',
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

function setupTasks(count: number) {
  mockState.tasks = Array.from({ length: count }, (_, index) =>
    task({ id: `task-${index + 1}`, title: `削除対象${index + 1}` })
  );
}

function selectionCheckboxes(container: HTMLElement) {
  return Array.from(container.querySelectorAll<HTMLInputElement>('input[type="checkbox"]')).slice(1);
}

async function clearDefaultDateFilters(user: ReturnType<typeof userEvent.setup>) {
  const startClear = screen.queryByRole('button', { name: '予定開始日フィルタをクリア' });
  const endClear = screen.queryByRole('button', { name: '予定終了日フィルタをクリア' });
  if (startClear) await user.click(startClear);
  if (endClear) await user.click(endClear);
}

async function startBulkMode(user: ReturnType<typeof userEvent.setup>) {
  await clearDefaultDateFilters(user);
  await user.click(screen.getByRole('button', { name: /一括削除/ }));
}

beforeEach(() => {
  mockState.tasks = [];
  mockState.sessions = [];
  mockState.deleteTask.mockReset();
  mockState.deleteTask.mockResolvedValue(undefined);
});

describe('Phase4 TaskListPage bulk selection DOM', () => {
  it('TC-CB-272 TD095 TV095 TA019 R017 TaskListPage starts bulk delete with zero selected', async () => {
    const user = userEvent.setup();
    setupTasks(2);
    const { container } = render(<TaskListPage />);

    await startBulkMode(user);

    expect(container).toHaveTextContent('0件選択中');
    expect(selectionCheckboxes(container)).toHaveLength(2);
    expect(screen.getByRole('button', { name: /削除する/ })).toBeDisabled();
  });

  it('TC-CB-273 TD095 TV095 TA019 R017 TaskListPage updates count when one task is selected', async () => {
    const user = userEvent.setup();
    setupTasks(2);
    const { container } = render(<TaskListPage />);

    await startBulkMode(user);
    await user.click(selectionCheckboxes(container)[0]);

    expect(container).toHaveTextContent('1件選択中');
    expect(screen.getByRole('button', { name: /削除する/ })).not.toBeDisabled();
  });

  it('TC-CB-274 TD095 TV095 TA019 R017 TaskListPage can select multiple visible tasks', async () => {
    const user = userEvent.setup();
    setupTasks(3);
    const { container } = render(<TaskListPage />);

    await startBulkMode(user);
    const checks = selectionCheckboxes(container);
    await user.click(checks[0]);
    await user.click(checks[2]);

    expect(container).toHaveTextContent('2件選択中');
  });

  it('TC-CB-278 TD096 TV096 TA019 R017 TaskListPage with zero tasks keeps delete confirmation disabled', async () => {
    const user = userEvent.setup();
    const { container } = render(<TaskListPage />);

    await startBulkMode(user);

    expect(container).toHaveTextContent('0件選択中');
    expect(screen.getByRole('button', { name: /削除する/ })).toBeDisabled();
  });

  it('TC-CB-280 TD096 TV096 TA019 R017 TaskListPage confirms only selected multiple tasks', async () => {
    const user = userEvent.setup();
    setupTasks(3);
    const { container } = render(<TaskListPage />);

    await startBulkMode(user);
    const checks = selectionCheckboxes(container);
    await user.click(checks[0]);
    await user.click(checks[2]);
    await user.click(screen.getByRole('button', { name: /削除する/ }));
    await user.click(screen.getByRole('button', { name: /確定/ }));

    await waitFor(() => expect(mockState.deleteTask).toHaveBeenCalledTimes(2));
    expect(mockState.deleteTask).toHaveBeenCalledWith('task-1');
    expect(mockState.deleteTask).toHaveBeenCalledWith('task-3');
  });

  it('TC-CB-281 TD096 TV096 TA019 R017 TaskListPage clears selection after cancelling bulk mode', async () => {
    const user = userEvent.setup();
    setupTasks(2);
    const { container } = render(<TaskListPage />);

    await startBulkMode(user);
    await user.click(selectionCheckboxes(container)[0]);
    await user.click(screen.getByRole('button', { name: /キャンセル/ }));

    expect(container).not.toHaveTextContent('1件選択中');
    expect(selectionCheckboxes(container)).toHaveLength(0);
  });
});
