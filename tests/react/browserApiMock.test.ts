import { describe, expect, it, vi } from 'vitest';
import {
  installClipboardMock,
  installNotificationMock,
  useFakeBrowserTime,
} from './mocks/browserApiMock';

describe('browser API test helpers', () => {
  it('records Notification constructor calls and mutable permission', async () => {
    const notification = installNotificationMock('default');

    expect(Notification.permission).toBe('default');

    notification.setPermission('granted');
    expect(await Notification.requestPermission()).toBe('granted');

    new Notification('タスクマネージャー', { body: '開始予定時刻です', tag: 'task-1:start' });

    expect(notification.created).toEqual([
      {
        title: 'タスクマネージャー',
        options: { body: '開始予定時刻です', tag: 'task-1:start' },
      },
    ]);
  });

  it('provides clipboard spies', async () => {
    const clipboard = installClipboardMock();

    await navigator.clipboard.writeText('export text');

    expect(clipboard.writeText).toHaveBeenCalledWith('export text');
  });

  it('controls browser timers and Date.now', async () => {
    const time = useFakeBrowserTime('2026-06-27T00:00:00.000Z');
    const callback = vi.fn();

    window.setTimeout(callback, 1_000);
    await time.advance(999);
    expect(callback).not.toHaveBeenCalled();

    await time.advance(1);
    expect(callback).toHaveBeenCalledTimes(1);
    expect(new Date().toISOString()).toBe('2026-06-27T00:00:01.000Z');

    time.restore();
  });
});
