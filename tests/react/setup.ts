import '@testing-library/jest-dom/vitest';
import { afterEach, vi } from 'vitest';
import { cleanup } from '@testing-library/react';
import { installDefaultBrowserMocks, resetBrowserStorage } from './mocks/browserApiMock';

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.useRealTimers();
  resetBrowserStorage();
});

installDefaultBrowserMocks();
