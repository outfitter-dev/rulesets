import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['esm', 'cjs'],
  dts: false, // Temporarily disable, will use tsc directly
  sourcemap: true,
  clean: true,
  splitting: false,
  shims: true,
  external: ['js-yaml'], // Only direct dependencies that consumers must install
  outExtension({ format }) {
    return {
      js: format === 'esm' ? '.mjs' : '.cjs',
    };
  },
});
