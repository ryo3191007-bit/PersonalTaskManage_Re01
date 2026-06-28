import { render, waitFor } from '@testing-library/react';
import { act } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AuthProvider, useAuth } from '../../src/contexts/AuthContext';

type MockSession = {
  access_token: string;
  user: { id: string; email: string };
} | null;

const mockState = vi.hoisted(() => ({
  session: null as MockSession,
  listeners: [] as Array<(event: string, session: MockSession) => void>,
  signInError: null as Error | null,
  signUpError: null as Error | null,
  signInWithPassword: vi.fn(),
  signUp: vi.fn(),
  signOut: vi.fn(),
  unsubscribe: vi.fn(),
}));

vi.mock('../../src/lib/supabase', () => ({
  supabase: {
    auth: {
      getSession: vi.fn(async () => ({ data: { session: mockState.session }, error: null })),
      signInWithPassword: vi.fn(async (credentials: Record<string, unknown>) => {
        mockState.signInWithPassword(credentials);
        return { data: { session: mockState.signInError ? null : mockState.session }, error: mockState.signInError };
      }),
      signUp: vi.fn(async (credentials: Record<string, unknown>) => {
        mockState.signUp(credentials);
        return { data: { session: mockState.signUpError ? null : mockState.session }, error: mockState.signUpError };
      }),
      signOut: vi.fn(async () => {
        mockState.signOut();
        mockState.session = null;
        mockState.listeners.forEach(listener => listener('SIGNED_OUT', null));
        return { error: null };
      }),
      onAuthStateChange: vi.fn((callback: (event: string, session: MockSession) => void) => {
        mockState.listeners.push(callback);
        return {
          data: {
            subscription: {
              unsubscribe: mockState.unsubscribe,
            },
          },
        };
      }),
    },
  },
}));

type AuthSnapshot = ReturnType<typeof useAuth>;

function renderAuthProvider() {
  const snapshots: AuthSnapshot[] = [];

  function Probe() {
    snapshots.push(useAuth());
    return null;
  }

  const view = render(
    <AuthProvider>
      <Probe />
    </AuthProvider>
  );

  return {
    ...view,
    latest: () => snapshots[snapshots.length - 1],
  };
}

function session(userId: string, email: string): MockSession {
  return {
    access_token: `${userId}-token`,
    user: { id: userId, email },
  };
}

beforeEach(() => {
  mockState.session = null;
  mockState.listeners = [];
  mockState.signInError = null;
  mockState.signUpError = null;
  mockState.signInWithPassword.mockClear();
  mockState.signUp.mockClear();
  mockState.signOut.mockClear();
  mockState.unsubscribe.mockClear();
});

describe('AuthContext Provider authentication state', () => {
  it('TC-CB-189 TD002 TV002 TA001 R001/R007 未認証または誤認証はProviderのuserを作らずerrorを返す', async () => {
    mockState.signInError = new Error('Invalid login credentials');
    const { latest, unmount } = renderAuthProvider();
    await waitFor(() => expect(latest().loading).toBe(false));

    let result: Awaited<ReturnType<AuthSnapshot['signIn']>> | undefined;
    await act(async () => {
      result = await latest().signIn('tc_td002_189@example.test', 'wrong-password');
    });

    expect(result?.error).toEqual(new Error('Invalid login credentials'));
    expect(latest().user).toBeNull();
    expect(mockState.signInWithPassword).toHaveBeenCalledWith({
      email: 'tc_td002_189@example.test',
      password: 'wrong-password',
    });

    unmount();
  });

  it('TC-CB-190 TD002 TV002 TA001 R001/R007 認証済みユーザーAの初期sessionをProvider状態へ反映する', async () => {
    mockState.session = session('user-a', 'tc_td002_190@example.test');
    const { latest, unmount } = renderAuthProvider();

    await waitFor(() => expect(latest().loading).toBe(false));
    expect(latest().user).toEqual(expect.objectContaining({
      id: 'user-a',
      email: 'tc_td002_190@example.test',
    }));
    expect(latest().session?.access_token).toBe('user-a-token');

    unmount();
  });

  it('TC-CB-191 TD002 TV002 TA001 R001/R007 認証状態変更でユーザーBへ切り替わりユーザーAが残留しない', async () => {
    mockState.session = session('user-a', 'tc_td002_190@example.test');
    const { latest, unmount } = renderAuthProvider();
    await waitFor(() => expect(latest().user?.id).toBe('user-a'));

    await act(async () => {
      mockState.session = session('user-b', 'tc_td002_191@example.test');
      mockState.listeners.forEach(listener => listener('SIGNED_IN', mockState.session));
    });

    expect(latest().user).toEqual(expect.objectContaining({
      id: 'user-b',
      email: 'tc_td002_191@example.test',
    }));
    expect(latest().session?.access_token).toBe('user-b-token');

    unmount();
  });

  it('TC-CB-192 TD002 TV002 TA001 R001/R007 期限切れ相当のnull sessionは認証済み状態を残さない', async () => {
    mockState.session = null;
    const { latest, unmount } = renderAuthProvider();
    await waitFor(() => expect(latest().loading).toBe(false));

    expect(latest().session).toBeNull();
    expect(latest().user).toBeNull();

    unmount();
  });

  it('TC-CB-269 TD094 TV094 TA018 R016 updateAccountは401応答をErrorとして返しBearer tokenを送る', async () => {
    mockState.session = session('user-a', 'tc_td094_269@example.test');
    const originalFetch = globalThis.fetch;
    const fetchMock = vi.fn(async (...args: unknown[]) => {
      void args;
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
    });
    globalThis.fetch = fetchMock as typeof fetch;
    const { latest, unmount } = renderAuthProvider();
    await waitFor(() => expect(latest().loading).toBe(false));

    let result: Awaited<ReturnType<AuthSnapshot['updateAccount']>> | undefined;
    await act(async () => {
      result = await latest().updateAccount({ email: 'next@example.test' });
    });

    expect(result?.error?.message).toBe('Unauthorized');
    const fetchInit = fetchMock.mock.calls[0]?.[1] as RequestInit | undefined;
    expect(fetchInit).toEqual(expect.objectContaining({
      method: 'POST',
      headers: expect.objectContaining({ Authorization: 'Bearer user-a-token' }),
    }));

    globalThis.fetch = originalFetch;
    unmount();
  });

  it('TC-CB-268 TD094 TV094 TA018 R016 updateAccountは通信失敗をErrorとして返す', async () => {
    mockState.session = session('user-a', 'tc_td094_268@example.test');
    const originalFetch = globalThis.fetch;
    globalThis.fetch = vi.fn(async () => {
      throw new TypeError('Failed to fetch');
    }) as typeof fetch;
    const { latest, unmount } = renderAuthProvider();
    await waitFor(() => expect(latest().loading).toBe(false));

    let result: Awaited<ReturnType<AuthSnapshot['updateAccount']>> | undefined;
    await act(async () => {
      result = await latest().updateAccount({ email: 'next@example.test' });
    });

    expect(result?.error?.message).toBe('通信に失敗しました。ネットワーク接続を確認してください');

    globalThis.fetch = originalFetch;
    unmount();
  });

  it('TC-CB-270 TD094 TV094 TA018 R016 updateAccountは400応答のerror本文を返す', async () => {
    mockState.session = session('user-a', 'tc_td094_270@example.test');
    const originalFetch = globalThis.fetch;
    globalThis.fetch = vi.fn(async () => new Response(JSON.stringify({ error: 'Bad request' }), { status: 400 })) as typeof fetch;
    const { latest, unmount } = renderAuthProvider();
    await waitFor(() => expect(latest().loading).toBe(false));

    let result: Awaited<ReturnType<AuthSnapshot['updateAccount']>> | undefined;
    await act(async () => {
      result = await latest().updateAccount({ password: '123456' });
    });

    expect(result?.error?.message).toBe('Bad request');

    globalThis.fetch = originalFetch;
    unmount();
  });

  it('TC-CB-271 TD094 TV094 TA018 R016 updateAccountは管理API失敗相当の応答を失敗として扱う', async () => {
    mockState.session = session('user-a', 'tc_td094_271@example.test');
    const originalFetch = globalThis.fetch;
    globalThis.fetch = vi.fn(async () => new Response(JSON.stringify({ error: '管理API失敗' }), { status: 400 })) as typeof fetch;
    const { latest, unmount } = renderAuthProvider();
    await waitFor(() => expect(latest().loading).toBe(false));

    let result: Awaited<ReturnType<AuthSnapshot['updateAccount']>> | undefined;
    await act(async () => {
      result = await latest().updateAccount({ email: 'next@example.test', password: '123456' });
    });

    expect(result?.error?.message).toBe('管理API失敗');

    globalThis.fetch = originalFetch;
    unmount();
  });
});
