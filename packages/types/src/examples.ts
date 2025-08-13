// Example usage of the Rulesets branded types system
// This file demonstrates how to use the new type-safe APIs

import {
  // Types
  // type ProviderId, // Unused in examples
  // type DestinationId, // Used in function
  type CompilationContext,
  // createOutputPath, // Unused in examples
  createBlockName,
  createCompiledContent,
  // Type guards
  // isProviderId, // Unused in examples

  // Legacy compatibility
  createDestinationId,
  createDestPath,
  createMarkerContent,
  createProviderId,
  createRawContent,
  createSourcePath,
  createVariableName,
  createVersion,
  isDestinationId,
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

    console.log('Created block names:', {
      instructions,
      userGuidelines,
      codeExamples,
    });

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

    console.log('Created variable names:', {
      destination,
      userName,
      _private,
      $jquery,
    });

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
  // Validator utilities are no longer exported - using type guards instead
  const testId = 'cursor';
  if (isDestinationId(testId)) {
    console.log('Validation passed:', testId);
  } else {
    console.error('Validation failed: Invalid destination ID');
  }

  // Direct validation using type guards
  const testId2 = 'windsurf';
  const isValid = isDestinationId(testId2);
  console.log('Registry validation result:', isValid);
}

/**
 * Example: Marker validation
 */
function exampleMarkerValidation() {
  try {
    // ✅ Valid markers
    const blockMarker = createMarkerContent('{{instructions}}');
    const importMarker = createMarkerContent('{{> @legal}}');

    // MarkerValidationUtil no longer exported - validation happens during creation
    console.log('Block marker created successfully:', blockMarker);
    console.log('Import marker created successfully:', importMarker);

    // ❌ Invalid marker syntax - would throw during creation
    try {
      createMarkerContent('{{invalid marker syntax');
      console.log('Should not reach here - validation failed');
    } catch (error) {
      console.log('Invalid marker validation caught error:', error);
    }
  } catch (error) {
    console.error('Marker validation error:', error);
  }
}

/**
 * Example: Creating a compilation context
 */
function exampleCompilationContext(): CompilationContext {
  return {
    stage: 'parse' as const,
    sourcePath: createSourcePath('./src/project-rules.rule.md'),
    providerId: createProviderId('cursor'),
    rawContent: createRawContent(`
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
        include: [
          createDestinationId('cursor'),
          createDestinationId('windsurf'),
        ],
      },
    },
    environment: {
      workspaceRoot: process.cwd(),
      outputDir: './.ruleset/dist',
      rulesetsVersion: createVersion('1.0.0'),
      debug: false,
      strict: true,
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

  const results = inputs.map((input) => {
    try {
      const validated = createDestinationId(input);
      return { input, success: true, result: validated };
    } catch (error) {
      return { input, success: false, error };
    }
  });

  console.log('Batch validation results:');
  results.forEach((result) => {
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
  console.log('Created compilation context for:', context.sourcePath);
}
