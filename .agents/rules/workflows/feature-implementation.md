# Feature Implementation Workflow

## Planning Phase

### 1. Create Feature Branch

```bash
git checkout main
git pull origin main
git checkout -b feature/[feature-name]
```

### 2. Setup Development Environment

```bash
bun install
turbo run build
turbo run test
```

## Implementation Phase

### 3. Write Tests First (TDD)

```bash
# Create test file
bunx shx touch packages/[package]/src/__tests__/[feature].test.ts

# Run tests in watch mode
bun test --watch packages/[package]/src/__tests__/[feature].test.ts
```

### 4. Implement Feature

```bash
# Create implementation file
bunx shx touch packages/[package]/src/[feature].ts

# Run development mode
turbo run dev
```

### 5. Iterate Development

```bash
# Watch tests while developing
bun test --watch

# Check types continuously
bun run typecheck --watch

# Format on save
bun run format --watch
```

## Validation Phase

### 6. Run Full Test Suite

```bash
turbo run test
```

### 7. Check Code Quality

```bash
bun run lint --fix
bun run format
bun run typecheck
```

### 8. Verify Build

```bash
turbo run build
ls -la packages/*/dist/
```

### 9. Test Integration

```bash
# Test with example
bun run examples:[example-name]

# Test compilation
bun run compile --validate
```

## Documentation Phase

### 10. Update Documentation

```bash
# Update API docs
bun run docs:api

# Update README if needed
# Update CHANGELOG if needed
# Record a changeset (select 'minor' for new features)
bunx changeset
```

### 11. Add Examples

```bash
bunx shx mkdir -p examples/[feature-name]
printf "# Feature Example\n" > examples/[feature-name]/README.md
```

## Commit Phase

### 12. Stage Changes

```bash
git add -A
git status
```

### 13. Commit with Message

```bash
git commit \
  -m "feat: implement [feature-name]" \
  -m "- Add [component/function]
- Include tests
- Update documentation"
```

### 14. Push Feature Branch

```bash
git push -u origin feature/[feature-name]
```

## Review Phase

### 15. Create Pull Request

```bash
gh pr create \
  --title "feat: [feature-name]" \
  --body "## Summary
  
  Implements [feature description]
  
  ## Changes
  - Added [component/function]
  - Included comprehensive tests
  - Updated documentation
  
  ## Testing
  - [ ] All tests pass
  - [ ] TypeScript checks pass
  - [ ] Linting passes
  - [ ] Build succeeds"
```

### 16. Address Review Feedback

```bash
# Make requested changes
# ...

# Commit fixes
git add -A
git commit -m "fix: address review feedback"
git push
```

### 17. Update PR

```bash
# Notify reviewers
gh pr comment [pr-number] --body "@coderabbitai please review the latest changes"
```

## Merge Phase

### 18. Final Checks

```bash
bun run ci:local
```

### 19. Merge PR

```bash
gh pr merge [pr-number] --squash --delete-branch
```

### 20. Clean Up

```bash
git checkout main
git pull origin main
git branch -d feature/[feature-name]
```
