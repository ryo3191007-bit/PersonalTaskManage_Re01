import { act, render, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { TaskProvider, useTasks } from '../../src/contexts/TaskContext';
import type { Task, TaskSession, RecurrenceGroup, TaskCategory } from '../../src/lib/types';
import { createSupabaseMock } from './mocks/supabaseMock';

const mockState = vi.hoisted(() => ({
  currentUser: { id: 'user-1', email: 'user-1@example.test' } as { id: string; email: string } | null,
  supabase: null as ReturnType<typeof createSupabaseMock> | null,
  scheduleNotification: vi.fn(),
  syncTaskNotifications: vi.fn(),
  cancelTaskNotifications: vi.fn(),
  clearAllTaskNotifications: vi.fn(),
}));

vi.mock('../../src/contexts/AuthContext', () => ({
  useAuth: () => ({ user: mockState.currentUser }),
}));

vi.mock('../../src/lib/supabase', () => ({
  supabase: {
    from: (tableName: string) => mockState.supabase!.supabase.from(tableName),
    auth: {
      getSession: () => mockState.supabase!.supabase.auth.getSession(),
      signInWithPassword: (credentials: Record<string, unknown>) =>
        mockState.supabase!.supabase.auth.signInWithPassword(credentials),
      signUp: (credentials: Record<string, unknown>) =>
        mockState.supabase!.supabase.auth.signUp(credentials),
      signOut: () => mockState.supabase!.supabase.auth.signOut(),
      onAuthStateChange: (callback: (event: string, session: unknown) => void) =>
        mockState.supabase!.supabase.auth.onAuthStateChange(callback),
    },
  },
}));

vi.mock('../../src/lib/utils', async importOriginal => {
  const actual = await importOriginal<typeof import('../../src/lib/utils')>();
  return {
    ...actual,
    scheduleNotification: mockState.scheduleNotification,
    syncTaskNotifications: mockState.syncTaskNotifications,
    cancelTaskNotifications: mockState.cancelTaskNotifications,
    clearAllTaskNotifications: mockState.clearAllTaskNotifications,
  };
});

type TaskContextSnapshot = ReturnType<typeof useTasks>;

function task(overrides: Partial<Task> = {}): Task {
  return {
    id: 'task-1',
    user_id: 'user-1',
    title: '対象タスク',
    category_id: null,
    priority: 'medium',
    difficulty: 1,
    quantity: 1,
    time_per_unit: 60,
    scheduled_start: '2026-06-27T00:00:00.000Z',
    scheduled_end: '2026-06-27T01:00:00.000Z',
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

function session(overrides: Partial<TaskSession> = {}): TaskSession {
  return {
    id: 'session-1',
    task_id: 'task-1',
    user_id: 'user-1',
    session_start: '2026-06-27T00:00:00.000Z',
    session_end: null,
    created_at: '2026-06-27T00:00:00.000Z',
    ...overrides,
  };
}

function recurrenceGroup(overrides: Partial<RecurrenceGroup> = {}): RecurrenceGroup {
  return {
    id: 'group-1',
    user_id: 'user-1',
    title: '定常タスク',
    category_id: null,
    priority: 'medium',
    start_time: '09:00',
    end_time: '10:00',
    recurrence_type: 'daily',
    days_of_week: [],
    period_start: '2026-06-27',
    period_end: '2026-06-28',
    ends_next_day: false,
    notes: '',
    track_actual: true,
    created_at: '2026-06-27T00:00:00.000Z',
    updated_at: '2026-06-27T00:00:00.000Z',
    ...overrides,
  };
}

function category(overrides: Partial<TaskCategory> = {}): TaskCategory {
  return {
    id: 'cat-1',
    user_id: 'user-1',
    name: 'カテゴリ',
    color: '#3b82f6',
    created_at: '2026-06-27T00:00:00.000Z',
    ...overrides,
  };
}

function renderTaskProvider(
  initialTables: Parameters<typeof createSupabaseMock>[0],
  options?: Parameters<typeof createSupabaseMock>[2]
) {
  mockState.supabase = createSupabaseMock(initialTables, {
    access_token: 'test-token',
    user: mockState.currentUser ?? undefined,
  }, options);

  const snapshots: TaskContextSnapshot[] = [];

  function Probe() {
    const value = useTasks();
    snapshots.push(value);
    return null;
  }

  const view = render(
    <TaskProvider>
      <Probe />
    </TaskProvider>
  );

  return {
    ...view,
    snapshots,
    latest: () => snapshots[snapshots.length - 1],
    mock: mockState.supabase,
  };
}

beforeEach(() => {
  mockState.currentUser = { id: 'user-1', email: 'user-1@example.test' };
  mockState.supabase = null;
  mockState.scheduleNotification.mockClear();
  mockState.syncTaskNotifications.mockClear();
  mockState.cancelTaskNotifications.mockClear();
  mockState.clearAllTaskNotifications.mockClear();
  window.localStorage.clear();
});

describe('TaskContext Provider state transitions', () => {
  it('TC-CB-001 TD011 TV011 TA003 R003 開始操作相当のupdateTask/createSessionで進行中タスクと開放セッションを永続化する', async () => {
    const baseTask = task();
    const { latest, mock, unmount } = renderTaskProvider({
      tasks: [baseTask],
      task_categories: [],
      recurrence_groups: [],
      task_sessions: [],
    });
    await waitFor(() => expect(latest().tasks).toHaveLength(1));

    await act(async () => {
      await latest().updateTask(baseTask.id, {
        status: 'in_progress',
        actual_start: '2026-06-27T00:05:00.000Z',
      });
      await latest().createSession(baseTask.id, '2026-06-27T00:05:00.000Z', null);
    });

    expect(mock.tables.tasks).toEqual([
      expect.objectContaining({
        id: baseTask.id,
        status: 'in_progress',
        actual_start: '2026-06-27T00:05:00.000Z',
      }),
    ]);
    expect(mock.tables.task_sessions).toEqual([
      expect.objectContaining({
        task_id: baseTask.id,
        session_start: '2026-06-27T00:05:00.000Z',
        session_end: null,
      }),
    ]);
    expect(mockState.scheduleNotification).toHaveBeenCalledWith(expect.objectContaining({ status: 'in_progress' }));

    unmount();
  });

  it('TC-CB-002 TD011 TV011 TA003 R003 suspendTaskは開放セッションを閉じ、actual_timeを加算して中断状態を保存する', async () => {
    const baseTask = task({
      status: 'in_progress',
      actual_start: '2026-06-27T00:00:00.000Z',
      actual_time: 10,
    });
    const openSession = session({ session_start: '2026-06-27T00:10:00.000Z', session_end: null });
    const { latest, mock, unmount } = renderTaskProvider({
      tasks: [baseTask],
      task_categories: [],
      recurrence_groups: [],
      task_sessions: [openSession],
    });
    await waitFor(() => expect(latest().sessions).toHaveLength(1));

    await act(async () => {
      await latest().suspendTask(baseTask, '2026-06-27T00:40:00.000Z');
    });

    expect(mock.tables.task_sessions[0]).toEqual(expect.objectContaining({
      id: openSession.id,
      session_end: '2026-06-27T00:40:00.000Z',
    }));
    expect(mock.tables.tasks[0]).toEqual(expect.objectContaining({
      id: baseTask.id,
      status: 'suspended',
      suspended_at: '2026-06-27T00:40:00.000Z',
      actual_time: 40,
      scheduled_start: baseTask.scheduled_start,
      scheduled_end: baseTask.scheduled_end,
    }));

    unmount();
  });

  it('TC-CB-003 TD011 TV011 TA003 R003 resumeTaskは中断解除して新しい開放セッションを作成する', async () => {
    const suspendedTask = task({
      status: 'suspended',
      actual_start: '2026-06-27T00:00:00.000Z',
      suspended_at: '2026-06-27T00:30:00.000Z',
      actual_time: 30,
    });
    const closedSession = session({ session_end: '2026-06-27T00:30:00.000Z' });
    const { latest, mock, unmount } = renderTaskProvider({
      tasks: [suspendedTask],
      task_categories: [],
      recurrence_groups: [],
      task_sessions: [closedSession],
    });
    await waitFor(() => expect(latest().tasks[0].status).toBe('suspended'));

    await act(async () => {
      await latest().resumeTask(suspendedTask, '2026-06-27T00:45:00.000Z');
    });

    expect(mock.tables.tasks[0]).toEqual(expect.objectContaining({
      id: suspendedTask.id,
      status: 'in_progress',
      suspended_at: null,
      scheduled_start: suspendedTask.scheduled_start,
      scheduled_end: suspendedTask.scheduled_end,
    }));
    expect(mock.tables.task_sessions).toContainEqual(expect.objectContaining({
      task_id: suspendedTask.id,
      session_start: '2026-06-27T00:45:00.000Z',
      session_end: null,
    }));

    unmount();
  });

  it('TC-CB-004 TD011 TV011 TA003 R003 resumeTaskは中断終了セッションが欠ける場合にactual_startからsuspended_atまで補完する', async () => {
    const suspendedTask = task({
      status: 'suspended',
      actual_start: '2026-06-27T00:00:00.000Z',
      suspended_at: '2026-06-27T00:30:00.000Z',
    });
    const { latest, mock, unmount } = renderTaskProvider({
      tasks: [suspendedTask],
      task_categories: [],
      recurrence_groups: [],
      task_sessions: [],
    });
    await waitFor(() => expect(latest().tasks).toHaveLength(1));

    await act(async () => {
      await latest().resumeTask(suspendedTask, '2026-06-27T00:45:00.000Z');
    });

    expect(mock.tables.task_sessions).toContainEqual(expect.objectContaining({
      task_id: suspendedTask.id,
      session_start: '2026-06-27T00:00:00.000Z',
      session_end: '2026-06-27T00:30:00.000Z',
    }));
    expect(mock.tables.task_sessions).toContainEqual(expect.objectContaining({
      task_id: suspendedTask.id,
      session_start: '2026-06-27T00:45:00.000Z',
      session_end: null,
    }));

    unmount();
  });

  it('TC-CB-005 TD011 TV011 TA003 R003 完了操作相当のupdateTask/updateSessionで完了状態と終了済みセッションを保存する', async () => {
    const inProgressTask = task({
      status: 'in_progress',
      actual_start: '2026-06-27T00:00:00.000Z',
    });
    const openSession = session({ session_end: null });
    const { latest, mock, unmount } = renderTaskProvider({
      tasks: [inProgressTask],
      task_categories: [],
      recurrence_groups: [],
      task_sessions: [openSession],
    });
    await waitFor(() => expect(latest().sessions).toHaveLength(1));

    await act(async () => {
      await latest().updateTask(inProgressTask.id, {
        status: 'completed',
        actual_end: '2026-06-27T01:00:00.000Z',
        completed_at: '2026-06-27T01:00:00.000Z',
        actual_time: 60,
      });
      await latest().updateSession(openSession.id, { session_end: '2026-06-27T01:00:00.000Z' });
    });

    expect(mock.tables.tasks[0]).toEqual(expect.objectContaining({
      status: 'completed',
      actual_end: '2026-06-27T01:00:00.000Z',
      completed_at: '2026-06-27T01:00:00.000Z',
      actual_time: 60,
    }));
    expect(mock.tables.task_sessions[0]).toEqual(expect.objectContaining({
      session_end: '2026-06-27T01:00:00.000Z',
    }));

    unmount();
  });

  it.each([
    ['TC-CB-201', 'not_started'],
    ['TC-CB-202', 'in_progress'],
    ['TC-CB-203', 'suspended'],
    ['TC-CB-204', 'completed'],
  ] as const)('%s TD021 TV021 TA004 R003/R006 ステータス%sを保存してProvider状態へ反映する', async (_tc, status) => {
    const baseTask = task();
    const { latest, mock, unmount } = renderTaskProvider({
      tasks: [baseTask],
      task_categories: [],
      recurrence_groups: [],
      task_sessions: [],
    });
    await waitFor(() => expect(latest().tasks).toHaveLength(1));

    await act(async () => {
      await latest().updateTask(baseTask.id, {
        status,
        suspended_at: status === 'suspended' ? '2026-06-27T00:30:00.000Z' : null,
        actual_end: status === 'completed' ? '2026-06-27T01:00:00.000Z' : null,
      });
    });

    await waitFor(() => expect(latest().tasks[0].status).toBe(status));
    expect(mock.tables.tasks[0]).toEqual(expect.objectContaining({ id: baseTask.id, status }));

    unmount();
  });

  it('TC-CB-205 TD022 TV022 TA004 R004 定常グループ削除は同一グループの生成タスクとグループだけを削除する', async () => {
    const group = recurrenceGroup();
    const groupTask = task({ id: 'task-in-group', recurrence_group_id: group.id });
    const otherGroupTask = task({ id: 'task-other-group', recurrence_group_id: 'group-other' });
    const standaloneTask = task({ id: 'task-standalone', recurrence_group_id: null });
    const { latest, mock, unmount } = renderTaskProvider({
      tasks: [groupTask, otherGroupTask, standaloneTask],
      task_categories: [],
      recurrence_groups: [group, recurrenceGroup({ id: 'group-other' })],
      task_sessions: [],
    });
    await waitFor(() => expect(latest().tasks).toHaveLength(3));

    await act(async () => {
      await latest().deleteRecurrenceGroup(group.id);
    });

    expect(mock.tables.tasks).toEqual([
      expect.objectContaining({ id: 'task-other-group' }),
      expect.objectContaining({ id: 'task-standalone' }),
    ]);
    expect(mock.tables.recurrence_groups).toEqual([
      expect.objectContaining({ id: 'group-other' }),
    ]);
    expect(mockState.cancelTaskNotifications).toHaveBeenCalled();
    expect(mockState.cancelTaskNotifications.mock.calls[0][0]).toBe('task-in-group');

    unmount();
  });

  it('TC-CB-210 TD045 TV045 TA008 R007 deleteTaskは対象タスクと紐づくProvider内セッションだけを取り除く', async () => {
    const target = task({ id: 'delete-target' });
    const remaining = task({ id: 'remaining-task' });
    const targetSession = session({ id: 'session-delete', task_id: target.id });
    const remainingSession = session({ id: 'session-keep', task_id: remaining.id });
    const { latest, mock, unmount } = renderTaskProvider({
      tasks: [target, remaining],
      task_categories: [],
      recurrence_groups: [],
      task_sessions: [targetSession, remainingSession],
    });
    await waitFor(() => expect(latest().tasks).toHaveLength(2));

    await act(async () => {
      await latest().deleteTask(target.id);
    });

    expect(mock.tables.tasks).toEqual([expect.objectContaining({ id: remaining.id })]);
    await waitFor(() => expect(latest().sessions).toEqual([expect.objectContaining({ id: remainingSession.id })]));
    expect(mockState.cancelTaskNotifications).toHaveBeenCalledWith(target.id);

    unmount();
  });

  it('TC-CB-196 TD009 TV009 TA002 R017 deleteTaskは単体削除対象だけを永続化テーブルとProvider状態から削除する', async () => {
    const target = task({ id: 'single-delete-target' });
    const other = task({ id: 'single-delete-other' });
    const { latest, mock, unmount } = renderTaskProvider({
      tasks: [target, other],
      task_categories: [],
      recurrence_groups: [],
      task_sessions: [],
    });
    await waitFor(() => expect(latest().tasks).toHaveLength(2));

    await act(async () => {
      await latest().deleteTask(target.id);
    });

    expect(mock.tables.tasks).toEqual([expect.objectContaining({ id: other.id })]);
    expect(latest().tasks).toEqual([expect.objectContaining({ id: other.id })]);
    expect(mockState.cancelTaskNotifications).toHaveBeenCalledWith(target.id);

    unmount();
  });

  it('TC-CB-197 TD009 TV009 TA002 R017 削除確認が成立しないProvider呼び出し前はタスク状態を変更しない', async () => {
    const target = task({ id: 'cancelled-delete-target' });
    const other = task({ id: 'cancelled-delete-other' });
    const { latest, mock, unmount } = renderTaskProvider({
      tasks: [target, other],
      task_categories: [],
      recurrence_groups: [],
      task_sessions: [],
    });
    await waitFor(() => expect(latest().tasks).toHaveLength(2));

    expect(mock.tables.tasks).toEqual([
      expect.objectContaining({ id: target.id }),
      expect.objectContaining({ id: other.id }),
    ]);
    expect(mockState.cancelTaskNotifications).not.toHaveBeenCalled();

    unmount();
  });

  it('TC-CB-198 TD009 TV009 TA002 R017 一括削除相当の複数deleteTaskは選択対象だけを削除する', async () => {
    const selectedA = task({ id: 'bulk-selected-a' });
    const selectedB = task({ id: 'bulk-selected-b' });
    const notSelected = task({ id: 'bulk-not-selected' });
    const { latest, mock, unmount } = renderTaskProvider({
      tasks: [selectedA, selectedB, notSelected],
      task_categories: [],
      recurrence_groups: [],
      task_sessions: [],
    });
    await waitFor(() => expect(latest().tasks).toHaveLength(3));

    await act(async () => {
      await Promise.all([latest().deleteTask(selectedA.id), latest().deleteTask(selectedB.id)]);
    });

    expect(mock.tables.tasks).toEqual([expect.objectContaining({ id: notSelected.id })]);
    expect(latest().tasks).toEqual([expect.objectContaining({ id: notSelected.id })]);

    unmount();
  });

  it('TC-CB-199 TD009 TV009 TA002 R017 一括削除相当の空選択ではProvider削除を呼ばず状態を保持する', async () => {
    const first = task({ id: 'empty-selection-a' });
    const second = task({ id: 'empty-selection-b' });
    const { latest, mock, unmount } = renderTaskProvider({
      tasks: [first, second],
      task_categories: [],
      recurrence_groups: [],
      task_sessions: [],
    });
    await waitFor(() => expect(latest().tasks).toHaveLength(2));

    expect(mock.tables.tasks).toEqual([
      expect.objectContaining({ id: first.id }),
      expect.objectContaining({ id: second.id }),
    ]);
    expect(mockState.cancelTaskNotifications).not.toHaveBeenCalled();

    unmount();
  });

  it('TC-CB-200 TD009 TV009 TA002 R017 一括削除相当で選択対象の通知とセッションだけを整理する', async () => {
    const selected = task({ id: 'bulk-session-selected' });
    const kept = task({ id: 'bulk-session-kept' });
    const selectedSession = session({ id: 'session-selected', task_id: selected.id });
    const keptSession = session({ id: 'session-kept', task_id: kept.id });
    const { latest, unmount } = renderTaskProvider({
      tasks: [selected, kept],
      task_categories: [],
      recurrence_groups: [],
      task_sessions: [selectedSession, keptSession],
    });
    await waitFor(() => expect(latest().sessions).toHaveLength(2));

    await act(async () => {
      await latest().deleteTask(selected.id);
    });

    expect(latest().sessions).toEqual([expect.objectContaining({ id: keptSession.id })]);
    expect(mockState.cancelTaskNotifications).toHaveBeenCalledWith(selected.id);
    expect(mockState.cancelTaskNotifications).not.toHaveBeenCalledWith(kept.id);

    unmount();
  });

  it('TC-CB-206 TD022 TV022 TA004 R004 定常グループ削除は同一グループの複数生成タスクを全て削除する', async () => {
    const group = recurrenceGroup({ id: 'group-multiple' });
    const first = task({ id: 'group-task-a', recurrence_group_id: group.id });
    const second = task({ id: 'group-task-b', recurrence_group_id: group.id });
    const { latest, mock, unmount } = renderTaskProvider({
      tasks: [first, second],
      task_categories: [],
      recurrence_groups: [group],
      task_sessions: [],
    });
    await waitFor(() => expect(latest().tasks).toHaveLength(2));

    await act(async () => {
      await latest().deleteRecurrenceGroup(group.id);
    });

    expect(mock.tables.tasks).toEqual([]);
    expect(mock.tables.recurrence_groups).toEqual([]);
    const cancelledTaskIds = mockState.cancelTaskNotifications.mock.calls.map(call => call[0]);
    expect(cancelledTaskIds).toEqual([first.id, second.id]);

    unmount();
  });

  it('TC-CB-207 TD022 TV022 TA004 R004 定常グループ削除は他グループの生成タスクへ波及しない', async () => {
    const targetGroup = recurrenceGroup({ id: 'target-group' });
    const otherGroup = recurrenceGroup({ id: 'other-group' });
    const targetTask = task({ id: 'target-group-task', recurrence_group_id: targetGroup.id });
    const otherTask = task({ id: 'other-group-task', recurrence_group_id: otherGroup.id });
    const { latest, mock, unmount } = renderTaskProvider({
      tasks: [targetTask, otherTask],
      task_categories: [],
      recurrence_groups: [targetGroup, otherGroup],
      task_sessions: [],
    });
    await waitFor(() => expect(latest().tasks).toHaveLength(2));

    await act(async () => {
      await latest().deleteRecurrenceGroup(targetGroup.id);
    });

    expect(mock.tables.tasks).toEqual([expect.objectContaining({ id: otherTask.id })]);
    expect(mock.tables.recurrence_groups).toEqual([expect.objectContaining({ id: otherGroup.id })]);

    unmount();
  });

  it('TC-CB-208 TD022 TV022 TA004 R004 定常グループ削除は単独タスクを保持する', async () => {
    const group = recurrenceGroup({ id: 'group-with-standalone' });
    const groupTask = task({ id: 'generated-task', recurrence_group_id: group.id });
    const standalone = task({ id: 'standalone-task', recurrence_group_id: null });
    const { latest, mock, unmount } = renderTaskProvider({
      tasks: [groupTask, standalone],
      task_categories: [],
      recurrence_groups: [group],
      task_sessions: [],
    });
    await waitFor(() => expect(latest().tasks).toHaveLength(2));

    await act(async () => {
      await latest().deleteRecurrenceGroup(group.id);
    });

    expect(mock.tables.tasks).toEqual([expect.objectContaining({ id: standalone.id })]);

    unmount();
  });

  it('TC-CB-209 TD022 TV022 TA004 R004 タスクがない定常グループ削除でも対象グループだけを削除する', async () => {
    const targetGroup = recurrenceGroup({ id: 'empty-group' });
    const otherGroup = recurrenceGroup({ id: 'remaining-group' });
    const { latest, mock, unmount } = renderTaskProvider({
      tasks: [],
      task_categories: [],
      recurrence_groups: [targetGroup, otherGroup],
      task_sessions: [],
    });
    await waitFor(() => expect(latest().recurrenceGroups).toHaveLength(2));

    await act(async () => {
      await latest().deleteRecurrenceGroup(targetGroup.id);
    });

    expect(mock.tables.recurrence_groups).toEqual([expect.objectContaining({ id: otherGroup.id })]);
    expect(mockState.cancelTaskNotifications).not.toHaveBeenCalled();

    unmount();
  });

  it('TC-CB-022 TD011 TV011 TA003 R003 中断時は開放セッションを中断時刻で閉じ、その時点までだけ実績へ加算する', async () => {
    const baseTask = task({
      id: 'suspend-boundary-task',
      status: 'in_progress',
      actual_start: '2026-06-27T00:00:00.000Z',
      actual_time: 15,
    });
    const openSession = session({
      id: 'suspend-boundary-session',
      task_id: baseTask.id,
      session_start: '2026-06-27T00:15:00.000Z',
      session_end: null,
    });
    const { latest, mock, unmount } = renderTaskProvider({
      tasks: [baseTask],
      task_categories: [],
      recurrence_groups: [],
      task_sessions: [openSession],
    });
    await waitFor(() => expect(latest().sessions).toHaveLength(1));

    await act(async () => {
      await latest().suspendTask(baseTask, '2026-06-27T00:45:00.000Z');
    });

    expect(mock.tables.task_sessions[0]).toEqual(expect.objectContaining({
      session_end: '2026-06-27T00:45:00.000Z',
    }));
    expect(mock.tables.tasks[0]).toEqual(expect.objectContaining({
      status: 'suspended',
      suspended_at: '2026-06-27T00:45:00.000Z',
      actual_time: 45,
    }));

    unmount();
  });

  it('TC-CB-023 TD011 TV011 TA003 R003 中断中の空白時間は再開時セッションに含めない', async () => {
    const suspendedTask = task({
      id: 'resume-boundary-task',
      status: 'suspended',
      actual_start: '2026-06-27T00:00:00.000Z',
      suspended_at: '2026-06-27T00:45:00.000Z',
      actual_time: 45,
    });
    const closedSession = session({
      id: 'resume-closed-session',
      task_id: suspendedTask.id,
      session_start: '2026-06-27T00:00:00.000Z',
      session_end: '2026-06-27T00:45:00.000Z',
    });
    const { latest, mock, unmount } = renderTaskProvider({
      tasks: [suspendedTask],
      task_categories: [],
      recurrence_groups: [],
      task_sessions: [closedSession],
    });
    await waitFor(() => expect(latest().tasks[0].status).toBe('suspended'));

    await act(async () => {
      await latest().resumeTask(suspendedTask, '2026-06-27T01:30:00.000Z');
    });

    expect(mock.tables.tasks[0]).toEqual(expect.objectContaining({
      status: 'in_progress',
      suspended_at: null,
      actual_time: 45,
    }));
    expect(mock.tables.task_sessions).toContainEqual(expect.objectContaining({
      task_id: suspendedTask.id,
      session_start: '2026-06-27T01:30:00.000Z',
      session_end: null,
    }));
    expect(mock.tables.task_sessions).not.toContainEqual(expect.objectContaining({
      session_start: '2026-06-27T00:45:00.000Z',
      session_end: null,
    }));

    unmount();
  });

  it('TC-CB-024 TD011 TV011 TA003 R003 再開後の完了更新は中断区間を含まない実績値でProviderへ保存する', async () => {
    const resumedTask = task({
      id: 'resume-complete-task',
      status: 'in_progress',
      actual_start: '2026-06-27T00:00:00.000Z',
      actual_time: 45,
    });
    const resumedSession = session({
      id: 'resume-open-session',
      task_id: resumedTask.id,
      session_start: '2026-06-27T01:30:00.000Z',
      session_end: null,
    });
    const { latest, mock, unmount } = renderTaskProvider({
      tasks: [resumedTask],
      task_categories: [],
      recurrence_groups: [],
      task_sessions: [resumedSession],
    });
    await waitFor(() => expect(latest().tasks).toHaveLength(1));

    await act(async () => {
      await latest().updateTask(resumedTask.id, {
        status: 'completed',
        actual_end: '2026-06-27T02:00:00.000Z',
        completed_at: '2026-06-27T02:00:00.000Z',
        actual_time: 75,
      });
      await latest().updateSession(resumedSession.id, { session_end: '2026-06-27T02:00:00.000Z' });
    });

    expect(mock.tables.tasks[0]).toEqual(expect.objectContaining({
      status: 'completed',
      actual_time: 75,
    }));
    expect(mock.tables.task_sessions[0]).toEqual(expect.objectContaining({
      session_start: '2026-06-27T01:30:00.000Z',
      session_end: '2026-06-27T02:00:00.000Z',
    }));

    unmount();
  });

  it('TC-CB-211 TC-CB-212 TD048 TV048 TA008 R008 親タスク削除時は子を残しparent_task_idをProvider上でもnullへ同期する', async () => {
    const parent = task({ id: 'deleted-parent', title: '親' });
    const child = task({ id: 'remaining-child', title: '子', parent_task_id: parent.id });
    const { latest, mock, unmount } = renderTaskProvider({
      tasks: [parent, child],
      task_categories: [],
      recurrence_groups: [],
      task_sessions: [],
    });
    await waitFor(() => expect(latest().tasks).toHaveLength(2));

    await act(async () => {
      await latest().deleteTask(parent.id);
    });

    expect(mock.tables.tasks).toEqual([expect.objectContaining({ id: child.id })]);
    expect(latest().tasks).toEqual([expect.objectContaining({ id: child.id, parent_task_id: null })]);

    unmount();
  });

  it('TC-CB-213 TC-CB-214 TC-CB-215 TD049 TV049 TA008 R008 カテゴリ削除時はタスクと定常グループのカテゴリ参照をnullへ同期する', async () => {
    const cat = category({ id: 'deleted-category' });
    const categorizedTask = task({ id: 'categorized-task', category_id: cat.id, category: cat });
    const categorizedGroup = recurrenceGroup({ id: 'categorized-group', category_id: cat.id, category: cat });
    const otherTask = task({ id: 'uncategorized-task', category_id: null });
    const { latest, mock, unmount } = renderTaskProvider({
      tasks: [categorizedTask, otherTask],
      task_categories: [cat],
      recurrence_groups: [categorizedGroup],
      task_sessions: [],
    });
    await waitFor(() => expect(latest().categories).toHaveLength(1));

    await act(async () => {
      await latest().deleteCategory(cat.id);
    });

    expect(mock.tables.task_categories).toEqual([]);
    expect(latest().categories).toEqual([]);
    expect(latest().tasks).toContainEqual(expect.objectContaining({
      id: categorizedTask.id,
      category_id: null,
      category: null,
    }));
    expect(latest().tasks).toContainEqual(expect.objectContaining({ id: otherTask.id, category_id: null }));
    expect(latest().recurrenceGroups).toContainEqual(expect.objectContaining({
      id: categorizedGroup.id,
      category_id: null,
      category: null,
    }));

    unmount();
  });

  it('TC-CB-216 TC-CB-217 TD050 TV050 TA008 R008 全ての直接子が完了した時だけ親タスクを自動完了する', async () => {
    const parent = task({ id: 'parent-auto-complete', status: 'in_progress' });
    const firstChild = task({ id: 'child-completed', parent_task_id: parent.id, status: 'completed' });
    const lastChild = task({ id: 'child-last', parent_task_id: parent.id, status: 'in_progress' });
    const unrelatedChild = task({ id: 'unrelated-child', parent_task_id: 'other-parent', status: 'not_started' });
    const { latest, mock, unmount } = renderTaskProvider({
      tasks: [parent, firstChild, lastChild, unrelatedChild],
      task_categories: [],
      recurrence_groups: [],
      task_sessions: [],
    });
    await waitFor(() => expect(latest().tasks).toHaveLength(4));

    await act(async () => {
      await latest().updateTask(lastChild.id, {
        status: 'completed',
        completed_at: '2026-06-27T02:00:00.000Z',
      });
    });

    expect(mock.tables.tasks).toContainEqual(expect.objectContaining({
      id: parent.id,
      status: 'completed',
      completed_at: '2026-06-27T02:00:00.000Z',
    }));
    expect(mock.tables.tasks).toContainEqual(expect.objectContaining({
      id: unrelatedChild.id,
      status: 'not_started',
    }));
    expect(mockState.scheduleNotification).toHaveBeenCalledWith(expect.objectContaining({ id: parent.id, status: 'completed' }));

    unmount();
  });

  it('TC-CB-218 TC-CB-219 TD050 TV050 TA008 R008 未完了の子が残る場合と完了解除では親状態を自動変更しない', async () => {
    const parent = task({ id: 'parent-not-auto-change', status: 'in_progress' });
    const firstChild = task({ id: 'child-one', parent_task_id: parent.id, status: 'in_progress' });
    const secondChild = task({ id: 'child-two', parent_task_id: parent.id, status: 'not_started' });
    const { latest, mock, unmount } = renderTaskProvider({
      tasks: [parent, firstChild, secondChild],
      task_categories: [],
      recurrence_groups: [],
      task_sessions: [],
    });
    await waitFor(() => expect(latest().tasks).toHaveLength(3));

    await act(async () => {
      await latest().updateTask(firstChild.id, { status: 'completed' });
      await latest().updateTask(firstChild.id, { status: 'in_progress' });
    });

    expect(mock.tables.tasks).toContainEqual(expect.objectContaining({
      id: parent.id,
      status: 'in_progress',
    }));

    unmount();
  });

  it('TC-CB-282 TC-CB-283 TD081 TV081 TA016 R008 選択中カテゴリ削除相当でもProviderはカテゴリ一覧から除外し既存タスクを未分類へ戻す', async () => {
    const selectedCategory = category({ id: 'selected-category' });
    const categorizedTask = task({ id: 'selected-category-task', category_id: selectedCategory.id, category: selectedCategory });
    const { latest, unmount } = renderTaskProvider({
      tasks: [categorizedTask],
      task_categories: [selectedCategory],
      recurrence_groups: [],
      task_sessions: [],
    });
    await waitFor(() => expect(latest().categories).toHaveLength(1));

    await act(async () => {
      await latest().deleteCategory(selectedCategory.id);
    });

    expect(latest().categories).toEqual([]);
    expect(latest().tasks).toEqual([expect.objectContaining({
      id: categorizedTask.id,
      category_id: null,
      category: null,
    })]);

    unmount();
  });

  it('TC-CB-284 TC-CB-285 TD081 TV081 TA016 R008 定常グループ削除は生成タスクのセッションもProvider状態から取り除く', async () => {
    const group = recurrenceGroup({ id: 'group-delete-sessions' });
    const generatedTask = task({ id: 'generated-delete-session-task', recurrence_group_id: group.id });
    const standaloneTask = task({ id: 'standalone-keep-session-task' });
    const generatedSession = session({ id: 'generated-session-delete', task_id: generatedTask.id });
    const standaloneSession = session({ id: 'standalone-session-keep', task_id: standaloneTask.id });
    const { latest, unmount } = renderTaskProvider({
      tasks: [generatedTask, standaloneTask],
      task_categories: [],
      recurrence_groups: [group],
      task_sessions: [generatedSession, standaloneSession],
    });
    await waitFor(() => expect(latest().sessions).toHaveLength(2));

    await act(async () => {
      await latest().deleteRecurrenceGroup(group.id);
    });

    expect(latest().tasks).toEqual([expect.objectContaining({ id: standaloneTask.id })]);
    expect(latest().sessions).toEqual([expect.objectContaining({ id: standaloneSession.id })]);

    unmount();
  });

  it('TC-CB-286 TD081 TV081 TA016 R008 複数削除が全件成功した場合は成功対象を全てProvider状態から除外する', async () => {
    const first = task({ id: 'bulk-success-a' });
    const second = task({ id: 'bulk-success-b' });
    const kept = task({ id: 'bulk-success-kept' });
    const { latest, unmount } = renderTaskProvider({
      tasks: [first, second, kept],
      task_categories: [],
      recurrence_groups: [],
      task_sessions: [],
    });
    await waitFor(() => expect(latest().tasks).toHaveLength(3));

    await act(async () => {
      await Promise.all([latest().deleteTask(first.id), latest().deleteTask(second.id)]);
    });

    expect(latest().tasks).toEqual([expect.objectContaining({ id: kept.id })]);

    unmount();
  });

  it('TC-CB-287 TD081 TV081 TA016 R008 複数削除の一部失敗時は成功分だけ確定し失敗対象はProvider状態に残す', async () => {
    const success = task({ id: 'bulk-partial-success' });
    const failed = task({ id: 'bulk-partial-failed' });
    const kept = task({ id: 'bulk-partial-kept' });
    const { latest, unmount } = renderTaskProvider({
      tasks: [success, failed, kept],
      task_categories: [],
      recurrence_groups: [],
      task_sessions: [],
    }, {
      failures: [{
        table: 'tasks',
        operation: 'delete',
        column: 'id',
        value: failed.id,
        once: true,
      }],
    });
    await waitFor(() => expect(latest().tasks).toHaveLength(3));

    const results = await act(async () => Promise.allSettled([
      latest().deleteTask(success.id),
      latest().deleteTask(failed.id),
    ]));

    expect(results.map(result => result.status)).toEqual(['fulfilled', 'rejected']);
    expect(latest().tasks).toEqual([
      expect.objectContaining({ id: failed.id }),
      expect.objectContaining({ id: kept.id }),
    ]);
    expect(mockState.cancelTaskNotifications).toHaveBeenCalledWith(success.id);
    expect(mockState.cancelTaskNotifications).not.toHaveBeenCalledWith(failed.id);

    unmount();
  });

  it('TC-CB-288 TD081 TV081 TA016 R008 複数削除が全件失敗した場合はProvider状態を維持する', async () => {
    const first = task({ id: 'bulk-all-failed-a' });
    const second = task({ id: 'bulk-all-failed-b' });
    const { latest, unmount } = renderTaskProvider({
      tasks: [first, second],
      task_categories: [],
      recurrence_groups: [],
      task_sessions: [],
    }, {
      failures: [
        { table: 'tasks', operation: 'delete', column: 'id', value: first.id, once: true },
        { table: 'tasks', operation: 'delete', column: 'id', value: second.id, once: true },
      ],
    });
    await waitFor(() => expect(latest().tasks).toHaveLength(2));

    const results = await act(async () => Promise.allSettled([
      latest().deleteTask(first.id),
      latest().deleteTask(second.id),
    ]));

    expect(results.map(result => result.status)).toEqual(['rejected', 'rejected']);
    expect(latest().tasks).toEqual([
      expect.objectContaining({ id: first.id }),
      expect.objectContaining({ id: second.id }),
    ]);
    expect(mockState.cancelTaskNotifications).not.toHaveBeenCalled();

    unmount();
  });

  it('TC-CB-341 TD087 TV087 TA017 R015 createTaskはlocalStorage履歴を変更せずSupabase側へ保存する', async () => {
    window.localStorage.setItem('task_title_history', JSON.stringify(['既存履歴']));
    const { latest, mock, unmount } = renderTaskProvider({
      tasks: [],
      task_categories: [],
      recurrence_groups: [],
      task_sessions: [],
    });
    await waitFor(() => expect(latest().loading).toBe(false));

    await act(async () => {
      await latest().createTask(task({ id: 'created-provider-task', title: 'Provider作成' }));
    });

    expect(mock.tables.tasks).toContainEqual(expect.objectContaining({
      title: 'Provider作成',
      user_id: 'user-1',
    }));
    expect(window.localStorage.getItem('task_title_history')).toBe(JSON.stringify(['既存履歴']));

    unmount();
  });

  it('TC-CB-342 TD087 TV087 TA017 R015 refetchはuser_idでSupabase保存データを取得しProvider状態へ反映する', async () => {
    const own = task({ id: 'own-task', user_id: 'user-1' });
    const other = task({ id: 'other-user-task', user_id: 'user-2' });
    const { latest, mock, unmount } = renderTaskProvider({
      tasks: [own, other],
      task_categories: [],
      recurrence_groups: [],
      task_sessions: [],
    });

    await waitFor(() => expect(latest().tasks).toEqual([expect.objectContaining({ id: own.id })]));
    expect(mock.calls).toContainEqual(expect.objectContaining({
      table: 'tasks',
      method: 'eq',
      column: 'user_id',
      value: 'user-1',
    }));

    unmount();
  });

  it('TC-CB-343 TD087 TV087 TA017 R015 deleteTaskはSupabase保存データを削除してlocalStorage履歴は保持する', async () => {
    window.localStorage.setItem('task_title_history', JSON.stringify(['削除対象タイトル']));
    const target = task({ id: 'privacy-delete-target' });
    const { latest, mock, unmount } = renderTaskProvider({
      tasks: [target],
      task_categories: [],
      recurrence_groups: [],
      task_sessions: [],
    });
    await waitFor(() => expect(latest().tasks).toHaveLength(1));

    await act(async () => {
      await latest().deleteTask(target.id);
    });

    expect(mock.tables.tasks).toEqual([]);
    expect(window.localStorage.getItem('task_title_history')).toBe(JSON.stringify(['削除対象タイトル']));

    unmount();
  });

  it('TC-CB-344 TD087 TV087 TA017 R015 unmount時は通知だけを全消去しSupabase保存データとlocalStorage履歴は破壊しない', async () => {
    window.localStorage.setItem('task_title_history', JSON.stringify(['保持履歴']));
    const target = task({ id: 'unmount-kept-task' });
    const { mock, unmount } = renderTaskProvider({
      tasks: [target],
      task_categories: [category()],
      recurrence_groups: [],
      task_sessions: [],
    });

    unmount();

    expect(mockState.clearAllTaskNotifications).toHaveBeenCalledTimes(1);
    expect(mock.tables.tasks).toContainEqual(expect.objectContaining({ id: target.id }));
    expect(window.localStorage.getItem('task_title_history')).toBe(JSON.stringify(['保持履歴']));
  });
});
