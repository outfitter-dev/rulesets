# Lint & Format Workflow

## Run Linter

```bash
bun run lint
```

## Run Linter with Auto-fix

```bash
bun run lint --fix
```

## Format Code

```bash
bun run format
```

## Format Specific Files

```bash
bun run format [file-pattern]
```

## Check Formatting (No Changes)

```bash
bun run format --check
```

## Type Checking

```bash
bun run typecheck
```

## Type Check Specific Package

```bash
cd packages/[package-name] && bun run typecheck
```

## Full Code Quality Check

```bash
bun run lint && bun run format && bun run typecheck
```

## Pre-commit Validation

```bash
bun run pre-commit
```
