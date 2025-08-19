/**
 * Tests for HandlebarsRulesetCompiler
 */

import { describe, expect, it } from 'bun:test';
import type { ParsedDoc } from '../../interfaces';
import { HandlebarsRulesetCompiler } from '../handlebars-compiler';

// Top-level regex constants for performance
const HANDLEBARS_COMPILATION_FAILED_REGEX = /Handlebars compilation failed/;

describe('HandlebarsRulesetCompiler', () => {
  const compiler = new HandlebarsRulesetCompiler();

  describe('Basic compilation', () => {
    it('should compile simple content without markers', () => {
      const parsedDoc: ParsedDoc = {
        source: {
          path: 'test.md',
          content: `---
name: test-rules
version: 1.0.0
---

# Test Rules

These are test rules.`,
          frontmatter: {
            name: 'test-rules',
            version: '1.0.0',
          },
        },
        ast: {
          blocks: [],
          imports: [],
          variables: [],
          markers: [],
        },
      };

      const result = compiler.compile(parsedDoc, 'cursor');

      expect(result.output.content).toBe(`# Test Rules

These are test rules.`);
      expect(result.context.destinationId).toBe('cursor');
      expect(result.output.metadata?.provider).toBe('cursor');
    });

    it('should handle empty files', () => {
      const parsedDoc: ParsedDoc = {
        source: {
          path: 'empty.md',
          content: '',
          frontmatter: undefined,
        },
        ast: {
          blocks: [],
          imports: [],
          variables: [],
          markers: [],
        },
      };

      const result = compiler.compile(parsedDoc, 'cursor');

      expect(result.output.content).toBe('');
    });
  });

  describe('Variable substitution', () => {
    it('should substitute provider variables', () => {
      const parsedDoc: ParsedDoc = {
        source: {
          path: 'test.md',
          content: `---
name: provider-test
---

Provider: {{provider.id}}
Display: {{provider.name}}
Type: {{provider.type}}`,
          frontmatter: {
            name: 'provider-test',
          },
        },
        ast: {
          blocks: [],
          imports: [],
          variables: [],
          markers: [],
        },
      };

      const result = compiler.compile(parsedDoc, 'cursor');

      expect(result.output.content).toContain('Provider: cursor');
      expect(result.output.content).toContain('Display: Cursor');
      expect(result.output.content).toContain('Type: ide');
    });

    it('should substitute file variables', () => {
      const parsedDoc: ParsedDoc = {
        source: {
          path: 'test.md',
          content: `---
name: file-test
version: 2.0.0
---

File: {{file.name}}
Version: {{file.version}}`,
          frontmatter: {
            name: 'file-test',
            version: '2.0.0',
          },
        },
        ast: {
          blocks: [],
          imports: [],
          variables: [],
          markers: [],
        },
      };

      const result = compiler.compile(parsedDoc, 'cursor');

      expect(result.output.content).toContain('File: file-test');
      expect(result.output.content).toContain('Version: 2.0.0');
    });

    it('should substitute custom frontmatter variables', () => {
      const parsedDoc: ParsedDoc = {
        source: {
          path: 'test.md',
          content: `---
name: custom-test
project:
  name: MyProject
  language: TypeScript
customVar: Hello World
---

Project: {{project.name}}
Language: {{project.language}}
Custom: {{customVar}}`,
          frontmatter: {
            name: 'custom-test',
            project: {
              name: 'MyProject',
              language: 'TypeScript',
            },
            customVar: 'Hello World',
          },
        },
        ast: {
          blocks: [],
          imports: [],
          variables: [],
          markers: [],
        },
      };

      const result = compiler.compile(parsedDoc, 'cursor');

      expect(result.output.content).toContain('Project: MyProject');
      expect(result.output.content).toContain('Language: TypeScript');
      expect(result.output.content).toContain('Custom: Hello World');
    });
  });

  describe('Section helpers (freeform)', () => {
    it('should compile freeform sections as XML by default', () => {
      const parsedDoc: ParsedDoc = {
        source: {
          path: 'test.md',
          content: `---
name: section-test
---

{{#instructions}}
- Follow these guidelines
- Write good code
{{/instructions}}`,
          frontmatter: {
            name: 'section-test',
          },
        },
        ast: {
          blocks: [],
          imports: [],
          variables: [],
          markers: [],
        },
      };

      const result = compiler.compile(parsedDoc, 'cursor');

      expect(result.output.content).toContain('<instructions>');
      expect(result.output.content).toContain('- Follow these guidelines');
      expect(result.output.content).toContain('- Write good code');
      expect(result.output.content).toContain('</instructions>');
    });

    it('should handle kebab-case section names', () => {
      const parsedDoc: ParsedDoc = {
        source: {
          path: 'test.md',
          content: `{{#user-instructions}}
Content here
{{/user-instructions}}`,
          frontmatter: {},
        },
        ast: {
          blocks: [],
          imports: [],
          variables: [],
          markers: [],
        },
      };

      const result = compiler.compile(parsedDoc, 'cursor');

      expect(result.output.content).toContain('<user_instructions>');
      expect(result.output.content).toContain('Content here');
      expect(result.output.content).toContain('</user_instructions>');
    });

    it('should support heading format', () => {
      const parsedDoc: ParsedDoc = {
        source: {
          path: 'test.md',
          content: `{{#instructions format="heading"}}
These are the instructions.
{{/instructions}}`,
          frontmatter: {},
        },
        ast: {
          blocks: [],
          imports: [],
          variables: [],
          markers: [],
        },
      };

      const result = compiler.compile(parsedDoc, 'cursor');

      expect(result.output.content).toContain('## Instructions');
      expect(result.output.content).toContain('These are the instructions.');
      expect(result.output.content).not.toContain('<instructions>');
    });

    it('should support raw format', () => {
      const parsedDoc: ParsedDoc = {
        source: {
          path: 'test.md',
          content: `{{#instructions format="raw"}}
Raw content without wrappers.
{{/instructions}}`,
          frontmatter: {},
        },
        ast: {
          blocks: [],
          imports: [],
          variables: [],
          markers: [],
        },
      };

      const result = compiler.compile(parsedDoc, 'cursor');

      expect(result.output.content.trim()).toBe(
        'Raw content without wrappers.'
      );
      expect(result.output.content).not.toContain('<instructions>');
      expect(result.output.content).not.toContain('## Instructions');
    });
  });

  describe('Provider filtering', () => {
    it('should include content for matching providers', () => {
      const parsedDoc: ParsedDoc = {
        source: {
          path: 'test.md',
          content: `{{#instructions include="cursor,windsurf"}}
Content for cursor and windsurf
{{/instructions}}`,
          frontmatter: {},
        },
        ast: {
          blocks: [],
          imports: [],
          variables: [],
          markers: [],
        },
      };

      const result = compiler.compile(parsedDoc, 'cursor');

      expect(result.output.content).toContain('<instructions>');
      expect(result.output.content).toContain(
        'Content for cursor and windsurf'
      );
    });

    it('should exclude content for non-matching providers', () => {
      const parsedDoc: ParsedDoc = {
        source: {
          path: 'test.md',
          content: `{{#instructions include="windsurf,claude-code"}}
Content for windsurf and claude-code only
{{/instructions}}`,
          frontmatter: {},
        },
        ast: {
          blocks: [],
          imports: [],
          variables: [],
          markers: [],
        },
      };

      const result = compiler.compile(parsedDoc, 'cursor');

      expect(result.output.content.trim()).toBe('');
    });

    it('should exclude content for excluded providers', () => {
      const parsedDoc: ParsedDoc = {
        source: {
          path: 'test.md',
          content: `{{#instructions exclude="cursor"}}
This should not appear for cursor
{{/instructions}}`,
          frontmatter: {},
        },
        ast: {
          blocks: [],
          imports: [],
          variables: [],
          markers: [],
        },
      };

      const result = compiler.compile(parsedDoc, 'cursor');

      expect(result.output.content.trim()).toBe('');
    });
  });

  describe('Provider conditional helpers', () => {
    it('should support if-provider helper', () => {
      const parsedDoc: ParsedDoc = {
        source: {
          path: 'test.md',
          content: `{{#if-provider "cursor,windsurf"}}
Content for cursor or windsurf
{{/if-provider}}`,
          frontmatter: {},
        },
        ast: {
          blocks: [],
          imports: [],
          variables: [],
          markers: [],
        },
      };

      const result = compiler.compile(parsedDoc, 'cursor');

      expect(result.output.content).toContain('Content for cursor or windsurf');
    });

    it('should support unless-provider helper', () => {
      const parsedDoc: ParsedDoc = {
        source: {
          path: 'test.md',
          content: `{{#unless-provider "claude-code"}}
Content for anything except claude-code
{{/unless-provider}}`,
          frontmatter: {},
        },
        ast: {
          blocks: [],
          imports: [],
          variables: [],
          markers: [],
        },
      };

      const result = compiler.compile(parsedDoc, 'cursor');

      expect(result.output.content).toContain(
        'Content for anything except claude-code'
      );
    });

    it('should exclude content in unless-provider when provider matches', () => {
      const parsedDoc: ParsedDoc = {
        source: {
          path: 'test.md',
          content: `{{#unless-provider "cursor"}}
This should not appear for cursor
{{/unless-provider}}`,
          frontmatter: {},
        },
        ast: {
          blocks: [],
          imports: [],
          variables: [],
          markers: [],
        },
      };

      const result = compiler.compile(parsedDoc, 'cursor');

      expect(result.output.content.trim()).toBe('');
    });
  });

  describe('Built-in Handlebars helpers', () => {
    it('should support if/unless conditionals', () => {
      const parsedDoc: ParsedDoc = {
        source: {
          path: 'test.md',
          content: `---
debug: true
---

{{#if debug}}
Debug mode is enabled
{{/if}}

{{#unless debug}}
Debug mode is disabled
{{/unless}}`,
          frontmatter: {
            debug: true,
          },
        },
        ast: {
          blocks: [],
          imports: [],
          variables: [],
          markers: [],
        },
      };

      const result = compiler.compile(parsedDoc, 'cursor');

      expect(result.output.content).toContain('Debug mode is enabled');
      expect(result.output.content).not.toContain('Debug mode is disabled');
    });

    it('should support each iteration', () => {
      const parsedDoc: ParsedDoc = {
        source: {
          path: 'test.md',
          content: `---
languages:
  - TypeScript
  - JavaScript
  - Python
---

{{#each languages}}
- {{this}}
{{/each}}`,
          frontmatter: {
            languages: ['TypeScript', 'JavaScript', 'Python'],
          },
        },
        ast: {
          blocks: [],
          imports: [],
          variables: [],
          markers: [],
        },
      };

      const result = compiler.compile(parsedDoc, 'cursor');

      expect(result.output.content).toContain('- TypeScript');
      expect(result.output.content).toContain('- JavaScript');
      expect(result.output.content).toContain('- Python');
    });
  });

  describe('Provider switch helpers', () => {
    it('should support switch-provider with case helpers', () => {
      const parsedDoc: ParsedDoc = {
        source: {
          path: 'test.md',
          content: `{{#switch-provider}}
{{#case "cursor"}}Content for Cursor{{/case}}
{{#case "windsurf"}}Content for Windsurf{{/case}}
{{#case "claude-code"}}Content for Claude Code{{/case}}
{{/switch-provider}}`,
          frontmatter: {},
        },
        ast: {
          blocks: [],
          imports: [],
          variables: [],
          markers: [],
        },
      };

      const result = compiler.compile(parsedDoc, 'cursor');

      expect(result.output.content.trim()).toBe('Content for Cursor');
    });

    it('should support switch-provider with default case', () => {
      const parsedDoc: ParsedDoc = {
        source: {
          path: 'test.md',
          content: `{{#switch-provider}}
{{#case "windsurf"}}Content for Windsurf{{/case}}
{{#case "claude-code"}}Content for Claude Code{{/case}}
{{#default}}Default content{{/default}}
{{/switch-provider}}`,
          frontmatter: {},
        },
        ast: {
          blocks: [],
          imports: [],
          variables: [],
          markers: [],
        },
      };

      const result = compiler.compile(parsedDoc, 'cursor');

      expect(result.output.content.trim()).toBe('Default content');
    });

    it('should support case with comma-separated provider list', () => {
      const parsedDoc: ParsedDoc = {
        source: {
          path: 'test.md',
          content: `{{#switch-provider}}
{{#case "cursor,windsurf"}}Content for IDE providers{{/case}}
{{#case "claude-code"}}Content for CLI providers{{/case}}
{{#default}}Other content{{/default}}
{{/switch-provider}}`,
          frontmatter: {},
        },
        ast: {
          blocks: [],
          imports: [],
          variables: [],
          markers: [],
        },
      };

      const result = compiler.compile(parsedDoc, 'windsurf');

      expect(result.output.content.trim()).toBe('Content for IDE providers');
    });

    it('should execute only first matching case', () => {
      const parsedDoc: ParsedDoc = {
        source: {
          path: 'test.md',
          content: `{{#switch-provider}}
{{#case "cursor"}}First match{{/case}}
{{#case "cursor"}}Second match (should not appear){{/case}}
{{#default}}Default (should not appear){{/default}}
{{/switch-provider}}`,
          frontmatter: {},
        },
        ast: {
          blocks: [],
          imports: [],
          variables: [],
          markers: [],
        },
      };

      const result = compiler.compile(parsedDoc, 'cursor');

      expect(result.output.content.trim()).toBe('First match');
      expect(result.output.content).not.toContain('Second match');
      expect(result.output.content).not.toContain('Default');
    });

    it('should not execute default when a case matches', () => {
      const parsedDoc: ParsedDoc = {
        source: {
          path: 'test.md',
          content: `{{#switch-provider}}
{{#case "windsurf"}}Windsurf content{{/case}}
{{#case "cursor"}}Cursor content{{/case}}
{{#default}}Default content (should not appear){{/default}}
{{/switch-provider}}`,
          frontmatter: {},
        },
        ast: {
          blocks: [],
          imports: [],
          variables: [],
          markers: [],
        },
      };

      const result = compiler.compile(parsedDoc, 'cursor');

      expect(result.output.content.trim()).toBe('Cursor content');
      expect(result.output.content).not.toContain('Default content');
    });

    it('should throw error when case is used outside switch-provider', () => {
      const parsedDoc: ParsedDoc = {
        source: {
          path: 'test.md',
          content: `{{#case "cursor"}}This should fail{{/case}}`,
          frontmatter: {},
        },
        ast: {
          blocks: [],
          imports: [],
          variables: [],
          markers: [],
        },
      };

      expect(() => {
        compiler.compile(parsedDoc, 'cursor');
      }).toThrow('case helper can only be used inside a switch-provider block');
    });

    it('should throw error when default is used outside switch-provider', () => {
      const parsedDoc: ParsedDoc = {
        source: {
          path: 'test.md',
          content: `{{#default}}This should fail{{/default}}`,
          frontmatter: {},
        },
        ast: {
          blocks: [],
          imports: [],
          variables: [],
          markers: [],
        },
      };

      expect(() => {
        compiler.compile(parsedDoc, 'cursor');
      }).toThrow('default helper can only be used inside a switch-provider block');
    });
  });

  describe('Error handling', () => {
    it('should throw error for undefined helpers', () => {
      const parsedDoc: ParsedDoc = {
        source: {
          path: 'test.md',
          content: '{{nonExistentHelper}}',
          frontmatter: {},
        },
        ast: {
          blocks: [],
          imports: [],
          variables: [],
          markers: [],
        },
      };

      expect(() => {
        compiler.compile(parsedDoc, 'cursor');
      }).toThrow();
    });

    it('should handle malformed templates gracefully', () => {
      const parsedDoc: ParsedDoc = {
        source: {
          path: 'test.md',
          content: '{{#if unclosed',
          frontmatter: {},
        },
        ast: {
          blocks: [],
          imports: [],
          variables: [],
          markers: [],
        },
      };

      expect(() => {
        compiler.compile(parsedDoc, 'cursor');
      }).toThrow(HANDLEBARS_COMPILATION_FAILED_REGEX);
    });
  });
});
