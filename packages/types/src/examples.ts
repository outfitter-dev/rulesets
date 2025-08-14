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
    const _cursorDest = createDestinationId('cursor');
    // Example usage - variable created but not used
    _cursorDest;

    // ✅ Type guard usage
    const unknownId: unknown = 'windsurf';
    if (isDestinationId(unknownId)) {
    }

    // ❌ This will throw a validation error
    // const invalidDest = createDestinationId('invalid-destination');
  } catch (_error) {
    // Validation errors are expected for invalid IDs
  }
}

/**
 * Example: Creating and validating file paths
 */
function exampleFilePaths() {
  try {
    // ✅ Valid source path
    const _sourcePath = createSourcePath('./src/my-rules.rule.md');
    // Example usage - variable created but not used
    _sourcePath;

    // ✅ Valid destination path
    const _destPath = createDestPath('./.cursor/rules/my-rules.mdc');
    // Example usage - variable created but not used
    _destPath;

    // ❌ These would throw validation errors:
    // const badSource = createSourcePath('./src/../../../etc/passwd'); // Path traversal
    // const badExt = createSourcePath('./src/rules.txt'); // Wrong extension
  } catch (_error) {
    // Validation errors are expected for invalid IDs
  }
}

/**
 * Example: Creating and validating block names
 */
function exampleBlockNames() {
  try {
    // ✅ Valid block names
    const _instructions = createBlockName('instructions');
    // Example usage - variable created but not used
    _instructions;
    const _userGuidelines = createBlockName('user-guidelines');
    _userGuidelines;
    const _codeExamples = createBlockName('code-examples');
    _codeExamples;

    // ❌ These would throw validation errors:
    // const invalidCase = createBlockName('CamelCase'); // Not kebab-case
    // const reserved = createBlockName('function'); // Reserved word
    // const empty = createBlockName(''); // Empty name
  } catch (_error) {
    // Validation errors are expected for invalid IDs
  }
}

/**
 * Example: Creating and validating variable names
 */
function exampleVariableNames() {
  try {
    // ✅ Valid variable names
    const _destination = createVariableName('destination');
    _destination;
    const _userName = createVariableName('userName');
    _userName;
    const _private = createVariableName('_private');
    _private;
    const _$jquery = createVariableName('$jquery');
    _$jquery;

    // ❌ These would throw validation errors:
    // const invalidStart = createVariableName('123invalid'); // Starts with number
    // const reserved = createVariableName('class'); // Reserved word
    // const spaces = createVariableName('user name'); // Contains spaces
  } catch (_error) {
    // Validation errors are expected for invalid IDs
  }
}

/**
 * Example: Content validation with security checks
 */
function exampleContentValidation() {
  try {
    // ✅ Valid content
    const _rawContent = createRawContent(`
# My Rules

These are the coding standards for our project.

## Instructions

- Follow TypeScript best practices
- Use meaningful variable names
- Write comprehensive tests
    `);
    _rawContent;

    const _compiledContent = createCompiledContent(`
<instructions>
Follow TypeScript best practices and write comprehensive tests.
</instructions>
    `);
    _compiledContent;

    // ❌ These would be rejected by security validation:
    // const malicious = createRawContent('<script>alert("xss")</script>');
    // const dangerous = createRawContent('Content with \0 null byte');
  } catch (_error) {
    // Validation errors are expected for invalid IDs
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
  } else {
  }

  // Direct validation using type guards
  const testId2 = 'windsurf';
  const _isValid = isDestinationId(testId2);
  _isValid;
}

/**
 * Example: Marker validation
 */
function exampleMarkerValidation() {
  try {
    // ✅ Valid markers
    const _blockMarker = createMarkerContent('{{instructions}}');
    _blockMarker;
    const _importMarker = createMarkerContent('{{> @legal}}');
    _importMarker;

    // ❌ Invalid marker syntax - would throw during creation
    try {
      createMarkerContent('{{invalid marker syntax');
    } catch (_error) {
      // Validation errors are expected for invalid IDs
    }
  } catch (_error) {
    // Validation errors are expected for invalid IDs
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
      runId: `run-${Date.now()}`,
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
      // If it's a RulesetValidationError, we get structured information
      if ('code' in error && 'category' in error && 'toJSON' in error) {
        const structuredError = error as unknown as {
          code: string;
          category: string;
          toJSON: () => object;
        };
        console.log(`Error: ${structuredError.code} in ${structuredError.category}`);
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
  for (const result of results) {
    if (result.success) {
    } else {
    }
  }
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
  exampleDestinationIds();
  exampleFilePaths();
  exampleBlockNames();
  exampleVariableNames();
  exampleContentValidation();
  exampleValidatorRegistry();
  exampleMarkerValidation();
  exampleErrorHandling();
  exampleBatchValidation();
  const _context = exampleCompilationContext();
  void _context;
}
