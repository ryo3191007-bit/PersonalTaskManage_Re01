import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import RecurrenceForm from '../../src/components/tasks/RecurrenceForm';
import type { RecurrenceGroup, TaskCategory } from '../../src/lib/types';

const mockState = vi.hoisted(() => ({
  categories: [] as TaskCategory[],
  createRecurrenceGroup: vi.fn(),
  updateRecurrenceGroup: vi.fn(),
  bulkCreateTasksForGroup: vi.fn(),
}));

vi.mock('../../src/contexts/TaskContext', () => ({
  useTasks: () => ({
    categories: mockState.categories,
    createRecurrenceGroup: mockState.createRecurrenceGroup,
    updateRecurrenceGroup: mockState.updateRecurrenceGroup,
    bulkCreateTasksForGroup: mockState.bulkCreateTasksForGroup,
  }),
}));

function createdGroup(overrides: Partial<RecurrenceGroup> = {}): RecurrenceGroup {
  return {
    id: 'group-1',
    user_id: 'user-1',
    title: '定常',
    category_id: null,
    priority: 'medium',
    start_time: '09:00',
    end_time: '10:00',
    ends_next_day: false,
    recurrence_type: 'daily',
    days_of_week: null,
    period_start: '2026-06-27',
    period_end: '2026-06-27',
    notes: '',
    track_actual: true,
    created_at: '2026-06-27T00:00:00.000Z',
    updated_at: '2026-06-27T00:00:00.000Z',
    ...overrides,
  };
}

async function renderForm() {
  const user = userEvent.setup();
  const onClose = vi.fn();
  render(<RecurrenceForm onClose={onClose} />);
  await user.clear(screen.getByPlaceholderText('例：朝の会議'));
  await user.type(screen.getByPlaceholderText('例：朝の会議'), '定常テスト');
  return { user, onClose };
}

function dateInputs() {
  const inputs = Array.from(document.querySelectorAll<HTMLInputElement>('input[type="date"]'));
  if (inputs.length < 2) throw new Error('date inputs not found');
  return { start: inputs[0], end: inputs[1] };
}

function timeInputs() {
  const inputs = Array.from(document.querySelectorAll<HTMLInputElement>('input[type="time"]'));
  if (inputs.length < 2) throw new Error('time inputs not found');
  return { start: inputs[0], end: inputs[1] };
}

beforeEach(() => {
  mockState.categories = [];
  mockState.createRecurrenceGroup.mockReset();
  mockState.createRecurrenceGroup.mockResolvedValue(createdGroup());
  mockState.updateRecurrenceGroup.mockReset();
  mockState.bulkCreateTasksForGroup.mockReset();
  mockState.bulkCreateTasksForGroup.mockResolvedValue(undefined);
});

describe('Phase4 RecurrenceForm DOM boundaries', () => {
  it('TC-CB-113 TD040 TV040 TA007 R004/R007 same-day end before start disables submit', async () => {
    const { user } = await renderForm();
    const { start, end } = timeInputs();

    await user.clear(start);
    await user.type(start, '10:00');
    await user.clear(end);
    await user.type(end, '09:59');

    expect(screen.getByRole('button', { name: /件を一括登録/ })).toBeDisabled();
    expect(screen.getByText('同日終了の場合、終了時刻は開始時刻より後にしてください。')).toBeInTheDocument();
  });

  it('TC-CB-114 TD040 TV040 TA007 R004/R007 same-day equal start and end disables submit', async () => {
    const { user } = await renderForm();
    const { start, end } = timeInputs();

    await user.clear(start);
    await user.type(start, '10:00');
    await user.clear(end);
    await user.type(end, '10:00');

    expect(screen.getByRole('button', { name: /件を一括登録/ })).toBeDisabled();
  });

  it('TC-CB-115 TD040 TV040 TA007 R004/R007 same-day end after start can create group', async () => {
    const { user, onClose } = await renderForm();
    const { start, end } = timeInputs();

    await user.clear(start);
    await user.type(start, '09:00');
    await user.clear(end);
    await user.type(end, '10:00');
    await user.click(screen.getByRole('button', { name: /件を一括登録/ }));

    await waitFor(() => expect(mockState.createRecurrenceGroup).toHaveBeenCalledTimes(1));
    expect(mockState.createRecurrenceGroup.mock.calls[0][0]).toEqual(expect.objectContaining({
      start_time: '09:00',
      end_time: '10:00',
      ends_next_day: false,
    }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('TC-CB-116 TD040 TV040 TA007 R004/R007 next-day end allows earlier clock time', async () => {
    const { user } = await renderForm();
    const { start, end } = timeInputs();

    await user.clear(start);
    await user.type(start, '23:00');
    await user.clear(end);
    await user.type(end, '01:00');
    await user.click(screen.getByLabelText('翌日に終了'));
    await user.click(screen.getByRole('button', { name: /件を一括登録/ }));

    await waitFor(() => expect(mockState.createRecurrenceGroup).toHaveBeenCalledTimes(1));
    expect(mockState.createRecurrenceGroup.mock.calls[0][0]).toEqual(expect.objectContaining({ ends_next_day: true }));
  });

  it('TC-CB-117 TD040 TV040 TA007 R004/R007 weekly recurrence with no day disables submit', async () => {
    const { user } = await renderForm();

    await user.click(screen.getByRole('button', { name: '曜日指定' }));

    expect(screen.getByRole('button', { name: /件を一括登録/ })).toBeDisabled();
    expect(screen.getByText('曜日を1つ以上選択してください')).toBeInTheDocument();
  });

  it('TC-CB-118 TD040 TV040 TA007 R004/R007 date range endpoints are submitted inclusively', async () => {
    const { user } = await renderForm();
    const { start, end } = dateInputs();

    await user.clear(start);
    await user.type(start, '2026-06-27');
    await user.clear(end);
    await user.type(end, '2026-06-29');
    await user.click(screen.getByRole('button', { name: /件を一括登録/ }));

    await waitFor(() => expect(mockState.createRecurrenceGroup).toHaveBeenCalledTimes(1));
    expect(mockState.createRecurrenceGroup.mock.calls[0][0]).toEqual(expect.objectContaining({
      period_start: '2026-06-27',
      period_end: '2026-06-29',
    }));
    expect(screen.getByText('3 件のタスクが作成されます')).toBeInTheDocument();
  });
});
