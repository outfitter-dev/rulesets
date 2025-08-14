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
    void _cursorDest; // Example usage

    // ✅ Type guard usage
    const unknownId: unknown = 'windsurf';
    if (isDestinationId(unknownId)) {
    }

    // ❌ This will throw a validation error
    // const invalidDest = createDestinationId('invalid-destination');
  } catch (_error) {}
}

/**
 * Example: Creating and validating file paths
 */
function exampleFilePaths() {
  try {
    // ✅ Valid source path
    const _sourcePath = createSourcePath('./src/my-rules.rule.md');
    void _sourcePath; // Example usage

    // ✅ Valid destination path
    const _destPath = createDestPath('./.cursor/rules/my-rules.mdc');
    void _destPath; // Example usage

    // ❌ These would throw validation errors:
    // const badSource = createSourcePath('./src/../../../etc/passwd'); // Path traversal
    // const badExt = createSourcePath('./src/rules.txt'); // Wrong extension
  } catch (_error) {}
}

/**
 * Example: Creating and validating block names
 */
function exampleBlockNames() {
  try {
    // ✅ Valid block names
    const _instructions = createBlockName('instructions');
    void _instructions; // Example usage
    const _userGuidelines = createBlockName('user-guidelines');
    void _userGuidelines; // Example usage
    const _codeExamples = createBlockName('code-examples');
    void _codeExamples; // Example usage

    // ❌ These would throw validation errors:
    // const invalidCase = createBlockName('CamelCase'); // Not kebab-case
    // const reserved = createBlockName('function'); // Reserved word
    // const empty = createBlockName(''); // Empty name
  } catch (_error) {}
}

/**
 * Example: Creating and validating variable names
 */
function exampleVariableNames() {
  try {
    // ✅ Valid variable names
    const _destination = createVariableName('destination');
    void _destination; // Example usage
    const _userName = createVariableName('userName');
    void _userName; // Example usage
    const _private = createVariableName('_private');
    void _private; // Example usage
    const _$jquery = createVariableName('$jquery');
    void _$jquery; // Example usage

    // ❌ These would throw validation errors:
    // const invalidStart = createVariableName('123invalid'); // Starts with number
    // const reserved = createVariableName('class'); // Reserved word
    // const spaces = createVariableName('user name'); // Contains spaces
  } catch (_error) {}
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
    void _rawContent; // Example usage

    const _compiledContent = createCompiledContent(`
<instructions>
Follow TypeScript best practices and write comprehensive tests.
</instructions>
    `);
    void _compiledContent; // Example usage

    // ❌ These would be rejected by security validation:
    // const malicious = createRawContent('<script>alert("xss")</script>');
    // const dangerous = createRawContent('Content with \0 null byte');
  } catch (_error) {}
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
  void _isValid; // Example usage
}

/**
 * Example: Marker validation
 */
function exampleMarkerValidation() {
  try {
    // ✅ Valid markers
    const _blockMarker = createMarkerContent('{{instructions}}');
    void _blockMarker; // Example usage
    const _importMarker = createMarkerContent('{{> @legal}}');
    void _importMarker; // Example usage

    // ❌ Invalid marker syntax - would throw during creation
    try {
      createMarkerContent('{{invalid marker syntax');
    } catch (_error) {}
  } catch (_error) {}
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
  results.forEach((result) => {
    if (result.success) {
    } else {
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
  void _context; // Example usage
}
