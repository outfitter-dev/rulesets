# Bun Migration Plan - Going All In

## Current State (MIGRATION COMPLETE ✅)

- ✅ Using Bun as package manager
- ✅ Using Bun for running scripts
- ✅ Using Bun's native test runner (replaced Vitest)
- ✅ Using Bun.file() APIs (replaced Node.js fs)
- ✅ Using Bun's native build system (replaced Turbo)
- ✅ Removed unnecessary dependencies (vitest, dotenv)

## Migration Tasks

### 1. Test Runner Migration

Replace Vitest with Bun's built-in test runner:

```typescript
// Before
import { describe, it, expect, vi } from 'vitest';

// After
import { describe, it, expect, mock } from 'bun:test';
```

**Benefits:**

- 10-100x faster test execution
- No separate test dependencies
- Native TypeScript support
- Built-in coverage reporting

### 2. File System APIs

Replace Node.js fs with Bun.file:

```typescript
// Before
import { promises as fs } from 'node:fs';
const content = await fs.readFile('./file.txt', 'utf-8');

// After
const content = await Bun.file('./file.txt').text();
```

**Benefits:**

- 3-10x faster file operations
- Simpler API
- Built-in streaming support

### 3. Build System

Replace TypeScript compilation with Bun's bundler:

```typescript
// Before (package.json)
"build": "tsc && rollup -c"

// After
"build": "bun build ./src/index.ts --outdir=./dist --target=bun"
```

**Benefits:**

- No separate build tool needed
- Faster builds
- Tree-shaking included
- Macros support

### 4. Shell Scripts

Use Bun Shell for automation:

```typescript
// Before
import { exec } from 'child_process';
import { promisify } from 'util';
const execAsync = promisify(exec);

// After
import { $ } from 'bun';
await $`git status`;
```

### 5. HTTP/Dev Server

If needed, use Bun.serve:

```typescript
Bun.serve({
  port: 3000,
  fetch(req) {
    return new Response('Dev server');
  },
});
```

### 6. Environment Variables

Bun auto-loads .env files:

```typescript
// No need for dotenv package
console.log(process.env.API_KEY); // Works automatically
```

### 7. Worker Threads

Use Bun's Worker API:

```typescript
// Instead of node:worker_threads
new Worker('./worker.ts');
```

### 8. Crypto

Use Web Crypto API (built into Bun):

```typescript
// Instead of node:crypto
const hash = await crypto.subtle.digest('SHA-256', data);
```

## Dependencies to Remove

After migration, we can remove:

- vitest
- @vitest/coverage-v8
- @types/node (maybe keep for ecosystem compatibility)
- Any build tools (if using Bun.build)

## Performance Gains

Expected improvements:

- Test execution: 10-100x faster
- File operations: 3-10x faster
- Package installation: Already achieved (3x faster)
- Build times: 2-5x faster
- Script execution: 2-3x faster

## Implementation Order

1. ✅ Package management (done)
2. 🔄 Test runner migration (in progress)
3. ⬜ File system APIs
4. ⬜ Build system
5. ⬜ Shell scripts
6. ⬜ Remove unnecessary dependencies

## Configuration Updates Needed

### bunfig.toml

```toml
[test]
coverage = true
coverageThreshold = { line = 80 }
watchMode = false

[build]
target = "bun"
minify = true
sourcemap = true
```

### tsconfig.json

```json
{
  "compilerOptions": {
    "types": ["bun-types"]
    // Remove @types/node
  }
}
```

## Breaking Changes

- Test syntax slightly different (vi → mock)
- Some Node.js specific APIs need replacement
- Build output might differ slightly

## Next Steps

1. Start with test migration (lowest risk)
2. Gradually replace file system calls
3. Update build pipeline
4. Remove unnecessary dependencies
