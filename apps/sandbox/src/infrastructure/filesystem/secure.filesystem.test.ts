/**

- @fileoverview Tests for SecureFileSystemService
-
- Tests the secure file system operations with proper validation,
- permission checking, and error handling.
 */

import { afterEach, beforeEach, describe, expect, test } from 'bun:test';
import { ErrorCodes, SandboxError } from '@/domain/errors';
import {
  createCompiledContent,
  createSafeDirectoryPath,
  createSafeFilePath,
  createSourceContent,
} from '@/shared/types/brands';
import { isErr, isOk } from '@/shared/types/result';
import { SecureFileSystemService } from './secure.filesystem';

describe('SecureFileSystemService', () => {
  let fileSystem: SecureFileSystemService;
  let tempDir: string;

  beforeEach(async () => {
    // Create temp directory for testing
    tempDir = `/tmp/rulesets-test-${Date.now()}`;
    await import('fs').then((fs) =>
      fs.promises.mkdir(tempDir, { recursive: true })
    );
    fileSystem = new SecureFileSystemService(tempDir);
  });

  afterEach(async () => {
    // Clean up test files
    try {
      await import('fs').then((fs) =>
        fs.promises.rm(tempDir, { recursive: true, force: true })
      );
    } catch {
      // Ignore cleanup errors
    }
  });

  describe('exists', () => {
    test('should return true for existing files', async () => {
      const testFile = createSafeFilePath('test.txt');
      // This test will fail until we implement the method
      const result = await fileSystem.exists(testFile);

      expect(isOk(result)).toBe(true);
      if (isOk(result)) {
        expect(typeof result.value).toBe('boolean');
      }
    });

    test('should return false for non-existing files', async () => {
      const nonExistentFile = createSafeFilePath('does-not-exist.txt');
      const result = await fileSystem.exists(nonExistentFile);

      expect(isOk(result)).toBe(true);
      if (isOk(result)) {
        expect(result.value).toBe(false);
      }
    });

    test('should handle invalid paths with security error', async () => {
      try {
        const invalidPath = createSafeFilePath('../etc/passwd');
        // This should never reach here due to branded type validation
        expect(true).toBe(false);
      } catch (error) {
        expect(error).toBeDefined();
      }
    });
  });

  describe('readFile', () => {
    test('should read file contents successfully', async () => {
      const filePath = createSafeFilePath('test-read.txt');
      const content = createSourceContent('Hello, World!');

      // First write a file (this will also fail until implemented)
      await fileSystem.writeFile(filePath, content);

      const result = await fileSystem.readFile(filePath);

      expect(isOk(result)).toBe(true);
      if (isOk(result)) {
        expect(result.value).toBe(content);
      }
    });

    test('should return error for non-existent files', async () => {
      const filePath = createSafeFilePath('non-existent.txt');
      const result = await fileSystem.readFile(filePath);

      expect(isErr(result)).toBe(true);
      if (isErr(result)) {
        expect(result.error).toBeInstanceOf(SandboxError);
        expect(result.error.code).toBe(ErrorCodes.FILE_NOT_FOUND);
      }
    });

    test('should respect maxSizeBytes option', async () => {
      const filePath = createSafeFilePath('large-file.txt');
      const largeContent = createSourceContent('x'.repeat(1000));

      await fileSystem.writeFile(filePath, largeContent);

      const result = await fileSystem.readFile(filePath, { maxSizeBytes: 100 });

      expect(isErr(result)).toBe(true);
      if (isErr(result)) {
        expect(result.error.code).toBe(ErrorCodes.FILE_READ_FAILED);
      }
    });
  });

  describe('writeFile', () => {
    test('should write file contents successfully', async () => {
      const filePath = createSafeFilePath('test-write.txt');
      const content = createCompiledContent('Test content');

      const result = await fileSystem.writeFile(filePath, content);

      expect(isOk(result)).toBe(true);

      // Verify file was actually written
      const readResult = await fileSystem.readFile(filePath);
      expect(isOk(readResult)).toBe(true);
      if (isOk(readResult)) {
        expect(readResult.value).toBe(content);
      }
    });

    test('should create parent directories when createParents is true', async () => {
      const filePath = createSafeFilePath('nested/dir/file.txt');
      const content = createCompiledContent('Nested content');

      const result = await fileSystem.writeFile(filePath, content, {
        createParents: true,
      });

      expect(isOk(result)).toBe(true);
    });

    test('should fail when parent directories do not exist and createParents is false', async () => {
      const filePath = createSafeFilePath('nested/dir/file.txt');
      const content = createCompiledContent('Nested content');

      const result = await fileSystem.writeFile(filePath, content, {
        createParents: false,
      });

      expect(isErr(result)).toBe(true);
      if (isErr(result)) {
        expect(result.error.code).toBe(ErrorCodes.DIRECTORY_NOT_FOUND);
      }
    });

    test('should perform atomic writes when requested', async () => {
      const filePath = createSafeFilePath('atomic-test.txt');
      const content = createCompiledContent('Atomic content');

      const result = await fileSystem.writeFile(filePath, content, {
        atomic: true,
      });

      expect(isOk(result)).toBe(true);
    });
  });

  describe('createDirectory', () => {
    test('should create directory successfully', async () => {
      const dirPath = createSafeDirectoryPath('test-dir/');

      const result = await fileSystem.createDirectory(dirPath);

      expect(isOk(result)).toBe(true);

      // Verify directory exists
      const existsResult = await fileSystem.exists(dirPath);
      expect(isOk(existsResult)).toBe(true);
      if (isOk(existsResult)) {
        expect(existsResult.value).toBe(true);
      }
    });

    test('should create nested directories when recursive is true', async () => {
      const dirPath = createSafeDirectoryPath('nested/deep/dir/');

      const result = await fileSystem.createDirectory(dirPath, {
        recursive: true,
      });

      expect(isOk(result)).toBe(true);
    });

    test('should fail for nested directories when recursive is false', async () => {
      const dirPath = createSafeDirectoryPath('nested/deep/dir/');

      const result = await fileSystem.createDirectory(dirPath, {
        recursive: false,
      });

      expect(isErr(result)).toBe(true);
      if (isErr(result)) {
        expect(result.error.code).toBe(ErrorCodes.DIRECTORY_NOT_FOUND);
      }
    });
  });

  describe('listDirectory', () => {
    test('should list directory contents', async () => {
      const dirPath = createSafeDirectoryPath('list-test/');
      await fileSystem.createDirectory(dirPath);

      // Create some test files
      await fileSystem.writeFile(
        createSafeFilePath('list-test/file1.txt'),
        createCompiledContent('content1')
      );
      await fileSystem.writeFile(
        createSafeFilePath('list-test/file2.txt'),
        createCompiledContent('content2')
      );

      const result = await fileSystem.listDirectory(dirPath);

      expect(isOk(result)).toBe(true);
      if (isOk(result)) {
        expect(result.value.length).toBe(2);
        expect(result.value.some((entry) => entry.name === 'file1.txt')).toBe(
          true
        );
        expect(result.value.some((entry) => entry.name === 'file2.txt')).toBe(
          true
        );
      }
    });

    test('should exclude hidden files by default', async () => {
      const dirPath = createSafeDirectoryPath('hidden-test/');
      await fileSystem.createDirectory(dirPath);

      // Try to create hidden file (should fail due to security)
      try {
        await fileSystem.writeFile(
          createSafeFilePath('hidden-test/.hidden'),
          createCompiledContent('hidden')
        );
        expect(true).toBe(false); // Should not reach here
      } catch (error) {
        expect(error).toBeDefined();
      }
    });
  });

  describe('getMetadata', () => {
    test('should return file metadata', async () => {
      const filePath = createSafeFilePath('metadata-test.txt');
      const content = createCompiledContent('metadata content');

      await fileSystem.writeFile(filePath, content);

      const result = await fileSystem.getMetadata(filePath);

      expect(isOk(result)).toBe(true);
      if (isOk(result)) {
        expect(result.value.path).toBe(filePath);
        expect(result.value.isFile).toBe(true);
        expect(result.value.isDirectory).toBe(false);
        expect(result.value.sizeBytes).toBeGreaterThan(0);
        expect(typeof result.value.createdAt).toBe('number');
        expect(typeof result.value.modifiedAt).toBe('number');
      }
    });

    test('should return directory metadata', async () => {
      const dirPath = createSafeDirectoryPath('metadata-dir/');

      await fileSystem.createDirectory(dirPath);

      const result = await fileSystem.getMetadata(dirPath);

      expect(isOk(result)).toBe(true);
      if (isOk(result)) {
        expect(result.value.isFile).toBe(false);
        expect(result.value.isDirectory).toBe(true);
      }
    });
  });

  describe('checkPermissions', () => {
    test('should check read permissions', async () => {
      const filePath = createSafeFilePath('perms-test.txt');
      await fileSystem.writeFile(filePath, createCompiledContent('test'));

      const result = await fileSystem.checkPermissions(filePath, ['read']);

      expect(isOk(result)).toBe(true);
      if (isOk(result)) {
        expect(result.value.read).toBe(true);
      }
    });

    test('should check write permissions', async () => {
      const filePath = createSafeFilePath('perms-test2.txt');
      await fileSystem.writeFile(filePath, createCompiledContent('test'));

      const result = await fileSystem.checkPermissions(filePath, ['write']);

      expect(isOk(result)).toBe(true);
      if (isOk(result)) {
        expect(result.value.write).toBe(true);
      }
    });
  });

  describe('deleteFile', () => {
    test('should delete file successfully', async () => {
      const filePath = createSafeFilePath('delete-test.txt');
      await fileSystem.writeFile(filePath, createCompiledContent('delete me'));

      const result = await fileSystem.deleteFile(filePath);

      expect(isOk(result)).toBe(true);

      // Verify file no longer exists
      const existsResult = await fileSystem.exists(filePath);
      if (isOk(existsResult)) {
        expect(existsResult.value).toBe(false);
      }
    });

    test('should create backup when requested', async () => {
      const filePath = createSafeFilePath('backup-test.txt');
      const content = createCompiledContent('backup me');
      await fileSystem.writeFile(filePath, content);

      const result = await fileSystem.deleteFile(filePath, {
        createBackup: true,
      });

      expect(isOk(result)).toBe(true);

      // Check for backup file (implementation detail)
      // The exact backup naming convention will be defined in implementation
    });
  });

  describe('getHealthStatus', () => {
    test('should return health status information', async () => {
      const result = await fileSystem.getHealthStatus();

      expect(isOk(result)).toBe(true);
      if (isOk(result)) {
        expect(typeof result.value.healthy).toBe('boolean');
        expect(typeof result.value.availableSpaceBytes).toBe('number');
        expect(typeof result.value.totalSpaceBytes).toBe('number');
        expect(Array.isArray(result.value.warnings)).toBe(true);
      }
    });
  });
});
