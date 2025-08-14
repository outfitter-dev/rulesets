/**
 * All Providers Integration Tests
 *
 * Tests each provider individually and collectively to ensure proper functionality,
 * output format compliance, and provider-specific features work correctly.
 */

import { promises as fs } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import {
  afterAll,
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from 'vitest';
import {
  AmpProvider,
  ClaudeCodeProvider,
  CodexProvider,
  ConsoleLogger,
  CursorProvider,
  getAllProviders,
  getProvider,
  getProviderIds,
  OpenCodeProvider,
  type RulesetConfig,
  runRulesetsV0,
  WindsurfProvider,
} from '../../src';

// Create real temporary directory for integration tests
const TEST_DIR = path.join(tmpdir(), `rulesets-providers-${Date.now()}`);

describe('All Providers Integration Tests', () => {
  let mockLogger: ConsoleLogger;
  let testProjectDir: string;

  beforeAll(async () => {
    // Create test directory structure
    await fs.mkdir(TEST_DIR, { recursive: true });
  });

  afterAll(async () => {
    // Clean up test directory
    try {
      await fs.rm(TEST_DIR, { recursive: true, force: true });
    } catch (_error) {
      // Ignore errors during cleanup
    }
  });

  beforeEach(async () => {
    mockLogger = new ConsoleLogger();
    vi.spyOn(mockLogger, 'info').mockImplementation(() => {
      // Mock implementation for testing
    });
    vi.spyOn(mockLogger, 'debug').mockImplementation(() => {
      // Mock implementation for testing
    });
    vi.spyOn(mockLogger, 'warn').mockImplementation(() => {
      // Mock implementation for testing
    });
    vi.spyOn(mockLogger, 'error').mockImplementation(() => {
      // Mock implementation for testing
    });

    // Create unique test project directory for each test
    testProjectDir = path.join(
      TEST_DIR,
      `providers-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`
    );
    await fs.mkdir(testProjectDir, { recursive: true });

    // Change to test directory for relative path operations
    process.chdir(testProjectDir);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Provider Registry and Discovery', () => {
    it('should have all 6 expected providers registered', () => {
      const providerIds = getProviderIds();

      expect(providerIds).toHaveLength(6);
      expect(providerIds).toContain('cursor');
      expect(providerIds).toContain('windsurf');
      expect(providerIds).toContain('claude-code');
      expect(providerIds).toContain('codex-cli');
      expect(providerIds).toContain('amp');
      expect(providerIds).toContain('opencode');
    });

    it('should provide correct provider instances', () => {
      const cursorProvider = getProvider('cursor');
      const windsurfProvider = getProvider('windsurf');
      const claudeCodeProvider = getProvider('claude-code');
      const codexProvider = getProvider('codex-cli');
      const ampProvider = getProvider('amp');
      const openCodeProvider = getProvider('opencode');

      expect(cursorProvider).toBeInstanceOf(CursorProvider);
      expect(windsurfProvider).toBeInstanceOf(WindsurfProvider);
      expect(claudeCodeProvider).toBeInstanceOf(ClaudeCodeProvider);
      expect(codexProvider).toBeInstanceOf(CodexProvider);
      expect(ampProvider).toBeInstanceOf(AmpProvider);
      expect(openCodeProvider).toBeInstanceOf(OpenCodeProvider);
    });

    it('should return undefined for unknown providers', () => {
      const unknownProvider = getProvider('unknown-provider');
      expect(unknownProvider).toBeUndefined();
    });

    it('should provide all providers through getAllProviders', () => {
      const allProviders = getAllProviders();

      expect(allProviders).toHaveLength(6);

      const providerTypes = allProviders.map((p) => p.constructor.name);
      expect(providerTypes).toContain('CursorProvider');
      expect(providerTypes).toContain('WindsurfProvider');
      expect(providerTypes).toContain('ClaudeCodeProvider');
      expect(providerTypes).toContain('CodexProvider');
      expect(providerTypes).toContain('AmpProvider');
      expect(providerTypes).toContain('OpenCodeProvider');
    });
  });

  describe('Individual Provider Testing', () => {
    const createTestContent = (providerName: string) => `---
ruleset:
  version: "0.1.0"
destinations:
  ${providerName}:
    outputPath: ".${providerName}/individual-test.${providerName === 'cursor' ? 'mdc' : 'md'}"
---

# ${providerName.charAt(0).toUpperCase() + providerName.slice(1)} Provider Test

{{instructions}}
These are comprehensive instructions for the ${providerName} provider.
They should be preserved exactly as-is in the output.
{{/instructions}}

## Code Standards

- Use TypeScript exclusively
- Follow ESLint configuration
- Write comprehensive tests
- Document all public APIs

{{examples}}
\`\`\`typescript
// ${providerName} specific example
interface ${providerName.charAt(0).toUpperCase() + providerName.slice(1)}Config {
  enabled: boolean;
  outputPath: string;
}

function configure${providerName.charAt(0).toUpperCase() + providerName.slice(1)}(config: ${providerName.charAt(0).toUpperCase() + providerName.slice(1)}Config): void {
  console.log(\`Configuring ${providerName} with:\`, config);
}
\`\`\`
{{/examples}}

{{variables}}
Current destination: {{$destination}}
Processing file: {{$file}}
{{/variables}}

## Architecture Guidelines

### File Organization
- \`src/\` - Source code
- \`tests/\` - Test files  
- \`docs/\` - Documentation

### Naming Conventions
- PascalCase for classes
- camelCase for functions
- kebab-case for files
- UPPER_CASE for constants

## Testing Requirements

All code must have:
1. Unit tests with 90%+ coverage
2. Integration tests for critical paths
3. E2E tests for user workflows
4. Performance benchmarks for hot paths

## Performance Guidelines

- Optimize for developer experience first
- Measure before optimizing
- Cache expensive operations
- Use lazy loading where appropriate
- Profile memory usage regularly
`;

    it('should process Cursor provider correctly', async () => {
      const sourceContent = createTestContent('cursor');
      const sourceFilePath = path.join(
        testProjectDir,
        'cursor-test.ruleset.md'
      );
      await fs.writeFile(sourceFilePath, sourceContent);

      await runRulesetsV0(sourceFilePath, mockLogger);

      const outputPath = path.join(
        testProjectDir,
        '.cursor/individual-test.mdc'
      );
      await expect(fs.access(outputPath)).resolves.not.toThrow();

      const outputContent = await fs.readFile(outputPath, 'utf8');

      // Verify Rulesets syntax preservation
      expect(outputContent).toContain('{{instructions}}');
      expect(outputContent).toContain('{{/instructions}}');
      expect(outputContent).toContain('{{examples}}');
      expect(outputContent).toContain('{{$destination}}');

      // Verify content integrity
      expect(outputContent).toContain('Cursor Provider Test');
      expect(outputContent).toContain('TypeScript exclusively');
      expect(outputContent).toContain('interface CursorConfig');
      expect(outputContent).toContain('Architecture Guidelines');
      expect(outputContent).toContain('Performance Guidelines');

      // Verify proper code block handling
      expect(outputContent).toContain('```typescript');
      expect(outputContent).toContain('function configureCursor');
    });

    it('should process Windsurf provider correctly', async () => {
      const sourceContent = createTestContent('windsurf');
      const sourceFilePath = path.join(
        testProjectDir,
        'windsurf-test.ruleset.md'
      );
      await fs.writeFile(sourceFilePath, sourceContent);

      await runRulesetsV0(sourceFilePath, mockLogger);

      const outputPath = path.join(
        testProjectDir,
        '.windsurf/individual-test.md'
      );
      await expect(fs.access(outputPath)).resolves.not.toThrow();

      const outputContent = await fs.readFile(outputPath, 'utf8');

      expect(outputContent).toContain('Windsurf Provider Test');
      expect(outputContent).toContain('{{instructions}}');
      expect(outputContent).toContain('interface WindsurfConfig');
      expect(outputContent).toContain('function configureWindsurf');
    });

    it('should process Claude Code provider correctly', async () => {
      const sourceContent = createTestContent('claude-code');
      const sourceFilePath = path.join(
        testProjectDir,
        'claude-code-test.ruleset.md'
      );
      await fs.writeFile(sourceFilePath, sourceContent);

      await runRulesetsV0(sourceFilePath, mockLogger);

      const outputPath = path.join(
        testProjectDir,
        '.claude-code/individual-test.md'
      );
      await expect(fs.access(outputPath)).resolves.not.toThrow();

      const outputContent = await fs.readFile(outputPath, 'utf8');

      expect(outputContent).toContain('Claude-code Provider Test');
      expect(outputContent).toContain('{{instructions}}');
      expect(outputContent).toContain('interface Claude-codeConfig');
      expect(outputContent).toContain('function configureClaude-code');
    });

    it('should process Codex CLI provider correctly', async () => {
      const sourceContent = createTestContent('codex-cli');
      const sourceFilePath = path.join(testProjectDir, 'codex-test.ruleset.md');
      await fs.writeFile(sourceFilePath, sourceContent);

      await runRulesetsV0(sourceFilePath, mockLogger);

      const outputPath = path.join(
        testProjectDir,
        '.codex-cli/individual-test.md'
      );
      await expect(fs.access(outputPath)).resolves.not.toThrow();

      const outputContent = await fs.readFile(outputPath, 'utf8');

      expect(outputContent).toContain('Codex-cli Provider Test');
      expect(outputContent).toContain('{{instructions}}');
      expect(outputContent).toContain('interface Codex-cliConfig');
    });

    it('should process Amp provider correctly', async () => {
      const sourceContent = createTestContent('amp');
      const sourceFilePath = path.join(testProjectDir, 'amp-test.ruleset.md');
      await fs.writeFile(sourceFilePath, sourceContent);

      await runRulesetsV0(sourceFilePath, mockLogger);

      const outputPath = path.join(testProjectDir, '.amp/individual-test.md');
      await expect(fs.access(outputPath)).resolves.not.toThrow();

      const outputContent = await fs.readFile(outputPath, 'utf8');

      expect(outputContent).toContain('Amp Provider Test');
      expect(outputContent).toContain('{{instructions}}');
      expect(outputContent).toContain('interface AmpConfig');
    });

    it('should process OpenCode provider correctly', async () => {
      const sourceContent = createTestContent('opencode');
      const sourceFilePath = path.join(
        testProjectDir,
        'opencode-test.ruleset.md'
      );
      await fs.writeFile(sourceFilePath, sourceContent);

      await runRulesetsV0(sourceFilePath, mockLogger);

      const outputPath = path.join(
        testProjectDir,
        '.opencode/individual-test.md'
      );
      await expect(fs.access(outputPath)).resolves.not.toThrow();

      const outputContent = await fs.readFile(outputPath, 'utf8');

      expect(outputContent).toContain('Opencode Provider Test');
      expect(outputContent).toContain('{{instructions}}');
      expect(outputContent).toContain('interface OpencodeConfig');
    });
  });

  describe('Provider Output Format Validation', () => {
    it('should maintain consistent output format across all providers', async () => {
      const sourceContent = `---
ruleset:
  version: "0.1.0"
---

# Format Consistency Test

{{instructions}}
Instructions block for testing format consistency.
{{/instructions}}

## Content

Standard markdown content with **bold** and *italic* text.

{{examples}}
\`\`\`javascript
console.log('Hello, world!');
\`\`\`
{{/examples}}

- List item 1
- List item 2
- List item 3

| Column 1 | Column 2 | Column 3 |
|----------|----------|----------|
| Value 1  | Value 2  | Value 3  |

> Blockquote content for testing.

Variables: {{$destination}} and {{$file}}
`;

      const sourceFilePath = path.join(
        testProjectDir,
        'format-test.ruleset.md'
      );
      await fs.writeFile(sourceFilePath, sourceContent);

      await runRulesetsV0(sourceFilePath, mockLogger);

      // Check outputs from all default providers
      const expectedOutputs = [
        '.ruleset/dist/cursor/my-rules.md',
        '.ruleset/dist/windsurf/my-rules.md',
        '.ruleset/dist/claude-code/my-rules.md',
        '.ruleset/dist/codex-cli/my-rules.md',
        '.ruleset/dist/amp/my-rules.md',
        '.ruleset/dist/opencode/my-rules.md',
      ];

      const outputs: { provider: string; content: string }[] = [];

      for (const outputPath of expectedOutputs) {
        const fullPath = path.join(testProjectDir, outputPath);
        await expect(fs.access(fullPath)).resolves.not.toThrow();

        const content = await fs.readFile(fullPath, 'utf8');
        const providerName = outputPath.split('/')[2]; // Extract provider name
        outputs.push({ provider: providerName, content });
      }

      // Verify all outputs contain required elements
      for (const output of outputs) {
        // Rulesets syntax preservation
        expect(output.content).toContain('{{instructions}}');
        expect(output.content).toContain('{{/instructions}}');
        expect(output.content).toContain('{{examples}}');
        expect(output.content).toContain('{{$destination}}');

        // Markdown content preservation
        expect(output.content).toContain('# Format Consistency Test');
        expect(output.content).toContain('**bold**');
        expect(output.content).toContain('*italic*');
        expect(output.content).toContain('```javascript');
        expect(output.content).toContain('console.log');
        expect(output.content).toContain('- List item 1');
        expect(output.content).toContain('| Column 1 |');
        expect(output.content).toContain('> Blockquote content');
      }

      // Verify content consistency across providers (should be identical)
      const baseContent = outputs[0].content;
      for (let i = 1; i < outputs.length; i++) {
        expect(outputs[i].content).toBe(baseContent);
      }
    });

    it('should handle special characters and edge cases consistently', async () => {
      const sourceContent = `---
ruleset:
  version: "0.1.0"
---

# Special Characters Test

{{instructions}}
Testing special characters: & < > " ' \` ~ @ # $ % ^ * ( ) [ ] { } | \\ / ? ! + = - _ . , ; :
Unicode: 🚀 ✨ 💯 🔥 ⚡ 🎯
{{/instructions}}

## Code with Special Characters

{{examples}}
\`\`\`typescript
const regex = /[\\w\\-\\.]+@[\\w\\-\\.]+\\.[a-zA-Z]{2,}/g;
const template = \`Hello \${name}, you have \${count} messages!\`;
const path = './src/**/*.{ts,tsx,js,jsx}';
\`\`\`
{{/examples}}

## Edge Cases

- Empty line follows:

- Line with only spaces:    
- Line with tabs:		
- Mixed whitespace: 	  	 

{{variables}}
Special chars in variables: {{$destination}} & {{$file}}
{{/variables}}
`;

      const sourceFilePath = path.join(
        testProjectDir,
        'special-chars.ruleset.md'
      );
      await fs.writeFile(sourceFilePath, sourceContent);

      await runRulesetsV0(sourceFilePath, mockLogger);

      // Test a subset of providers to ensure special character handling
      const testProviders = ['cursor', 'windsurf', 'claude-code'];

      for (const providerId of testProviders) {
        const outputPath = path.join(
          testProjectDir,
          `.ruleset/dist/${providerId}/my-rules.md`
        );
        const content = await fs.readFile(outputPath, 'utf8');

        // Verify special characters are preserved
        expect(content).toContain(
          '& < > " \' ` ~ @ # $ % ^ * ( ) [ ] { } | \\ / ? ! + = - _ . , ; :'
        );
        expect(content).toContain('🚀 ✨ 💯 🔥 ⚡ 🎯');
        expect(content).toContain('\\w\\-\\.');
        expect(content).toContain('${name}');
        expect(content).toContain('./src/**/*.{ts,tsx,js,jsx}');

        // Verify edge cases
        expect(content).toContain('Empty line follows:');
        expect(content).toContain('Line with only spaces:');
        expect(content).toContain('Line with tabs:');
      }
    });
  });

  describe('Provider-Specific Configuration', () => {
    it('should handle provider-specific output paths and settings', async () => {
      const config: RulesetConfig = {
        rulesets: { version: '0.1.0' },
        providers: {
          cursor: {
            enabled: true,
            outputPath: '.cursor/custom/path.mdc',
          },
          windsurf: {
            enabled: true,
            outputPath: '.windsurf/special/location.md',
          },
          'claude-code': {
            enabled: true,
            outputPath: '.claude/rules/claude-specific.md',
          },
          'codex-cli': {
            enabled: false, // Disabled
          },
          amp: {
            enabled: true,
            outputPath: '.amp/custom.md',
          },
          opencode: {
            enabled: true,
            outputPath: '.opencode/rules.md',
          },
        },
      };

      const configPath = path.join(testProjectDir, 'ruleset.config.jsonc');
      await fs.writeFile(configPath, JSON.stringify(config, null, 2));

      const sourceContent = `---
ruleset:
  version: "0.1.0"
---

# Provider Configuration Test
Testing provider-specific configurations.
`;

      const sourceFilePath = path.join(
        testProjectDir,
        'provider-config.ruleset.md'
      );
      await fs.writeFile(sourceFilePath, sourceContent);

      await runRulesetsV0(sourceFilePath, mockLogger);

      // Verify enabled providers created files at custom paths
      const expectedOutputs = [
        '.cursor/custom/path.mdc',
        '.windsurf/special/location.md',
        '.claude/rules/claude-specific.md',
        '.amp/custom.md',
        '.opencode/rules.md',
      ];

      for (const outputPath of expectedOutputs) {
        const fullPath = path.join(testProjectDir, outputPath);
        await expect(fs.access(fullPath)).resolves.not.toThrow();

        const content = await fs.readFile(fullPath, 'utf8');
        expect(content).toContain('Provider Configuration Test');
      }

      // Verify disabled provider did not create output
      const disabledOutput = path.join(
        testProjectDir,
        '.ruleset/dist/codex-cli/my-rules.md'
      );
      await expect(fs.access(disabledOutput)).rejects.toThrow();

      // Verify logging shows only enabled providers
      expect(mockLogger.info).toHaveBeenCalledWith(
        expect.stringContaining('cursor, windsurf, claude-code, amp, opencode')
      );
      expect(mockLogger.info).toHaveBeenCalledWith(
        expect.not.stringContaining('codex-cli')
      );
    });

    it('should handle mixed frontmatter and configuration provider settings', async () => {
      // Configuration enables some providers
      const config: RulesetConfig = {
        rulesets: { version: '0.1.0' },
        providers: {
          cursor: { enabled: true },
          windsurf: { enabled: true },
          'claude-code': { enabled: false },
          amp: { enabled: true },
        },
      };

      const configPath = path.join(testProjectDir, 'ruleset.config.jsonc');
      await fs.writeFile(configPath, JSON.stringify(config, null, 2));

      // Frontmatter specifies different providers (should override config)
      const sourceContent = `---
ruleset:
  version: "0.1.0"
destinations:
  claude-code:
    outputPath: ".claude/frontmatter.md"
  codex-cli:
    outputPath: ".codex/frontmatter.md"
---

# Mixed Configuration Test
Frontmatter should override configuration.
`;

      const sourceFilePath = path.join(
        testProjectDir,
        'mixed-config.ruleset.md'
      );
      await fs.writeFile(sourceFilePath, sourceContent);

      await runRulesetsV0(sourceFilePath, mockLogger);

      // Verify only frontmatter providers created outputs
      const expectedOutputs = [
        '.claude/frontmatter.md',
        '.codex/frontmatter.md',
      ];

      const unexpectedOutputs = [
        '.ruleset/dist/cursor/my-rules.md',
        '.ruleset/dist/windsurf/my-rules.md',
        '.ruleset/dist/amp/my-rules.md',
      ];

      for (const outputPath of expectedOutputs) {
        const fullPath = path.join(testProjectDir, outputPath);
        await expect(fs.access(fullPath)).resolves.not.toThrow();
      }

      for (const outputPath of unexpectedOutputs) {
        const fullPath = path.join(testProjectDir, outputPath);
        await expect(fs.access(fullPath)).rejects.toThrow();
      }

      // Verify logging shows frontmatter override
      expect(mockLogger.debug).toHaveBeenCalledWith(
        'Using destinations from frontmatter'
      );
    });
  });

  describe('Provider Error Handling', () => {
    it('should handle provider write failures gracefully', async () => {
      const config: RulesetConfig = {
        rulesets: { version: '0.1.0' },
        providers: {
          cursor: {
            enabled: true,
            outputPath: '/invalid/readonly/path.mdc', // Will fail due to permissions
          },
          windsurf: {
            enabled: true,
            outputPath: '.windsurf/should-succeed.md', // Should succeed
          },
        },
      };

      const configPath = path.join(testProjectDir, 'ruleset.config.jsonc');
      await fs.writeFile(configPath, JSON.stringify(config, null, 2));

      const sourceContent = `---
ruleset:
  version: "0.1.0"
---

# Error Handling Test
Testing provider failure scenarios.
`;

      const sourceFilePath = path.join(testProjectDir, 'error-test.ruleset.md');
      await fs.writeFile(sourceFilePath, sourceContent);

      // Should throw due to cursor provider write failure
      await expect(runRulesetsV0(sourceFilePath, mockLogger)).rejects.toThrow();

      // Verify error was logged for cursor
      expect(mockLogger.error).toHaveBeenCalledWith(
        expect.stringContaining('Failed to write cursor output'),
        expect.any(Error)
      );
    });

    it('should handle unknown providers in configuration gracefully', async () => {
      const config: RulesetConfig = {
        rulesets: { version: '0.1.0' },
        providers: {
          cursor: { enabled: true },
          'unknown-provider': { enabled: true }, // Unknown provider
          windsurf: { enabled: true },
        } as Record<string, unknown>, // Type assertion to test unknown provider handling
      };

      const configPath = path.join(testProjectDir, 'ruleset.config.jsonc');
      await fs.writeFile(configPath, JSON.stringify(config, null, 2));

      const sourceContent = `---
ruleset:
  version: "0.1.0"
---

# Unknown Provider Test
`;

      const sourceFilePath = path.join(
        testProjectDir,
        'unknown-provider.ruleset.md'
      );
      await fs.writeFile(sourceFilePath, sourceContent);

      // Should succeed for known providers
      await runRulesetsV0(sourceFilePath, mockLogger);

      // Verify warning was logged for unknown provider
      expect(mockLogger.warn).toHaveBeenCalledWith(
        'No plugin found for destination: unknown-provider'
      );

      // Verify known providers still worked
      const expectedOutputs = [
        '.ruleset/dist/cursor/my-rules.md',
        '.ruleset/dist/windsurf/my-rules.md',
      ];

      for (const outputPath of expectedOutputs) {
        const fullPath = path.join(testProjectDir, outputPath);
        await expect(fs.access(fullPath)).resolves.not.toThrow();
      }
    });
  });

  describe('Provider Performance Testing', () => {
    it('should handle large content efficiently across all providers', async () => {
      // Create large content
      const largeContent = `---
ruleset:
  version: "0.1.0"
---

# Large Content Performance Test

{{instructions}}
${'Large instruction block content. '.repeat(500)}
{{/instructions}}

${'## Large Section\n\nThis is a large section with lots of content. '.repeat(200)}

{{examples}}
\`\`\`typescript
${'// Large code example\n'.repeat(100)}
interface LargeInterface {
${Array.from({ length: 100 }, (_, i) => `  property${i}: string;`).join('\n')}
}
\`\`\`
{{/examples}}

${'More content sections follow. '.repeat(300)}
`;

      const actualLargeContent = largeContent.replace(
        /\$\{i\}/g,
        (_match, offset, string) => {
          // Simple counter for property names
          const lineNumber = string.substring(0, offset).split('\n').length;
          return String(lineNumber);
        }
      );

      const sourceFilePath = path.join(
        testProjectDir,
        'large-content.ruleset.md'
      );
      await fs.writeFile(sourceFilePath, actualLargeContent);

      // Measure execution time
      const startTime = Date.now();
      await runRulesetsV0(sourceFilePath, mockLogger);
      const executionTime = Date.now() - startTime;

      // Should complete in reasonable time (less than 30 seconds even for large content)
      expect(executionTime).toBeLessThan(30_000);

      // Verify all providers created outputs
      const expectedOutputs = [
        '.ruleset/dist/cursor/my-rules.md',
        '.ruleset/dist/windsurf/my-rules.md',
        '.ruleset/dist/claude-code/my-rules.md',
        '.ruleset/dist/codex-cli/my-rules.md',
        '.ruleset/dist/amp/my-rules.md',
        '.ruleset/dist/opencode/my-rules.md',
      ];

      for (const outputPath of expectedOutputs) {
        const fullPath = path.join(testProjectDir, outputPath);
        await expect(fs.access(fullPath)).resolves.not.toThrow();

        const content = await fs.readFile(fullPath, 'utf8');
        expect(content.length).toBeGreaterThan(10_000); // Should contain the large content
        expect(content).toContain('Large Content Performance Test');
        expect(content).toContain('{{instructions}}');
      }

      expect(mockLogger.info).toHaveBeenCalledWith(
        'Rulesets v0.1.0 processing completed successfully!'
      );
    });
  });
});
