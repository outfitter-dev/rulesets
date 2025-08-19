/**

- @fileoverview Tests for RulesetsCompilationService
-
- Tests the integration with @rulesets/core, providing proper compilation
- functionality with comprehensive error handling and result management.
 */

import { afterEach, beforeEach, describe, expect, mock, test } from 'bun:test';
import { ErrorCodes, SandboxError } from '@/domain/errors';
import {
  type CompilationRequest,
  CompilationRequestUtils,
  type CompilationSource,
  type CompilationTarget,
} from '@/domain/models/compilation-request';
import {
  BrandedTypeUtils,
  createCompiledContent,
  createSafeFilePath,
  createSourceContent,
} from '@/shared/types/brands';
import { isErr, isOk } from '@/shared/types/result';
import { ConfigurationService } from '../config/config.loader';
import { SecureFileSystemService } from '../filesystem/secure.filesystem';
import { RulesetsCompilationService } from './rulesets.adapter';

// Mock @rulesets/core
const mockRunRulesetsV0 = mock(() => Promise.resolve());
const mockConsoleLogger = mock(() => ({
  info: mock(() => {}),
  warn: mock(() => {}),
  error: mock(() => {}),
  debug: mock(() => {}),
}));

mock.module('@rulesets/core', () => ({
  runRulesetsV0: mockRunRulesetsV0,
  ConsoleLogger: mockConsoleLogger,
}));

// Mock @rulesets/types
mock.module('@rulesets/types', () => ({
  Logger: mockConsoleLogger,
}));

describe('RulesetsCompilationService', () => {
  let compilationService: RulesetsCompilationService;
  let fileSystem: SecureFileSystemService;
  let configService: ConfigurationService;
  let tempDir: string;

  beforeEach(async () => {
    tempDir = `/tmp/rulesets-compilation-test-${Date.now()}`;
    await import('fs').then((fs) =>
      fs.promises.mkdir(tempDir, { recursive: true })
    );

    fileSystem = new SecureFileSystemService(tempDir);
    configService = new ConfigurationService(fileSystem);
    compilationService = new RulesetsCompilationService(
      fileSystem,
      configService
    );

    // Reset mocks
    mockRunRulesetsV0.mockClear();
    mockConsoleLogger.mockClear();
  });

  afterEach(async () => {
    try {
      await import('fs').then((fs) =>
        fs.promises.rm(tempDir, { recursive: true, force: true })
      );
    } catch {
      // Ignore cleanup errors
    }
  });

  describe('createRequest', () => {
    test('should create compilation request successfully', async () => {
      // Create test source file
      const sourceFile = createSafeFilePath('test.rule.md');
      await fileSystem.writeFile(
        sourceFile,
        createSourceContent('# Test Rule')
      );

      const sources: CompilationSource[] = [
        CompilationRequestUtils.createFileSource(sourceFile, 'Test Rule'),
      ];

      const targets: CompilationTarget[] = [
        CompilationRequestUtils.createTarget(
          'cursor' as any,
          createSafeFilePath('cursor/rules.mdc'),
          'cursor/' as any
        ),
      ];

      const result = await compilationService.createRequest({
        sources,
        targets,
      });

      expect(isOk(result)).toBe(true);
      if (isOk(result)) {
        expect(result.value.sources).toEqual(sources);
        expect(result.value.targets).toEqual(targets);
        expect(result.value.status).toBe('pending');
        expect(typeof result.value.id).toBe('string');
      }
    });

    test('should validate source files exist', async () => {
      const sources: CompilationSource[] = [
        CompilationRequestUtils.createFileSource(
          createSafeFilePath('non-existent.rule.md'),
          'Non-existent Rule'
        ),
      ];

      const targets: CompilationTarget[] = [
        CompilationRequestUtils.createTarget(
          'cursor' as any,
          createSafeFilePath('cursor/rules.mdc'),
          'cursor/' as any
        ),
      ];

      const result = await compilationService.createRequest({
        sources,
        targets,
      });

      expect(isErr(result)).toBe(true);
      if (isErr(result)) {
        expect(result.error.code).toBe(ErrorCodes.FILE_NOT_FOUND);
      }
    });

    test('should validate compilation options', async () => {
      // Create a test source file
      const sourceFile = createSafeFilePath('test.rule.md');
      await fileSystem.writeFile(
        sourceFile,
        createSourceContent('# Test Rule\n\nThis is a test rule.')
      );

      const sources: CompilationSource[] = [
        CompilationRequestUtils.createFileSource(sourceFile, 'Test Rule'),
      ];

      const targets: CompilationTarget[] = [
        CompilationRequestUtils.createTarget(
          'cursor' as any,
          createSafeFilePath('cursor/rules.mdc'),
          'cursor/' as any
        ),
      ];

      const result = await compilationService.createRequest({
        sources,
        targets,
        options: {
          validateInput: true,
          generateSourceMaps: true,
          timeoutMs: 30_000,
        },
      });

      expect(isOk(result)).toBe(true);
      if (isOk(result)) {
        expect(result.value.options.validateInput).toBe(true);
        expect(result.value.options.generateSourceMaps).toBe(true);
        expect(result.value.options.timeoutMs).toBe(30_000);
      }
    });
  });

  describe('getRequest', () => {
    test('should retrieve existing compilation request', async () => {
      // First create a request
      const sourceFile = createSafeFilePath('test.rule.md');
      await fileSystem.writeFile(
        sourceFile,
        createSourceContent('# Test Rule')
      );

      const sources: CompilationSource[] = [
        CompilationRequestUtils.createFileSource(sourceFile, 'Test Rule'),
      ];

      const targets: CompilationTarget[] = [
        CompilationRequestUtils.createTarget(
          'cursor' as any,
          createSafeFilePath('cursor/rules.mdc'),
          'cursor/' as any
        ),
      ];

      const createResult = await compilationService.createRequest({
        sources,
        targets,
      });
      expect(isOk(createResult)).toBe(true);

      if (isOk(createResult)) {
        const getResult = await compilationService.getRequest(
          createResult.value.id
        );

        expect(isOk(getResult)).toBe(true);
        if (isOk(getResult)) {
          expect(getResult.value.id).toBe(createResult.value.id);
          expect(getResult.value.status).toBe('pending');
        }
      }
    });

    test('should return error for non-existent request', async () => {
      const fakeId = BrandedTypeUtils.generateCompilationRequestId();
      const result = await compilationService.getRequest(fakeId);

      expect(isErr(result)).toBe(true);
      if (isErr(result)) {
        expect(result.error.code).toBe(ErrorCodes.REQUEST_NOT_FOUND);
      }
    });
  });

  describe('compile', () => {
    test('should compile successfully with file sources', async () => {
      // Create test source file
      const sourceFile = createSafeFilePath('test.rule.md');
      const sourceContent = `# Test Rule

This is a test rule for cursor.

{{instructions}}
Follow these coding standards:

- Use TypeScript
- Write tests
{{/instructions}}
`;
      await fileSystem.writeFile(
        sourceFile,
        createSourceContent(sourceContent)
      );

      // Create compilation request
      const sources: CompilationSource[] = [
        CompilationRequestUtils.createFileSource(sourceFile, 'Test Rule'),
      ];

      const targets: CompilationTarget[] = [
        CompilationRequestUtils.createTarget(
          'cursor' as any,
          createSafeFilePath('cursor/rules.mdc'),
          'cursor/' as any
        ),
      ];

      const createResult = await compilationService.createRequest({
        sources,
        targets,
      });
      expect(isOk(createResult)).toBe(true);

      if (isOk(createResult)) {
        // Mock successful compilation
        mockRunRulesetsV0.mockResolvedValueOnce(undefined);

        const compileResult = await compilationService.compile(
          createResult.value.id
        );

        expect(isOk(compileResult)).toBe(true);
        if (isOk(compileResult)) {
          expect(compileResult.value.status).toBe('success');
          expect(compileResult.value.requestId).toBe(createResult.value.id);
          expect(typeof compileResult.value.id).toBe('string');
          expect(typeof compileResult.value.startedAt).toBe('number');
          expect(typeof compileResult.value.completedAt).toBe('number');
        }

        // Verify @rulesets/core was called
        expect(mockRunRulesetsV0).toHaveBeenCalledTimes(1);
      }
    });

    test('should compile successfully with content sources', async () => {
      const sourceContent = `# Test Rule

This is a test rule with direct content.

{{instructions}}
Follow these coding standards.
{{/instructions}}
`;

      // Create compilation request with content source
      const sources: CompilationSource[] = [
        CompilationRequestUtils.createContentSource(
          createSourceContent(sourceContent),
          'Test Rule Content'
        ),
      ];

      const targets: CompilationTarget[] = [
        CompilationRequestUtils.createTarget(
          'claude-code' as any,
          createSafeFilePath('CLAUDE.md'),
          'output/' as any
        ),
      ];

      const createResult = await compilationService.createRequest({
        sources,
        targets,
      });
      expect(isOk(createResult)).toBe(true);

      if (isOk(createResult)) {
        // Mock successful compilation
        mockRunRulesetsV0.mockResolvedValueOnce(undefined);

        const compileResult = await compilationService.compile(
          createResult.value.id
        );

        expect(isOk(compileResult)).toBe(true);
        if (isOk(compileResult)) {
          expect(compileResult.value.status).toBe('success');
          expect(mockRunRulesetsV0).toHaveBeenCalledTimes(1);
        }
      }
    });

    test('should handle compilation errors from @rulesets/core', async () => {
      // Create test source file
      const sourceFile = createSafeFilePath('test.rule.md');
      await fileSystem.writeFile(
        sourceFile,
        createSourceContent('# Invalid Rule')
      );

      const sources: CompilationSource[] = [
        CompilationRequestUtils.createFileSource(sourceFile, 'Test Rule'),
      ];

      const targets: CompilationTarget[] = [
        CompilationRequestUtils.createTarget(
          'cursor' as any,
          createSafeFilePath('cursor/rules.mdc'),
          'cursor/' as any
        ),
      ];

      const createResult = await compilationService.createRequest({
        sources,
        targets,
      });
      expect(isOk(createResult)).toBe(true);

      if (isOk(createResult)) {
        // Mock compilation failure
        const compilationError = new Error('Parsing failed: Invalid syntax');
        mockRunRulesetsV0.mockRejectedValueOnce(compilationError);

        const compileResult = await compilationService.compile(
          createResult.value.id
        );

        expect(isOk(compileResult)).toBe(true); // Should still return a result
        if (isOk(compileResult)) {
          expect(compileResult.value.status).toBe('failure');
          expect(compileResult.value.errors.length).toBeGreaterThan(0);
        }
      }
    });

    test('should respect compilation timeout', async () => {
      // Create test source file
      const sourceFile = createSafeFilePath('test.rule.md');
      await fileSystem.writeFile(
        sourceFile,
        createSourceContent('# Test Rule')
      );

      const sources: CompilationSource[] = [
        CompilationRequestUtils.createFileSource(sourceFile, 'Test Rule'),
      ];

      const targets: CompilationTarget[] = [
        CompilationRequestUtils.createTarget(
          'cursor' as any,
          createSafeFilePath('cursor/rules.mdc'),
          'cursor/' as any
        ),
      ];

      const createResult = await compilationService.createRequest({
        sources,
        targets,
        options: {
          timeoutMs: 100, // Very short timeout
        },
      });
      expect(isOk(createResult)).toBe(true);

      if (isOk(createResult)) {
        // Mock slow compilation
        mockRunRulesetsV0.mockImplementationOnce(
          () => new Promise((resolve) => setTimeout(resolve, 200))
        );

        const compileResult = await compilationService.compile(
          createResult.value.id
        );

        expect(isOk(compileResult)).toBe(true);
        if (isOk(compileResult)) {
          expect(compileResult.value.status).toBe('failure');
          expect(
            compileResult.value.errors.some(
              (e) =>
                e.message.includes('timeout') || e.message.includes('Timeout')
            )
          ).toBe(true);
        }
      }
    });

    test('should return error for non-existent request', async () => {
      const fakeId = BrandedTypeUtils.generateCompilationRequestId();
      const result = await compilationService.compile(fakeId);

      expect(isErr(result)).toBe(true);
      if (isErr(result)) {
        expect(result.error.code).toBe(ErrorCodes.REQUEST_NOT_FOUND);
      }
    });
  });

  describe('validateSourceFiles', () => {
    test('should validate existing files', async () => {
      const file1 = createSafeFilePath('file1.rule.md');
      const file2 = createSafeFilePath('file2.rule.md');

      await fileSystem.writeFile(file1, createSourceContent('# Rule 1'));
      await fileSystem.writeFile(file2, createSourceContent('# Rule 2'));

      const result = await compilationService.validateSourceFiles([
        file1,
        file2,
      ]);

      expect(isOk(result)).toBe(true);
      if (isOk(result)) {
        expect(result.value).toEqual([true, true]);
      }
    });

    test('should identify non-existing files', async () => {
      const existingFile = createSafeFilePath('existing.rule.md');
      const nonExistentFile = createSafeFilePath('non-existent.rule.md');

      await fileSystem.writeFile(
        existingFile,
        createSourceContent('# Existing Rule')
      );

      const result = await compilationService.validateSourceFiles([
        existingFile,
        nonExistentFile,
      ]);

      expect(isOk(result)).toBe(true);
      if (isOk(result)) {
        expect(result.value).toEqual([true, false]);
      }
    });
  });

  describe('listRequests', () => {
    test('should list compilation requests with filtering', async () => {
      // Create multiple requests
      const sourceFile = createSafeFilePath('test.rule.md');
      await fileSystem.writeFile(
        sourceFile,
        createSourceContent('# Test Rule')
      );

      const sources: CompilationSource[] = [
        CompilationRequestUtils.createFileSource(sourceFile, 'Test Rule'),
      ];

      const targets: CompilationTarget[] = [
        CompilationRequestUtils.createTarget(
          'cursor' as any,
          createSafeFilePath('cursor/rules.mdc'),
          'cursor/' as any
        ),
      ];

      const request1 = await compilationService.createRequest({
        sources,
        targets,
      });

      // Small delay to ensure different timestamps
      await new Promise((resolve) => setTimeout(resolve, 1));

      const request2 = await compilationService.createRequest({
        sources,
        targets,
        priority: 'high',
      });

      expect(isOk(request1)).toBe(true);
      expect(isOk(request2)).toBe(true);

      const listResult = await compilationService.listRequests({
        limit: 10,
        sortBy: 'createdAt',
        sortOrder: 'desc',
      });

      expect(isOk(listResult)).toBe(true);
      if (isOk(listResult)) {
        expect(listResult.value.length).toBe(2);
        expect(listResult.value[0]!.priority).toBe('high'); // Should be sorted by creation time desc
      }
    });

    test('should filter requests by status', async () => {
      const sourceFile = createSafeFilePath('test.rule.md');
      await fileSystem.writeFile(
        sourceFile,
        createSourceContent('# Test Rule')
      );

      const sources: CompilationSource[] = [
        CompilationRequestUtils.createFileSource(sourceFile, 'Test Rule'),
      ];

      const targets: CompilationTarget[] = [
        CompilationRequestUtils.createTarget(
          'cursor' as any,
          createSafeFilePath('cursor/rules.mdc'),
          'cursor/' as any
        ),
      ];

      await compilationService.createRequest({ sources, targets });

      const listResult = await compilationService.listRequests({
        status: ['pending'],
      });

      expect(isOk(listResult)).toBe(true);
      if (isOk(listResult)) {
        expect(listResult.value.length).toBe(1);
        expect(listResult.value[0]!.status).toBe('pending');
      }
    });
  });

  describe('getHealthStatus', () => {
    test('should return service health information', async () => {
      const result = await compilationService.getHealthStatus();

      expect(isOk(result)).toBe(true);
      if (isOk(result)) {
        expect(typeof result.value.healthy).toBe('boolean');
        expect(typeof result.value.activeCompilations).toBe('number');
        expect(typeof result.value.queuedRequests).toBe('number');
        expect(typeof result.value.averageCompilationTimeMs).toBe('number');
        expect(typeof result.value.successRate).toBe('number');
        expect(Array.isArray(result.value.warnings)).toBe(true);
        expect(typeof result.value.diagnostics).toBe('object');
      }
    });
  });
});
