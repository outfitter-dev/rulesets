// :M: tldr: Build configuration for the @rulesets/core package using tsup
// :M: v0.1.0: Basic build config with ESM/CJS output and source maps
import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['esm', 'cjs'],
  dts: false, // Temporarily disable, will use tsc directly
  sourcemap: true,
  clean: true,
  splitting: false, // :M: tldr: Disabled code splitting for simplicity
  // :M: v0.1.0: Single bundle output without code splitting
  // :M: todo(v0.2.0): Enable code splitting for better performance
  shims: true,
  external: ['json-schema'],
});