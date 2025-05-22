# @mixdown/core

Core library for Mixdown - a CommonMark-compliant rules compiler that lets you author a single source rules file in Markdown and compile it into destination-specific rules files.

## Installation

```bash
npm install @mixdown/core
# or
pnpm add @mixdown/core
# or
yarn add @mixdown/core
```

## Overview

Mixdown v0 provides the foundational architecture for processing Markdown-based rules files. This initial version focuses on:

- **Parser**: Extracts frontmatter and body content from Markdown files
- **Linter**: Validates frontmatter structure and content
- **Compiler**: Pass-through compilation (no marker processing in v0)
- **Destination Plugins**: Stub implementations for Cursor and Windsurf

## Quick Start

```typescript
import { runMixdownV0, ConsoleLogger } from '@mixdown/core';

async function main() {
  const logger = new ConsoleLogger();
  
  try {
    await runMixdownV0('./my-rules.mix.md', logger);
    logger.info('Mixdown processing completed!');
  } catch (error) {
    logger.error('Processing failed:', error);
  }
}

main();
```

## API Reference

### Core Functions

#### `runMixdownV0(sourceFilePath, logger?, projectConfig?)`

Main orchestration function that processes a Mixdown source file.

- `sourceFilePath`: Path to the `.mix.md` or `.md` file
- `logger`: Optional logger instance (defaults to ConsoleLogger)
- `projectConfig`: Optional project configuration object

### Parser

```typescript
import { parse } from '@mixdown/core';

const parsedDoc = await parse(markdownContent);
// Returns: ParsedDoc with frontmatter and AST
```

### Linter

```typescript
import { lint } from '@mixdown/core';

const lintResults = await lint(parsedDoc, {
  requireMixdownVersion: true,
  allowedDestinations: ['cursor', 'windsurf']
});
// Returns: Array of LintResult objects
```

### Compiler

```typescript
import { compile } from '@mixdown/core';

const compiledDoc = await compile(parsedDoc, 'cursor', projectConfig);
// Returns: CompiledDoc ready for destination plugin
```

### Destination Plugins

```typescript
import { destinations } from '@mixdown/core';

const cursorPlugin = destinations.get('cursor');
await cursorPlugin.write({
  compiled: compiledDoc,
  destPath: '.cursor/rules/my-rule.mdc',
  config: {},
  logger
});
```

## Source Rules Format

Create a `.mix.md` file with frontmatter and content:

```markdown
---
mixdown: v0
title: My Coding Standards
description: Rules for AI assistants
destinations:
  cursor:
    outputPath: ".cursor/rules/standards.mdc"
  windsurf:
    outputPath: ".windsurf/rules/standards.md"
---

# Coding Standards

These are my coding standards...
```

## V0 Limitations

This is the initial v0 release with intentional limitations:

- **No Marker Processing**: Mixdown notation markers (`{{...}}`) are passed through as-is
- **No Stem Support**: Content blocks are not parsed or processed
- **No Variable Substitution**: Variables (`{{$var}}`) are not replaced
- **No Import Support**: Import statements (`{{> file}}`) are not processed

These features are planned for future v0.x releases.

## Roadmap

- **v0.1**: Stem parsing and basic marker processing
- **v0.2**: Variable substitution and system variables
- **v0.3**: Import support and file inclusion
- **v1.0**: Full Mixdown notation support

## Contributing

See the main [Mixdown README](../../README.md) for contribution guidelines.

## License

MIT