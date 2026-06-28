import { vi } from 'vitest';

type NotificationPermissionValue = NotificationPermission;

interface CreatedNotification {
  title: string;
  options?: NotificationOptions;
}

export function installMatchMediaMock(matches = false) {
  const matchMedia = vi.fn().mockImplementation((query: string) => ({
    matches,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  }));

  Object.defineProperty(window, 'matchMedia', {
    configurable: true,
    writable: true,
    value: matchMedia,
  });

  return matchMedia;
}

export function installClipboardMock() {
  const writeText = vi.fn().mockResolvedValue(undefined);
  const readText = vi.fn().mockResolvedValue('');

  Object.defineProperty(navigator, 'clipboard', {
    configurable: true,
    value: {
      writeText,
      readText,
    },
  });

  return { writeText, readText };
}

export function installNotificationMock(initialPermission: NotificationPermissionValue = 'default') {
  let permission = initialPermission;
  const created: CreatedNotification[] = [];
  const requestPermission = vi.fn(async () => permission);

  const NotificationMock = vi.fn().mockImplementation(function notification(this: unknown, title: string, options?: NotificationOptions) {
    created.push({ title, options });
    return { title, ...options };
  });

  Object.defineProperty(NotificationMock, 'permission', {
    configurable: true,
    get: () => permission,
  });
  Object.defineProperty(NotificationMock, 'requestPermission', {
    configurable: true,
    value: requestPermission,
  });

  Object.defineProperty(window, 'Notification', {
    configurable: true,
    writable: true,
    value: NotificationMock,
  });
  Object.defineProperty(globalThis, 'Notification', {
    configurable: true,
    writable: true,
    value: NotificationMock,
  });

  return {
    NotificationMock,
    requestPermission,
    created,
    setPermission(next: NotificationPermissionValue) {
      permission = next;
    },
  };
}

export function useFakeBrowserTime(now: string | Date) {
  vi.useFakeTimers();
  vi.setSystemTime(new Date(now));

  return {
    async advance(ms: number) {
      await vi.advanceTimersByTimeAsync(ms);
    },
    async runAll() {
      await vi.runAllTimersAsync();
    },
    restore() {
      vi.useRealTimers();
    },
  };
}

export function resetBrowserStorage() {
  window.localStorage.clear();
  window.sessionStorage.clear();
}

export function installDefaultBrowserMocks() {
  const matchMedia = installMatchMediaMock(false);
  const clipboard = installClipboardMock();

  return {
    matchMedia,
    clipboard,
  };
}
