// Vitest configuration for the @rulesets/core package. Enables global test utilities and coverage reporting.
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node', // Explicitly set environment
    coverage: {
      provider: 'v8', // or 'istanbul'
      reporter: ['text', 'json', 'html'],
      include: ['src/**/*.{ts,tsx,mts,cts}'],
      exclude: [
        'src/interfaces/**',
        'src/**/__tests__/**',
        'src/**/*.spec.ts',
        'src/**/*.test.ts',
      ],
    },
  },
});
