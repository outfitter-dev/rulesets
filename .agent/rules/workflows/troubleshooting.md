# Troubleshooting Workflow

## Clear Caches

### Clear Turbo Cache

```bash
turbo clean
```

### Clear All Caches

```bash
turbo clean && bunx rimraf node_modules/.cache
```

### Clear Bun Cache

```bash
bun pm cache rm
```

## Dependency Issues

### Reinstall Dependencies

```bash
bunx rimraf node_modules bun.lockb && bun install
```

### Fix Lockfile

```bash
bun install --frozen-lockfile
```

### Update Lockfile

```bash
bun install --force
```

### Check for Duplicates

```bash
bun pm ls --duplicates
```

## Build Issues

### Clean and Rebuild

```bash
turbo clean && turbo build --force
```

### Debug Build Failure

```bash
DEBUG=* turbo build --verbose
```

### Check TypeScript Errors

```bash
bun run typecheck --listFiles
```

### Verify Package Exports

```bash
bun run verify:exports
```

## Test Issues

### Clear Test Cache

```bash
bunx rimraf coverage .test-cache
```

### Run a Single Test File

```bash
bun test path/to/test-file.test.ts
```

### Debug Failing Test

```bash
bun test --bail [test-file]
```

### Update Snapshots

```bash
bun test --updateSnapshot
```

## Git Issues

### Reset to Clean State

```bash
git reset --hard HEAD && git clean -fd
```

### Fix Line Endings

```bash
git config core.autocrlf input
git rm --cached -r .
git reset --hard
```

### Recover Lost Commits

```bash
git reflog
git cherry-pick [commit-hash]
```

### Fix Merge Conflicts

```bash
git status
# Edit conflicted files
git add [resolved-files]
git commit
```

## Runtime Issues

### Debug Compilation

```bash
# macOS/Linux
DEBUG=ruleset:* bun run compile --verbose

# Windows (PowerShell)
$env:DEBUG="ruleset:*"; bun run compile --verbose

# Cross-platform
bunx cross-env DEBUG=ruleset:* bun run compile --verbose
```

### Check Memory Usage

```bash
NODE_OPTIONS="--max-old-space-size=4096" bun run compile
```

### Profile Performance

```bash
bun run compile --profile > profile.log
```

### Trace Errors

```bash
NODE_OPTIONS="--trace-warnings" bun run dev
```

## Environment Issues

### Verify Node Version

```bash
node --version
```

### Check Bun Version

```bash
bun --version
```

### Validate Environment Variables

```bash
bun run env:validate
```

### Fix Permissions

```bash
chmod +x scripts/*.sh
```
