// TLDR: Build configuration for the @mixdown/core package using tsup. Defines entry points, output formats (ESM, CJS), and d.ts generation (mixd-v0)
import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['esm', 'cjs'],
  dts: false, // Temporarily disable, will use tsc directly
  sourcemap: true,
  clean: true,
  splitting: false, // TLDR: keep it simple. Can enable later if needed (mixd-v0)
  // TODO (mixd-v0.1): Enable code splitting for better performance
  shims: true,
  external: ['json-schema'],
});