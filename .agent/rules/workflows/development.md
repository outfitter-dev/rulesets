# Development Workflow

## Start Development Mode

```bash
bunx turbo run dev
```

## Install Dependencies

```bash
bun install
```

## Update Dependencies

```bash
bun update
```

## Update Specific Package

```bash
bun update [package-name]
```

## Check Outdated Packages

```bash
bun outdated
```

## Link Local Package

```bash
# In the source package
cd packages/[local-package] && bun link

# In the consumer package
cd packages/[consumer] && bun link [local-package]
```

## Run Development Server

```bash
bun run dev
```

## Debug Mode

```bash
# macOS/Linux
DEBUG=* bun run dev

# Windows (PowerShell)
$env:DEBUG="*"; bun run dev

# Cross-platform
bunx cross-env DEBUG=* bun run dev
```

## Development with Hot Reload

```bash
bun --hot run dev
```

## Clean Development Environment

```bash
bunx turbo clean && bun install
```

## Develop a Single Workspace

```bash
bunx turbo run dev --filter=@scope/[package-name]
```
