# Git Workflow

## Branch Management

### Create Feature Branch

```bash
git checkout -b feature/[feature-name]
# or
git switch -c feature/[feature-name]
```

### Create Fix Branch

```bash
git checkout -b fix/[issue-name]
```

### Create Chore Branch

```bash
git checkout -b chore/[task-name]
```

### Switch to Main Branch

```bash
git checkout main
```

### Update from Main

```bash
git fetch origin main && git rebase origin/main
```

## Committing Changes

### Stage All Changes

```bash
git add -A
```

### Stage Specific Files

```bash
git add [file-path]
```

### Commit with Conventional Message

```bash
git commit -m "feat: add new feature"
git commit -m "fix: resolve bug issue"
git commit -m "docs: update documentation"
git commit -m "chore: update dependencies"
git commit -m "test: add test coverage"
git commit -m "refactor: improve code structure"
git commit -m "style: format code"
git commit -m "perf: optimize performance"
```

### Amend Last Commit

```bash
git commit --amend
```

### Interactive Rebase

```bash
git rebase -i HEAD~[number-of-commits]
```

## Remote Operations

### Push New Branch

```bash
git push -u origin HEAD
```

### Force Push (After Rebase)

```bash
git push --force-with-lease
```

### Pull Latest Changes

```bash
git pull --rebase origin main
```

## Stashing

### Stash Changes

```bash
git stash
```

### Apply Stash

```bash
git stash pop
```

### List Stashes

```bash
git stash list
```

## Status and History

### Check Status

```bash
git status
```

### View Log

```bash
git log --oneline --graph --decorate
```

### Show Diff

```bash
git diff
git diff --staged
```
