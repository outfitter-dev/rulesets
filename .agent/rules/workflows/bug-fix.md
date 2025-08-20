# Bug Fix Workflow

## Investigation Phase

### 1. Create Fix Branch
```bash
git checkout main
git pull origin main
git checkout -b fix/[issue-description]
```

### 2. Reproduce Issue
```bash
# Write failing test that reproduces the bug
touch packages/[package]/src/__tests__/[bug].test.ts

# Run test to confirm failure
bun test packages/[package]/src/__tests__/[bug].test.ts
```

### 3. Debug the Issue
```bash
# Enable debug output
DEBUG=* bun test packages/[package]/src/__tests__/[bug].test.ts

# Use inspector if needed
bun --inspect-brk test packages/[package]/src/__tests__/[bug].test.ts
```

## Fix Implementation

### 4. Implement Fix
```bash
# Edit the problematic file
# Run tests in watch mode while fixing
bun test --watch packages/[package]/src/__tests__/[bug].test.ts
```

### 5. Verify Fix
```bash
# Run specific test
bun test packages/[package]/src/__tests__/[bug].test.ts

# Run related tests
bun test packages/[package]
```

### 6. Check for Regressions
```bash
# Run full test suite
turbo test

# Check types
bun run typecheck

# Run build
turbo build
```

## Validation Phase

### 7. Test Edge Cases
```bash
# Add additional test cases
# Run comprehensive tests
bun test --coverage
```

### 8. Run CI Checks
```bash
bun run ci:local
```

## Documentation Phase

### 9. Update Tests
```bash
# Ensure test clearly documents the bug scenario
# Add comments explaining the fix
```

### 10. Update Changelog
```bash
# Add entry to CHANGELOG.md if significant
echo "### Bug Fixes
- Fix [description] ([#issue-number])" >> CHANGELOG.md
```

## Commit Phase

### 11. Stage Changes
```bash
git add -A
git status
```

### 12. Commit Fix
```bash
git commit -m "fix: [brief description]

Resolves #[issue-number]

The issue was caused by [root cause].
Fixed by [solution description]."
```

### 13. Push Branch
```bash
git push -u origin fix/[issue-description]
```

## Review Phase

### 14. Create Pull Request
```bash
gh pr create \
  --title "fix: [issue description]" \
  --body "## Summary
  
  Fixes #[issue-number]
  
  ## Root Cause
  [Explain what caused the bug]
  
  ## Solution
  [Explain how the fix works]
  
  ## Testing
  - [ ] Added test to reproduce issue
  - [ ] All tests pass
  - [ ] No regressions introduced"
```

### 15. Link to Issue
```bash
gh issue develop [issue-number] --branch fix/[issue-description]
```

## Merge Phase

### 16. Address Review
```bash
# Make any requested changes
git add -A
git commit -m "fix: address review feedback"
git push
```

### 17. Merge PR
```bash
gh pr merge [pr-number] --squash
```

### 18. Close Issue
```bash
gh issue close [issue-number] --comment "Fixed in #[pr-number]"
```

### 19. Clean Up
```bash
git checkout main
git pull origin main
git branch -d fix/[issue-description]
```