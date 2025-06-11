// TLDR: Unit tests for the Rulesets linter module (mixd-v0)
import { describe, it, expect } from 'vitest';
import { lint } from '../index';
import type { ParsedDoc } from '../../interfaces';

describe('linter', () => {
  describe('lint', () => {
    it('should pass a valid document with complete frontmatter', async () => {
      const parsedDoc: ParsedDoc = {
        source: {
          content: '---\nmixdown: v0\ntitle: Test\ndescription: Test description\n---\n\n# Content',
          frontmatter: {
            mixdown: 'v0',
            title: 'Test',
            description: 'Test description',
          },
        },
        ast: {
          stems: [],
          imports: [],
          variables: [],
          markers: [],
        },
      };

      const results = await lint(parsedDoc);
      expect(results).toHaveLength(0);
    });

    it('should warn when no frontmatter is present', async () => {
      const parsedDoc: ParsedDoc = {
        source: {
          content: '# Content without frontmatter',
        },
        ast: {
          stems: [],
          imports: [],
          variables: [],
          markers: [],
        },
      };

      const results = await lint(parsedDoc);
      expect(results).toHaveLength(1);
      expect(results[0].severity).toBe('warning');
      expect(results[0].message).toContain('No frontmatter found');
    });

    it('should error when mixdown version is missing', async () => {
      const parsedDoc: ParsedDoc = {
        source: {
          content: '---\ntitle: Test\n---\n\n# Content',
          frontmatter: {
            title: 'Test',
          },
        },
        ast: {
          stems: [],
          imports: [],
          variables: [],
          markers: [],
        },
      };

      const results = await lint(parsedDoc);
      const mixdownError = results.find(r => r.message.includes('Missing required "mixdown" field'));
      expect(mixdownError).toBeDefined();
      expect(mixdownError!.severity).toBe('error');
    });

    it('should error when mixdown field is not a string', async () => {
      const parsedDoc: ParsedDoc = {
        source: {
          content: '---\nmixdown: 123\n---\n\n# Content',
          frontmatter: {
            mixdown: 123,
          },
        },
        ast: {
          stems: [],
          imports: [],
          variables: [],
          markers: [],
        },
      };

      const results = await lint(parsedDoc);
      const typeError = results.find(r => r.message.includes('Invalid "mixdown" field type'));
      expect(typeError).toBeDefined();
      expect(typeError!.severity).toBe('error');
    });

    it('should validate destinations structure', async () => {
      const parsedDoc: ParsedDoc = {
        source: {
          content: '---\nmixdown: v0\ndestinations: ["cursor", "windsurf"]\n---\n\n# Content',
          frontmatter: {
            mixdown: 'v0',
            destinations: ['cursor', 'windsurf'],
          },
        },
        ast: {
          stems: [],
          imports: [],
          variables: [],
          markers: [],
        },
      };

      const results = await lint(parsedDoc);
      const destError = results.find(r => r.message.includes('Invalid "destinations" field'));
      expect(destError).toBeDefined();
      expect(destError!.severity).toBe('error');
    });

    it('should warn about unknown destinations when configured', async () => {
      const parsedDoc: ParsedDoc = {
        source: {
          content: '---\nmixdown: v0\ndestinations:\n  unknown-dest:\n    path: "/test"\n---\n\n# Content',
          frontmatter: {
            mixdown: 'v0',
            destinations: {
              'unknown-dest': { path: '/test' },
            },
          },
        },
        ast: {
          stems: [],
          imports: [],
          variables: [],
          markers: [],
        },
      };

      const results = await lint(parsedDoc, {
        allowedDestinations: ['cursor', 'windsurf'],
      });

      const destWarning = results.find(r => r.message.includes('Unknown destination'));
      expect(destWarning).toBeDefined();
      expect(destWarning!.severity).toBe('warning');
    });

    it('should provide info suggestions for missing title and description', async () => {
      const parsedDoc: ParsedDoc = {
        source: {
          content: '---\nmixdown: v0\n---\n\n# Content',
          frontmatter: {
            mixdown: 'v0',
          },
        },
        ast: {
          stems: [],
          imports: [],
          variables: [],
          markers: [],
        },
      };

      const results = await lint(parsedDoc);
      const titleInfo = results.find(r => r.message.includes('Consider adding a "title"'));
      const descInfo = results.find(r => r.message.includes('Consider adding a "description"'));
      
      expect(titleInfo).toBeDefined();
      expect(titleInfo!.severity).toBe('info');
      expect(descInfo).toBeDefined();
      expect(descInfo!.severity).toBe('info');
    });

    it('should include parsing errors in lint results', async () => {
      const parsedDoc: ParsedDoc = {
        source: {
          content: '---\ninvalid yaml\n---\n\n# Content',
          frontmatter: {},
        },
        ast: {
          stems: [],
          imports: [],
          variables: [],
          markers: [],
        },
        errors: [
          {
            message: 'Failed to parse frontmatter YAML',
            line: 2,
            column: 1,
          },
        ],
      };

      const results = await lint(parsedDoc);
      const parseError = results.find(r => r.message.includes('Failed to parse frontmatter YAML'));
      expect(parseError).toBeDefined();
      expect(parseError!.severity).toBe('error');
      expect(parseError!.line).toBe(2);
    });
  });
});