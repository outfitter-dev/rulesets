// TLDR: Unit tests for the Rulesets linter module (Rulesets v0)
import { describe, it, expect } from 'vitest';
import { lint } from '../index';
import type { ParsedDoc } from '../../interfaces';

describe('linter', () => {
  describe('lint', () => {
    it('should pass a valid document with complete frontmatter', async () => {
      const parsedDoc: ParsedDoc = {
        source: {
          content: '---\nrulesets: { version: "0.1.0" }\ntitle: Test\ndescription: Test description\n---\n\n# Content',
          frontmatter: {
            rulesets: { version: '0.1.0' },
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

    it('should error when rulesets version is missing', async () => {
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
      const rulesetsError = results.find(r => r.message.includes('Missing required'));
      expect(rulesetsError).toBeDefined();
      expect(rulesetsError!.severity).toBe('error');
    });

    it('should error when rulesets field is invalid', async () => {
      const parsedDoc: ParsedDoc = {
        source: {
          content: '---\nrulesets: 123\n---\n\n# Content',
          frontmatter: {
            rulesets: 123,
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
      const typeError = results.find(r => r.message.includes('Invalid'));
      expect(typeError).toBeDefined();
      expect(typeError!.severity).toBe('error');
    });

    it('should validate destinations structure', async () => {
      const parsedDoc: ParsedDoc = {
        source: {
          content: '---\nrulesets: { version: "0.1.0" }\ndestinations: ["cursor", "windsurf"]\n---\n\n# Content',
          frontmatter: {
            rulesets: { version: '0.1.0' },
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
      const destError = results.find(r => r.message.includes('Invalid Destination configurations'));
      expect(destError).toBeDefined();
      expect(destError!.severity).toBe('error');
    });

    it('should warn about unknown destinations when configured', async () => {
      const parsedDoc: ParsedDoc = {
        source: {
          content: '---\nrulesets: { version: "0.1.0" }\ndestinations:\n  unknown-dest:\n    path: "/test"\n---\n\n# Content',
          frontmatter: {
            rulesets: { version: '0.1.0' },
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
          content: '---\nrulesets: { version: "0.1.0" }\n---\n\n# Content',
          frontmatter: {
            rulesets: { version: '0.1.0' },
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
      const titleInfo = results.find(r => r.message.includes('Consider adding a Document title'));
      const descInfo = results.find(r => r.message.includes('Consider adding a Document description'));
      
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
describe('additional edge-case scenarios', () => {
    it('should allow missing rulesets when requireRulesetsVersion=false', async () => {
      const parsedDoc: ParsedDoc = {
        source: { content: '---\\ntitle: Test\\n---\\n\\n# Content', frontmatter: { title: 'Test' } },
        ast: { stems: [], imports: [], variables: [], markers: [] },
      };
      const results = await lint(parsedDoc, { requireRulesetsVersion: false });
      expect(results.find(r => r.message.includes('Rulesets'))).toBeUndefined();
    });

    it('should NOT warn when all destinations are allowed', async () => {
      const parsedDoc: ParsedDoc = {
        source: {
          content: '---\\nrulesets: { version: \\"0.1.0\\" }\\ndestinations:\\n  cursor: { path: \\"/\\" }\\n  windsurf: { path: \\"/another\\" }\\n---\\n',
          frontmatter: {
            rulesets: { version: '0.1.0' },
            destinations: { cursor: { path: '/' }, windsurf: { path: '/another' } },
          },
        },
        ast: { stems: [], imports: [], variables: [], markers: [] },
      };
      const results = await lint(parsedDoc, { allowedDestinations: ['cursor', 'windsurf'] });
      expect(results.some(r => r.message.includes('Unknown destination'))).toBe(false);
    });

    it('should error when rulesets.version is empty string', async () => {
      const parsedDoc: ParsedDoc = {
        source: { content: '---\\nrulesets: { version: \\"\\" }\\n---', frontmatter: { rulesets: { version: '' } } },
        ast: { stems: [], imports: [], variables: [], markers: [] },
      };
      const results = await lint(parsedDoc);
      // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
      const err = results.find(r => r.message.includes('Invalid') && r.message.includes('Rulesets'));
      expect(err).toBeDefined();
      expect(err!.severity).toBe('error');
    });

    it('should not provide title/description suggestions when present', async () => {
      const parsedDoc: ParsedDoc = {
        source: {
          content: '---\\nrulesets: { version: \\"0.1.0\\" }\\ntitle: My Doc\\ndescription: Cool\\n---',
          frontmatter: { rulesets: { version: '0.1.0' }, title: 'My Doc', description: 'Cool' },
        },
        ast: { stems: [], imports: [], variables: [], markers: [] },
      };
      const results = await lint(parsedDoc);
      expect(results.some(r => r.message.includes('Document title'))).toBe(false);
      expect(results.some(r => r.message.includes('Document description'))).toBe(false);
    });

    it('should handle very large documents without overflowing stack', async () => {
      const bigBody = '# Heading\\n' + 'Paragraph\\n'.repeat(20_000);
      const parsedDoc: ParsedDoc = {
        source: {
          content: '---\\nrulesets: { version: \\"0.1.0\\" }\\ntitle: Big\\ndescription: Big doc\\n---\\n' + bigBody,
          frontmatter: { rulesets: { version: '0.1.0' }, title: 'Big', description: 'Big doc' },
        },
        ast: { stems: [], imports: [], variables: [], markers: [] },
      };
      await expect(lint(parsedDoc)).resolves.not.toThrow();
    });
  });