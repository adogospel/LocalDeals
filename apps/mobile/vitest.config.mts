import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html'],
      thresholds: {
        statements: 85,
        branches: 80,
        functions: 85,
        lines: 90,
      },
    },
    include: ['src/**/*.test.ts'],
  },
});
