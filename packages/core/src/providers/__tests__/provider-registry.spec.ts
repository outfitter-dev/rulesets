/**
 * Comprehensive tests for the provider registry system
 * Tests modern provider exports, backwards compatibility, and provider interactions
 */

import { describe, test, expect, beforeEach, vi } from 'bun:test';
import {
  // Modern provider registry
  providers,
  getProvider,
  getAllProviders,
  getProviderIds,
  
  // Provider instances
  cursorProvider,
  windsurfProvider,
  claudeCodeProvider,
  codexProvider,
  ampProvider,
  openCodeProvider,
  
  // Provider classes
  CursorProvider,
  WindsurfProvider,
  ClaudeCodeProvider,
  CodexProvider,
  AmpProvider,
  OpenCodeProvider,
  
  // Backwards compatibility
  destinations,
  cursorPlugin,
  windsurfPlugin,
  claudeCodePlugin,
  codexPlugin,
  ampPlugin,
  openCodePlugin,
} from '../index';

import {
  createProviderId,
  createOutputPath,
  createCompiledContent,
  type ProviderId,
} from '@rulesets/types';

import type {
  Provider,
  DestinationPlugin,
  CompiledDoc,
  Logger,
  WriteResult,
} from '@rulesets/types';

describe('Provider Registry System', () => {
  describe('Modern Provider Registry', () => {
    test('should export all expected providers', () => {
      const expectedProviderIds = [
        'cursor',
        'windsurf',
        'claude-code',
        'codex-cli',
        'amp',
        'opencode',
      ];

      expect(providers.size).toBe(expectedProviderIds.length);

      for (const id of expectedProviderIds) {
        expect(providers.has(id)).toBe(true);
        expect(providers.get(id)).toBeDefined();
      }
    });

    test('should provide providers with correct IDs', () => {
      const providerMap = Array.from(providers.entries());

      for (const [id, provider] of providerMap) {
        expect(provider.id).toBe(id);
        expect(provider.name).toBeDefined();
        expect(provider.version).toBeDefined();
        expect(provider.type).toBeDefined();
        expect(provider.config).toBeDefined();
        expect(provider.capabilities).toBeDefined();
      }
    });

    test('should provide readonly access to providers', () => {
      // TypeScript ensures readonly at compile time
      // Runtime test for the Map being readonly
      expect(() => {
        (providers as any).set('new-provider', cursorProvider);
      }).toThrow();

      expect(() => {
        (providers as any).delete('cursor');
      }).toThrow();

      expect(() => {
        (providers as any).clear();
      }).toThrow();
    });

    describe('getProvider', () => {
      test('should return provider for valid ID', () => {
        const cursor = getProvider('cursor');
        expect(cursor).toBe(cursorProvider);
        expect(cursor?.id).toBe('cursor');

        const claudeCode = getProvider('claude-code');
        expect(claudeCode).toBe(claudeCodeProvider);
        expect(claudeCode?.id).toBe('claude-code');
      });

      test('should return undefined for invalid ID', () => {
        expect(getProvider('invalid-provider')).toBeUndefined();
        expect(getProvider('')).toBeUndefined();
      });

      test('should handle special characters and edge cases', () => {
        expect(getProvider('CURSOR')).toBeUndefined(); // Case sensitive
        expect(getProvider('cursor ')).toBeUndefined(); // Trailing space
        expect(getProvider(' cursor')).toBeUndefined(); // Leading space
      });
    });

    describe('getAllProviders', () => {
      test('should return all providers as array', () => {
        const allProviders = getAllProviders();
        
        expect(Array.isArray(allProviders)).toBe(true);
        expect(allProviders.length).toBe(providers.size);

        const providerIds = allProviders.map(p => p.id);
        expect(providerIds).toContain('cursor');
        expect(providerIds).toContain('claude-code');
        expect(providerIds).toContain('windsurf');
      });

      test('should return providers in consistent order', () => {
        const providers1 = getAllProviders();
        const providers2 = getAllProviders();
        
        expect(providers1.map(p => p.id)).toEqual(providers2.map(p => p.id));
      });

      test('should return different array instances', () => {
        const providers1 = getAllProviders();
        const providers2 = getAllProviders();
        
        expect(providers1).not.toBe(providers2); // Different array references
        expect(providers1[0]).toBe(providers2[0]); // Same provider instances
      });
    });

    describe('getProviderIds', () => {
      test('should return all provider IDs', () => {
        const ids = getProviderIds();
        
        expect(Array.isArray(ids)).toBe(true);
        expect(ids.length).toBe(providers.size);
        expect(ids).toContain('cursor');
        expect(ids).toContain('claude-code');
        expect(ids).toContain('windsurf');
      });

      test('should return IDs in consistent order', () => {
        const ids1 = getProviderIds();
        const ids2 = getProviderIds();
        
        expect(ids1).toEqual(ids2);
      });
    });
  });

  describe('Provider Instances', () => {
    test('should provide singleton instances', () => {
      // Test that providers are singletons
      expect(cursorProvider).toBeInstanceOf(CursorProvider);
      expect(windsurfProvider).toBeInstanceOf(WindsurfProvider);
      expect(claudeCodeProvider).toBeInstanceOf(ClaudeCodeProvider);
      expect(codexProvider).toBeInstanceOf(CodexProvider);
      expect(ampProvider).toBeInstanceOf(AmpProvider);
      expect(openCodeProvider).toBeInstanceOf(OpenCodeProvider);
    });

    test('should maintain same instances across calls', () => {
      expect(getProvider('cursor')).toBe(cursorProvider);
      expect(getProvider('windsurf')).toBe(windsurfProvider);
      expect(getProvider('claude-code')).toBe(claudeCodeProvider);
    });

    test('should have valid provider configurations', () => {
      const providersToTest = [
        cursorProvider,
        windsurfProvider,
        claudeCodeProvider,
        codexProvider,
        ampProvider,
        openCodeProvider,
      ];

      for (const provider of providersToTest) {
        expect(provider.id).toBeDefined();
        expect(provider.name).toBeDefined();
        expect(provider.version).toBeDefined();
        expect(provider.type).toBeDefined();
        expect(provider.config).toBeDefined();
        expect(provider.capabilities).toBeDefined();

        // Validate config structure
        expect(provider.config.outputPath).toBeDefined();
        expect(provider.config.format).toBeDefined();

        // Validate capabilities structure
        expect(typeof provider.capabilities.supportsBlocks).toBe('boolean');
        expect(typeof provider.capabilities.supportsImports).toBe('boolean');
        expect(typeof provider.capabilities.supportsVariables).toBe('boolean');
        expect(typeof provider.capabilities.supportsXml).toBe('boolean');
        expect(typeof provider.capabilities.supportsMarkdown).toBe('boolean');
        expect(Array.isArray(provider.capabilities.allowedFormats)).toBe(true);
      }
    });
  });

  describe('Provider Classes', () => {
    test('should export provider classes for extension', () => {
      expect(CursorProvider).toBeDefined();
      expect(WindsurfProvider).toBeDefined();
      expect(ClaudeCodeProvider).toBeDefined();
      expect(CodexProvider).toBeDefined();
      expect(AmpProvider).toBeDefined();
      expect(OpenCodeProvider).toBeDefined();

      expect(typeof CursorProvider).toBe('function');
      expect(typeof WindsurfProvider).toBe('function');
      expect(typeof ClaudeCodeProvider).toBe('function');
    });

    test('should allow creating new instances', () => {
      const customCursor = new CursorProvider();
      const customWindsurf = new WindsurfProvider();
      
      expect(customCursor).toBeInstanceOf(CursorProvider);
      expect(customWindsurf).toBeInstanceOf(WindsurfProvider);
      
      expect(customCursor.id).toBe('cursor');
      expect(customWindsurf.id).toBe('windsurf');
      
      // Should be different instances
      expect(customCursor).not.toBe(cursorProvider);
      expect(customWindsurf).not.toBe(windsurfProvider);
    });

    test('should support provider extension', () => {
      class ExtendedCursorProvider extends CursorProvider {
        get name(): string {
          return 'Extended Cursor Provider';
        }

        async compile(): Promise<string> {
          const result = await super.compile();
          return `<!-- Extended -->\n${result}`;
        }
      }

      const extended = new ExtendedCursorProvider();
      expect(extended.name).toBe('Extended Cursor Provider');
      expect(extended.id).toBe('cursor'); // Inherited
    });
  });

  describe('Provider Interface Compliance', () => {
    test('should implement Provider interface correctly', () => {
      const providersToTest = getAllProviders();

      for (const provider of providersToTest) {
        // Required Provider interface properties
        expect(typeof provider.id).toBe('string');
        expect(typeof provider.name).toBe('string');
        expect(typeof provider.version).toBe('string');
        expect(typeof provider.type).toBe('string');
        expect(typeof provider.config).toBe('object');
        expect(typeof provider.capabilities).toBe('object');

        // Optional properties
        if (provider.description !== undefined) {
          expect(typeof provider.description).toBe('string');
        }
        if (provider.website !== undefined) {
          expect(typeof provider.website).toBe('string');
        }
      }
    });

    test('should implement DestinationPlugin interface for backwards compatibility', () => {
      const providersToTest = getAllProviders();

      for (const provider of providersToTest) {
        // Cast to DestinationPlugin to test backwards compatibility
        const legacyProvider = provider as unknown as DestinationPlugin;

        expect(typeof legacyProvider.name).toBe('string');
        expect(typeof legacyProvider.configSchema).toBe('function');
        expect(typeof legacyProvider.write).toBe('function');

        // Test configSchema returns valid JSON schema
        const schema = legacyProvider.configSchema();
        expect(schema).toBeDefined();
        expect(schema.type).toBeDefined();

        // Test write method signature (without actually calling it)
        expect(legacyProvider.write.length).toBeGreaterThan(0); // Has parameters
      }
    });
  });

  describe('Backwards Compatibility Layer', () => {
    test('should provide destinations map for legacy code', () => {
      expect(destinations).toBeDefined();
      expect(destinations.size).toBe(providers.size);

      // Should contain same providers with same IDs
      for (const [id, provider] of providers) {
        expect(destinations.has(id)).toBe(true);
        expect(destinations.get(id)).toBe(provider);
      }
    });

    test('should provide legacy plugin aliases', () => {
      expect(cursorPlugin).toBe(cursorProvider);
      expect(windsurfPlugin).toBe(windsurfProvider);
      expect(claudeCodePlugin).toBe(claudeCodeProvider);
      expect(codexPlugin).toBe(codexProvider);
      expect(ampPlugin).toBe(ampProvider);
      expect(openCodePlugin).toBe(openCodeProvider);
    });

    test('should maintain type compatibility', () => {
      // Test that legacy interfaces work with modern providers
      const legacyCursor = destinations.get('cursor')!;
      const modernCursor = providers.get('cursor')!;

      expect(legacyCursor).toBe(modernCursor);
      expect(legacyCursor.name).toBe(modernCursor.name);
    });
  });

  describe('Provider Functionality Integration', () => {
    let mockLogger: Logger;
    let mockCompiledDoc: CompiledDoc;

    beforeEach(() => {
      mockLogger = {
        debug: vi.fn(),
        info: vi.fn(),
        warn: vi.fn(),
        error: vi.fn(),
      };

      mockCompiledDoc = {
        source: {
          content: '# Test Rules',
          frontmatter: {},
          blocks: [],
          imports: [],
          variables: [],
          markers: [],
          errors: [],
          warnings: [],
        },
        output: {
          content: createCompiledContent('# Test Rules\n\nCompiled content'),
          format: 'markdown',
          metadata: {},
        },
        metadata: {
          compiledAt: new Date().toISOString(),
          compiler: 'test',
          version: '1.0.0',
        },
      };
    });

    test('should support provider compilation workflow', async () => {
      const provider = getProvider('cursor')!;
      
      // Test provider can be used in compilation context
      expect(provider.id).toBe('cursor');
      expect(provider.config.format).toBe('markdown');
      expect(provider.capabilities.supportsMarkdown).toBe(true);
    });

    test('should handle provider configuration validation', () => {
      const providersToTest = getAllProviders();

      for (const provider of providersToTest) {
        // Test that provider configurations are valid
        expect(provider.config.outputPath).toBeDefined();
        expect(provider.config.format).toBeDefined();
        
        // Test that capabilities are consistent with config
        const supportsFormat = provider.capabilities.allowedFormats.includes(provider.config.format);
        expect(supportsFormat).toBe(true);
      }
    });

    test('should support write operations through legacy interface', async () => {
      const provider = destinations.get('cursor')! as DestinationPlugin;
      
      // Mock the write operation
      const originalWrite = provider.write;
      const mockWrite = vi.fn().mockResolvedValue({
        generatedPaths: ['.cursor/rules/test.mdc'],
        metadata: { provider: 'cursor' },
      } as WriteResult);
      
      (provider as any).write = mockWrite;

      try {
        const result = await provider.write({
          compiled: mockCompiledDoc,
          destPath: '.cursor/rules/test.mdc',
          config: {},
          logger: mockLogger,
        });

        expect(mockWrite).toHaveBeenCalledWith({
          compiled: mockCompiledDoc,
          destPath: '.cursor/rules/test.mdc',
          config: {},
          logger: mockLogger,
        });

        expect(result).toBeDefined();
        if (result) {
          expect(result.generatedPaths).toContain('.cursor/rules/test.mdc');
        }
      } finally {
        // Restore original method
        (provider as any).write = originalWrite;
      }
    });
  });

  describe('Provider Registry Performance', () => {
    test('should provide fast provider lookup', () => {
      const iterations = 10000;
      
      const start = performance.now();
      for (let i = 0; i < iterations; i++) {
        getProvider('cursor');
        getProvider('claude-code');
        getProvider('windsurf');
      }
      const end = performance.now();
      
      const timePerLookup = (end - start) / (iterations * 3);
      expect(timePerLookup).toBeLessThan(0.01); // Less than 0.01ms per lookup
    });

    test('should efficiently provide all providers', () => {
      const iterations = 1000;
      
      const start = performance.now();
      for (let i = 0; i < iterations; i++) {
        getAllProviders();
      }
      const end = performance.now();
      
      const timePerCall = (end - start) / iterations;
      expect(timePerCall).toBeLessThan(0.1); // Less than 0.1ms per call
    });

    test('should not create memory leaks on repeated access', () => {
      const initialMemory = process.memoryUsage();
      
      // Repeatedly access providers
      for (let i = 0; i < 10000; i++) {
        getAllProviders();
        getProviderIds();
        getProvider('cursor');
        getProvider('windsurf');
      }

      // Force garbage collection if available
      if (global.gc) {
        global.gc();
      }

      const finalMemory = process.memoryUsage();
      const heapGrowth = finalMemory.heapUsed - initialMemory.heapUsed;
      
      // Should not grow more than 1MB
      expect(heapGrowth).toBeLessThan(1024 * 1024);
    });
  });

  describe('Provider Registry Edge Cases', () => {
    test('should handle concurrent access safely', async () => {
      const concurrentAccess = Array.from({ length: 100 }, () =>
        Promise.resolve().then(() => {
          const provider = getProvider('cursor');
          expect(provider).toBeDefined();
          return provider;
        })
      );

      const results = await Promise.all(concurrentAccess);
      
      // All should return the same instance
      const firstResult = results[0];
      for (const result of results) {
        expect(result).toBe(firstResult);
      }
    });

    test('should maintain referential integrity', () => {
      const provider1 = getProvider('cursor');
      const provider2 = getProvider('cursor');
      const provider3 = providers.get('cursor');
      const provider4 = cursorProvider;

      expect(provider1).toBe(provider2);
      expect(provider2).toBe(provider3);
      expect(provider3).toBe(provider4);
    });

    test('should handle provider enumeration consistently', () => {
      const allProviders1 = getAllProviders();
      const allProviders2 = Array.from(providers.values());
      const allProviders3 = getProviderIds().map(id => getProvider(id)!);

      // All methods should return the same providers
      expect(allProviders1.length).toBe(allProviders2.length);
      expect(allProviders2.length).toBe(allProviders3.length);

      const ids1 = allProviders1.map(p => p.id).sort();
      const ids2 = allProviders2.map(p => p.id).sort();
      const ids3 = allProviders3.map(p => p.id).sort();

      expect(ids1).toEqual(ids2);
      expect(ids2).toEqual(ids3);
    });
  });
});