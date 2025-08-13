# Ultracite Compliance Roadmap

## Current Status

As of 2025-01-13, the Rulesets project has **970 Ultracite violations** (down from 1011).

### Progress Made

- ✅ Replaced console usage with pino logger in production code
- ✅ Fixed parameter properties in error classes
- ✅ Moved regex patterns to top-level constants
- ✅ Removed `as any` type casts where possible
- ✅ Fixed control character issues in regex patterns
- ✅ Added proper biome-ignore comments for legitimate exceptions

## Remaining Violations by Category

### 1. Public Accessibility Modifiers (~400 violations)

**Rule**: `lint/style/useConsistentMemberAccessibility`

**Issue**: Ultracite forbids explicit `public` modifiers on class members.

**Files Affected**:
- `packages/core/src/logger.ts`
- `packages/core/src/interfaces/logger.ts`
- `packages/types/src/logger.ts`
- All provider classes in `packages/core/src/providers/`
- All test files with class definitions

**Fix Required**:
```typescript
// Before
public method(): void { }

// After
method(): void { }
```

### 2. File Naming Convention (~50 violations)

**Rule**: `lint/style/useFilenamingConvention`

**Issue**: Files must use kebab-case naming.

**Files to Rename**:
- `GitignoreManager.ts` → `gitignore-manager.ts`
- `ConfigLoader.ts` → `config-loader.ts`
- `ConfigValidator.ts` → `config-validator.ts`
- All test files: `*.test.ts` → `*.spec.ts` (if required by config)
- All React/component files if using PascalCase

### 3. Console Usage in Test Files (~200 violations)

**Rule**: `lint/suspicious/noConsole`

**Issue**: Console methods are not allowed, even in tests.

**Files Affected**:
- All files in `__tests__/` directories
- Example files in `packages/types/src/examples.ts`
- Integration tests

**Fix Options**:
1. Use a test-specific logger
2. Add biome-ignore comments for each console usage in tests
3. Create a test utility that wraps console methods

### 4. Unused Variables (~100 violations)

**Rule**: `lint/correctness/noUnusedVariables`

**Common Patterns**:
- Unused imports in test files
- Destructured variables where only some are used
- Function parameters in interface implementations

**Fix Required**:
- Remove unused imports
- Prefix intentionally unused vars with `_`
- Use `_` for unused destructured values

### 5. Template Literal Usage (~50 violations)

**Rule**: `lint/style/useTemplate`

**Issue**: String concatenation should use template literals.

**Fix Required**:
```typescript
// Before
const message = "Error: " + error.message;

// After
const message = `Error: ${error.message}`;
```

### 6. Formatting Issues (~70 violations)

**Rules**: Various formatting rules

**Common Issues**:
- Line length exceeding limits
- Incorrect indentation
- Missing or extra blank lines
- Trailing commas

**Fix**: Run `bun run format` with proper configuration

### 7. Type Assertions (~30 violations)

**Rule**: `lint/style/useConsistentTypeAssertions`

**Issue**: Prefer `as` over angle brackets, avoid unnecessary assertions.

**Fix Required**:
```typescript
// Before
<Type>value
value as any

// After
value as Type
// Or refactor to avoid assertion
```

### 8. Cognitive Complexity (~20 violations)

**Rule**: `lint/complexity/noExcessiveCognitiveComplexity`

**Files Affected**:
- `packages/core/src/compiler/index.ts`
- Complex provider implementations
- Large test suites

**Fix**: Break down complex functions into smaller, focused functions

## Implementation Plan

### Phase 1: Automated Fixes (1-2 hours)
```bash
# Fix formatting issues
bun run format

# Fix unused imports
npx @biomejs/biome check --apply-unsafe

# Fix template literals
npx @biomejs/biome check --apply --only=lint/style/useTemplate
```

### Phase 2: Semi-Automated Fixes (2-3 hours)

1. **Remove public modifiers**:
```bash
# Find and replace regex
find . -name "*.ts" -exec sed -i '' 's/public //' {} \;
```

2. **Rename files**:
```bash
# Script to rename to kebab-case
for file in $(find . -name "*[A-Z]*.ts"); do
  new_name=$(echo $file | sed 's/\([A-Z]\)/-\L\1/g' | sed 's/^-//')
  git mv $file $new_name
done
```

### Phase 3: Manual Fixes (4-6 hours)

1. **Console in Tests**:
   - Create test logger utility
   - Replace console calls with test logger
   - Or add biome-ignore comments with justification

2. **Cognitive Complexity**:
   - Refactor complex functions
   - Extract helper functions
   - Simplify conditional logic

3. **Type Safety**:
   - Remove unnecessary type assertions
   - Add proper type guards
   - Fix union type handling

## Configuration Updates Needed

### biome.json Updates

```json
{
  "linter": {
    "rules": {
      "style": {
        "useConsistentMemberAccessibility": {
          "level": "error",
          "options": {
            "accessibility": "noPublic"
          }
        },
        "useFilenamingConvention": {
          "level": "error",
          "options": {
            "requireAscii": true,
            "filenameCases": ["kebab-case"]
          }
        }
      },
      "suspicious": {
        "noConsole": {
          "level": "error",
          "options": {
            "allow": []
          }
        }
      }
    }
  },
  "overrides": [
    {
      "include": ["**/*.test.ts", "**/*.spec.ts"],
      "linter": {
        "rules": {
          "suspicious": {
            "noConsole": "off"
          }
        }
      }
    }
  ]
}
```

## Testing Strategy

After each phase:

1. Run linting: `bun run lint`
2. Run tests: `bun test`
3. Run type checking: `bun run typecheck`
4. Verify build: `bun run build`

## Exceptions and Overrides

Some violations may be legitimate and require exceptions:

1. **Deprecation warnings**: Must use console.warn with biome-ignore
2. **Example files**: May need console for demonstration
3. **Complex algorithms**: Some complexity may be unavoidable
4. **Third-party interfaces**: May require specific patterns

## Estimated Timeline

- **Phase 1**: 1-2 hours (automated)
- **Phase 2**: 2-3 hours (semi-automated)
- **Phase 3**: 4-6 hours (manual)
- **Testing & Verification**: 2-3 hours

**Total**: 9-14 hours for full compliance

## Benefits of Full Compliance

1. **Consistency**: Uniform code style across the entire codebase
2. **Maintainability**: Easier to read and understand code
3. **Performance**: Optimized patterns (e.g., top-level regex)
4. **Type Safety**: Stronger type checking and fewer runtime errors
5. **Developer Experience**: Clear conventions for new contributors

## Next Steps

1. Review and approve this plan
2. Create a dedicated branch for compliance work
3. Execute phases in order
4. Run comprehensive tests after each phase
5. Document any legitimate exceptions
6. Update contribution guidelines with Ultracite requirements

## Notes

- Some test files may legitimately need console output
- Performance test timing assertions may need adjustment
- Consider gradual adoption for existing code vs. strict enforcement for new code
- May want to configure different rules for different file types (tests, examples, etc.)