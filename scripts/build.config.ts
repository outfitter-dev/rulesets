/**
 * Shared build configuration for Rulesets monorepo
 * Centralized settings for consistent builds across all packages
 */

import type { BuildConfig } from 'bun';

/**
 * Base build configuration for all packages
 */
export const baseBuildConfig: Partial<BuildConfig> = {
  target: 'node',
  format: 'esm',
  sourcemap: 'none',
  minify: true,
  // Use tree shaking for smaller bundles
  treeShaking: true,
  // External common dependencies to avoid bundling
  external: [
    'bun',
    'node:*',
    '@rulesets/*', // Don't bundle workspace packages
  ],
};

/**
 * Development build configuration
 */
export const devBuildConfig: Partial<BuildConfig> = {
  ...baseBuildConfig,
  minify: false,
  sourcemap: 'inline',
};

/**
 * Production build configuration
 */
export const prodBuildConfig: Partial<BuildConfig> = {
  ...baseBuildConfig,
  minify: true,
  sourcemap: 'external',
};

/**
 * Test build configuration
 */
export const testBuildConfig: Partial<BuildConfig> = {
  ...baseBuildConfig,
  minify: false,
  sourcemap: 'inline',
  // Include test utilities
  external: [...baseBuildConfig.external!, 'vitest', 'bun:test'],
};

/**
 * Get build configuration based on environment
 */
export function getBuildConfig(
  env: 'development' | 'production' | 'test' = 'production'
): Partial<BuildConfig> {
  switch (env) {
    case 'development':
      return devBuildConfig;
    case 'test':
      return testBuildConfig;
    case 'production':
    default:
      return prodBuildConfig;
  }
}

/**
 * Package-specific overrides
 */
export const packageOverrides: Record<string, Partial<BuildConfig>> = {
  '@rulesets/cli': {
    // CLI needs to be executable
    platform: 'node',
    format: 'esm',
  },
  '@rulesets/core': {
    // Core might need to bundle some dependencies
    external: [
      'bun',
      'node:*',
      'handlebars', // Keep handlebars external for template flexibility
    ],
  },
};

/**
 * Get build configuration for a specific package
 */
export function getPackageBuildConfig(
  packageName: string,
  env: 'development' | 'production' | 'test' = 'production'
): Partial<BuildConfig> {
  const baseConfig = getBuildConfig(env);
  const overrides = packageOverrides[packageName] || {};

  return {
    ...baseConfig,
    ...overrides,
  };
}
