# @rulesets/core

Core library for Rulesets - a CommonMark-compliant rules compiler that lets you author a single source rules file in Markdown and compile it into destination-specific rules files.

## Installation

```bash
npm install @rulesets/core
# or
pnpm add @rulesets/core
# or
yarn add @rulesets/core
```

## Overview

Rulesets v0 provides the foundational architecture for processing Markdown-based rules files. This initial version focuses on:

- **Parser**: Extracts frontmatter and body content from Markdown files
- **Linter**: Validates frontmatter structure and content
- **Compiler**: Pass-through compilation (no marker processing in v0)
- **Destination Plugins**: Stub implementations for Cursor and Windsurf

## Quick Start

```typescript
import { runRulesetsV0, ConsoleLogger } from '@rulesets/core';

async function main() {
  const logger = new ConsoleLogger();
  
  try {
    await runRulesetsV0('./my-rules.rules.md', logger);
    logger.info('Rulesets processing completed!');
  } catch (error) {
    logger.error('Processing failed:', error);
  }
}

main();
```

## API Reference

### Core Functions

#### `runRulesetsV0(sourceFilePath, logger?, projectConfig?)`

Main orchestration function that processes a Rulesets source file.

- `sourceFilePath`: Path to the `.rules.md` or `.md` file
- `logger`: Optional logger instance (defaults to ConsoleLogger)
- `projectConfig`: Optional project configuration object

### Parser

```typescript
import { parse } from '@rulesets/core';

const parsedDoc = await parse(markdownContent);
// Returns: ParsedDoc with frontmatter and AST
```

### Linter

```typescript
import { lint } from '@rulesets/core';

const lintResults = await lint(parsedDoc, {
  requireRulesetsVersion: true,
  allowedDestinations: ['cursor', 'windsurf']
});
// Returns: Array of LintResult objects
```

### Compiler

```typescript
import { compile } from '@rulesets/core';

const compiledDoc = compile(parsedDoc, 'cursor', projectConfig);
// Returns: CompiledDoc ready for destination plugin
```

### Destination Plugins

```typescript
import { destinations } from '@rulesets/core';

const cursorPlugin = destinations.get('cursor');
await cursorPlugin.write({
  compiled: compiledDoc,
  destPath: '.cursor/rules/my-rule.mdc',
  config: {},
  logger
});
```

## Source Rules Format

Create a `.rules.md` file with frontmatter and content:

```markdown
---
rulesets: { version: "0.1.0" }
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

- **No Marker Processing**: Rulesets notation markers (`{{...}}`) are passed through as-is
- **No Stem Support**: Content blocks are not parsed or processed
- **No Variable Substitution**: Variables (`{{$var}}`) are not replaced
- **No Import Support**: Import statements (`{{> file}}`) are not processed

These features are planned for future v0.x releases.

## Roadmap

- **v0.1**: Stem parsing and basic marker processing
- **v0.2**: Variable substitution and system variables
- **v0.3**: Import support and file inclusion
- **v1.0**: Full Rulesets notation support

## Contributing

See the main [Rulesets README](../../README.md) for contribution guidelines.

## License

MIT
