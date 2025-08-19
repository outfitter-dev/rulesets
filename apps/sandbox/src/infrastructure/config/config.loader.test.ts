/**

- @fileoverview Tests for ConfigurationService
-
- Tests configuration loading, validation, and management with proper
- error handling and type safety.
 */

import { afterEach, beforeEach, describe, expect, test } from 'bun:test';
import { ErrorCodes, SandboxError } from '@/domain/errors';
import {
  createConfigurationKey,
  createSafeFilePath,
  createSourceContent,
} from '@/shared/types/brands';
import { isErr, isOk } from '@/shared/types/result';
import { SecureFileSystemService } from '../filesystem/secure.filesystem';
import { ConfigurationService } from './config.loader';

describe('ConfigurationService', () => {
  let configService: ConfigurationService;
  let fileSystem: SecureFileSystemService;
  let tempDir: string;

  beforeEach(async () => {
    tempDir = `/tmp/rulesets-config-test-${Date.now()}`;
    await import('fs').then((fs) =>
      fs.promises.mkdir(tempDir, { recursive: true })
    );

    fileSystem = new SecureFileSystemService(tempDir);
    configService = new ConfigurationService(fileSystem);
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

  describe('loadConfiguration', () => {
    test('should load valid JSON configuration file', async () => {
      const configPath = createSafeFilePath('ruleset.config.json');
      const validConfig = {
        compilerVersion: '0.2.0',
        providers: ['cursor', 'claude-code'],
        outputDirectory: '.ruleset/dist',
        validateInput: true,
      };

      await fileSystem.writeFile(
        configPath,
        createSourceContent(JSON.stringify(validConfig, null, 2))
      );

      const result = await configService.loadConfiguration(configPath);

      expect(isOk(result)).toBe(true);
      if (isOk(result)) {
        expect(result.value.compilerVersion).toBe('0.2.0');
        expect(result.value.providers).toEqual(['cursor', 'claude-code']);
        expect(result.value.outputDirectory).toBe('.ruleset/dist');
        expect(result.value.validateInput).toBe(true);
      }
    });

    test('should load valid JSONC configuration file', async () => {
      const configPath = createSafeFilePath('ruleset.config.jsonc');
      const validConfigWithComments = `{
        // Rulesets configuration
        "compilerVersion": "0.2.0",
        "providers": [
          "cursor", // IDE provider
          "claude-code" // CLI provider  
        ],
        "outputDirectory": ".ruleset/dist"
      }`;

      await fileSystem.writeFile(
        configPath,
        createSourceContent(validConfigWithComments)
      );

      const result = await configService.loadConfiguration(configPath);

      expect(isOk(result)).toBe(true);
      if (isOk(result)) {
        expect(result.value.compilerVersion).toBe('0.2.0');
        expect(result.value.providers).toEqual(['cursor', 'claude-code']);
      }
    });

    test('should return error for non-existent configuration file', async () => {
      const configPath = createSafeFilePath('non-existent.config.json');

      const result = await configService.loadConfiguration(configPath);

      expect(isErr(result)).toBe(true);
      if (isErr(result)) {
        expect(result.error).toBeInstanceOf(SandboxError);
        expect(result.error.code).toBe(ErrorCodes.CONFIG_NOT_FOUND);
      }
    });

    test('should return error for invalid JSON', async () => {
      const configPath = createSafeFilePath('invalid.config.json');
      const invalidJson = '{ "compilerVersion": "0.2.0", }'; // Trailing comma

      await fileSystem.writeFile(configPath, createSourceContent(invalidJson));

      const result = await configService.loadConfiguration(configPath);

      expect(isErr(result)).toBe(true);
      if (isErr(result)) {
        expect(result.error.code).toBe(ErrorCodes.CONFIG_INVALID);
      }
    });

    test('should validate required configuration fields', async () => {
      const configPath = createSafeFilePath('incomplete.config.json');
      const incompleteConfig = {
        // Missing required fields
        providers: ['cursor'],
      };

      await fileSystem.writeFile(
        configPath,
        createSourceContent(JSON.stringify(incompleteConfig))
      );

      const result = await configService.loadConfiguration(configPath);

      expect(isErr(result)).toBe(true);
      if (isErr(result)) {
        expect(result.error.code).toBe(ErrorCodes.VALIDATION_FAILED);
      }
    });

    test('should validate provider types', async () => {
      const configPath = createSafeFilePath('invalid-providers.config.json');
      const configWithInvalidProviders = {
        compilerVersion: '0.2.0',
        providers: ['cursor', 'invalid-provider'],
        outputDirectory: '.ruleset/dist',
      };

      await fileSystem.writeFile(
        configPath,
        createSourceContent(JSON.stringify(configWithInvalidProviders))
      );

      const result = await configService.loadConfiguration(configPath);

      expect(isErr(result)).toBe(true);
      if (isErr(result)) {
        expect(result.error.code).toBe(ErrorCodes.VALIDATION_FAILED);
      }
    });
  });

  describe('get', () => {
    test('should retrieve configuration value by key', async () => {
      const config = {
        compilerVersion: '0.2.0',
        providers: ['cursor'],
        outputDirectory: '.ruleset/dist',
        validateInput: true,
      };

      // Load configuration first
      const configPath = createSafeFilePath('test.config.json');
      await fileSystem.writeFile(
        configPath,
        createSourceContent(JSON.stringify(config))
      );
      await configService.loadConfiguration(configPath);

      const result = configService.get(
        createConfigurationKey('compilerVersion')
      );

      expect(isOk(result)).toBe(true);
      if (isOk(result)) {
        expect(result.value).toBe('0.2.0');
      }
    });

    test('should return error for missing configuration key', async () => {
      const config = {
        compilerVersion: '0.2.0',
        providers: ['cursor'],
        outputDirectory: '.ruleset/dist',
      };

      const configPath = createSafeFilePath('test.config.json');
      await fileSystem.writeFile(
        configPath,
        createSourceContent(JSON.stringify(config))
      );
      await configService.loadConfiguration(configPath);

      const result = configService.get(
        createConfigurationKey('nonExistentKey')
      );

      expect(isErr(result)).toBe(true);
      if (isErr(result)) {
        expect(result.error.code).toBe(ErrorCodes.CONFIG_NOT_FOUND);
      }
    });

    test('should support nested configuration keys', async () => {
      const config = {
        compilerVersion: '0.2.0',
        providers: ['cursor'],
        outputDirectory: '.ruleset/dist',
        advanced: {
          debugMode: true,
          timeout: 30_000,
        },
      };

      const configPath = createSafeFilePath('nested.config.json');
      await fileSystem.writeFile(
        configPath,
        createSourceContent(JSON.stringify(config))
      );
      await configService.loadConfiguration(configPath);

      const result = configService.get(
        createConfigurationKey('advanced.debugMode')
      );

      expect(isOk(result)).toBe(true);
      if (isOk(result)) {
        expect(result.value).toBe(true);
      }
    });
  });

  describe('set', () => {
    test('should set configuration value', async () => {
      const config = {
        compilerVersion: '0.2.0',
        providers: ['cursor'],
        outputDirectory: '.ruleset/dist',
      };

      const configPath = createSafeFilePath('test.config.json');
      await fileSystem.writeFile(
        configPath,
        createSourceContent(JSON.stringify(config))
      );
      await configService.loadConfiguration(configPath);

      const setResult = configService.set(
        createConfigurationKey('compilerVersion'),
        '0.2.0'
      );
      expect(isOk(setResult)).toBe(true);

      const getResult = configService.get(
        createConfigurationKey('compilerVersion')
      );
      expect(isOk(getResult)).toBe(true);
      if (isOk(getResult)) {
        expect(getResult.value).toBe('0.2.0');
      }
    });

    test('should set nested configuration value', async () => {
      const config = {
        compilerVersion: '0.2.0',
        providers: ['cursor'],
        outputDirectory: '.ruleset/dist',
        advanced: {
          debugMode: false,
        },
      };

      const configPath = createSafeFilePath('nested.config.json');
      await fileSystem.writeFile(
        configPath,
        createSourceContent(JSON.stringify(config))
      );
      await configService.loadConfiguration(configPath);

      const setResult = configService.set(
        createConfigurationKey('advanced.debugMode'),
        true
      );
      expect(isOk(setResult)).toBe(true);

      const getResult = configService.get(
        createConfigurationKey('advanced.debugMode')
      );
      expect(isOk(getResult)).toBe(true);
      if (isOk(getResult)) {
        expect(getResult.value).toBe(true);
      }
    });
  });

  describe('saveConfiguration', () => {
    test('should save configuration to file', async () => {
      const config = {
        compilerVersion: '0.2.0',
        providers: ['cursor'],
        outputDirectory: '.ruleset/dist',
      };

      const configPath = createSafeFilePath('save-test.config.json');
      await fileSystem.writeFile(
        configPath,
        createSourceContent(JSON.stringify(config))
      );
      await configService.loadConfiguration(configPath);

      // Modify configuration
      configService.set(createConfigurationKey('compilerVersion'), '0.2.0');

      const saveResult = await configService.saveConfiguration(configPath);
      expect(isOk(saveResult)).toBe(true);

      // Verify file was updated
      const fileContent = await fileSystem.readFile(configPath);
      expect(isOk(fileContent)).toBe(true);
      if (isOk(fileContent)) {
        const parsedConfig = JSON.parse(fileContent.value);
        expect(parsedConfig.compilerVersion).toBe('0.2.0');
      }
    });

    test('should preserve formatting when saving JSONC files', async () => {
      const configPath = createSafeFilePath('format-test.config.jsonc');
      const formattedConfig = `{
  "compilerVersion": "0.2.0",
  "providers": ["cursor"],
  "outputDirectory": ".ruleset/dist"
}`;

      await fileSystem.writeFile(
        configPath,
        createSourceContent(formattedConfig)
      );
      await configService.loadConfiguration(configPath);

      const saveResult = await configService.saveConfiguration(configPath);
      expect(isOk(saveResult)).toBe(true);

      // File should still be well-formatted (though exact formatting may vary)
      const fileContent = await fileSystem.readFile(configPath);
      expect(isOk(fileContent)).toBe(true);
      if (isOk(fileContent)) {
        expect(fileContent.value).toContain('"compilerVersion"');
        expect(fileContent.value).toContain('"providers"');
      }
    });
  });

  describe('validateConfiguration', () => {
    test('should validate complete configuration', () => {
      const validConfig = {
        compilerVersion: '0.2.0',
        providers: ['cursor', 'claude-code'],
        outputDirectory: '.ruleset/dist',
        validateInput: true,
      };

      const result = configService.validateConfiguration(validConfig);

      expect(isOk(result)).toBe(true);
    });

    test('should reject configuration with missing required fields', () => {
      const invalidConfig = {
        providers: ['cursor'],
        // Missing compilerVersion and outputDirectory
      };

      const result = configService.validateConfiguration(invalidConfig);

      expect(isErr(result)).toBe(true);
      if (isErr(result)) {
        expect(result.error.code).toBe(ErrorCodes.VALIDATION_FAILED);
      }
    });

    test('should reject configuration with invalid provider types', () => {
      const invalidConfig = {
        compilerVersion: '0.2.0',
        providers: ['cursor', 'invalid-provider'],
        outputDirectory: '.ruleset/dist',
      };

      const result = configService.validateConfiguration(invalidConfig);

      expect(isErr(result)).toBe(true);
      if (isErr(result)) {
        expect(result.error.code).toBe(ErrorCodes.VALIDATION_FAILED);
      }
    });
  });

  describe('getDefaultConfiguration', () => {
    test('should return valid default configuration', () => {
      const result = configService.getDefaultConfiguration();

      expect(isOk(result)).toBe(true);
      if (isOk(result)) {
        expect(typeof result.value.compilerVersion).toBe('string');
        expect(Array.isArray(result.value.providers)).toBe(true);
        expect(typeof result.value.outputDirectory).toBe('string');
        expect(typeof result.value.validateInput).toBe('boolean');
      }
    });

    test('should return configuration that passes validation', () => {
      const defaultResult = configService.getDefaultConfiguration();
      expect(isOk(defaultResult)).toBe(true);

      if (isOk(defaultResult)) {
        const validationResult = configService.validateConfiguration(
          defaultResult.value
        );
        expect(isOk(validationResult)).toBe(true);
      }
    });
  });
});
