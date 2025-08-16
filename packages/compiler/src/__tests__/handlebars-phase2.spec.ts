/**
 * Tests for Handlebars Phase 2 features
 * Enhanced conditionals, capabilities, and complex logic
 */

import { describe, it, expect, beforeEach } from 'bun:test';
import { HandlebarsRulesetCompiler } from '../handlebars-compiler';
import type { ParsedDoc, Provider as RulesetProvider } from '@rulesets/types';

describe('HandlebarsRulesetCompiler - Phase 2 Features', () => {
  let compiler: HandlebarsRulesetCompiler;
  let mockProvider: RulesetProvider;

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

    compiler = new HandlebarsRulesetCompiler([mockProvider]);
  });

  describe('Enhanced Provider Conditionals', () => {
    it('should support switch-case provider logic', () => {
      const switchDoc: ParsedDoc = {
        source: {
          path: 'switch.rule.md',
          content: `{{#switch-provider}}
  {{#case "cursor,windsurf"}}
    Content for IDEs
  {{/case}}
  
  {{#case "claude-code"}}
    Content for CLI
  {{/case}}
  
  {{#default}}
    Generic content
  {{/default}}
{{/switch-provider}}`,
          frontmatter: {},
        },
        ast: { blocks: [], imports: [], variables: [], markers: [] },
      };

      const result = compiler.compile(switchDoc, 'cursor');
      
      expect(result.output.content).toContain('Content for IDEs');
      expect(result.output.content).not.toContain('Content for CLI');
      expect(result.output.content).not.toContain('Generic content');
    });

    it('should fall back to default case when no match', () => {
      const switchDoc: ParsedDoc = {
        source: {
          path: 'switch.rule.md',
          content: `{{#switch-provider}}
  {{#case "claude-code,windsurf"}}
    CLI and Windsurf content
  {{/case}}
  
  {{#default}}
    Default content for {{provider.name}}
  {{/default}}
{{/switch-provider}}`,
          frontmatter: {},
        },
        ast: { blocks: [], imports: [], variables: [], markers: [] },
      };

      const result = compiler.compile(switchDoc, 'cursor');
      
      expect(result.output.content).not.toContain('CLI and Windsurf content');
      expect(result.output.content).toContain('Default content for Cursor');
    });
  });

  describe('Capability-Based Conditionals', () => {
    it('should support has-capability helper', () => {
      const capabilityDoc: ParsedDoc = {
        source: {
          path: 'capability.rule.md',
          content: `{{#has-capability "workspaces"}}
## Workspace Configuration
Configure your workspace settings
{{/has-capability}}

{{#has-capability "debugging"}}
## Debug Settings  
Set up debugging configuration
{{/has-capability}}

{{#has-capability "unknown-feature"}}
This should not appear
{{/has-capability}}`,
          frontmatter: {},
        },
        ast: { blocks: [], imports: [], variables: [], markers: [] },
      };

      const result = compiler.compile(capabilityDoc, 'cursor');
      
      expect(result.output.content).toContain('Workspace Configuration');
      expect(result.output.content).toContain('Debug Settings'); // Auto-detected for IDE
      expect(result.output.content).not.toContain('This should not appear');
    });

    it('should auto-detect capabilities based on provider type', () => {
      const cliProvider: RulesetProvider = {
        id: 'claude-code',
        name: 'Claude Code',
        config: {
          type: 'cli',
          capabilities: ['terminal'],
          format: 'md',
        },
      } as RulesetProvider;

      const cliCompiler = new HandlebarsRulesetCompiler([cliProvider]);
      
      const capabilityDoc: ParsedDoc = {
        source: {
          path: 'cli-test.rule.md',
          content: `{{#has-capability "scripting"}}
CLI scripting capability detected
{{/has-capability}}

{{#has-capability "automation"}}
Automation support available
{{/has-capability}}`,
          frontmatter: {},
        },
        ast: { blocks: [], imports: [], variables: [], markers: [] },
      };

      const result = cliCompiler.compile(capabilityDoc, 'claude-code');
      
      expect(result.output.content).toContain('CLI scripting capability detected');
      expect(result.output.content).toContain('Automation support available');
    });
  });

  describe('Complex Logic Helpers', () => {
    it('should support eq helper for comparisons', () => {
      const eqDoc: ParsedDoc = {
        source: {
          path: 'eq-test.rule.md',
          content: `{{#if (eq provider.type "ide")}}
This is an IDE provider
{{/if}}

{{#if (eq file.version "1.0.0")}}
Version 1.0.0 detected
{{/if}}`,
          frontmatter: { version: '1.0.0' },
        },
        ast: { blocks: [], imports: [], variables: [], markers: [] },
      };

      const result = compiler.compile(eqDoc, 'cursor');
      
      expect(result.output.content).toContain('This is an IDE provider');
      expect(result.output.content).toContain('Version 1.0.0 detected');
    });

    it('should support or helper for multiple conditions', () => {
      const orDoc: ParsedDoc = {
        source: {
          path: 'or-test.rule.md',
          content: `{{#if (or (eq provider.id "cursor") (eq provider.id "windsurf"))}}
IDE-specific content
{{/if}}

{{#if (or (has-capability "workspaces") (has-capability "projects"))}}
Project management features available
{{/if}}`,
          frontmatter: {},
        },
        ast: { blocks: [], imports: [], variables: [], markers: [] },
      };

      const result = compiler.compile(orDoc, 'cursor');
      
      expect(result.output.content).toContain('IDE-specific content');
      expect(result.output.content).toContain('Project management features available');
    });

    it('should support and helper for all conditions', () => {
      const andDoc: ParsedDoc = {
        source: {
          path: 'and-test.rule.md',
          content: `{{#if (and (eq provider.type "ide") (has-capability "workspaces"))}}
Advanced IDE with workspace support
{{/if}}

{{#if (and (eq provider.id "cursor") (eq file.version "2.0.0"))}}
This should not appear
{{/if}}`,
          frontmatter: { version: '1.0.0' },
        },
        ast: { blocks: [], imports: [], variables: [], markers: [] },
      };

      const result = compiler.compile(andDoc, 'cursor');
      
      expect(result.output.content).toContain('Advanced IDE with workspace support');
      expect(result.output.content).not.toContain('This should not appear');
    });
  });

  describe('Enhanced Context Generation', () => {
    it('should flatten nested frontmatter for template access', () => {
      const nestedDoc: ParsedDoc = {
        source: {
          path: 'nested.rule.md',
          content: `## {{project.name}} Configuration

Language: {{project.language}}
Framework: {{project.framework}}

Flattened access:
- Name: {{file.frontmatter.project.name}}
- Type: {{file.frontmatter.config.type}}
- Version: {{file.frontmatter.config.version}}`,
          frontmatter: {
            project: {
              name: 'Advanced Project',
              language: 'TypeScript',
              framework: 'React'
            },
            config: {
              type: 'web-app',
              version: '2.1.0'
            }
          },
        },
        ast: { blocks: [], imports: [], variables: [], markers: [] },
      };

      const result = compiler.compile(nestedDoc, 'cursor');
      
      expect(result.output.content).toContain('Advanced Project Configuration');
      expect(result.output.content).toContain('Language: TypeScript');
      expect(result.output.content).toContain('Framework: React');
      expect(result.output.content).toContain('Name: Advanced Project');
      expect(result.output.content).toContain('Type: web-app');
      expect(result.output.content).toContain('Version: 2.1.0');
    });

    it('should extract user-defined variables', () => {
      const variablesDoc: ParsedDoc = {
        source: {
          path: 'variables.rule.md',
          content: `## {{variables.projectName}} Standards

Custom setting: {{custom.theme}}
Debug mode: {{variables.debug}}`,
          frontmatter: {
            variables: {
              projectName: 'My Awesome Project',
              debug: true
            },
            custom: {
              theme: 'dark-mode',
              author: 'Team Lead'
            }
          },
        },
        ast: { blocks: [], imports: [], variables: [], markers: [] },
      };

      const result = compiler.compile(variablesDoc, 'cursor');
      
      expect(result.output.content).toContain('My Awesome Project Standards');
      expect(result.output.content).toContain('Custom setting: dark-mode');
      expect(result.output.content).toContain('Debug mode: true');
    });

    it('should deep merge project configuration', () => {
      const projectConfig = {
        name: 'Config Project',
        environment: 'production',
        project: {
          database: 'PostgreSQL',
          cache: 'Redis'
        }
      };

      const mergeDoc: ParsedDoc = {
        source: {
          path: 'merge.rule.md',
          content: `# {{project.name}} Setup

Environment: {{project.environment}}
Database: {{project.database}}
Cache: {{project.cache}}
Language: {{project.language}}`,
          frontmatter: {
            project: {
              name: 'Frontmatter Project',
              language: 'Go'
            }
          },
        },
        ast: { blocks: [], imports: [], variables: [], markers: [] },
      };

      const result = compiler.compile(mergeDoc, 'cursor', projectConfig);
      
      // Frontmatter should override config
      expect(result.output.content).toContain('Frontmatter Project Setup');
      expect(result.output.content).toContain('Environment: production');
      expect(result.output.content).toContain('Database: PostgreSQL');
      expect(result.output.content).toContain('Cache: Redis');
      expect(result.output.content).toContain('Language: Go');
    });
  });

  describe('Error Handling', () => {
    it('should handle case without switch', () => {
      const invalidDoc: ParsedDoc = {
        source: {
          path: 'invalid.rule.md',
          content: `{{#case "cursor"}}This should fail{{/case}}`,
          frontmatter: {},
        },
        ast: { blocks: [], imports: [], variables: [], markers: [] },
      };

      expect(() => {
        compiler.compile(invalidDoc, 'cursor');
      }).toThrow('case helper must be used within switch helper');
    });
  });
});