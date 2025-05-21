# @mixdown/core

Core library for the Mixdown rules compiler, containing the parser, linter, compiler, and destination plugins.

## Overview

Mixdown is a CommonMark-compliant rules compiler that lets you author a single source rules file in Markdown and compile it into destination-specific rules files for various AI tools and IDEs. Think of it as Terraform for AI rules: write once, compile for many destinations.

This package (`@mixdown/core`) implements the core functionality of Mixdown, including:

- **Parser**: Extracts frontmatter and raw Markdown body from source rules files
- **Linter**: Validates parsed documents against schema rules
- **Compiler**: Transforms parsed documents into compiled documents
- **Destination Plugins**: Write compiled documents to specific destinations (e.g., Cursor, Windsurf)

## Installation

```bash
npm install @mixdown/core
# or
pnpm add @mixdown/core
# or
yarn add @mixdown/core
```

## v0 Limitations

This is Mixdown v0, which has the following limitations:

- The parser only extracts YAML frontmatter and raw Markdown body
- The compiler is a pass-through implementation that doesn't process Mixdown notation markers (`{{...}}`)
- The linter only validates frontmatter against a basic schema
- The destination plugins are stub implementations that write raw content to files

Future versions will add support for:

- Stem parsing (`{{stem-name}}...{{/stem-name}}`) in v0.1
- Variable substitution (`{{$variable}}`) in v0.2
- Import processing (`{{> import}}`) in v0.2
- More advanced linting rules in v0.1
- Destination-specific formatting in v0.1

## Basic Usage

```typescript
import { runMixdownV0, ConsoleLogger } from '@mixdown/core';

async function main() {
  const logger = new ConsoleLogger();
  
  try {
    // Process a Mixdown source file
    await runMixdownV0('path/to/my-rules.mix.md', logger);
    logger.info('Mixdown processing completed!');
  } catch (error) {
    logger.error('Mixdown processing failed:', error);
  }
}

main();
```

## Creating Source Rules Files

A basic Mixdown source rules file (`*.mix.md`) looks like this:

```markdown
---
mixdown: v0
title: My Example Rule
description: A simple example rule
destinations:
  cursor:
    outputPath: ".cursor/rules/my-example.mdc"
  windsurf:
    outputPath: ".windsurf/rules/my-example.md"
    trigger: "always_on"
---

# This is the main content

This is a paragraph of the rule. In v0, this content will be passed through as-is.
```

## API Reference

### `runMixdownV0(sourceFilePath, logger, config)`

Main entry point for processing a Mixdown source file.

- `sourceFilePath`: Path to the source Mixdown file
- `logger`: Logger instance (optional, defaults to ConsoleLogger)
- `config`: Configuration options (optional)

### Core Modules

- `parse(content)`: Parse a string containing Markdown with YAML frontmatter
- `lint(parsedDoc, config)`: Lint a parsed document against schema rules
- `compile(parsedDoc, destinationId, projectConfig)`: Compile a parsed document for a specific destination

### Plugins

- `cursorPlugin`: Plugin for the Cursor destination
- `windsurfPlugin`: Plugin for the Windsurf destination
- `getPlugin(name)`: Get a destination plugin by name

## Contributing

See the [main repository](https://github.com/maybe-good/mixdown) for contribution guidelines.

## License

MIT