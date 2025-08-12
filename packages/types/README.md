# @rulesets/types

Comprehensive branded types system for Rulesets that provides type safety, runtime validation, and security checks.

## Overview

This package provides a production-ready type system that adopts Grapple's patterns for:

- **Branded Types**: Nominal typing for core domain values
- **Runtime Validation**: Security-first validation with comprehensive checks
- **Custom Error Classes**: Structured error reporting with context
- **Type Guards**: Safe type checking and conversion
- **Concrete Types**: Discoverable types over complex generics

## Key Features

### 🔐 Security-First Design

- Path traversal prevention
- Content security scanning
- Input sanitization
- Size limit enforcement
- Malicious pattern detection

### 🏷️ Branded Types

All core domain values are branded to prevent accidental mixing:

```typescript
import { createDestinationId, createBlockName, DestinationId, BlockName } from '@rulesets/types';

// ✅ Type-safe creation
const destination: DestinationId = createDestinationId('cursor');
const block: BlockName = createBlockName('user-instructions');

// ❌ Compile-time error - can't mix types
function processBlock(name: BlockName) { /* ... */ }
processBlock(destination); // Error: Argument of type 'DestinationId' is not assignable to parameter of type 'BlockName'
```

### 🛡️ Runtime Validation

Comprehensive validation with detailed error reporting:

```typescript
import { createSourcePath, SecurityValidationError, PathTraversalError } from '@rulesets/types';

try {
  const path = createSourcePath('../../../etc/passwd');
} catch (error) {
  if (error instanceof PathTraversalError) {
    console.log('Path traversal detected:', error.message);
    console.log('Error details:', error.toJSON());
  }
}
```

### 📋 Type Guards

Safe type checking for unknown values:

```typescript
import { isDestinationId, isBlockName } from '@rulesets/types';

function processUserInput(input: unknown) {
  if (isDestinationId(input)) {
    // TypeScript knows input is DestinationId here
    console.log('Processing destination:', input);
  }
  
  if (isBlockName(input)) {
    // TypeScript knows input is BlockName here
    console.log('Processing block:', input);
  }
}
```

## Core Types

### Domain Types

| Type | Purpose | Validation |
|------|---------|------------|
| `DestinationId` | AI tool identifiers | Enum validation against known destinations |
| `SourcePath` | Source file paths | Extension check, path traversal prevention |
| `DestPath` | Output file paths | Path traversal prevention, permission checks |
| `BlockName` | Block identifiers | Kebab-case validation, reserved word checking |
| `VariableName` | Variable identifiers | JavaScript naming rules, reserved word checking |
| `PropertyName` | Property identifiers | Kebab-case with optional values |
| `MarkerContent` | Marker content | Security scanning, size limits |
| `RawContent` | Source content | Size limits, malicious pattern detection |
| `CompiledContent` | Compiled output | Size limits, security validation |
| `Version` | Semantic versions | Semantic versioning format validation |

### Context Types

- `CompilationContext` - Complete compilation state and configuration
- `WriteContext` - Context for destination plugin write operations
- `ParserContext` - Parser execution state
- `CompilerContext` - Compilation processing state
- `PluginContext` - Plugin execution environment

### Configuration Types

- `FrontmatterData` - Typed frontmatter structure
- `GlobalConfig` - System-wide configuration
- `ProjectConfig` - Project-specific settings
- `DestinationConfig` - Destination-specific configuration
- `RuntimeConfig` - Runtime compilation options

## Usage Examples

### Basic Usage

```typescript
import {
  createDestinationId,
  createSourcePath,
  createBlockName,
  createRawContent,
  type CompilationContext
} from '@rulesets/types';

// Create validated types
const destination = createDestinationId('cursor');
const sourcePath = createSourcePath('./rules/coding-standards.rule.md');
const blockName = createBlockName('user-instructions');
const content = createRawContent(`
# Coding Standards

{{user-instructions}}
Follow TypeScript best practices and write comprehensive tests.
{{/user-instructions}}
`);
```

### Validation with Error Handling

```typescript
import {
  createBlockName,
  InvalidBlockNameError,
  RulesetValidationError
} from '@rulesets/types';

function validateBlockName(input: string) {
  try {
    return createBlockName(input);
  } catch (error) {
    if (error instanceof InvalidBlockNameError) {
      console.error('Invalid block name:', error.message);
      console.error('Reason:', error.context?.reason);
    } else if (error instanceof RulesetValidationError) {
      console.error('Validation error:', error.toJSON());
    }
    throw error;
  }
}
```

### Using Validators

```typescript
import { validators, type ValidationResult } from '@rulesets/types';

// Use registry for validation
const result = validators.validate('destinationId', userInput);
if (result.valid) {
  console.log('Valid destination:', result.data);
} else {
  console.error('Validation errors:', result.errors);
}

// Direct validator usage
import { DestinationIdValidator } from '@rulesets/types';

const validator = new DestinationIdValidator();
const isValid = validator.isValid(userInput);
```

### Marker Validation

```typescript
import { MarkerValidationUtil, createMarkerContent } from '@rulesets/types';

const marker = createMarkerContent('{{user-instructions}}');
const validation = MarkerValidationUtil.validateMarkerSyntax(marker);

if (!validation.valid) {
  console.error('Marker errors:', validation.errors);
  console.log('Suggestions:', validation.suggestions);
}
```

### Configuration and Context

```typescript
import {
  type CompilationContext,
  type WriteContext,
  createDestinationId,
  createSourcePath,
  createVersion
} from '@rulesets/types';

const context: CompilationContext = {
  source: {
    path: createSourcePath('./src/rules.rule.md'),
    content: createRawContent('# Rules...'),
    frontmatter: {
      ruleset: { version: createVersion('0.1.0') }
    }
  },
  destination: {
    id: createDestinationId('cursor'),
    outputPath: createDestPath('./.cursor/rules/rules.mdc'),
    config: {
      enabled: true,
      output: { createDirectory: true },
      plugin: { options: {} },
      transform: { enabled: true, rules: [] },
      validation: { enabled: true }
    }
  },
  // ... rest of context
};
```

## Security Features

### Path Validation

Prevents directory traversal attacks:

```typescript
// ❌ These will throw PathTraversalError
createSourcePath('../../../etc/passwd');
createDestPath('C:\\Windows\\System32\\config');
createSourcePath('/var/log/private.log');
```

### Content Scanning

Detects malicious content patterns:

```typescript
// ❌ These will throw SecurityValidationError
createRawContent('<script>alert("xss")</script>');
createRawContent('javascript:void(0)');
createRawContent('Content with \0 null byte');
```

### Size Limits

Enforces reasonable size limits:

```typescript
// Default limits (configurable)
const LIMITS = {
  MAX_FILE_SIZE: 10 * 1024 * 1024,      // 10MB
  MAX_CONTENT_SIZE: 5 * 1024 * 1024,     // 5MB
  MAX_PATH_LENGTH: 4096,                 // 4KB
  MAX_BLOCK_NAME_LENGTH: 128,            // 128 chars
  MAX_VARIABLE_NAME_LENGTH: 64,          // 64 chars
};
```

## Error Handling

### Error Hierarchy

```
RulesetValidationError (base)
├── SecurityValidationError
│   └── PathTraversalError
├── InvalidDestinationError  
├── InvalidBlockNameError
├── InvalidVariableNameError
└── ContentSizeError
```

### Structured Error Information

All errors provide structured information:

```typescript
try {
  createBlockName('Invalid Name!');
} catch (error) {
  if (error instanceof RulesetValidationError) {
    console.log(error.toJSON());
    // {
    //   name: 'InvalidBlockNameError',
    //   code: 'INVALID_FORMAT', 
    //   category: 'syntax',
    //   message: 'Block name must be in kebab-case format...',
    //   context: { blockName: 'Invalid Name!', reason: '...' }
    // }
  }
}
```

## Integration

### With Existing Code

The branded types integrate seamlessly with existing Rulesets code:

```typescript
// Existing interfaces still work
import { DestinationPlugin, CompiledDoc } from '@rulesets/types';

// New branded types provide additional safety
import { DestinationId, createDestinationId } from '@rulesets/types';

class MyPlugin implements DestinationPlugin {
  get name(): string {
    return 'my-plugin';
  }
  
  async write(ctx: { destPath: string; /* ... */ }) {
    // Convert to branded type for validation
    const safePath = createDestPath(ctx.destPath, process.cwd());
    // Now safePath is validated and secure
  }
}
```

### With Provider System

```typescript
import { type DestinationId, isDestinationId } from '@rulesets/types';

function getProviderConfig(providerId: unknown) {
  if (!isDestinationId(providerId)) {
    throw new Error('Invalid provider ID');
  }
  
  // TypeScript knows providerId is DestinationId here
  return getConfig(providerId);
}
```

## Migration Guide

### From Existing Types

1. **Replace string literals with branded types:**
   ```typescript
   // Before
   function processDestination(id: string) { }
   
   // After  
   function processDestination(id: DestinationId) { }
   ```

2. **Add validation at boundaries:**
   ```typescript
   // Before
   const destId = userInput;
   
   // After
   const destId = createDestinationId(userInput);
   ```

3. **Use type guards for unknown inputs:**
   ```typescript
   // Before
   if (typeof input === 'string' && validDestinations.includes(input)) {
   
   // After
   if (isDestinationId(input)) {
   ```

### Gradual Adoption

The system is designed for gradual adoption:

1. Start with high-security areas (path handling, user input)
2. Add validation at API boundaries
3. Gradually replace internal string types
4. Use type guards for external integrations

## Performance

- **Zero runtime overhead** for branded types (compile-time only)
- **Minimal validation cost** - validators are optimized for common cases
- **Caching support** - validator results can be cached
- **Lazy validation** - validation only occurs when creating branded types

## Development

### Running Examples

```bash
# Install dependencies
bun install

# Run type examples
bun run examples.ts

# Run tests
bun test

# Type checking
bun run tsc --noEmit
```

### Adding New Branded Types

1. Add the brand definition in `brands.ts`
2. Implement validation logic
3. Create type guard function
4. Add to validator registry
5. Export from main index
6. Add usage examples

## License

MIT - see LICENSE file for details.