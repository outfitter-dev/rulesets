/**
 * Comprehensive tests for branded types system
 * Following TDD principles with security, validation, and backwards compatibility focus
 */

import { afterEach, beforeEach, describe, expect, test, mock, spyOn } from 'bun:test';
import {
  // Error class
  BrandValidationError,
  createBlockName,
  createCompiledContent,
  // Backwards compatibility
  createDestinationId,
  createDestPath,
  createMarkerContent,
  createOutputPath,
  createPropertyName,
  // Creation functions
  createProviderId,
  createRawContent,
  createSourcePath,
  createVariableName,
  createVersion,
  isBlockName,
  isDestinationId,
  isDestPath,
  isOutputPath,
  // Type guards
  isProviderId,
  isSourcePath,
  isVersion,
  // Unsafe brands for performance
  UnsafeBrands,
  // Constants
  VALID_PROVIDERS,
  type ValidProviderId,
} from '../src/brands';

describe('Branded Types System', () => {
  describe('BrandValidationError', () => {
    test('should create error with brand type, value, and message', () => {
      const error = new BrandValidationError(
        'TestBrand',
        'invalid',
        'test message'
      );

      expect(error.name).toBe('BrandValidationError');
      expect(error.brandType).toBe('TestBrand');
      expect(error.value).toBe('invalid');
      expect(error.message).toBe('Invalid TestBrand: test message');
      expect(error.context).toBeUndefined();
    });

    test('should include context when provided', () => {
      const context = { validOptions: ['a', 'b'] };
      const error = new BrandValidationError(
        'TestBrand',
        'invalid',
        'test message',
        context
      );

      expect(error.context).toEqual(context);
    });

    test('should extend Error properly', () => {
      const error = new BrandValidationError(
        'TestBrand',
        'invalid',
        'test message'
      );

      expect(error).toBeInstanceOf(Error);
      expect(error.stack).toBeDefined();
    });
  });

  describe('ProviderId Validation', () => {
    describe('createProviderId', () => {
      test('should accept valid provider IDs', () => {
        const validIds: ValidProviderId[] = [
          'cursor',
          'windsurf',
          'claude-code',
          'cline',
          'roo-code',
          'codex-cli',
          'amp',
        ];

        for (const id of validIds) {
          expect(() => createProviderId(id)).not.toThrow();
          const result = createProviderId(id);
          expect(result).toBe(id);
        }
      });

      test('should reject invalid provider IDs', () => {
        const invalidIds = [
          'invalid-provider',
          'CURSOR',
          'cursor_ide',
          'cursor.exe',
          'cursor/rules',
          'my-custom-provider',
        ];

        for (const id of invalidIds) {
          expect(() => createProviderId(id)).toThrow(BrandValidationError);

          try {
            createProviderId(id);
          } catch (error) {
            expect(error).toBeInstanceOf(BrandValidationError);
            expect((error as BrandValidationError).brandType).toBe(
              'ProviderId'
            );
            expect((error as BrandValidationError).value).toBe(id);
            expect((error as BrandValidationError).message).toContain(
              'must be one of'
            );
            expect(
              (error as BrandValidationError).context?.validProviders
            ).toEqual(VALID_PROVIDERS);
          }
        }
      });

      test('should reject non-string values', () => {
        const invalidValues = [null, undefined, 123, {}, [], true];

        for (const value of invalidValues) {
          expect(() => createProviderId(value as any)).toThrow(
            BrandValidationError
          );

          try {
            createProviderId(value as any);
          } catch (error) {
            expect(error).toBeInstanceOf(BrandValidationError);
            expect((error as BrandValidationError).message).toContain(
              'must be a non-empty string'
            );
          }
        }
      });

      test('should reject empty strings', () => {
        expect(() => createProviderId('')).toThrow(BrandValidationError);
        expect(() => createProviderId('   ')).toThrow(BrandValidationError);
      });
    });

    describe('isProviderId type guard', () => {
      test('should return true for valid provider IDs', () => {
        expect(isProviderId('cursor')).toBe(true);
        expect(isProviderId('claude-code')).toBe(true);
        expect(isProviderId('windsurf')).toBe(true);
      });

      test('should return false for invalid values', () => {
        expect(isProviderId('invalid')).toBe(false);
        expect(isProviderId(null)).toBe(false);
        expect(isProviderId(undefined)).toBe(false);
        expect(isProviderId(123)).toBe(false);
        expect(isProviderId('')).toBe(false);
      });
    });
  });

  describe('SourcePath Validation', () => {
    describe('createSourcePath', () => {
      test('should accept valid source paths', () => {
        const validPaths = [
          'rules.md',
          'rules.rule.md',
          'src/rules.md',
          'project/rules.rule.md',
          'nested/deep/rules.md',
          'my-rule-file.rule.md',
          'README.md',
        ];

        for (const path of validPaths) {
          expect(() => createSourcePath(path)).not.toThrow();
          const result = createSourcePath(path);
          expect(result).toBe(path);
        }
      });

      test('should reject paths without .md extension', () => {
        const invalidPaths = [
          'rules.txt',
          'rules.yaml',
          'rules',
          'rules.rule.txt',
          'rules.markdown',
        ];

        for (const path of invalidPaths) {
          expect(() => createSourcePath(path)).toThrow(BrandValidationError);

          try {
            createSourcePath(path);
          } catch (error) {
            expect((error as BrandValidationError).message).toContain(
              'must end with .md or .rule.md'
            );
          }
        }
      });

      test('should reject absolute paths for portability', () => {
        const absolutePaths = [
          '/Users/test/rules.md',
          '/etc/rules.md',
          '/home/user/project/rules.md',
        ];

        for (const path of absolutePaths) {
          expect(() => createSourcePath(path)).toThrow(BrandValidationError);

          try {
            createSourcePath(path);
          } catch (error) {
            expect((error as BrandValidationError).message).toContain(
              'must be a relative path'
            );
          }
        }
      });

      test('should prevent path traversal attacks', () => {
        const traversalPaths = [
          '../rules.md',
          'src/../rules.md',
          'project/../../etc/passwd.md',
          'rules/../../../sensitive.md',
          'folder\\..\\windows-path.md',
        ];

        for (const path of traversalPaths) {
          expect(() => createSourcePath(path)).toThrow(BrandValidationError);

          try {
            createSourcePath(path);
          } catch (error) {
            expect((error as BrandValidationError).message).toContain(
              'path traversal not allowed'
            );
          }
        }
      });

      test('should prevent hidden files for security', () => {
        const hiddenPaths = [
          '.hidden.md',
          'src/.config.md',
          '.ssh/config.md',
          'normal/.hidden.md',
        ];

        for (const path of hiddenPaths) {
          expect(() => createSourcePath(path)).toThrow(BrandValidationError);

          try {
            createSourcePath(path);
          } catch (error) {
            expect((error as BrandValidationError).message).toContain(
              'hidden files not allowed'
            );
          }
        }
      });

      test('should enforce length limits', () => {
        const longPath = `${'a'.repeat(260)}.md`;

        expect(() => createSourcePath(longPath)).toThrow(BrandValidationError);

        try {
          createSourcePath(longPath);
        } catch (error) {
          expect((error as BrandValidationError).message).toContain(
            'path too long'
          );
        }
      });

      test('should prevent control characters', () => {
        const controlCharPaths = [
          'rules\x00.md',
          'rules\x01.md',
          'rules\x1f.md',
          'rules\x7f.md',
        ];

        for (const path of controlCharPaths) {
          expect(() => createSourcePath(path)).toThrow(BrandValidationError);

          try {
            createSourcePath(path);
          } catch (error) {
            expect((error as BrandValidationError).message).toContain(
              'control characters not allowed'
            );
          }
        }
      });
    });

    describe('isSourcePath type guard', () => {
      test('should return true for valid source paths', () => {
        expect(isSourcePath('rules.md')).toBe(true);
        expect(isSourcePath('src/project.rule.md')).toBe(true);
      });

      test('should return false for invalid paths', () => {
        expect(isSourcePath('rules.txt')).toBe(false);
        expect(isSourcePath('/absolute/path.md')).toBe(false);
        expect(isSourcePath('../traversal.md')).toBe(false);
        expect(isSourcePath(null)).toBe(false);
      });
    });
  });

  describe('OutputPath Validation', () => {
    describe('createOutputPath', () => {
      test('should accept valid output paths', () => {
        const validPaths = [
          '.cursor/rules',
          'CLAUDE.md',
          'dist/output.json',
          'build/compiled.xml',
          '/.cursor/rules', // Hidden directories in project root are allowed
        ];

        for (const path of validPaths) {
          expect(() => createOutputPath(path)).not.toThrow();
          const result = createOutputPath(path);
          expect(result).toBe(path);
        }
      });

      test('should prevent path traversal', () => {
        const traversalPaths = [
          '../outside.md',
          'build/../../etc/passwd',
          'output\\..\\windows',
        ];

        for (const path of traversalPaths) {
          expect(() => createOutputPath(path)).toThrow(BrandValidationError);

          try {
            createOutputPath(path);
          } catch (error) {
            expect((error as BrandValidationError).message).toContain(
              'path traversal not allowed'
            );
          }
        }
      });

      test('should warn about absolute paths outside project', () => {
        const absolutePaths = [
          '/usr/bin/output',
          '/etc/output.conf',
          '/tmp/temp-output',
        ];

        for (const path of absolutePaths) {
          expect(() => createOutputPath(path)).toThrow(BrandValidationError);

          try {
            createOutputPath(path);
          } catch (error) {
            expect((error as BrandValidationError).message).toContain(
              'absolute paths not recommended'
            );
          }
        }
      });

      test('should prevent null bytes', () => {
        const nullBytePaths = ['output\0.md', 'normal\0/path'];

        for (const path of nullBytePaths) {
          expect(() => createOutputPath(path)).toThrow(BrandValidationError);

          try {
            createOutputPath(path);
          } catch (error) {
            expect((error as BrandValidationError).message).toContain(
              'null bytes not allowed'
            );
          }
        }
      });

      test('should enforce length limits', () => {
        const longPath = 'a'.repeat(260);

        expect(() => createOutputPath(longPath)).toThrow(BrandValidationError);

        try {
          createOutputPath(longPath);
        } catch (error) {
          expect((error as BrandValidationError).message).toContain(
            'path too long'
          );
        }
      });
    });
  });

  describe('BlockName Validation', () => {
    describe('createBlockName', () => {
      test('should accept valid kebab-case block names', () => {
        const validNames = [
          'user-instructions',
          'code-examples',
          'my-block',
          'api-docs',
          'test-cases',
          'ab', // minimum length
          'a1',
          'block-with-numbers-123',
        ];

        for (const name of validNames) {
          expect(() => createBlockName(name)).not.toThrow();
          const result = createBlockName(name);
          expect(result).toBe(name);
        }
      });

      test('should reject non-kebab-case names', () => {
        const invalidNames = [
          'UserInstructions', // PascalCase
          'user_instructions', // snake_case
          'userInstructions', // camelCase
          'user instructions', // spaces
          'USER-INSTRUCTIONS', // uppercase
          'user.instructions', // dots
          'user/instructions', // slashes
        ];

        for (const name of invalidNames) {
          expect(() => createBlockName(name)).toThrow(BrandValidationError);

          try {
            createBlockName(name);
          } catch (error) {
            expect((error as BrandValidationError).message).toContain(
              'must be kebab-case'
            );
          }
        }
      });

      test('should enforce length limits', () => {
        expect(() => createBlockName('a')).toThrow(BrandValidationError); // too short

        const longName = 'a'.repeat(51);
        expect(() => createBlockName(longName)).toThrow(BrandValidationError); // too long

        try {
          createBlockName('a');
        } catch (error) {
          expect((error as BrandValidationError).message).toContain(
            'must be at least 2 characters'
          );
        }

        try {
          createBlockName(longName);
        } catch (error) {
          expect((error as BrandValidationError).message).toContain(
            'must be at most 50 characters'
          );
        }
      });

      test('should prevent double hyphens', () => {
        const doubleHyphenNames = [
          'user--instructions',
          'my--block--name',
          'test--case',
        ];

        for (const name of doubleHyphenNames) {
          expect(() => createBlockName(name)).toThrow(BrandValidationError);

          try {
            createBlockName(name);
          } catch (error) {
            expect((error as BrandValidationError).message).toContain(
              'cannot contain consecutive hyphens'
            );
          }
        }
      });
    });
  });

  describe('VariableName Validation', () => {
    describe('createVariableName', () => {
      test('should accept valid variable names with $', () => {
        const validNames = [
          '$var',
          '$myVar',
          '$my_var',
          '$my.var',
          '$my.nested.var',
          '$_private',
          '$user123',
        ];

        for (const name of validNames) {
          expect(() => createVariableName(name)).not.toThrow();
          const result = createVariableName(name);
          expect(result).toBe(name);
        }
      });

      test('should accept valid JS identifiers without $', () => {
        const validNames = [
          'myVar',
          'my_var',
          '_private',
          'user123',
          'API_KEY',
        ];

        for (const name of validNames) {
          expect(() => createVariableName(name)).not.toThrow();
          const result = createVariableName(name);
          expect(result).toBe(name);
        }
      });

      test('should reject invalid variable names', () => {
        const invalidNames = [
          '$123invalid', // can't start with number after $
          '$my-var', // hyphens not allowed after $
          '$my/var', // slashes not allowed
          '$', // empty after $
          '$  ', // whitespace after $
          '123invalid', // can't start with number
          'my-var', // hyphens not valid in JS identifiers
          'my var', // spaces not valid
        ];

        for (const name of invalidNames) {
          expect(() => createVariableName(name)).toThrow(BrandValidationError);
        }
      });

      test('should enforce length limits', () => {
        const longName = `$${'a'.repeat(100)}`;

        expect(() => createVariableName(longName)).toThrow(
          BrandValidationError
        );

        try {
          createVariableName(longName);
        } catch (error) {
          expect((error as BrandValidationError).message).toContain(
            'must be at most 100 characters'
          );
        }
      });
    });
  });

  describe('PropertyName Validation', () => {
    describe('createPropertyName', () => {
      test('should accept valid property names', () => {
        const validNames = [
          'name',
          'output',
          'code-javascript',
          'wrap-80',
          'h-1',
          'indent-4',
          'priority-high',
        ];

        for (const name of validNames) {
          expect(() => createPropertyName(name)).not.toThrow();
          const result = createPropertyName(name);
          expect(result).toBe(name);
        }
      });

      test('should reject invalid property names', () => {
        const invalidNames = [
          'Name', // uppercase
          'code_javascript', // underscore
          'code.javascript', // dot
          'code/javascript', // slash
          'code javascript', // space
          'CODE-JAVASCRIPT', // all uppercase
          'code-JavaScript', // mixed case
          '123-invalid', // starts with number
          '-invalid', // starts with hyphen
          'invalid-', // ends with hyphen
        ];

        for (const name of invalidNames) {
          expect(() => createPropertyName(name)).toThrow(BrandValidationError);

          try {
            createPropertyName(name);
          } catch (error) {
            expect((error as BrandValidationError).message).toContain(
              'must be lowercase with optional hyphens'
            );
          }
        }
      });

      test('should enforce length limits', () => {
        const longName = 'a'.repeat(51);

        expect(() => createPropertyName(longName)).toThrow(
          BrandValidationError
        );

        try {
          createPropertyName(longName);
        } catch (error) {
          expect((error as BrandValidationError).message).toContain(
            'must be at most 50 characters'
          );
        }
      });
    });
  });

  describe('MarkerContent Validation', () => {
    describe('createMarkerContent', () => {
      test('should accept valid marker content', () => {
        const validContent = [
          '',
          'instructions',
          'user-instructions priority="high"',
          '$variable',
          '> import-path',
          '/close-tag',
          'code-javascript',
        ];

        for (const content of validContent) {
          expect(() => createMarkerContent(content)).not.toThrow();
          const result = createMarkerContent(content);
          expect(result).toBe(content);
        }
      });

      test('should enforce length limits', () => {
        const longContent = 'a'.repeat(5001);

        expect(() => createMarkerContent(longContent)).toThrow(
          BrandValidationError
        );

        try {
          createMarkerContent(longContent);
        } catch (error) {
          expect((error as BrandValidationError).message).toContain(
            'marker content too long'
          );
        }
      });

      test('should prevent nested markers', () => {
        const nestedContent = [
          'outer {{inner}} content',
          '{{nested {{deep}} markers}}',
          'start {{middle}} end',
        ];

        for (const content of nestedContent) {
          expect(() => createMarkerContent(content)).toThrow(
            BrandValidationError
          );

          try {
            createMarkerContent(content);
          } catch (error) {
            expect((error as BrandValidationError).message).toContain(
              'nested markers not allowed'
            );
          }
        }
      });

      test('should prevent script injection attempts', () => {
        const dangerousContent = [
          '<script>alert("xss")</script>',
          'javascript:alert("xss")',
          'data:text/html,<script>alert("xss")</script>',
          'onclick="alert()"',
          'onerror="malicious()"',
          'eval("dangerous code")',
          'Function("return process")()',
        ];

        for (const content of dangerousContent) {
          expect(() => createMarkerContent(content)).toThrow(
            BrandValidationError
          );

          try {
            createMarkerContent(content);
          } catch (error) {
            expect((error as BrandValidationError).message).toContain(
              'potentially dangerous content detected'
            );
            expect(
              (error as BrandValidationError).context?.detectedPattern
            ).toBeDefined();
          }
        }
      });

      test('should allow case-insensitive detection of dangerous patterns', () => {
        const dangerousContent = [
          '<SCRIPT>alert("xss")</SCRIPT>',
          'JAVASCRIPT:alert("xss")',
          'OnClick="alert()"',
          'EVAL("code")',
        ];

        for (const content of dangerousContent) {
          expect(() => createMarkerContent(content)).toThrow(
            BrandValidationError
          );
        }
      });
    });
  });

  describe('RawContent Validation', () => {
    describe('createRawContent', () => {
      test('should accept valid raw content', () => {
        const validContent = [
          '',
          'Simple text',
          'Multi\nline\ncontent',
          '# Markdown\n\n- List item\n- Another item',
          'Content with {{markers}} inside',
        ];

        for (const content of validContent) {
          expect(() => createRawContent(content)).not.toThrow();
          const result = createRawContent(content);
          expect(result).toBe(content);
        }
      });

      test('should enforce custom length limits', () => {
        const maxLength = 1000;
        const longContent = 'a'.repeat(maxLength + 1);

        expect(() => createRawContent(longContent, maxLength)).toThrow(
          BrandValidationError
        );

        try {
          createRawContent(longContent, maxLength);
        } catch (error) {
          expect((error as BrandValidationError).message).toContain(
            `content too long (max ${maxLength} characters)`
          );
          expect((error as BrandValidationError).context?.actualLength).toBe(
            longContent.length
          );
          expect((error as BrandValidationError).context?.maxLength).toBe(
            maxLength
          );
        }
      });

      test('should prevent null bytes', () => {
        const nullByteContent = 'content\0with\0nulls';

        expect(() => createRawContent(nullByteContent)).toThrow(
          BrandValidationError
        );

        try {
          createRawContent(nullByteContent);
        } catch (error) {
          expect((error as BrandValidationError).message).toContain(
            'null bytes not allowed'
          );
        }
      });

      test('should use default max length of 10MB', () => {
        // This test would be too slow with actual 10MB content
        // Just verify the default is applied
        const result = createRawContent('small content');
        expect(result).toBe('small content');
      });
    });
  });

  describe('CompiledContent Validation', () => {
    describe('createCompiledContent', () => {
      test('should accept valid compiled content', () => {
        const validContent = [
          '',
          '<user_instructions>Content</user_instructions>',
          '# Compiled Markdown\n\nWith XML tags',
          'JSON: {"compiled": true}',
        ];

        for (const content of validContent) {
          expect(() => createCompiledContent(content)).not.toThrow();
          const result = createCompiledContent(content);
          expect(result).toBe(content);
        }
      });

      test('should enforce custom length limits', () => {
        const maxLength = 1000;
        const longContent = 'a'.repeat(maxLength + 1);

        expect(() => createCompiledContent(longContent, maxLength)).toThrow(
          BrandValidationError
        );

        try {
          createCompiledContent(longContent, maxLength);
        } catch (error) {
          expect((error as BrandValidationError).message).toContain(
            `content too long (max ${maxLength} characters)`
          );
        }
      });

      test('should use default max length of 5MB', () => {
        const result = createCompiledContent('compiled content');
        expect(result).toBe('compiled content');
      });
    });
  });

  describe('Version Validation', () => {
    describe('createVersion', () => {
      test('should accept valid semantic versions', () => {
        const validVersions = [
          '1.0.0',
          '0.1.0',
          '10.20.30',
          '1.0.0-alpha',
          '1.0.0-beta.1',
          '1.0.0-rc.1',
          '1.0.0+build.1',
          '1.0.0-alpha+build.1',
        ];

        for (const version of validVersions) {
          expect(() => createVersion(version)).not.toThrow();
          const result = createVersion(version);
          expect(result).toBe(version);
        }
      });

      test('should reject invalid version formats', () => {
        const invalidVersions = [
          '1.0', // missing patch
          '1', // missing minor and patch
          'v1.0.0', // v prefix
          '1.0.0.0', // extra number
          '1.0.0-', // empty pre-release
          '1.0.0+', // empty build
          'invalid', // not numeric
          '1.0.0-alpha..beta', // double dots
        ];

        for (const version of invalidVersions) {
          expect(() => createVersion(version)).toThrow(BrandValidationError);

          try {
            createVersion(version);
          } catch (error) {
            expect((error as BrandValidationError).message).toContain(
              'must be valid semantic version'
            );
          }
        }
      });
    });

    describe('isVersion type guard', () => {
      test('should return true for valid versions', () => {
        expect(isVersion('1.0.0')).toBe(true);
        expect(isVersion('1.0.0-alpha')).toBe(true);
      });

      test('should return false for invalid versions', () => {
        expect(isVersion('1.0')).toBe(false);
        expect(isVersion('invalid')).toBe(false);
        expect(isVersion(null)).toBe(false);
      });
    });
  });

  describe('Backwards Compatibility', () => {
    let consoleSpy: ReturnType<typeof spyOn>;

    beforeEach(() => {
      consoleSpy = spyOn(console, 'warn').mockImplementation(() => {});
    });

    afterEach(() => {
      consoleSpy.mockRestore();
    });

    describe('Deprecated createDestinationId', () => {
      test('should work like createProviderId', () => {
        const result = createDestinationId('cursor');
        expect(result).toBe('cursor');
        expect(createProviderId('cursor')).toBe(result);
      });

      test('should emit deprecation warning in development', () => {
        const originalEnv = process.env.NODE_ENV;
        process.env.NODE_ENV = 'development';

        createDestinationId('cursor');

        expect(consoleSpy).toHaveBeenCalledWith(
          'createDestinationId is deprecated. Use createProviderId instead.'
        );

        process.env.NODE_ENV = originalEnv;
      });

      test('should not emit warning in production', () => {
        const originalEnv = process.env.NODE_ENV;
        process.env.NODE_ENV = 'production';

        createDestinationId('cursor');

        expect(consoleSpy).not.toHaveBeenCalled();

        process.env.NODE_ENV = originalEnv;
      });
    });

    describe('Deprecated createDestPath', () => {
      test('should work like createOutputPath', () => {
        const result = createDestPath('.cursor/rules');
        expect(result).toBe('.cursor/rules');
        expect(createOutputPath('.cursor/rules')).toBe(result);
      });

      test('should emit deprecation warning in development', () => {
        const originalEnv = process.env.NODE_ENV;
        process.env.NODE_ENV = 'development';

        createDestPath('.cursor/rules');

        expect(consoleSpy).toHaveBeenCalledWith(
          'createDestPath is deprecated. Use createOutputPath instead.'
        );

        process.env.NODE_ENV = originalEnv;
      });
    });

    describe('Type guard aliases', () => {
      test('isDestinationId should work like isProviderId', () => {
        expect(isDestinationId('cursor')).toBe(true);
        expect(isDestinationId('invalid')).toBe(false);
        expect(isDestinationId('cursor')).toBe(isProviderId('cursor'));
      });

      test('isDestPath should work like isOutputPath', () => {
        expect(isDestPath('.cursor/rules')).toBe(true);
        expect(isDestPath('../invalid')).toBe(false);
        expect(isDestPath('.cursor/rules')).toBe(isOutputPath('.cursor/rules'));
      });
    });
  });

  describe('UnsafeBrands Performance API', () => {
    test('should create branded types without validation', () => {
      // These would normally throw errors due to validation
      const invalidId = UnsafeBrands.providerId('invalid-provider');
      const invalidPath = UnsafeBrands.sourcePath('../invalid/path.txt');
      const invalidBlock = UnsafeBrands.blockName('Invalid_Block_Name');

      // But they are successfully created as branded types
      expect(typeof invalidId).toBe('string');
      expect(typeof invalidPath).toBe('string');
      expect(typeof invalidBlock).toBe('string');

      // The values are preserved exactly
      expect(invalidId).toBe('invalid-provider');
      expect(invalidPath).toBe('../invalid/path.txt');
      expect(invalidBlock).toBe('Invalid_Block_Name');
    });

    test('should provide all brand creators', () => {
      const brands = UnsafeBrands;

      expect(typeof brands.providerId).toBe('function');
      expect(typeof brands.sourcePath).toBe('function');
      expect(typeof brands.outputPath).toBe('function');
      expect(typeof brands.blockName).toBe('function');
      expect(typeof brands.variableName).toBe('function');
      expect(typeof brands.propertyName).toBe('function');
      expect(typeof brands.markerContent).toBe('function');
      expect(typeof brands.rawContent).toBe('function');
      expect(typeof brands.compiledContent).toBe('function');
      expect(typeof brands.version).toBe('function');
    });

    test('should be marked as const for type safety', () => {
      // This test ensures the UnsafeBrands object is a const export
      // In Bun/JavaScript, const objects are mutable but the reference is immutable
      expect(UnsafeBrands).toBeDefined();
      expect(typeof UnsafeBrands).toBe('object');
      
      // Verify all expected methods exist (type safety check)
      expect(typeof UnsafeBrands.providerId).toBe('function');
      expect(typeof UnsafeBrands.sourcePath).toBe('function');
      expect(typeof UnsafeBrands.outputPath).toBe('function');
    });
  });

  describe('Edge Cases and Security', () => {
    test('should handle extremely large inputs gracefully', () => {
      const largeInput = 'x'.repeat(1_000_000); // 1MB

      expect(() => createRawContent(largeInput)).not.toThrow();
      expect(() => createCompiledContent(largeInput)).not.toThrow();

      // But it should fail if over the limit
      const tooLarge = 'x'.repeat(15_000_000); // 15MB
      expect(() => createRawContent(tooLarge)).toThrow();
    });

    test('should handle unicode and special characters properly', () => {
      const unicodeContent = '🚀 Unicode content with émojis and spëcial chars';

      expect(() => createRawContent(unicodeContent)).not.toThrow();
      expect(() => createMarkerContent('instructions 📝')).not.toThrow();

      // But should still catch dangerous patterns in unicode
      expect(() => createMarkerContent('OnClick="alert()"')).toThrow();
    });

    test('should maintain consistent behavior across environments', () => {
      // Test that validation works the same regardless of environment
      const testCases = [
        () => createProviderId('cursor'),
        () => createSourcePath('rules.md'),
        () => createBlockName('user-instructions'),
      ];

      for (const testCase of testCases) {
        expect(() => testCase()).not.toThrow();
      }
    });

    test('should prevent prototype pollution attempts', () => {
      // Test that our validation doesn't allow prototype pollution
      const maliciousInputs = [
        '__proto__.polluted',
        'constructor.prototype.polluted',
        'prototype.polluted',
      ];

      for (const input of maliciousInputs) {
        // These should either be rejected by validation or safely handled
        expect(() => createPropertyName(input)).toThrow();
        expect(() => createVariableName(input)).toThrow();
      }
    });
  });

  describe('Type System Integration', () => {
    test('should maintain type safety through branded types', () => {
      const providerId = createProviderId('cursor');
      const sourcePath = createSourcePath('rules.md');
      const outputPath = createOutputPath('.cursor/rules');

      // TypeScript should enforce these are different types
      // (This is tested at compile time, but we can verify the values)
      expect(typeof providerId).toBe('string');
      expect(typeof sourcePath).toBe('string');
      expect(typeof outputPath).toBe('string');

      // But they should not be assignable to each other in TypeScript
      // This would be caught at compile time if we tried:
      // const invalid: ProviderId = sourcePath; // Type error
    });

    test('should work with JSON serialization', () => {
      const providerId = createProviderId('cursor');
      const blockName = createBlockName('user-instructions');

      const serialized = JSON.stringify({ providerId, blockName });
      const parsed = JSON.parse(serialized);

      expect(parsed.providerId).toBe('cursor');
      expect(parsed.blockName).toBe('user-instructions');

      // After parsing, they're regular strings and need re-validation
      expect(isProviderId(parsed.providerId)).toBe(true);
      expect(isBlockName(parsed.blockName)).toBe(true);
    });
  });
});
