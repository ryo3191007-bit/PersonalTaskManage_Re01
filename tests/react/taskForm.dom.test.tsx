import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import TaskForm from '../../src/components/tasks/TaskForm';
import type { Task, TaskCategory, TaskSession } from '../../src/lib/types';

const mockState = vi.hoisted(() => ({
  tasks: [] as Task[],
  categories: [] as TaskCategory[],
  sessions: [] as TaskSession[],
  createTask: vi.fn(),
  updateTask: vi.fn(),
  deleteTask: vi.fn(),
  createCategory: vi.fn(),
  updateCategory: vi.fn(),
  deleteCategory: vi.fn(),
  createRecurrenceGroup: vi.fn(),
  updateRecurrenceGroup: vi.fn(),
  deleteRecurrenceGroup: vi.fn(),
  bulkCreateTasksForGroup: vi.fn(),
  bulkUpdateTasksForGroup: vi.fn(),
  suspendTask: vi.fn(),
  resumeTask: vi.fn(),
  updateSession: vi.fn(),
  createSession: vi.fn(),
  deleteSession: vi.fn(),
  refetch: vi.fn(),
}));

vi.mock('../../src/contexts/TaskContext', () => ({
  useTasks: () => ({
    tasks: mockState.tasks,
    categories: mockState.categories,
    recurrenceGroups: [],
    sessions: mockState.sessions,
    loading: false,
    refetch: mockState.refetch,
    createTask: mockState.createTask,
    updateTask: mockState.updateTask,
    deleteTask: mockState.deleteTask,
    createCategory: mockState.createCategory,
    updateCategory: mockState.updateCategory,
    deleteCategory: mockState.deleteCategory,
    createRecurrenceGroup: mockState.createRecurrenceGroup,
    updateRecurrenceGroup: mockState.updateRecurrenceGroup,
    deleteRecurrenceGroup: mockState.deleteRecurrenceGroup,
    bulkCreateTasksForGroup: mockState.bulkCreateTasksForGroup,
    bulkUpdateTasksForGroup: mockState.bulkUpdateTasksForGroup,
    suspendTask: mockState.suspendTask,
    resumeTask: mockState.resumeTask,
    updateSession: mockState.updateSession,
    createSession: mockState.createSession,
    deleteSession: mockState.deleteSession,
  }),
}));

function task(overrides: Partial<Task> = {}): Task {
  return {
    id: 'task-1',
    user_id: 'user-1',
    title: '編集対象タスク',
    category_id: null,
    priority: 'medium',
    difficulty: 0,
    quantity: 1,
    time_per_unit: 0,
    scheduled_start: null,
    scheduled_end: null,
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

async function renderTaskForm(props: Partial<React.ComponentProps<typeof TaskForm>> = {}) {
  const onClose = vi.fn();
  const user = userEvent.setup();
  render(<TaskForm onClose={onClose} {...props} />);
  return { user, onClose };
}

async function submitCreate(user: ReturnType<typeof userEvent.setup>) {
  await user.click(screen.getByRole('button', { name: '作成する' }));
}

async function fillRequiredTitle(user: ReturnType<typeof userEvent.setup>, value = '有効なタスク') {
  const titleInput = screen.getByPlaceholderText('タスク名を入力');
  await user.clear(titleInput);
  await user.type(titleInput, value);
}

function statusSelect() {
  return screen.getByDisplayValue('未着手');
}

function datetimeInputs() {
  return Array.from(document.querySelectorAll<HTMLInputElement>('input[type="datetime-local"]'));
}

function numberInputs() {
  const inputs = Array.from(document.querySelectorAll<HTMLInputElement>('input[type="number"]'));
  if (inputs.length < 2) throw new Error('number inputs not found');
  return { quantity: inputs[0], timePerUnit: inputs[1] };
}

async function setNumberInput(user: ReturnType<typeof userEvent.setup>, input: HTMLInputElement, value: string) {
  await user.clear(input);
  if (value) await user.type(input, value);
}

beforeEach(() => {
  mockState.tasks = [];
  mockState.categories = [];
  mockState.sessions = [];
  mockState.createTask.mockReset();
  mockState.createTask.mockResolvedValue(task({ id: 'created-task' }));
  mockState.updateTask.mockReset();
  mockState.updateTask.mockResolvedValue(undefined);
  mockState.createSession.mockReset();
  mockState.createSession.mockResolvedValue({
    id: 'created-session',
    task_id: 'created-task',
    user_id: 'user-1',
    session_start: '2026-06-27T00:00:00.000Z',
    session_end: null,
    created_at: '2026-06-27T00:00:00.000Z',
  });
  mockState.updateSession.mockReset();
  mockState.deleteSession.mockReset();
  mockState.createCategory.mockReset();
  mockState.refetch.mockReset();
});

describe('TaskForm DOM input and UI state', () => {
  it('TC-CB-097 TD037 TV037 TA007 R007/R015 空のタスク名では送信せず保存処理を呼ばない', async () => {
    const { user, onClose } = await renderTaskForm();

    await submitCreate(user);

    expect(mockState.createTask).not.toHaveBeenCalled();
    expect(onClose).not.toHaveBeenCalled();
  });

  it('TC-CB-098 TD037 TV037 TA007 R007/R015 空白だけのタスク名では送信せず保存処理を呼ばない', async () => {
    const { user, onClose } = await renderTaskForm();

    await user.type(screen.getByPlaceholderText('タスク名を入力'), '   ');
    await submitCreate(user);

    expect(mockState.createTask).not.toHaveBeenCalled();
    expect(onClose).not.toHaveBeenCalled();
  });

  it.each([
    ['TC-CB-099', '日本語タスク'],
    ['TC-CB-100', '特殊文字 <>& タスク'],
  ])('%s TD037 TV037 TA007 R007/R015 有効なタスク名をtrimして保存する', async (_tc, title) => {
    const { user, onClose } = await renderTaskForm();

    await fillRequiredTitle(user, `  ${title}  `);
    await submitCreate(user);

    await waitFor(() => expect(mockState.createTask).toHaveBeenCalledTimes(1));
    expect(mockState.createTask.mock.calls[0][0]).toEqual(expect.objectContaining({ title }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('TC-CB-109 TD039 TV039 TA007 R003/R007 進行中で開始実績日時がない場合は保存しない', async () => {
    const { user } = await renderTaskForm();

    await fillRequiredTitle(user);
    await user.selectOptions(statusSelect(), 'in_progress');
    await submitCreate(user);

    expect(mockState.createTask).not.toHaveBeenCalled();
    expect(screen.getByText('開始実績日時は必須です')).toBeInTheDocument();
  });

  it('TC-CB-110 TD039 TV039 TA007 R003/R007 完了で終了実績日時がない場合は保存しない', async () => {
    const { user } = await renderTaskForm();

    await fillRequiredTitle(user);
    await user.selectOptions(statusSelect(), 'completed');
    await user.type(datetimeInputs()[2], '2026-06-27T09:00');
    await submitCreate(user);

    expect(mockState.createTask).not.toHaveBeenCalled();
    expect(screen.getAllByText('終了実績日時は必須です').length).toBeGreaterThan(0);
  });

  it('TC-CB-111 TD039 TV039 TA007 R003/R007 中断で中断時刻がない場合は保存しない', async () => {
    const { user } = await renderTaskForm();

    await fillRequiredTitle(user);
    await user.selectOptions(statusSelect(), 'suspended');
    await user.type(datetimeInputs()[2], '2026-06-27T09:00');
    await submitCreate(user);

    expect(mockState.createTask).not.toHaveBeenCalled();
    expect(screen.getByText('中断時間を1件以上入力してください')).toBeInTheDocument();
  });

  it('TC-CB-112 TD039 TV039 TA007 R003/R007 中断入力行を追加しても中断時刻が空なら保存しない', async () => {
    const { user } = await renderTaskForm();

    await fillRequiredTitle(user);
    await user.selectOptions(statusSelect(), 'suspended');
    await user.type(datetimeInputs()[2], '2026-06-27T09:00');
    await user.click(screen.getByRole('button', { name: /中断時間を追加/ }));
    await submitCreate(user);

    expect(mockState.createTask).not.toHaveBeenCalled();
    expect(screen.getByText(/中断時刻/)).toBeInTheDocument();
  });

  it('TC-CB-220 TD048 TV048 TA008 R008 編集対象自身を親タスク候補に表示しない', async () => {
    const editTarget = task({ id: 'task-1', title: '自分自身' });
    mockState.tasks = [
      editTarget,
      task({ id: 'candidate-parent', title: '選択可能な親' }),
    ];
    const { user } = await renderTaskForm({ task: editTarget });

    await user.click(screen.getByRole('button', { name: 'なし' }));
    const list = screen.getByRole('list');

    expect(within(list).queryByRole('button', { name: '自分自身' })).not.toBeInTheDocument();
    expect(within(list).getByRole('button', { name: '選択可能な親' })).toBeInTheDocument();
  });

  it('TC-CB-221 TD048 TV048 TA008 R008 編集対象の直接子を親タスク候補に表示しない', async () => {
    const editTarget = task({ id: 'task-1', title: '親候補から除外する対象' });
    mockState.tasks = [
      editTarget,
      task({ id: 'child-task', title: '直接の子', parent_task_id: editTarget.id }),
      task({ id: 'candidate-parent', title: '選択可能な親' }),
    ];
    const { user } = await renderTaskForm({ task: editTarget });

    await user.click(screen.getByRole('button', { name: 'なし' }));
    const list = screen.getByRole('list');

    expect(within(list).queryByRole('button', { name: '直接の子' })).not.toBeInTheDocument();
    expect(within(list).getByRole('button', { name: '選択可能な親' })).toBeInTheDocument();
  });

  it('TC-CB-222 TD048 TV048 TA008 R008 削除済み親IDが編集フォームに残っていても保存時にparent_task_idをnullへ正規化する', async () => {
    const editTarget = task({
      id: 'task-with-stale-parent',
      title: '古い親を持つタスク',
      parent_task_id: 'deleted-parent-id',
    });
    mockState.tasks = [
      editTarget,
      task({ id: 'candidate-parent', title: '現在存在する親候補' }),
    ];
    const { user } = await renderTaskForm({ task: editTarget });

    await user.click(screen.getByRole('button', { name: '更新する' }));

    await waitFor(() => expect(mockState.updateTask).toHaveBeenCalledTimes(1));
    expect(mockState.updateTask.mock.calls[0][0]).toBe(editTarget.id);
    expect(mockState.updateTask.mock.calls[0][1]).toEqual(expect.objectContaining({
      parent_task_id: null,
    }));
  });

  it.each([
    ['TC-CB-101', '-1', '60', true, 1, 60],
    ['TC-CB-102', '0', '60', false, 0, 60],
    ['TC-CB-103', '1', '60', true, 1, 60],
    ['TC-CB-104', '1.5', '60', false, 1.5, 60],
    ['TC-CB-105', '2147483647', '60', true, 2147483647, 60],
    ['TC-CB-106', '2147483648', '60', true, 2147483648, 60],
    ['TC-CB-107', '1', '-1', true, 1, 1],
    ['TC-CB-108', '1', '2147483648', true, 1, 2147483648],
  ])('%s TD038 TV038 TA007 R007/R014 数量と所要時間のUI入力境界を検証する', async (_tc, quantityValue, tpuValue, shouldSubmit, expectedQuantity, expectedTpu) => {
    const { user } = await renderTaskForm();
    const { quantity, timePerUnit } = numberInputs();

    await fillRequiredTitle(user, `数量境界${_tc}`);
    await setNumberInput(user, quantity, quantityValue);
    await setNumberInput(user, timePerUnit, tpuValue);
    await submitCreate(user);

    if (shouldSubmit) {
      await waitFor(() => expect(mockState.createTask).toHaveBeenCalledTimes(1));
      expect(mockState.createTask.mock.calls[0][0]).toEqual(expect.objectContaining({
        quantity: expectedQuantity,
        time_per_unit: expectedTpu,
      }));
    } else {
      expect(mockState.createTask).not.toHaveBeenCalled();
    }
  });

  it.each([
    ['TC-CB-119', ''],
    ['TC-CB-120', 'あ'],
    ['TC-CB-121', 'あ'.repeat(29)],
    ['TC-CB-122', 'あ'.repeat(30)],
    ['TC-CB-123', 'あ'.repeat(31)],
  ])('%s TD041 TV041 TA007 R007 タスク名文字数境界を保存時にtrimして扱う', async (_tc, title) => {
    const { user } = await renderTaskForm();

    const titleInput = screen.getByPlaceholderText('タスク名を入力');
    await user.clear(titleInput);
    if (title) await user.type(titleInput, title);
    await submitCreate(user);

    if (title.trim()) {
      await waitFor(() => expect(mockState.createTask).toHaveBeenCalledTimes(1));
      expect(mockState.createTask.mock.calls[0][0]).toEqual(expect.objectContaining({ title }));
    } else {
      expect(mockState.createTask).not.toHaveBeenCalled();
    }
  });

  it.each([
    ['TC-CB-129', ''],
    ['TC-CB-130', '予'],
    ['TC-CB-131', '予'.repeat(99)],
    ['TC-CB-132', '予'.repeat(100)],
    ['TC-CB-133', '予'.repeat(101)],
  ])('%s TD041 TV041 TA007 R007 予定メモ文字数境界を保存payloadへ渡す', async (_tc, notes) => {
    const { user } = await renderTaskForm();

    await fillRequiredTitle(user, `予定メモ${_tc}`);
    const notesInput = screen.getByPlaceholderText('予定メモを入力');
    if (notes) await user.type(notesInput, notes);
    await submitCreate(user);

    await waitFor(() => expect(mockState.createTask).toHaveBeenCalledTimes(1));
    expect(mockState.createTask.mock.calls[0][0]).toEqual(expect.objectContaining({ notes }));
  });

  it.each([
    ['TC-CB-134', ''],
    ['TC-CB-135', '実'],
    ['TC-CB-136', '実'.repeat(99)],
    ['TC-CB-137', '実'.repeat(100)],
  ])('%s TD041 TV041 TA007 R007 実績メモ文字数境界を保存payloadへ渡す', async (_tc, actualMemo) => {
    const { user } = await renderTaskForm();

    await fillRequiredTitle(user, `実績メモ${_tc}`);
    await user.selectOptions(statusSelect(), 'completed');
    await user.type(datetimeInputs()[2], '2026-06-27T09:00');
    await user.type(datetimeInputs()[3], '2026-06-27T10:00');
    const actualMemoInput = screen.getByPlaceholderText('実績メモ');
    if (actualMemo) await user.type(actualMemoInput, actualMemo);
    await submitCreate(user);

    await waitFor(() => expect(mockState.createTask).toHaveBeenCalledTimes(1));
    expect(mockState.createTask.mock.calls[0][0]).toEqual(expect.objectContaining({ actual_memo: actualMemo }));
  });
});
