/**
 * Tests for Handlebars-based Rulesets compiler
 * Phase 1: Foundation testing - basic functionality
 */

import { describe, it, expect, beforeEach } from 'bun:test';
import { HandlebarsRulesetCompiler } from '../handlebars-compiler';
import type { ParsedDoc, Provider as RulesetProvider } from '@rulesets/types';

describe('HandlebarsRulesetCompiler', () => {
  let compiler: HandlebarsRulesetCompiler;
  let mockProvider: RulesetProvider;
  let mockParsedDoc: ParsedDoc;

  beforeEach(() => {
    mockProvider = {
      id: 'cursor',
      name: 'Cursor',
      config: {
        type: 'ide',
        capabilities: ['workspaces', 'git'],
        format: 'mdc',
      },
    } as RulesetProvider;

    mockParsedDoc = {
      source: {
        path: 'test-rule.rule.md',
        content: `---
title: Test Rule
version: 1.0.0
project:
  name: TestProject
  language: TypeScript
---

# {{file.name}} v{{file.version}}

{{#instructions}}
## Coding Standards for {{project.name}}

All {{project.language}} code must follow these guidelines.
{{/instructions}}`,
        frontmatter: {
          title: 'Test Rule',
          version: '1.0.0',
          project: {
            name: 'TestProject',
            language: 'TypeScript',
          },
        },
      },
      ast: {
        blocks: [],
        imports: [],
        variables: [],
        markers: [],
      },
    };

    compiler = new HandlebarsRulesetCompiler([mockProvider]);
  });

  describe('Basic Compilation', () => {
    it('should compile a simple template with variables', () => {
      const simpleDoc: ParsedDoc = {
        source: {
          path: 'simple.rule.md',
          content: `---
title: Simple Rule
version: 2.0.0
---

# Rule for {{provider.name}}

Current provider: {{provider.id}}`,
          frontmatter: {
            title: 'Simple Rule',
            version: '2.0.0',
          },
        },
        ast: { blocks: [], imports: [], variables: [], markers: [] },
      };

      const result = compiler.compile(simpleDoc, 'cursor');

      expect(result.output.content).toContain('Rule for Cursor');
      expect(result.output.content).toContain('Current provider: cursor');
      expect(result.output.metadata.provider).toBe('cursor');
      expect(result.output.metadata.handlebarsVersion).toBe('2.0.0-handlebars');
    });

    it('should handle frontmatter correctly', () => {
      const result = compiler.compile(mockParsedDoc, 'cursor');

      expect(result.output.content).not.toContain('---');
      expect(result.output.metadata.title).toBe('Test Rule');
      expect(result.output.metadata.version).toBe('1.0.0');
      expect(result.context.destinationId).toBe('cursor');
    });

    it('should build correct context structure', () => {
      const result = compiler.compile(mockParsedDoc, 'cursor', { 
        customConfig: 'test-value' 
      });

      // Check that variables are accessible in template
      expect(result.output.content).toContain('test-rule v1.0.0');
      expect(result.output.content).toContain('TestProject');
      expect(result.output.content).toContain('TypeScript');
    });
  });

  describe('Section Helpers', () => {
    it('should convert freeform sections to XML by default', () => {
      const result = compiler.compile(mockParsedDoc, 'cursor');

      expect(result.output.content).toContain('<instructions>');
      expect(result.output.content).toContain('</instructions>');
      expect(result.output.content).toContain('Coding Standards for TestProject');
    });

    it('should handle empty sections', () => {
      const emptyDoc: ParsedDoc = {
        source: {
          path: 'empty.rule.md',
          content: '{{#empty-section}}{{/empty-section}}',
          frontmatter: {},
        },
        ast: { blocks: [], imports: [], variables: [], markers: [] },
      };

      const result = compiler.compile(emptyDoc, 'cursor');
      expect(result.output.content).toContain('<empty_section>');
      expect(result.output.content).toContain('</empty_section>');
    });
  });

  describe('Provider Conditionals', () => {
    it('should include content for matching provider', () => {
      const conditionalDoc: ParsedDoc = {
        source: {
          path: 'conditional.rule.md',
          content: `{{#if-provider "cursor"}}
Content for Cursor
{{/if-provider}}

{{#if-provider "claude-code"}}
Content for Claude Code
{{/if-provider}}`,
          frontmatter: {},
        },
        ast: { blocks: [], imports: [], variables: [], markers: [] },
      };

      const result = compiler.compile(conditionalDoc, 'cursor');
      
      expect(result.output.content).toContain('Content for Cursor');
      expect(result.output.content).not.toContain('Content for Claude Code');
    });

    it('should exclude content for non-matching provider', () => {
      const conditionalDoc: ParsedDoc = {
        source: {
          path: 'conditional.rule.md',
          content: `{{#unless-provider "claude-code"}}
Not for Claude Code
{{/unless-provider}}

{{#unless-provider "cursor"}}
Not for Cursor  
{{/unless-provider}}`,
          frontmatter: {},
        },
        ast: { blocks: [], imports: [], variables: [], markers: [] },
      };

      const result = compiler.compile(conditionalDoc, 'cursor');
      
      expect(result.output.content).toContain('Not for Claude Code');
      expect(result.output.content).not.toContain('Not for Cursor');
    });

    it('should handle multiple providers in conditional', () => {
      const multiDoc: ParsedDoc = {
        source: {
          path: 'multi.rule.md',
          content: `{{#if-provider "cursor,windsurf"}}
Content for IDEs
{{/if-provider}}`,
          frontmatter: {},
        },
        ast: { blocks: [], imports: [], variables: [], markers: [] },
      };

      const result = compiler.compile(multiDoc, 'cursor');
      expect(result.output.content).toContain('Content for IDEs');
    });
  });

  describe('Utility Helpers', () => {
    it('should convert kebab-case to snake_case', () => {
      const kebabDoc: ParsedDoc = {
        source: {
          path: 'kebab.rule.md',
          content: `{{kebab-to-snake "user-instructions"}}`,
          frontmatter: {},
        },
        ast: { blocks: [], imports: [], variables: [], markers: [] },
      };

      const result = compiler.compile(kebabDoc, 'cursor');
      expect(result.output.content).toContain('user_instructions');
    });
  });

  describe('Error Handling', () => {
    it('should throw error for unknown provider', () => {
      expect(() => {
        compiler.compile(mockParsedDoc, 'unknown-provider');
      }).toThrow('Unknown provider: unknown-provider');
    });

    it('should handle compilation errors gracefully', () => {
      const malformedDoc: ParsedDoc = {
        source: {
          path: 'malformed.rule.md',
          content: '{{#unclosed-block}}content',
          frontmatter: {},
        },
        ast: { blocks: [], imports: [], variables: [], markers: [] },
      };

      expect(() => {
        compiler.compile(malformedDoc, 'cursor');
      }).toThrow(/Handlebars compilation failed/);
    });
  });

  describe('Backward Compatibility', () => {
    it('should maintain output structure compatibility', () => {
      const result = compiler.compile(mockParsedDoc, 'cursor');

      // Check required structure
      expect(result).toHaveProperty('source');
      expect(result).toHaveProperty('ast');
      expect(result).toHaveProperty('output');
      expect(result).toHaveProperty('context');
      
      expect(result.output).toHaveProperty('content');
      expect(result.output).toHaveProperty('metadata');
      expect(result.context).toHaveProperty('destinationId');
      expect(result.context).toHaveProperty('config');
    });

    it('should preserve legacy context fields', () => {
      const result = compiler.compile(mockParsedDoc, 'cursor', { legacy: true });

      expect(result.context.destinationId).toBe('cursor');
      expect(result.context.config).toEqual({ legacy: true });
    });
  });
});