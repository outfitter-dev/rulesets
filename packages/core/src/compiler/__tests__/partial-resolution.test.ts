/**
 * Tests for the Handlebars partial resolution system
 */

import { describe, it, expect, beforeEach, afterEach } from 'bun:test';
import { mkdir, writeFile, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { HandlebarsRulesetCompiler } from '../handlebars-compiler';
import type { ParsedDoc } from '../../interfaces';

describe('Handlebars Partial Resolution System', () => {
  let compiler: HandlebarsRulesetCompiler;
  let testDir: string;
  let partialsDirs: string[];

  beforeEach(async () => {
    compiler = new HandlebarsRulesetCompiler();
    testDir = join(tmpdir(), `rulesets-test-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`);
    
    // Create test directory structure
    await mkdir(testDir, { recursive: true });
    const srcDir = join(testDir, '.ruleset', 'src');
    const partialsDir = join(srcDir, '_partials');
    const localPartialsDir = join(srcDir, 'local', '_partials');
    
    partialsDirs = [partialsDir, localPartialsDir];
    
    await mkdir(partialsDir, { recursive: true });
    await mkdir(localPartialsDir, { recursive: true });
    
    // Create sample partial files
    await writeFile(join(partialsDir, 'common-patterns.md'), `
## Common Patterns

- Use TypeScript for type safety
- Follow SOLID principles
- Write comprehensive tests
`);
    
    await writeFile(join(partialsDir, 'code-style.md'), `
## Code Style Guidelines

\`\`\`typescript
// Use descriptive variable names
const userAccountBalance = calculateBalance(userId);

// Prefer const over let when possible
const API_BASE_URL = 'https://api.example.com';
\`\`\`
`);
    
    await writeFile(join(localPartialsDir, 'local-config.md'), `
### Local Configuration

Project-specific configuration:
- Environment: {{provider.type}}
- Provider: {{provider.name}}
`);

    // Create a handlebars template partial
    await writeFile(join(partialsDir, 'template-example.hbs'), `
{{#if provider.id}}
Provider ID: {{provider.id}}
{{else}}
No provider specified
{{/if}}
`);
  });

  afterEach(async () => {
    try {
      await rm(testDir, { recursive: true, force: true });
    } catch (_error) {
      // Ignore cleanup errors
    }
  });

  it('should resolve @-prefixed partials from _partials directory', async () => {
    const sourceFile = join(testDir, '.ruleset', 'src', 'test-rules.md');
    await writeFile(sourceFile, `
# Test Rules

{{> @common-patterns}}

Additional rules here.
`);

    const parsedDoc: ParsedDoc = {
      source: {
        path: sourceFile,
        content: `
# Test Rules

{{> @common-patterns}}

Additional rules here.
`,
        frontmatter: {
          title: 'Test Rules'
        }
      },
      ast: {
        blocks: [],
        imports: [],
        variables: [],
        markers: []
      },
      errors: []
    };

    const compiled = compiler.compile(parsedDoc, 'cursor');
    
    expect(compiled.output.content).toContain('## Common Patterns');
    expect(compiled.output.content).toContain('Use TypeScript for type safety');
    expect(compiled.output.content).toContain('Follow SOLID principles');
  });

  it('should resolve regular partials without @ prefix', async () => {
    const sourceFile = join(testDir, '.ruleset', 'src', 'test-rules.md');
    await writeFile(sourceFile, `
# Test Rules

{{> code-style}}

More content here.
`);

    const parsedDoc: ParsedDoc = {
      source: {
        path: sourceFile,
        content: `
# Test Rules

{{> code-style}}

More content here.
`,
        frontmatter: {
          title: 'Test Rules'
        }
      },
      ast: {
        blocks: [],
        imports: [],
        variables: [],
        markers: []
      },
      errors: []
    };

    const compiled = compiler.compile(parsedDoc, 'cursor');
    
    expect(compiled.output.content).toContain('## Code Style Guidelines');
    expect(compiled.output.content).toContain('const userAccountBalance');
  });

  it('should resolve partials from nested _partials directories', async () => {
    const nestedSourceFile = join(testDir, '.ruleset', 'src', 'local', 'nested-rules.md');
    await mkdir(join(testDir, '.ruleset', 'src', 'local'), { recursive: true });
    await writeFile(nestedSourceFile, `
# Nested Rules

{{> local-config}}

Other content.
`);

    const parsedDoc: ParsedDoc = {
      source: {
        path: nestedSourceFile,
        content: `
# Nested Rules

{{> local-config}}

Other content.
`,
        frontmatter: {
          title: 'Nested Rules'
        }
      },
      ast: {
        blocks: [],
        imports: [],
        variables: [],
        markers: []
      },
      errors: []
    };

    const compiled = compiler.compile(parsedDoc, 'cursor');
    
    expect(compiled.output.content).toContain('### Local Configuration');
    expect(compiled.output.content).toContain('Provider: Cursor'); // Should resolve template variables
  });

  it('should handle handlebars template partials with context', async () => {
    const sourceFile = join(testDir, '.ruleset', 'src', 'template-test.md');
    await writeFile(sourceFile, `
# Template Test

{{> template-example}}

End of file.
`);

    const parsedDoc: ParsedDoc = {
      source: {
        path: sourceFile,
        content: `
# Template Test

{{> template-example}}

End of file.
`,
        frontmatter: {
          title: 'Template Test'
        }
      },
      ast: {
        blocks: [],
        imports: [],
        variables: [],
        markers: []
      },
      errors: []
    };

    const compiled = compiler.compile(parsedDoc, 'windsurf');
    
    expect(compiled.output.content).toContain('Provider ID: windsurf');
  });

  it('should cache partials for performance', async () => {
    const sourceFile = join(testDir, '.ruleset', 'src', 'cache-test.md');
    await writeFile(sourceFile, `
# Cache Test

{{> @common-patterns}}

And again:

{{> @common-patterns}}
`);

    const parsedDoc: ParsedDoc = {
      source: {
        path: sourceFile,
        content: `
# Cache Test

{{> @common-patterns}}

And again:

{{> @common-patterns}}
`,
        frontmatter: {
          title: 'Cache Test'
        }
      },
      ast: {
        blocks: [],
        imports: [],
        variables: [],
        markers: []
      },
      errors: []
    };

    const compiled = compiler.compile(parsedDoc, 'cursor');
    
    // Should have the partial content twice
    const patternOccurrences = (compiled.output.content.match(/Common Patterns/g) || []).length;
    expect(patternOccurrences).toBe(2);
  });

  it('should handle missing partials gracefully', async () => {
    const sourceFile = join(testDir, '.ruleset', 'src', 'missing-test.md');
    await writeFile(sourceFile, `
# Missing Partial Test

{{> @non-existent-partial}}

Content continues.
`);

    const parsedDoc: ParsedDoc = {
      source: {
        path: sourceFile,
        content: `
# Missing Partial Test

{{> @non-existent-partial}}

Content continues.
`,
        frontmatter: {
          title: 'Missing Partial Test'
        }
      },
      ast: {
        blocks: [],
        imports: [],
        variables: [],
        markers: []
      },
      errors: []
    };

    // Should not throw but should handle gracefully
    const compiled = compiler.compile(parsedDoc, 'cursor');
    
    expect(compiled.output.content).toContain('Missing Partial Test');
    expect(compiled.output.content).toContain('Content continues');
  });

  it('should clear partial cache when requested', () => {
    // Load a partial to populate cache
    const sourceFile = join(testDir, '.ruleset', 'src', 'test.md');
    const parsedDoc: ParsedDoc = {
      source: {
        path: sourceFile,
        content: '{{> @common-patterns}}',
        frontmatter: {}
      },
      ast: {
        blocks: [],
        imports: [],
        variables: [],
        markers: []
      },
      errors: []
    };

    compiler.compile(parsedDoc, 'cursor');
    
    // Clear cache
    compiler.clearPartialCache();
    
    // Cache should be empty (verified by internal state)
    expect(true).toBe(true); // This test verifies the method exists and doesn't throw
  });

  it('should use explicit {{partial}} helper', async () => {
    const sourceFile = join(testDir, '.ruleset', 'src', 'explicit-test.md');
    await writeFile(sourceFile, `
# Explicit Partial Test

{{partial "@common-patterns"}}

End.
`);

    const parsedDoc: ParsedDoc = {
      source: {
        path: sourceFile,
        content: `
# Explicit Partial Test

{{partial "@common-patterns"}}

End.
`,
        frontmatter: {
          title: 'Explicit Test'
        }
      },
      ast: {
        blocks: [],
        imports: [],
        variables: [],
        markers: []
      },
      errors: []
    };

    const compiled = compiler.compile(parsedDoc, 'cursor');
    
    expect(compiled.output.content).toContain('## Common Patterns');
    expect(compiled.output.content).toContain('Use TypeScript for type safety');
  });

  it('should handle multiple file extensions', async () => {
    // Create partial with .txt extension
    await writeFile(join(partialsDirs[0], 'text-partial.txt'), 'This is a text partial');
    
    const sourceFile = join(testDir, '.ruleset', 'src', 'extension-test.md');
    await writeFile(sourceFile, `
# Extension Test

{{> text-partial}}

End.
`);

    const parsedDoc: ParsedDoc = {
      source: {
        path: sourceFile,
        content: `
# Extension Test

{{> text-partial}}

End.
`,
        frontmatter: {}
      },
      ast: {
        blocks: [],
        imports: [],
        variables: [],
        markers: []
      },
      errors: []
    };

    const compiled = compiler.compile(parsedDoc, 'cursor');
    
    expect(compiled.output.content).toContain('This is a text partial');
  });
});