# Test Strategy for @rulesets/core

## Why Vitest Instead of Bun Test

The core package retains **Vitest** for testing instead of migrating to Bun test due to:

### Complex Testing Requirements

- **Extensive mocking**: E2E tests mock the entire `fs` module (`vi.mock('fs')`)
- **Spy functionality**: Uses `vi.spyOn()` for logger method testing
- **Setup/teardown complexity**: `beforeEach`, `afterEach` with mock state management
- **Module mocking**: Tests require complex module replacement patterns

### Test Complexity Examples

- `tests/integration/e2e.spec.ts`: 8 tests with full filesystem mocking
- Multiple spy instances per test for different logger methods
- Mock restoration and clearing between tests
- Complex async file I/O simulation

### Migration Criteria

Per the Phase 4 migration policy:

- ✅ **Simple tests** (< 10 tests, no mocking) → Migrate to Bun test
- ❌ **Complex tests** (extensive mocking, spies) → Keep Vitest

The core package falls into the complex category and benefits from Vitest's mature mocking ecosystem.

## Test Command

```bash
# Run tests
bun run test

# Watch mode  
bun run test:watch
```

Tests use `vitest run` and `vitest` respectively, as configured in package.json.
