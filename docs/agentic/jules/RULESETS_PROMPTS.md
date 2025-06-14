# Effective Prompts for Jules Working on Rulesets

## Core Implementation Tasks

### Parser Module

```
Implement frontmatter parsing in packages/core/src/parser/index.ts

Requirements:
- Extract YAML frontmatter and raw Markdown body
- Return ParsedDoc interface (defined in interfaces/compiled-doc.ts)
- Use js-yaml for frontmatter parsing
- Add TLDR comment: "Simple frontmatter parser (mixd-v0)"
- Add TODO comment: "TODO (mixd-v0.1): Add block parsing support"
- Include comprehensive unit tests following existing patterns
- Ensure pnpm turbo test passes
```

### Compiler Module

```
Implement pass-through compiler in packages/core/src/compiler/index.ts

Requirements:
- Transform ParsedDoc to CompiledDoc without processing markers
- Raw body content goes to output.content unchanged
- Mark as: "Pass-through compiler implementation (mixd-v0)"
- Add TODO: "TODO (mixd-v0.1): Process Ruleset syntax markers"
- Follow interface definitions in interfaces/compiled-doc.ts
- Add unit tests verifying pass-through behavior
```

### Linter Module

```
Implement basic frontmatter validation in packages/core/src/linter/index.ts

Requirements:
- Validate ParsedDoc frontmatter against basic schema
- Check for required 'ruleset' key in frontmatter
- Return LintResult array with any validation errors
- Comment as: "Basic frontmatter schema validation (mixd-v0)"
- Add TODO: "TODO (mixd-v0.1): Add content body linting"
- Include tests for valid/invalid frontmatter scenarios
```

### Destination Plugins

```
Create stub destination plugins in packages/core/src/destinations/

Requirements:
- Implement DestinationPlugin interface for cursor and windsurf
- cursor-plugin.ts and windsurf-plugin.ts files
- write() method should log compiled content and destPath
- Comment as: "Stub plugin implementation (mixd-v0)"
- Export plugins from index.ts
- Add basic unit tests ensuring interface compliance
```

## Advanced Tasks

### Integration Testing

```
Add end-to-end integration tests in packages/core/tests/integration/

Requirements:
- Test complete parse -> lint -> compile -> write pipeline
- Use sample source rules file for testing
- Verify output files are created with correct content
- Test both success and error scenarios
- Follow existing test patterns and naming
- All tests must pass with pnpm turbo test
```

### TypeScript Configuration

```
Enhance TypeScript configuration for strict type checking

Requirements:
- Update tsconfig.json with strictest possible settings
- Fix any type errors that arise
- Ensure all interfaces are properly typed
- Add JSDoc comments with version markers
- Maintain compatibility with existing code
```

## Code Quality Tasks

### Documentation

```
Add comprehensive JSDoc documentation to all public interfaces

Requirements:
- Document all parameters and return types
- Include usage examples in JSDoc
- Add version markers in comments
- Reference related interfaces and types
- Follow existing documentation patterns
```

### Error Handling

```
Implement robust error handling throughout the codebase

Requirements:
- Add try/catch blocks for file operations
- Create custom error types for different failure modes
- Include error context and debugging information
- Mark error handling code with (mixd-sec) where appropriate
- Add tests for error scenarios
```

## Context Always Include

```
Context for all tasks:
- This is Rulesets v0 implementation in TypeScript monorepo
- Use pnpm/Turborepo for package management and building
- Follow grepable marker system from docs/project/GREPABLE.md
- Use terminology from docs/project/LANGUAGE.md consistently
- Reference implementation plan in docs/project/plans/PLAN-rulesets-v0.md
- All code must include TLDR comments with (mixd-v0) markers
- Add TODO (mixd-v0.1) markers for future enhancements
- Follow SOLID principles and include descriptive comments
- Run pnpm turbo test && pnpm turbo lint before completion
```
