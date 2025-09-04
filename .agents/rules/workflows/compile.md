# Compile Rules Workflow

## Compile for All Providers

```bash
bun run compile
```

## Compile for Specific Provider

```bash
bun run compile --provider cursor
bun run compile --provider claude-code
bun run compile --provider windsurf
bun run compile --provider roo-code
bun run compile --provider cline
bun run compile --provider codex
```

## Watch Mode Compilation

```bash
bun run compile --watch
```

## Compile with Validation

```bash
bun run compile --validate
```

## Compile Specific Source File

```bash
bun run compile --source [path/to/rule.md]
```

## Compile with Debug Output

```bash
# macOS/Linux
DEBUG=ruleset:* bun run compile

# Windows (PowerShell)
$env:DEBUG="ruleset:*"; bun run compile

# Alternatively (cross-platform)
bunx cross-env DEBUG=ruleset:* bun run compile
```

## Dry Run (Preview Output)

```bash
bun run compile --dry-run
```

## Force Recompile (Ignore Cache)

```bash
bun run compile --force
```

## Compile with Custom Config

```bash
bun run compile --config [path/to/config.json]
```

## Profile Compilation Performance

```bash
bun run compile --profile
```
