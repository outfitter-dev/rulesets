// TLDR: Test configuration for the @mixdown/core package using Vitest. Enables global test utilities and coverage reporting (mixd-v0)
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node', // Explicitly set environment
    coverage: {
      provider: 'v8', // or 'istanbul'
      reporter: ['text', 'json', 'html'],
      include: ['src/**/*.{ts,tsx}'],
      exclude: ['src/interfaces/**', 'src/**/__tests__/**', 'src/**/*.spec.ts'],
    },
  },
});