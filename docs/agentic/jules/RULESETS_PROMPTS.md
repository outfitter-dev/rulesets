# Effective Prompts for Jules Working on Rulesets

## Core Implementation Tasks

### Parser Module

```text
Implement frontmatter parsing in packages/core/src/parser/index.ts

Requirements:
- Extract YAML frontmatter and raw Markdown body
- Return ParsedDoc interface (defined in interfaces/compiled-doc.ts)
- Use js-yaml for frontmatter parsing
- Add TLDR comment: "Simple frontmatter parser"
- Add TODO comment: "TODO: Add block parsing support"
- Include comprehensive unit tests following existing patterns
- Ensure bun turbo test passes
```

### Compiler Module

```text
Implement pass-through compiler in packages/core/src/compiler/index.ts

Requirements:
- Transform ParsedDoc to CompiledDoc without processing markers
- Raw body content goes to output.content unchanged
- Mark as: "Pass-through compiler implementation"
- Add TODO: "TODO: Process Ruleset syntax markers"
- Follow interface definitions in interfaces/compiled-doc.ts
- Add unit tests verifying pass-through behavior
```

### Linter Module

```text
Implement basic frontmatter validation in packages/core/src/linter/index.ts

Requirements:
- Validate ParsedDoc frontmatter against basic schema
- Check for required 'ruleset' key in frontmatter
- Return LintResult array with any validation errors
- Comment as: "Basic frontmatter schema validation"
- Add TODO: "TODO: Add content body linting"
- Include tests for valid/invalid frontmatter scenarios
```

### Destination Plugins

```text
Create stub destination plugins in packages/core/src/destinations/

Requirements:
- Implement DestinationPlugin interface for cursor and windsurf
- cursor-plugin.ts and windsurf-plugin.ts files
- write() method should log compiled content and destPath
- Comment as: "Stub plugin implementation"
- Export plugins from index.ts
- Add basic unit tests ensuring interface compliance
```

## Advanced Tasks

### Integration Testing

```text
Add end-to-end integration tests in packages/core/tests/integration/

Requirements:
- Test complete parse -> lint -> compile -> write pipeline
- Use sample source rules file for testing
- Verify output files are created with correct content
- Test both success and error scenarios
- Follow existing test patterns and naming
- All tests must pass with bun turbo test
```

### TypeScript Configuration

```text
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

```text
Add comprehensive JSDoc documentation to all public interfaces

Requirements:
- Document all parameters and return types
- Include usage examples in JSDoc
- Add clear descriptive comments
- Reference related interfaces and types
- Follow existing documentation patterns
```

### Error Handling

```text
Implement robust error handling throughout the codebase

Requirements:
- Add try/catch blocks for file operations
- Create custom error types for different failure modes
- Include error context and debugging information
- Document security-sensitive error handling clearly
- Add tests for error scenarios
```

## Context Always Include

```text
Context for all tasks:
- This is Rulesets v0 implementation in TypeScript monorepo
- Use bun/Turborepo for package management and building
- Use terminology from docs/project/LANGUAGE.md consistently
- Reference implementation plan in docs/project/plans/PLAN-rulesets-v0.md
- All code must include clear TLDR comments
- Add TODO comments for future enhancements
- Follow SOLID principles and include descriptive comments
- Run bun turbo test && bun turbo lint before completion
```
