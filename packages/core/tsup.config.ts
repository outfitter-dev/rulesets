// TLDR: Build configuration for the @mixdown/core package using tsup. Defines entry points, output formats (ESM, CJS), and d.ts generation (mixd-v0)
import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['esm', 'cjs'],
  dts: true,
  sourcemap: true,
  clean: true,
  splitting: false, // TLDR: keep it simple for now (mixd-v0)
  // TODO (mixd-v0.1): Enable code splitting for better performance
  shims: true,
});