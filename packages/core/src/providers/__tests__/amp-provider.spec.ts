// Tests for AmpProvider - Amp AI assistant provider implementation

import type { Logger, ProviderCompilationContext } from '@rulesets/types';
import {
  createOutputPath,
  createProviderId,
  createSourcePath,
  createVersion,
} from '@rulesets/types';
import { beforeEach, describe, expect, it } from 'vitest';
import { AmpProvider } from '../amp-provider';

describe('AmpProvider', () => {
  let provider: AmpProvider;
  let _mockLogger: Logger;

  beforeEach(() => {
    provider = new AmpProvider();
    _mockLogger = {
      info: () => {},
      error: () => {},
      warn: () => {},
      debug: () => {},
    };
  });

  describe('Provider Interface Implementation', () => {
    it('should have correct provider properties', () => {
      expect(provider.id).toBe(createProviderId('amp'));
      expect(provider.version).toBe(createVersion('1.0.0'));
      expect(provider.description).toBe('Amp AI assistant');
      expect(provider.website).toBe('https://amp.dev');
      expect(provider.type).toBe('agent');
      expect(provider.name).toBe('Amp');
    });

    it('should have correct provider configuration', () => {
      expect(provider.config.outputPath).toBe(createOutputPath('AGENT.md'));
      expect(provider.config.format).toBe('markdown');
      expect(provider.config.fileNaming).toBe('preserve');
      expect(provider.config.features?.autoFormat).toBe(true);
      expect(provider.config.features?.syntaxHighlighting).toBe(true);
    });

    it('should have correct capabilities', () => {
      expect(provider.capabilities.supportsBlocks).toBe(true);
      expect(provider.capabilities.supportsImports).toBe(true);
      expect(provider.capabilities.supportsVariables).toBe(true);
      expect(provider.capabilities.supportsXml).toBe(false);
      expect(provider.capabilities.supportsMarkdown).toBe(true);
      expect(provider.capabilities.maxFileSize).toBe(10 * 1024 * 1024);
      expect(provider.capabilities.allowedFormats).toEqual(['markdown']);
      expect(provider.capabilities.requiresSpecialHandling).toEqual([]);
    });
  });

  describe('Configuration Schema', () => {
    it('should provide valid JSON schema', () => {
      const schema = provider.configSchema();

      expect(schema.type).toBe('object');
      expect(schema.properties).toBeDefined();
      expect(schema.properties?.outputPath).toBeDefined();
      expect(schema.properties?.priority).toBeDefined();
      expect(schema.properties?.includeProjectContext).toBeDefined();
      expect(schema.additionalProperties).toBe(true);
    });

    it('should have correct default values in schema', () => {
      const schema = provider.configSchema();
      const outputPathProperty = schema.properties?.outputPath as any;
      const includeProjectContextProperty = schema.properties
        ?.includeProjectContext as any;

      expect(outputPathProperty.default).toBe('AGENT.md');
      expect(includeProjectContextProperty.default).toBe(true);
    });
  });

  describe('Compilation', () => {
    it('should successfully compile content', async () => {
      const mockContext: ProviderCompilationContext = {
        provider,
        sourcePath: createSourcePath('test.rule.md'),
        outputPath: createOutputPath('AGENT.md'),
        variables: {},
        metadata: {},
      };

      const result = await provider.compile(mockContext);

      expect(result.success).toBe(true);
      expect(result.content).toBeDefined();
      expect(result.errors).toEqual([]);
      expect(result.warnings).toEqual([]);
      expect(result.metadata.provider).toBe(provider.id);
      expect(result.metadata.format).toBe('markdown');
      expect(result.metadata.outputFile).toBe('AGENT.md');
      expect(result.stats.duration).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Provider API Compatibility', () => {
    it('should implement both Provider and DestinationPlugin interfaces', () => {
      // Test that provider has all required properties for both interfaces
      expect(provider.id).toBeDefined();
      expect(provider.name).toBeDefined();
      expect(provider.version).toBeDefined();
      expect(provider.type).toBeDefined();
      expect(provider.config).toBeDefined();
      expect(provider.capabilities).toBeDefined();
      expect(provider.configSchema).toBeDefined();
      expect(provider.compile).toBeDefined();
      expect(provider.write).toBeDefined();

      // Verify function types
      expect(typeof provider.configSchema).toBe('function');
      expect(typeof provider.compile).toBe('function');
      expect(typeof provider.write).toBe('function');
    });

    it('should return correct display name', () => {
      expect(provider.name).toBe('Amp');
    });
  });

  describe('Provider Registry Integration', () => {
    it('should be compatible with provider registry', () => {
      // Test that the provider can be used in a registry context
      const registry = new Map<string, any>();
      registry.set('amp', provider);

      const retrieved = registry.get('amp');
      expect(retrieved).toBe(provider);
      expect(retrieved.id).toBe(createProviderId('amp'));
    });
  });
});
