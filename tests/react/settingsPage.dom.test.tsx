import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import SettingsPage from '../../src/pages/SettingsPage';
import type { TaskCategory } from '../../src/lib/types';

const mockState = vi.hoisted(() => ({
  categories: [] as TaskCategory[],
  createCategory: vi.fn(),
  updateCategory: vi.fn(),
  deleteCategory: vi.fn(),
  user: { id: 'user-1', email: 'current@example.test' },
  updateAccount: vi.fn(),
}));

vi.mock('../../src/contexts/TaskContext', () => ({
  useTasks: () => ({
    categories: mockState.categories,
    createCategory: mockState.createCategory,
    updateCategory: mockState.updateCategory,
    deleteCategory: mockState.deleteCategory,
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
    name: '開発',
    color: '#3b82f6',
    created_at: '2026-06-27T00:00:00.000Z',
    ...overrides,
  };
}

function buttonsByText(text: string) {
  return screen.getAllByRole('button').filter(button => button.textContent?.includes(text));
}

function firstAccountForm(container: HTMLElement) {
  const form = container.querySelector('form');
  if (!form) throw new Error('account form not found');
  return form;
}

function accountInputs(container: HTMLElement) {
  const form = firstAccountForm(container);
  const email = form.querySelector<HTMLInputElement>('input[type="email"]');
  const passwordInputs = Array.from(form.querySelectorAll<HTMLInputElement>('input[type="password"]'));
  if (!email || passwordInputs.length < 2) throw new Error('account inputs not found');
  return { email, newPassword: passwordInputs[0], confirmPassword: passwordInputs[1], form };
}

beforeEach(() => {
  Object.defineProperty(window, 'Notification', {
    configurable: true,
    value: class {
      static permission: NotificationPermission = 'default';
      static requestPermission = vi.fn(async () => 'granted' as NotificationPermission);
    },
  });
  mockState.categories = [];
  mockState.createCategory.mockReset();
  mockState.createCategory.mockResolvedValue(category({ id: 'created-category' }));
  mockState.updateCategory.mockReset();
  mockState.updateCategory.mockResolvedValue(undefined);
  mockState.deleteCategory.mockReset();
  mockState.deleteCategory.mockResolvedValue(undefined);
  mockState.updateAccount.mockReset();
  mockState.updateAccount.mockResolvedValue({ error: null });
});

describe('SettingsPage React DOM account and category states', () => {
  it('TC-CB-140/TC-CB-183/TC-CB-266 TD042/TD092/TD091 TV042/TV092/TV091 TA007/TA018 R001/R016 6文字パスワードは更新APIへ渡す', async () => {
    const { container } = render(<SettingsPage />);
    const { newPassword, confirmPassword, form } = accountInputs(container);

    fireEvent.change(newPassword, { target: { value: '123456' } });
    fireEvent.change(confirmPassword, { target: { value: '123456' } });
    fireEvent.submit(form);

    await waitFor(() => expect(mockState.updateAccount).toHaveBeenCalledWith({ password: '123456' }));
  });

  it('TC-CB-182/TC-CB-265 TD092/TD091 TV092/TV091 TA018 R001/R016 5文字パスワードは更新APIを呼ばない', () => {
    const { container } = render(<SettingsPage />);
    const { newPassword, confirmPassword, form } = accountInputs(container);

    fireEvent.change(newPassword, { target: { value: '12345' } });
    fireEvent.change(confirmPassword, { target: { value: '12345' } });
    fireEvent.submit(form);

    expect(mockState.updateAccount).not.toHaveBeenCalled();
    expect(container).toHaveTextContent('6');
  });

  it('TC-CB-141/TC-CB-184/TC-CB-267 TD042/TD092/TD091 TV042/TV092/TV091 TA007/TA018 R001/R016 確認不一致は更新APIを呼ばない', () => {
    const { container } = render(<SettingsPage />);
    const { newPassword, confirmPassword, form } = accountInputs(container);

    fireEvent.change(newPassword, { target: { value: '123456' } });
    fireEvent.change(confirmPassword, { target: { value: 'abcdef' } });
    fireEvent.submit(form);

    expect(mockState.updateAccount).not.toHaveBeenCalled();
  });

  it('TC-CB-143/TC-CB-186 TD042/TD092 TV042/TV092 TA007/TA018 R001 メール形式不正は更新APIを呼ばない', () => {
    const { container } = render(<SettingsPage />);
    const { email, form } = accountInputs(container);

    fireEvent.change(email, { target: { value: 'invalid-email' } });
    fireEvent.submit(form);

    expect(mockState.updateAccount).not.toHaveBeenCalled();
    expect(container).toHaveTextContent('メールアドレスの形式が正しくありません');
  });

  it('TC-CB-142/TC-CB-185 TD042/TD092 TV042/TV092 TA007/TA018 R001 変更なしでは更新APIを呼ばない', () => {
    const { container } = render(<SettingsPage />);
    const { form } = accountInputs(container);

    fireEvent.submit(form);

    expect(mockState.updateAccount).not.toHaveBeenCalled();
  });

  it('TC-CB-149 TD044 TV044 TA007 R007 空白カテゴリ名では作成APIを呼ばない', async () => {
    const user = userEvent.setup();
    const { container } = render(<SettingsPage />);

    await user.click(buttonsByText('追加')[0] ?? buttonsByText('霑ｽ蜉')[0]);
    const dialog = container.querySelector('.fixed');
    expect(dialog).toBeTruthy();
    const form = dialog!.querySelector('form');
    if (!form) throw new Error('category form not found');
    fireEvent.submit(form);

    expect(mockState.createCategory).not.toHaveBeenCalled();
  });

  it('TC-CB-150 TD044 TV044 TA007 R007 カテゴリ保存失敗ではダイアログを閉じずエラーを表示する', async () => {
    const user = userEvent.setup();
    mockState.createCategory.mockResolvedValueOnce(null);
    const { container } = render(<SettingsPage />);

    await user.click(buttonsByText('追加')[0] ?? buttonsByText('霑ｽ蜉')[0]);
    const dialog = container.querySelector('.fixed');
    const nameInput = dialog!.querySelector<HTMLInputElement>('input[type="text"]');
    const form = dialog!.querySelector('form');
    if (!nameInput || !form) throw new Error('category dialog controls not found');
    fireEvent.change(nameInput, { target: { value: '新カテゴリ' } });
    fireEvent.submit(form);

    await waitFor(() => expect(mockState.createCategory).toHaveBeenCalledTimes(1));
    expect(container.querySelector('.fixed')).toBeTruthy();
  });

  it('TC-CB-151 TD044 TV044 TA007 R007 カテゴリ保存中の二重submitを防ぐ', async () => {
    const user = userEvent.setup();
    let resolveCreate: (value: TaskCategory) => void = () => {};
    mockState.createCategory.mockReturnValue(new Promise<TaskCategory>(resolve => {
      resolveCreate = resolve;
    }));
    const { container } = render(<SettingsPage />);

    await user.click(buttonsByText('追加')[0] ?? buttonsByText('霑ｽ蜉')[0]);
    const dialog = container.querySelector('.fixed');
    const nameInput = dialog!.querySelector<HTMLInputElement>('input[type="text"]');
    const form = dialog!.querySelector('form');
    if (!nameInput || !form) throw new Error('category dialog controls not found');

    fireEvent.change(nameInput, { target: { value: '二重送信防止' } });
    fireEvent.submit(form);
    fireEvent.submit(form);

    expect(mockState.createCategory).toHaveBeenCalledTimes(1);
    resolveCreate(category({ id: 'created-category' }));
    await waitFor(() => expect(container.querySelector('.fixed')).toBeFalsy());
  });

  it('TC-CB-255〜TC-CB-259 TD089 TV089 TA008 R008 10色パレットと色フィルタでカテゴリ表示を切り替える', async () => {
    const user = userEvent.setup();
    mockState.categories = [
      category({ id: 'blue', name: '青カテゴリ', color: '#3b82f6' }),
      category({ id: 'red', name: '赤カテゴリ', color: '#ef4444' }),
      category({ id: 'green', name: '緑カテゴリ', color: '#22c55e' }),
    ];
    const { container } = render(<SettingsPage />);

    expect(container).toHaveTextContent('青カテゴリ');
    expect(container).not.toHaveTextContent('赤カテゴリ');
    expect(container.querySelectorAll('button[title^="#"]')).toHaveLength(10);

    await user.click(container.querySelector('button[title="#ef4444"]') as HTMLElement);
    expect(container).toHaveTextContent('赤カテゴリ');
    expect(container).not.toHaveTextContent('青カテゴリ');

    await user.click(container.querySelector('button[title="#ef4444"]') as HTMLElement);
    expect(container).toHaveTextContent('青カテゴリ');
    expect(container).toHaveTextContent('赤カテゴリ');
    expect(container).toHaveTextContent('緑カテゴリ');
  });

  it('TC-CB-260〜TC-CB-262 TD089 TV089 TA008 R008 カテゴリ名検索で一致カテゴリだけを表示する', async () => {
    const user = userEvent.setup();
    mockState.categories = [
      category({ id: 'blue', name: '開発', color: '#3b82f6' }),
      category({ id: 'red', name: '設計', color: '#ef4444' }),
    ];
    const { container } = render(<SettingsPage />);
    await user.click(container.querySelector('button[title="#3b82f6"]') as HTMLElement);

    const searchInput = screen.getByPlaceholderText(/分類名/);
    await user.type(searchInput, '設');

    expect(container).toHaveTextContent('設計');
    expect(container).not.toHaveTextContent('開発');
  });

  it('TC-CB-263〜TC-CB-264 TD089 TV089 TA008 R008 カテゴリ編集で名称と色を更新APIへ渡す', async () => {
    const user = userEvent.setup();
    mockState.categories = [category({ id: 'blue', name: '開発', color: '#3b82f6' })];
    const { container } = render(<SettingsPage />);

    const row = screen.getByText('開発').closest('div');
    if (!row) throw new Error('category row not found');
    const editButton = Array.from(row.querySelectorAll('button'))[0];
    await user.click(editButton);

    const editInput = container.querySelector<HTMLInputElement>('input[value="開発"]');
    if (!editInput) throw new Error('edit input not found');
    fireEvent.change(editInput, { target: { value: '開発更新' } });
    const editRow = editInput.closest('div');
    if (!editRow) throw new Error('edit row not found');
    const colorButtons = Array.from(editRow.querySelectorAll<HTMLButtonElement>('button')).filter(button =>
      button.style.backgroundColor
    );
    await user.click(colorButtons[1]);
    const saveButton = Array.from(container.querySelectorAll('button')).find(button =>
      button.querySelector('svg') && button.className.includes('text-green')
    );
    if (!saveButton) throw new Error('save button not found');
    await user.click(saveButton);

    expect(mockState.updateCategory).toHaveBeenCalledWith('blue', {
      name: '開発更新',
      color: '#ef4444',
    });
  });

  it.each([
    ['TC-CB-124', '', false],
    ['TC-CB-125', 'あ', true],
    ['TC-CB-126', 'あ'.repeat(29), true],
    ['TC-CB-127', 'あ'.repeat(30), true],
    ['TC-CB-128', 'あ'.repeat(31), true],
  ])('%s TD041 TV041 TA007 R007 カテゴリ名文字数境界を作成payloadへ渡す', async (_tc, name, shouldCreate) => {
    const user = userEvent.setup();
    const { container } = render(<SettingsPage />);

    await user.click(buttonsByText('追加')[0] ?? buttonsByText('霑ｽ蜉')[0]);
    const dialog = container.querySelector('.fixed');
    const nameInput = dialog?.querySelector<HTMLInputElement>('input[type="text"]');
    const form = dialog?.querySelector('form');
    if (!nameInput || !form) throw new Error('category dialog controls not found');

    if (name) fireEvent.change(nameInput, { target: { value: name } });
    fireEvent.submit(form);

    if (shouldCreate) {
      await waitFor(() => expect(mockState.createCategory).toHaveBeenCalledTimes(1));
      expect(mockState.createCategory.mock.calls[0][0]).toEqual({ name, color: '#3b82f6' });
    } else {
      expect(mockState.createCategory).not.toHaveBeenCalled();
    }
  });

  it('TC-CB-275 TD095 TV095 TA019 R017 SettingsPageはカテゴリ個別選択数を表示する', async () => {
    const user = userEvent.setup();
    mockState.categories = [
      category({ id: 'cat-a', name: '削除A', color: '#3b82f6' }),
      category({ id: 'cat-b', name: '削除B', color: '#3b82f6' }),
    ];
    const { container } = render(<SettingsPage />);

    await user.click(buttonsByText('一括削除')[0]);
    const checks = Array.from(container.querySelectorAll<HTMLInputElement>('input[type="checkbox"]'));
    await user.click(checks[0]);

    expect(container).toHaveTextContent('1件選択中');
  });

  it('TC-CB-276 TD095 TV095 TA019 R017 SettingsPageは選択解除で0件に戻す', async () => {
    const user = userEvent.setup();
    mockState.categories = [
      category({ id: 'cat-a', name: '削除A', color: '#3b82f6' }),
    ];
    const { container } = render(<SettingsPage />);

    await user.click(buttonsByText('一括削除')[0]);
    const check = container.querySelector<HTMLInputElement>('input[type="checkbox"]');
    if (!check) throw new Error('checkbox not found');
    await user.click(check);
    await user.click(check);

    expect(container).toHaveTextContent('0件選択中');
  });

  it('TC-CB-277 TD095 TV095 TA019 R017 SettingsPageは選択カテゴリだけを確定削除する', async () => {
    const user = userEvent.setup();
    mockState.categories = [
      category({ id: 'cat-a', name: '削除A', color: '#3b82f6' }),
      category({ id: 'cat-b', name: '削除B', color: '#3b82f6' }),
    ];
    const { container } = render(<SettingsPage />);

    await user.click(buttonsByText('一括削除')[0]);
    const checks = Array.from(container.querySelectorAll<HTMLInputElement>('input[type="checkbox"]'));
    await user.click(checks[1]);
    await user.click(buttonsByText('削除する')[0]);
    await user.click(buttonsByText('確定')[0]);

    await waitFor(() => expect(mockState.deleteCategory).toHaveBeenCalledWith('cat-b'));
    expect(mockState.deleteCategory).toHaveBeenCalledTimes(1);
  });

  it('TC-CB-279 TD096 TV096 TA019 R017 SettingsPageは1件カテゴリの一括削除UIを有効化する', async () => {
    const user = userEvent.setup();
    mockState.categories = [category({ id: 'cat-a', name: '削除A', color: '#3b82f6' })];
    const { container } = render(<SettingsPage />);

    await user.click(buttonsByText('一括削除')[0]);
    const check = container.querySelector<HTMLInputElement>('input[type="checkbox"]');
    if (!check) throw new Error('checkbox not found');
    await user.click(check);

    expect(buttonsByText('削除する')[0]).not.toBeDisabled();
  });
});
