# Documentation Workflow

## Generate Documentation

### Generate API Docs

```bash
bun run docs:api
```

### Generate TypeDoc

```bash
bun run docs:typedoc
```

### Generate Changelog

```bash
bun run changelog
```

### Generate Coverage Report

```bash
bun test --coverage
# macOS:  open coverage/index.html
# Linux:  xdg-open coverage/index.html
# Windows (PowerShell): start coverage/index.html
# Or add a script:
# bunx opener coverage/index.html
```

## Preview Documentation

### Start Documentation Server

```bash
bun run docs:preview
```

### Build Documentation Site

```bash
bun run docs:build
```

### Serve Built Documentation

```bash
bun run docs:serve
```

## Update Documentation

### Update README

```bash
bun run docs:readme
```

### Update API Reference

```bash
bun run docs:api:update
```

### Update Examples

```bash
bun run docs:examples
```

### Update Version References

```bash
bun run docs:update-version
```

## Documentation Validation

### Check Links

```bash
bun run docs:check-links
```

### Validate Examples

```bash
bun run docs:validate-examples
```

### Lint Markdown

```bash
bun run lint:md
```

### Check Spelling

```bash
bun run spellcheck
```

## Documentation Structure

### Create New Guide

```bash
bunx shx touch docs/guides/[guide-name].md
```

### Create API Doc

```bash
bunx shx touch docs/api/[api-name].md
```

### Create Example

```bash
bunx shx mkdir -p examples/[example-name]
bunx shx touch examples/[example-name]/README.md
```
