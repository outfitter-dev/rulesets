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

Tip: In a monorepo, prefer running type checks via Turbo at the root to ensure all packages are validated:

```bash
bunx turbo run typecheck
```

## Type Check Specific Package

```bash
cd packages/[package-name] && bun run typecheck
```

## Full Code Quality Check

```bash
bun run lint && bun run format && bun run typecheck
```

## Lint Markdown

```bash
bun run lint:md
```

## Pre-commit Validation

```bash
bun run pre-commit
```
