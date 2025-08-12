// Example usage of the Rulesets branded types system
// This file demonstrates how to use the new type-safe APIs

import {
  createDestinationId,
  createSourcePath,
  createDestPath,
  createBlockName,
  createVariableName,
  createMarkerContent,
  createRawContent,
  createCompiledContent,
  createVersion,
  
  // Type guards
  isDestinationId,
  
  // Validation utilities
  validators,
  DestinationIdValidator,
  MarkerValidationUtil,
  
  // Types
  type DestinationId,
  type CompilationContext,
} from './index';

// ============================================================================
// Basic Usage Examples
// ============================================================================

/**
 * Example: Creating and validating destination IDs
 */
function exampleDestinationIds() {
  try {
    // ✅ Valid destination ID
    const cursorDest = createDestinationId('cursor');
    console.log('Created destination:', cursorDest);
    
    // ✅ Type guard usage
    const unknownId: unknown = 'windsurf';
    if (isDestinationId(unknownId)) {
      // TypeScript now knows unknownId is DestinationId
      console.log('Valid destination ID:', unknownId);
    }
    
    // ❌ This will throw a validation error
    // const invalidDest = createDestinationId('invalid-destination');
  } catch (error) {
    console.error('Validation error:', error);
  }
}

/**
 * Example: Creating and validating file paths
 */
function exampleFilePaths() {
  try {
    // ✅ Valid source path
    const sourcePath = createSourcePath('./src/my-rules.rule.md');
    console.log('Created source path:', sourcePath);
    
    // ✅ Valid destination path  
    const destPath = createDestPath('./.cursor/rules/my-rules.mdc');
    console.log('Created destination path:', destPath);
    
    // ❌ These would throw validation errors:
    // const badSource = createSourcePath('./src/../../../etc/passwd'); // Path traversal
    // const badExt = createSourcePath('./src/rules.txt'); // Wrong extension
  } catch (error) {
    console.error('Path validation error:', error);
  }
}

/**
 * Example: Creating and validating block names
 */
function exampleBlockNames() {
  try {
    // ✅ Valid block names
    const instructions = createBlockName('instructions');
    const userGuidelines = createBlockName('user-guidelines');
    const codeExamples = createBlockName('code-examples');
    
    console.log('Created block names:', { instructions, userGuidelines, codeExamples });
    
    // ❌ These would throw validation errors:
    // const invalidCase = createBlockName('CamelCase'); // Not kebab-case
    // const reserved = createBlockName('function'); // Reserved word
    // const empty = createBlockName(''); // Empty name
  } catch (error) {
    console.error('Block name validation error:', error);
  }
}

/**
 * Example: Creating and validating variable names
 */
function exampleVariableNames() {
  try {
    // ✅ Valid variable names
    const destination = createVariableName('destination');
    const userName = createVariableName('userName');
    const _private = createVariableName('_private');
    const $jquery = createVariableName('$jquery');
    
    console.log('Created variable names:', { destination, userName, _private, $jquery });
    
    // ❌ These would throw validation errors:
    // const invalidStart = createVariableName('123invalid'); // Starts with number
    // const reserved = createVariableName('class'); // Reserved word
    // const spaces = createVariableName('user name'); // Contains spaces
  } catch (error) {
    console.error('Variable name validation error:', error);
  }
}

/**
 * Example: Content validation with security checks
 */
function exampleContentValidation() {
  try {
    // ✅ Valid content
    const rawContent = createRawContent(`
# My Rules

These are the coding standards for our project.

## Instructions

- Follow TypeScript best practices
- Use meaningful variable names
- Write comprehensive tests
    `);
    
    const compiledContent = createCompiledContent(`
<instructions>
Follow TypeScript best practices and write comprehensive tests.
</instructions>
    `);
    
    console.log('Created content successfully', {
      rawLength: rawContent.length,
      compiledLength: compiledContent.length,
    });
    
    // ❌ These would be rejected by security validation:
    // const malicious = createRawContent('<script>alert("xss")</script>');
    // const dangerous = createRawContent('Content with \0 null byte');
  } catch (error) {
    console.error('Content validation error:', error);
  }
}

// ============================================================================
// Advanced Usage Examples
// ============================================================================

/**
 * Example: Using the validator registry
 */
function exampleValidatorRegistry() {
  // Direct validator usage
  const destinationValidator = new DestinationIdValidator();
  const result = destinationValidator.validate('cursor');
  
  if (result.valid) {
    console.log('Validation passed:', result.data);
  } else {
    console.error('Validation failed:', result.errors);
  }
  
  // Using the validator registry
  const registryResult = validators.validate<DestinationId>('destinationId', 'windsurf');
  console.log('Registry validation result:', registryResult);
}

/**
 * Example: Marker validation
 */
function exampleMarkerValidation() {
  try {
    // ✅ Valid markers
    const blockMarker = createMarkerContent('{{instructions}}');
    const importMarker = createMarkerContent('{{> @legal}}');
    
    // Validate marker syntax
    const blockResult = MarkerValidationUtil.validateMarkerSyntax(blockMarker);
    console.log('Block marker validation:', blockResult);
    
    const importResult = MarkerValidationUtil.validateMarkerSyntax(importMarker);
    console.log('Import marker validation:', importResult);
    
    // ❌ Invalid marker syntax
    const invalidMarker = createMarkerContent('{{invalid marker syntax');
    const invalidResult = MarkerValidationUtil.validateMarkerSyntax(invalidMarker);
    console.log('Invalid marker validation:', invalidResult);
  } catch (error) {
    console.error('Marker validation error:', error);
  }
}

/**
 * Example: Creating a compilation context
 */
function exampleCompilationContext(): CompilationContext {
  return {
    source: {
      path: createSourcePath('./src/project-rules.rule.md'),
      content: createRawContent(`
---
ruleset:
  version: "0.1.0"
description: "Project coding standards"
destination:
  include: ["cursor", "windsurf"]
---

# Project Rules

{{instructions}}
Follow these coding standards for consistency.
{{/instructions}}
      `),
      frontmatter: {
        ruleset: { version: createVersion('0.1.0') },
        description: 'Project coding standards',
        destination: {
          include: [createDestinationId('cursor'), createDestinationId('windsurf')],
        },
      },
    },
    
    destination: {
      id: createDestinationId('cursor'),
      outputPath: createDestPath('./.cursor/rules/project-rules.mdc'),
      config: {
        enabled: true,
        output: {
          createDirectory: true,
        },
        plugin: {
          options: {},
        },
        transform: {
          enabled: true,
          rules: [],
        },
        validation: {
          enabled: true,
        },
      },
    },
    
    config: {
      global: {
        source: {
          directory: './src',
          include: ['**/*.rule.md', '**/*.md'],
          exclude: ['node_modules/**', '.git/**'],
        },
        output: {
          directory: './.ruleset/dist',
          createLatestSymlink: true,
          retention: {
            maxRuns: 10,
            maxAge: '30d',
          },
        },
        validation: {
          strict: true,
          rules: [],
        },
        logging: {
          level: 'info',
          format: 'text',
          output: 'console',
        },
      },
      project: {
        project: {
          name: 'My Project',
          version: createVersion('1.0.0'),
        },
        destinations: new Map(),
        variables: new Map(),
        properties: new Map(),
      },
      runtime: {
        performance: {
          timeout: 30000,
          maxMemory: 512 * 1024 * 1024, // 512MB
          monitoring: false,
        },
        security: {
          sandbox: false,
          allowedOperations: ['read', 'write'],
          limits: {
            maxFileSize: 10 * 1024 * 1024, // 10MB
            maxTotalSize: 100 * 1024 * 1024, // 100MB
          },
        },
        debug: {
          enabled: false,
          include: [],
        },
      },
    },
    
    metadata: {
      timestamp: new Date(),
      runId: 'run-' + Date.now(),
      version: createVersion('0.1.0'),
      baseDir: process.cwd(),
    },
  };
}

/**
 * Example: Error handling with detailed information
 */
function exampleErrorHandling() {
  try {
    // This will throw a specific validation error
    createDestinationId('nonexistent-destination');
  } catch (error) {
    if (error instanceof Error) {
      console.log('Error name:', error.name);
      console.log('Error message:', error.message);
      
      // If it's a RulesetValidationError, we get structured information
      if ('code' in error && 'category' in error && 'toJSON' in error) {
        console.log('Error details:', (error as any).toJSON());
      }
    }
  }
}

/**
 * Example: Batch validation for multiple values
 */
function exampleBatchValidation() {
  const inputs = ['cursor', 'windsurf', 'invalid-dest', 'claude-code', ''];
  
  const results = inputs.map(input => {
    try {
      const validated = createDestinationId(input);
      return { input, success: true, result: validated };
    } catch (error) {
      return { input, success: false, error };
    }
  });
  
  console.log('Batch validation results:');
  results.forEach(result => {
    if (result.success) {
      console.log(`✅ ${result.input} -> ${result.result}`);
    } else {
      console.log(`❌ ${result.input} -> ${result.error}`);
    }
  });
}

// ============================================================================
// Export examples for testing
// ============================================================================

export {
  exampleDestinationIds,
  exampleFilePaths,
  exampleBlockNames,
  exampleVariableNames,
  exampleContentValidation,
  exampleValidatorRegistry,
  exampleMarkerValidation,
  exampleCompilationContext,
  exampleErrorHandling,
  exampleBatchValidation,
};

// Demo function to run all examples
export function runAllExamples() {
  console.log('=== Destination IDs ===');
  exampleDestinationIds();
  
  console.log('\n=== File Paths ===');
  exampleFilePaths();
  
  console.log('\n=== Block Names ===');
  exampleBlockNames();
  
  console.log('\n=== Variable Names ===');
  exampleVariableNames();
  
  console.log('\n=== Content Validation ===');
  exampleContentValidation();
  
  console.log('\n=== Validator Registry ===');
  exampleValidatorRegistry();
  
  console.log('\n=== Marker Validation ===');
  exampleMarkerValidation();
  
  console.log('\n=== Error Handling ===');
  exampleErrorHandling();
  
  console.log('\n=== Batch Validation ===');
  exampleBatchValidation();
  
  console.log('\n=== Compilation Context ===');
  const context = exampleCompilationContext();
  console.log('Created compilation context for:', context.source.path);
}