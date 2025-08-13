# Provider Terminology Migration Guide

This guide demonstrates the migration from "Destination" to "Provider" terminology in the Rulesets project, along with the new branded types system inspired by Grapple's security-first approach.

## Provider Terminology Migration

### Overview

The Rulesets project has completed a comprehensive refactoring from "Destination" to "Provider" terminology:

**Key Changes:**
- All TypeScript interfaces updated (`DestinationPlugin` → `RulesetProvider`)
- System variables updated (`$destination` → `$provider`)
- Configuration frontmatter updated (`destination:` → `provider:`)
- File structure updated (`destinations/` → `providers/`)
- Documentation updated throughout

### Migration Examples

#### TypeScript Interfaces

**Before:**
```typescript
interface DestinationPlugin {
  id: DestinationId;
  name: string;
  compile(doc: ParsedDocument, destPath: DestPath): CompiledDocument;
}
```

**After:**
```typescript
interface RulesetProvider {
  id: ProviderId;
  name: string;
  compile(doc: ParsedDocument, outputPath: OutputPath): CompiledDocument;
}
```

#### Configuration Frontmatter

**Before:**
```yaml
---
destination:
  include: ['cursor', 'windsurf']
  exclude: ['claude-code']
cursor:
  destination:
    path: '.cursor/rules'
---
```

**After:**
```yaml
---
provider:
  include: ['cursor', 'windsurf']
  exclude: ['claude-code']
cursor:
  provider:
    path: '.cursor/rules'
---
```

#### System Variables

**Before:**
```markdown
Current destination: {{$destination}}
Destination ID: {{$destination.id}}
```

**After:**
```markdown
Current provider: {{$provider}}
Provider ID: {{$provider.id}}
```

### Backwards Compatibility

- Old `destination:` frontmatter keys still work but are deprecated
- `$destination` variable still available but will be removed in v1.0
- Legacy plugin interfaces continue to work through adapters

## Branded Types Migration

## Overview

The branded types system provides:
- **Compile-time safety** through Opaque types from type-fest
- **Runtime validation** with security checks (path traversal, injection prevention)
- **Clear error messages** with rich context
- **Type guards** for safe runtime checks
- **Performance options** with unsafe creators for validated data

## Core Concepts

### Before: Loose Typing
```typescript
// Old approach - prone to errors
function parseDocument(path: string, content: string) {
  // No validation, any string accepted
  return { path, content };
}

// Could pass invalid data
parseDocument("../../../etc/passwd", "malicious content");
```

### After: Branded Types
```typescript
import { 
  createSourcePath, 
  createRawContent,
  type SourcePath,
  type RawContent 
} from '@outfitter/types';

function parseDocument(path: SourcePath, content: RawContent) {
  // Types guarantee valid, secure data
  return { path, content };
}

// Must validate first - throws on invalid data
const safePath = createSourcePath("rules/my-rule.rule.md");
const safeContent = createRawContent("# My Rules\n\nContent here");
parseDocument(safePath, safeContent);
```

## Migration Examples

### 1. Parser Module Migration

#### Before
```typescript
// packages/parser/src/index.ts
export function parse(
  content: string,
  sourcePath?: string
): ParsedDocument {
  const frontmatter = extractFrontmatter(content);
  const blocks = findBlocks(content);
  
  return {
    source: { path: sourcePath || 'unknown', content },
    blocks,
    frontmatter
  };
}
```

#### After
```typescript
// packages/parser/src/index.ts
import {
  createSourcePath,
  createRawContent,
  createBlockName,
  type SourcePath,
  type RawContent,
  type BlockName,
  type ParsedDocument
} from '@outfitter/types';

export function parse(
  content: string,
  sourcePath?: string
): ParsedDocument {
  // Validate and brand inputs
  const validPath = sourcePath 
    ? createSourcePath(sourcePath)
    : createSourcePath('unknown.md');
  const validContent = createRawContent(content);
  
  const frontmatter = extractFrontmatter(validContent);
  const blocks = findBlocks(validContent);
  
  return {
    source: { 
      path: validPath, 
      content: validContent,
      frontmatter
    },
    ast: {
      blocks: blocks.map(b => ({
        ...b,
        name: createBlockName(b.name) // Validate block names
      })),
      imports: [],
      variables: [],
      markers: []
    }
  };
}
```

### 2. Linter Module Migration

#### Before
```typescript
// packages/linter/src/index.ts
export function lint(
  parsedDoc: any,
  config: LinterConfig
): LintResult {
  const errors = [];
  
  // Check destination
  if (config.allowedDestinations) {
    const dest = parsedDoc.destination;
    if (!config.allowedDestinations.includes(dest)) {
      errors.push(`Invalid destination: ${dest}`);
    }
  }
  
  return { errors };
}
```

#### After
```typescript
// packages/linter/src/index.ts
import {
  isDestinationId,
  createDestinationId,
  type ParsedDocument,
  type LinterContext,
  type ValidationError,
  error
} from '@outfitter/types';

export function lint(
  context: LinterContext
): ValidationResult<ParsedDocument> {
  const errors: ValidationError[] = [];
  const { parsedDoc, config } = context;
  
  // Type-safe destination checking
  if (config.allowedDestinations) {
    const dest = parsedDoc.metadata?.destination;
    
    // Use type guard for runtime check
    if (!isDestinationId(dest)) {
      errors.push(
        error(
          'metadata.destination',
          'Invalid or missing destination',
          { code: 'INVALID_DESTINATION' }
        )
      );
    } else if (!config.allowedDestinations.includes(dest)) {
      errors.push(
        error(
          'metadata.destination',
          `Destination ${dest} not allowed`,
          { 
            code: 'DESTINATION_NOT_ALLOWED',
            context: { allowed: config.allowedDestinations }
          }
        )
      );
    }
  }
  
  return errors.length > 0 
    ? failure(errors)
    : success(parsedDoc);
}
```

### 3. Compiler Module Migration

#### Before
```typescript
// packages/compiler/src/index.ts
export function compile(
  doc: ParsedDocument,
  destination: string,
  outputPath: string
): string {
  let output = doc.content;
  
  // Process blocks
  doc.blocks.forEach(block => {
    const xmlTag = block.name.replace(/-/g, '_');
    output = output.replace(
      `{{${block.name}}}`,
      `<${xmlTag}>`
    );
  });
  
  return output;
}
```

#### After
```typescript
// packages/compiler/src/index.ts
import {
  createDestinationId,
  createDestPath,
  createCompiledContent,
  type CompilerContext,
  type CompiledDocument
} from '@outfitter/types';

export function compile(
  context: CompilerContext
): CompiledDocument {
  const { parsedDoc, providerId, outputPath } = context;
  let output = parsedDoc.source.content;
  
  // Type-safe block processing
  parsedDoc.ast.blocks.forEach(block => {
    // BlockName type ensures valid format
    const xmlTag = block.name.replace(/-/g, '_');
    output = output.replace(
      `{{${block.name}}}`,
      `<${xmlTag}>`
    );
  });
  
  // Create branded compiled content
  const compiledContent = createCompiledContent(output);
  
  return {
    source: parsedDoc.source,
    ast: parsedDoc.ast,
    output: {
      content: compiledContent,
      metadata: {}
    },
    context: {
      providerId,
      config: {}
    }
  };
}
```

### 4. CLI Module Migration

#### Before
```typescript
// apps/cli/src/commands/compile.ts
export async function compileCommand(
  source: string,
  destination: string,
  output: string
) {
  const content = await fs.readFile(source, 'utf-8');
  const parsed = parse(content, source);
  const compiled = compile(parsed, destination, output);
  await fs.writeFile(output, compiled);
}
```

#### After
```typescript
// apps/cli/src/commands/compile.ts
import {
  createSourcePath,
  createProviderId,
  createOutputPath,
  createRawContent,
  createParserContext,
  createCompilerContext,
  createWriterContext,
  type CompilationEnvironment
} from '@outfitter/types';

export async function compileCommand(
  source: string,
  destination: string,
  output: string
) {
  try {
    // Validate all inputs upfront
    const sourcePath = createSourcePath(source);
    const providerId = createProviderId(destination);
    const outputPath = createOutputPath(output);
    
    // Read and validate content
    const content = await fs.readFile(source, 'utf-8');
    const rawContent = createRawContent(content);
    
    // Create environment
    const environment: CompilationEnvironment = {
      workspaceRoot: process.cwd(),
      outputDir: path.dirname(output),
      rulesetsVersion: createVersion('0.1.0'),
      debug: process.env.DEBUG === 'true'
    };
    
    // Create contexts for each stage
    const parserCtx = createParserContext(
      sourcePath,
      rawContent,
      providerId,
      environment
    );
    
    const parsed = parse(parserCtx);
    
    const compilerCtx = createCompilerContext(
      parsed,
      outputPath,
      providerId,
      { id: providerId, outputPath: outputPath },
      environment
    );
    
    const compiled = compile(compilerCtx);
    
    const writerCtx = createWriterContext(
      compiled.output.content,
      outputPath,
      sourcePath,
      providerId,
      environment
    );
    
    await write(writerCtx);
    
  } catch (err) {
    if (err instanceof BrandValidationError) {
      // Rich error context available
      console.error(`Validation failed for ${err.brandType}:`, err.message);
      if (err.context) {
        console.error('Context:', err.context);
      }
      process.exit(1);
    }
    throw err;
  }
}
```

## Using Validation Framework

### Composable Validators

```typescript
import {
  string,
  number,
  object,
  array,
  optional,
  required,
  chain,
  combine,
  type Validator
} from '@outfitter/types/validation';

// Define a schema for frontmatter
const frontmatterValidator = object({
  rulesetsVersion: required(string({ pattern: /^\d+\.\d+\.\d+$/ })),
  description: optional(string({ maxLength: 500 })),
  destinations: optional(array(string({ enum: VALID_DESTINATIONS }))),
  priority: optional(number({ min: 0, max: 10 }))
});

// Validate frontmatter
const result = frontmatterValidator(data);
if (result.success) {
  // result.value is fully typed
  console.log('Valid frontmatter:', result.value);
} else {
  // Rich error information
  result.errors.forEach(err => {
    console.error(`${err.path}: ${err.message}`);
  });
}
```

### Custom Validators with Brands

```typescript
import {
  createSourcePath,
  type SourcePath,
  type Validator
} from '@outfitter/types';

// Create a branded validator
const sourcePathValidator: Validator<SourcePath> = (value, path = '') => {
  try {
    const validated = createSourcePath(String(value));
    return success(validated);
  } catch (err) {
    if (err instanceof BrandValidationError) {
      return failure([fromBrandError(err, path)]);
    }
    return failure([error(path, 'Invalid source path')]);
  }
};

// Use in object schemas
const configValidator = object({
  source: required(sourcePathValidator),
  destination: required(destinationIdValidator),
  options: optional(object({
    strict: boolean(),
    verbose: boolean()
  }))
});
```

## Performance Considerations

### When to Use Unsafe Brands

For performance-critical paths where data is already validated:

```typescript
import { UnsafeBrands } from '@outfitter/types';

// Example: Processing already-validated data from database
async function loadFromCache(): Promise<ParsedDocument[]> {
  const cached = await redis.get('parsed-docs');
  
  // Data from cache is pre-validated
  return cached.map(doc => ({
    source: {
      // Use unsafe brands for performance
      path: UnsafeBrands.sourcePath(doc.path),
      content: UnsafeBrands.rawContent(doc.content),
      frontmatter: doc.frontmatter
    },
    ast: {
      blocks: doc.blocks.map(b => ({
        ...b,
        name: UnsafeBrands.blockName(b.name)
      })),
      imports: [],
      variables: [],
      markers: []
    }
  }));
}
```

⚠️ **Warning**: Only use `UnsafeBrands` when:
1. Data comes from a trusted source (database, validated cache)
2. Performance is critical (hot paths, large datasets)
3. Validation has already occurred upstream
4. You're willing to accept runtime errors for invalid data

## Testing with Branded Types

### Unit Tests

```typescript
import { describe, test, expect } from 'bun:test';
import {
  createSourcePath,
  createDestinationId,
  BrandValidationError
} from '@outfitter/types';

describe('SourcePath validation', () => {
  test('accepts valid paths', () => {
    expect(() => createSourcePath('rules/my-rule.md')).not.toThrow();
    expect(() => createSourcePath('nested/path/rule.rule.md')).not.toThrow();
  });
  
  test('rejects path traversal', () => {
    expect(() => createSourcePath('../etc/passwd.md'))
      .toThrow(BrandValidationError);
  });
  
  test('rejects absolute paths', () => {
    expect(() => createSourcePath('/etc/passwd.md'))
      .toThrow(BrandValidationError);
  });
  
  test('rejects non-markdown files', () => {
    expect(() => createSourcePath('file.txt'))
      .toThrow(BrandValidationError);
  });
});
```

### Integration Tests

```typescript
describe('Compilation pipeline', () => {
  test('validates all inputs', async () => {
    const pipeline = async () => {
      const source = createSourcePath('test.rule.md');
      const dest = createDestinationId('cursor');
      const output = createDestPath('.cursor/rules/test.mdc');
      
      const env = {
        workspaceRoot: process.cwd(),
        outputDir: '.cursor/rules',
        rulesetsVersion: createVersion('0.1.0')
      };
      
      // Full pipeline with branded types
      const parserCtx = createParserContext(source, content, dest, env);
      const parsed = await parse(parserCtx);
      
      const compilerCtx = createCompilerContext(parsed, output, dest, config, env);
      const compiled = await compile(compilerCtx);
      
      return compiled;
    };
    
    await expect(pipeline()).resolves.toBeDefined();
  });
});
```

## Common Patterns

### 1. Early Validation Pattern
Validate all inputs at system boundaries (CLI, API endpoints):

```typescript
// Validate everything upfront
const validated = {
  source: createSourcePath(args.source),
  destination: createDestinationId(args.destination),
  output: createDestPath(args.output)
};

// Rest of code works with validated brands
await processFiles(validated);
```

### 2. Type Guard Pattern
Use type guards for conditional logic:

```typescript
if (isDestinationId(value)) {
  // value is DestinationId here
  processDestination(value);
} else {
  // Handle invalid case
  console.error('Invalid destination');
}
```

### 3. Validation Result Pattern
Handle validation results consistently:

```typescript
const result = validateConfig(config);
if (!result.success) {
  // Log all errors with context
  result.errors.forEach(err => {
    logger.error({
      path: err.path,
      message: err.message,
      code: err.code,
      severity: err.severity,
      context: err.context
    });
  });
  return;
}

// result.value is fully validated
processConfig(result.value);
```

## Migration Checklist

- [ ] Replace all `string` parameters with appropriate branded types
- [ ] Add validation at system boundaries (CLI, API)
- [ ] Update function signatures to accept branded types
- [ ] Add type guards for runtime checks
- [ ] Create validators for complex objects
- [ ] Add comprehensive error handling for `BrandValidationError`
- [ ] Update tests to use branded type creators
- [ ] Document which branded types each module uses
- [ ] Consider performance implications and use `UnsafeBrands` where appropriate
- [ ] Add validation context to error messages

## Benefits After Migration

1. **Compile-time Safety**: TypeScript catches type mismatches
2. **Runtime Security**: Validation prevents injection attacks
3. **Clear Contracts**: Function signatures document expectations
4. **Rich Errors**: Detailed context for debugging
5. **Maintainability**: Self-documenting code through types
6. **Testability**: Clear validation boundaries
7. **Performance**: Validation only where needed
8. **Consistency**: Uniform validation across codebase

## Next Steps

1. Start with critical paths (parser, linter, compiler)
2. Migrate one module at a time
3. Add tests for validation edge cases
4. Document team conventions for branded types
5. Consider adding more domain-specific brands as needed