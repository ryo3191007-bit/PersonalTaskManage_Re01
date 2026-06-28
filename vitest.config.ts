import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./tests/react/setup.ts'],
    include: ['tests/react/**/*.test.{ts,tsx}'],
    css: true,
    clearMocks: true,
    restoreMocks: true,
  },
});
