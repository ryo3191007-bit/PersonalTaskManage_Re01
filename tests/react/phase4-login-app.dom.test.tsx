import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import LoginPage from '../../src/pages/LoginPage';
import App from '../../src/App';

const authState = vi.hoisted(() => ({
  user: null as null | { id: string; email?: string },
  loading: false,
  signIn: vi.fn(),
  signUp: vi.fn(),
}));

vi.mock('../../src/contexts/AuthContext', () => ({
  AuthProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  useAuth: () => ({
    user: authState.user,
    loading: authState.loading,
    signIn: authState.signIn,
    signUp: authState.signUp,
  }),
}));

vi.mock('../../src/contexts/TaskContext', () => ({
  TaskProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

vi.mock('../../src/pages/TaskListPage', () => ({
  default: () => <main>保護タスク一覧</main>,
}));

vi.mock('../../src/pages/CalendarPage', () => ({ default: () => <main>カレンダー</main> }));
vi.mock('../../src/pages/AnalyticsPage', () => ({ default: () => <main>分析</main> }));
vi.mock('../../src/pages/SettingsPage', () => ({ default: () => <main>設定</main> }));
vi.mock('../../src/pages/RecurrenceGroupsPage', () => ({ default: () => <main>繰り返し</main> }));

beforeEach(() => {
  authState.user = null;
  authState.loading = false;
  authState.signIn.mockReset();
  authState.signIn.mockResolvedValue({ error: null });
  authState.signUp.mockReset();
  authState.signUp.mockResolvedValue({ error: null });
});

describe('Phase4 LoginPage and protected App DOM', () => {
  it('TC-CB-187 TD001 TV001 TA001 R001 valid login submits credentials', async () => {
    const user = userEvent.setup();
    render(<LoginPage />);

    await user.type(screen.getByPlaceholderText('you@example.com'), 'user@example.test');
    await user.type(screen.getByPlaceholderText('6文字以上'), 'secret1');
    const loginButtons = screen.getAllByRole('button', { name: 'ログイン' });
    await user.click(loginButtons[loginButtons.length - 1]);

    await waitFor(() => expect(authState.signIn).toHaveBeenCalledWith('user@example.test', 'secret1'));
    expect(authState.signUp).not.toHaveBeenCalled();
  });

  it('TC-CB-188 TD001 TV001 TA001 R001 valid signup submits credentials', async () => {
    const user = userEvent.setup();
    render(<LoginPage />);

    await user.click(screen.getAllByRole('button', { name: '新規登録' })[0]);
    await user.type(screen.getByPlaceholderText('you@example.com'), 'new@example.test');
    await user.type(screen.getByPlaceholderText('6文字以上'), 'secret1');
    const signupButtons = screen.getAllByRole('button', { name: '新規登録' });
    await user.click(signupButtons[signupButtons.length - 1]);

    await waitFor(() => expect(authState.signUp).toHaveBeenCalledWith('new@example.test', 'secret1'));
    expect(authState.signIn).not.toHaveBeenCalled();
  });

  it('TC-CB-193 TD004 TV004 TA001 R001 unauthenticated App shows login only', () => {
    authState.user = null;

    render(<App />);

    expect(screen.getByRole('heading', { name: 'タスクマネージャー' })).toBeInTheDocument();
    expect(screen.queryByText('保護タスク一覧')).not.toBeInTheDocument();
  });

  it('TC-CB-194 TD004 TV004 TA001 R001 authenticated App shows protected page', () => {
    authState.user = { id: 'user-1', email: 'user@example.test' };

    render(<App />);

    expect(screen.getByText('保護タスク一覧')).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'タスクマネージャー' })).not.toBeInTheDocument();
  });

  it('TC-CB-195 TD004 TV004 TA001 R001 loading App hides both login and protected data', () => {
    authState.loading = true;
    authState.user = { id: 'user-1', email: 'user@example.test' };

    render(<App />);

    expect(screen.queryByText('保護タスク一覧')).not.toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'タスクマネージャー' })).not.toBeInTheDocument();
  });
});
