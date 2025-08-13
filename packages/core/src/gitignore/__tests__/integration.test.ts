/**
 * Integration tests for GitignoreManager with runRulesetsV0
 */

import { promises as fs } from 'node:fs';
import { runRulesetsV0 } from '../../index';
import { ConsoleLogger } from '../../logger';
import { GitignoreManager } from '../GitignoreManager';

// Mock fs module
jest.mock('fs', () => ({
  promises: {
    readFile: jest.fn(),
    writeFile: jest.fn(),
    mkdir: jest.fn(),
  },
}));

const mockFs = fs as jest.Mocked<typeof fs>;

describe('GitignoreManager Integration', () => {
  const testSourcePath = '/test/project/my-rules.ruleset.md';
  const testProjectPath = '/test/project';

  beforeEach(() => {
    jest.clearAllMocks();

    // Mock successful file operations
    mockFs.mkdir.mockResolvedValue(undefined);
    mockFs.writeFile.mockResolvedValue(undefined);

    // Mock reading source file
    mockFs.readFile.mockImplementation(async (filePath: string) => {
      if (filePath === testSourcePath) {
        return `---
ruleset:
  version: 0.1.0
---

# Test Rules

{{instructions}}
These are test instructions for the AI assistant.
{{/instructions}}`;
      }

      if (filePath.endsWith('.gitignore')) {
        return '# Existing gitignore\nnode_modules/\n';
      }

      // Override files don't exist
      throw { code: 'ENOENT' };
    });
  });

  it('should integrate GitignoreManager with runRulesetsV0', async () => {
    const logger = new ConsoleLogger();
    jest.spyOn(logger, 'info').mockImplementation();
    jest.spyOn(logger, 'debug').mockImplementation();
    jest.spyOn(logger, 'warn').mockImplementation();
    jest.spyOn(logger, 'error').mockImplementation();

    // Change to test directory for relative path resolution
    const originalCwd = process.cwd();
    const mockCwd = jest.spyOn(process, 'cwd').mockReturnValue(testProjectPath);

    try {
      await runRulesetsV0(testSourcePath, logger);

      // Verify .gitignore was updated
      const gitignoreWriteCalls = mockFs.writeFile.mock.calls.filter((call) =>
        (call[0] as string).endsWith('.gitignore')
      );

      expect(gitignoreWriteCalls.length).toBeGreaterThan(0);

      const gitignoreContent = gitignoreWriteCalls[0][1] as string;
      expect(gitignoreContent).toContain('# Existing gitignore');
      expect(gitignoreContent).toContain('# START Rulesets Generated Files');
      expect(gitignoreContent).toContain('# END Rulesets Generated Files');

      // Should contain generated file paths from both providers
      expect(gitignoreContent).toMatch(/\.cursor\/rules\/.*\.mdc/);
      expect(gitignoreContent).toMatch(/\.windsurf\/rules\/.*\.md/);

      // Verify logger messages
      expect(logger.info).toHaveBeenCalledWith(
        expect.stringContaining('Updating .gitignore')
      );
      expect(logger.info).toHaveBeenCalledWith(
        expect.stringContaining('Added')
      );
      expect(logger.info).toHaveBeenCalledWith(
        expect.stringContaining('Generated')
      );
    } finally {
      mockCwd.mockRestore();
      process.chdir(originalCwd);
    }
  });

  it('should handle GitignoreManager errors gracefully', async () => {
    const logger = new ConsoleLogger();
    jest.spyOn(logger, 'info').mockImplementation();
    jest.spyOn(logger, 'debug').mockImplementation();
    jest.spyOn(logger, 'warn').mockImplementation();
    jest.spyOn(logger, 'error').mockImplementation();

    // Mock fs to throw error on gitignore operations
    mockFs.readFile.mockImplementation(async (filePath: string) => {
      if (filePath === testSourcePath) {
        return `---
ruleset:
  version: 0.1.0
---

# Test Rules`;
      }

      if (filePath.endsWith('.gitignore')) {
        throw new Error('Permission denied');
      }

      throw { code: 'ENOENT' };
    });

    const originalCwd = process.cwd();
    const mockCwd = jest.spyOn(process, 'cwd').mockReturnValue(testProjectPath);

    try {
      // Should not throw - gitignore errors should be handled gracefully
      await runRulesetsV0(testSourcePath, logger);

      // Verify warning was logged but process continued
      expect(logger.warn).toHaveBeenCalledWith(
        expect.stringContaining('GitignoreManager error')
      );
      expect(logger.info).toHaveBeenCalledWith(
        expect.stringContaining('processing completed successfully')
      );
    } finally {
      mockCwd.mockRestore();
      process.chdir(originalCwd);
    }
  });

  it('should respect .rulesetkeep override files', async () => {
    const logger = new ConsoleLogger();
    jest.spyOn(logger, 'info').mockImplementation();
    jest.spyOn(logger, 'debug').mockImplementation();
    jest.spyOn(logger, 'warn').mockImplementation();

    mockFs.readFile.mockImplementation(async (filePath: string) => {
      if (filePath === testSourcePath) {
        return `---
ruleset:
  version: 0.1.0
---

# Test Rules`;
      }

      if (filePath.endsWith('.gitignore')) {
        return 'node_modules/\n';
      }

      if (filePath.endsWith('.rulesetkeep')) {
        return '.cursor/rules/*\n# Keep cursor rules in git\n';
      }

      throw { code: 'ENOENT' };
    });

    const originalCwd = process.cwd();
    const mockCwd = jest.spyOn(process, 'cwd').mockReturnValue(testProjectPath);

    try {
      await runRulesetsV0(testSourcePath, logger);

      // Verify files were kept due to override rules
      expect(logger.info).toHaveBeenCalledWith(expect.stringContaining('Kept'));
      expect(logger.info).toHaveBeenCalledWith(
        expect.stringContaining('override rules')
      );
    } finally {
      mockCwd.mockRestore();
      process.chdir(originalCwd);
    }
  });

  it('should handle disabled GitignoreManager gracefully', async () => {
    const logger = new ConsoleLogger();
    jest.spyOn(logger, 'info').mockImplementation();
    jest.spyOn(logger, 'debug').mockImplementation();

    // Test GitignoreManager with disabled config
    const gitignoreManager = new GitignoreManager({ enabled: false });
    const result = await gitignoreManager.updateGitignore([
      '.cursor/rules/test.mdc',
    ]);

    expect(result.success).toBe(true);
    expect(result.added).toEqual([]);
    expect(result.messages).toEqual(['GitignoreManager is disabled']);

    // Verify no file operations occurred
    expect(mockFs.readFile).not.toHaveBeenCalled();
    expect(mockFs.writeFile).not.toHaveBeenCalled();
  });

  it('should normalize paths correctly across platforms', async () => {
    const gitignoreManager = new GitignoreManager({}, testProjectPath);

    mockFs.readFile.mockImplementation(async (filePath: string) => {
      if (filePath.endsWith('.gitignore')) {
        return '';
      }
      throw { code: 'ENOENT' };
    });

    const result = await gitignoreManager.updateGitignore([
      '/test/project/.cursor/rules/test.mdc', // Absolute path
      '.\\windsurf\\rules\\test.md', // Windows path
      './another/test.mdc', // Relative path with ./
    ]);

    expect(result.success).toBe(true);
    expect(result.added).toEqual([
      '.cursor/rules/test.mdc',
      'windsurf/rules/test.md',
      'another/test.mdc',
    ]);
  });
});
