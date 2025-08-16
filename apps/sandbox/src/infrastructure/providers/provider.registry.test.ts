/**

- @fileoverview Tests for ProviderRegistry
-
- Tests provider registration, management, and querying with proper
- validation and error handling.
 */

import { beforeEach, describe, expect, test } from 'bun:test';
import { ErrorCodes, SandboxError } from '@/domain/errors';
import type { ServiceProviderInfo } from '@/domain/interfaces';
import { isErr, isOk } from '@/shared/types/result';
import { ProviderRegistry } from './provider.registry';

describe('ProviderRegistry', () => {
  let registry: ProviderRegistry;

  beforeEach(() => {
    registry = new ProviderRegistry();
  });

  describe('register', () => {
    test('should register a new provider successfully', async () => {
      const provider: ServiceProviderInfo = {
        id: 'cursor',
        name: 'Cursor IDE',
        description: 'Cursor IDE Rules Provider',
        version: '1.0.0',
        enabled: true,
        capabilities: ['template_processing', 'syntax_highlighting'],
        metadata: {
          outputExtension: '.mdc',
          website: '<https://cursor.sh>',
        },
      };

      const result = await registry.register(provider);

      expect(isOk(result)).toBe(true);
    });

    test('should reject registration of duplicate provider', async () => {
      const provider: ServiceProviderInfo = {
        id: 'cursor',
        name: 'Cursor IDE',
        description: 'Cursor IDE Rules Provider',
        version: '1.0.0',
        enabled: true,
        capabilities: ['template_processing'],
        metadata: {},
      };

      await registry.register(provider);
      const result = await registry.register(provider);

      expect(isErr(result)).toBe(true);
      if (isErr(result)) {
        expect(result.error.code).toBe(ErrorCodes.PROVIDER_INVALID);
      }
    });

    test('should validate provider information before registration', async () => {
      const invalidProvider = {
        id: '',
        name: 'Invalid Provider',
        description: 'Missing required fields',
        version: 'invalid-version',
        enabled: true,
        capabilities: [],
        metadata: {},
      } as ServiceProviderInfo;

      const result = await registry.register(invalidProvider);

      expect(isErr(result)).toBe(true);
      if (isErr(result)) {
        expect(result.error.code).toBe(ErrorCodes.VALIDATION_FAILED);
      }
    });

    test('should handle provider with complex capabilities', async () => {
      const provider: ServiceProviderInfo = {
        id: 'claude-code',
        name: 'Claude Code',
        description: 'Claude Code CLI Provider',
        version: '2.1.0',
        enabled: true,
        capabilities: [
          'template_processing',
          'variable_substitution',
          'block_filtering',
          'validation',
          'minification',
        ],
        metadata: {
          outputExtension: '.md',
          configSchema: {
            type: 'object',
            properties: {
              maxFileSize: { type: 'number' },
              enableMinification: { type: 'boolean' },
            },
          },
        },
      };

      const result = await registry.register(provider);

      expect(isOk(result)).toBe(true);
    });
  });

  describe('unregister', () => {
    test('should unregister existing provider', async () => {
      const provider: ServiceProviderInfo = {
        id: 'test-provider',
        name: 'Test Provider',
        description: 'Test provider for unregistration',
        version: '1.0.0',
        enabled: true,
        capabilities: ['template_processing'],
        metadata: {},
      };

      await registry.register(provider);
      const result = await registry.unregister('test-provider');

      expect(isOk(result)).toBe(true);

      // Verify provider is no longer available
      const getResult = await registry.getProvider('test-provider');
      expect(isErr(getResult)).toBe(true);
    });

    test('should return error when unregistering non-existent provider', async () => {
      const result = await registry.unregister('non-existent');

      expect(isErr(result)).toBe(true);
      if (isErr(result)) {
        expect(result.error.code).toBe(ErrorCodes.PROVIDER_NOT_FOUND);
      }
    });
  });

  describe('getProvider', () => {
    test('should retrieve registered provider', async () => {
      const provider: ServiceProviderInfo = {
        id: 'windsurf',
        name: 'Windsurf',
        description: 'Windsurf IDE Provider',
        version: '1.5.0',
        enabled: true,
        capabilities: ['template_processing', 'hot_reload'],
        metadata: {
          website: '<https://windsurf.dev>',
        },
      };

      await registry.register(provider);
      const result = await registry.getProvider('windsurf');

      expect(isOk(result)).toBe(true);
      if (isOk(result)) {
        expect(result.value.id).toBe('windsurf');
        expect(result.value.name).toBe('Windsurf');
        expect(result.value.version).toBe('1.5.0');
        expect(result.value.capabilities).toEqual([
          'template_processing',
          'hot_reload',
        ]);
      }
    });

    test('should return error for non-existent provider', async () => {
      const result = await registry.getProvider('non-existent');

      expect(isErr(result)).toBe(true);
      if (isErr(result)) {
        expect(result.error.code).toBe(ErrorCodes.PROVIDER_NOT_FOUND);
      }
    });
  });

  describe('listProviders', () => {
    test('should list all registered providers', async () => {
      const providers: ServiceProviderInfo[] = [
        {
          id: 'cursor',
          name: 'Cursor',
          description: 'Cursor IDE Provider',
          version: '1.0.0',
          enabled: true,
          capabilities: ['template_processing'],
          metadata: {},
        },
        {
          id: 'claude-code',
          name: 'Claude Code',
          description: 'Claude Code CLI Provider',
          version: '2.0.0',
          enabled: false,
          capabilities: ['validation'],
          metadata: {},
        },
        {
          id: 'roo-code',
          name: 'Roo Code',
          description: 'Roo VS Code Extension',
          version: '1.2.0',
          enabled: true,
          capabilities: ['syntax_highlighting'],
          metadata: {},
        },
      ];

      for (const provider of providers) {
        await registry.register(provider);
      }

      const result = await registry.listProviders();

      expect(isOk(result)).toBe(true);
      if (isOk(result)) {
        expect(result.value.length).toBe(3);
        expect(result.value.map((p) => p.id)).toEqual([
          'cursor',
          'claude-code',
          'roo-code',
        ]);
      }
    });

    test('should list only enabled providers when filtered', async () => {
      const providers: ServiceProviderInfo[] = [
        {
          id: 'enabled-1',
          name: 'Enabled Provider 1',
          description: 'First enabled provider',
          version: '1.0.0',
          enabled: true,
          capabilities: [],
          metadata: {},
        },
        {
          id: 'disabled-1',
          name: 'Disabled Provider 1',
          description: 'First disabled provider',
          version: '1.0.0',
          enabled: false,
          capabilities: [],
          metadata: {},
        },
        {
          id: 'enabled-2',
          name: 'Enabled Provider 2',
          description: 'Second enabled provider',
          version: '1.0.0',
          enabled: true,
          capabilities: [],
          metadata: {},
        },
      ];

      for (const provider of providers) {
        await registry.register(provider);
      }

      const result = await registry.listProviders(true);

      expect(isOk(result)).toBe(true);
      if (isOk(result)) {
        expect(result.value.length).toBe(2);
        expect(result.value.every((p) => p.enabled)).toBe(true);
        expect(result.value.map((p) => p.id)).toEqual([
          'enabled-1',
          'enabled-2',
        ]);
      }
    });

    test('should return empty array when no providers registered', async () => {
      const result = await registry.listProviders();

      expect(isOk(result)).toBe(true);
      if (isOk(result)) {
        expect(result.value.length).toBe(0);
      }
    });
  });

  describe('isProviderAvailable', () => {
    test('should return true for registered and enabled provider', async () => {
      const provider: ServiceProviderInfo = {
        id: 'available-provider',
        name: 'Available Provider',
        description: 'Provider that is available',
        version: '1.0.0',
        enabled: true,
        capabilities: ['template_processing'],
        metadata: {},
      };

      await registry.register(provider);
      const result = await registry.isProviderAvailable('available-provider');

      expect(isOk(result)).toBe(true);
      if (isOk(result)) {
        expect(result.value).toBe(true);
      }
    });

    test('should return false for registered but disabled provider', async () => {
      const provider: ServiceProviderInfo = {
        id: 'disabled-provider',
        name: 'Disabled Provider',
        description: 'Provider that is disabled',
        version: '1.0.0',
        enabled: false,
        capabilities: ['template_processing'],
        metadata: {},
      };

      await registry.register(provider);
      const result = await registry.isProviderAvailable('disabled-provider');

      expect(isOk(result)).toBe(true);
      if (isOk(result)) {
        expect(result.value).toBe(false);
      }
    });

    test('should return false for non-existent provider', async () => {
      const result = await registry.isProviderAvailable('non-existent');

      expect(isOk(result)).toBe(true);
      if (isOk(result)) {
        expect(result.value).toBe(false);
      }
    });
  });

  describe('getProvidersByCapability', () => {
    test('should return providers with specific capability', async () => {
      const providers: ServiceProviderInfo[] = [
        {
          id: 'provider-1',
          name: 'Provider 1',
          description: 'Provider with template processing',
          version: '1.0.0',
          enabled: true,
          capabilities: ['template_processing', 'validation'],
          metadata: {},
        },
        {
          id: 'provider-2',
          name: 'Provider 2',
          description: 'Provider with syntax highlighting',
          version: '1.0.0',
          enabled: true,
          capabilities: ['syntax_highlighting', 'minification'],
          metadata: {},
        },
        {
          id: 'provider-3',
          name: 'Provider 3',
          description: 'Provider with template processing',
          version: '1.0.0',
          enabled: true,
          capabilities: ['template_processing', 'hot_reload'],
          metadata: {},
        },
      ];

      for (const provider of providers) {
        await registry.register(provider);
      }

      const result = await registry.getProvidersByCapability(
        'template_processing'
      );

      expect(isOk(result)).toBe(true);
      if (isOk(result)) {
        expect(result.value.length).toBe(2);
        expect(result.value.map((p) => p.id)).toEqual([
          'provider-1',
          'provider-3',
        ]);
      }
    });

    test('should return empty array for capability not supported by any provider', async () => {
      const provider: ServiceProviderInfo = {
        id: 'basic-provider',
        name: 'Basic Provider',
        description: 'Provider with basic capabilities',
        version: '1.0.0',
        enabled: true,
        capabilities: ['template_processing'],
        metadata: {},
      };

      await registry.register(provider);
      const result = await registry.getProvidersByCapability(
        'unsupported_capability'
      );

      expect(isOk(result)).toBe(true);
      if (isOk(result)) {
        expect(result.value.length).toBe(0);
      }
    });

    test('should only return enabled providers with capability', async () => {
      const providers: ServiceProviderInfo[] = [
        {
          id: 'enabled-provider',
          name: 'Enabled Provider',
          description: 'Enabled provider with validation',
          version: '1.0.0',
          enabled: true,
          capabilities: ['validation'],
          metadata: {},
        },
        {
          id: 'disabled-provider',
          name: 'Disabled Provider',
          description: 'Disabled provider with validation',
          version: '1.0.0',
          enabled: false,
          capabilities: ['validation'],
          metadata: {},
        },
      ];

      for (const provider of providers) {
        await registry.register(provider);
      }

      const result = await registry.getProvidersByCapability('validation');

      expect(isOk(result)).toBe(true);
      if (isOk(result)) {
        expect(result.value.length).toBe(1);
        expect(result.value[0]!.id).toBe('enabled-provider');
      }
    });
  });

  describe('validateProvider', () => {
    test('should validate registered provider successfully', async () => {
      const provider: ServiceProviderInfo = {
        id: 'valid-provider',
        name: 'Valid Provider',
        description: 'A valid provider for testing',
        version: '1.0.0',
        enabled: true,
        capabilities: ['template_processing'],
        metadata: {
          configSchema: {
            type: 'object',
            properties: {
              maxSize: { type: 'number' },
            },
          },
        },
      };

      await registry.register(provider);
      const result = await registry.validateProvider('valid-provider');

      expect(isOk(result)).toBe(true);
      if (isOk(result)) {
        expect(result.value.length).toBe(0); // No validation errors
      }
    });

    test('should return validation errors for problematic provider', async () => {
      // First register a valid provider
      const validProvider: ServiceProviderInfo = {
        id: 'problematic-provider',
        name: 'Initially Valid Provider',
        description: 'Provider with issues',
        version: '1.0.0',
        enabled: true,
        capabilities: ['template_processing'],
        metadata: {},
      };

      await registry.register(validProvider);

      // Now manually update it to have issues (simulating external configuration changes)
      // This is a test-specific scenario where we modify the provider after registration
      const registry_internal = registry as any;
      registry_internal.providers.set('problematic-provider', {
        ...validProvider,
        name: '', // Invalid: empty name
        version: 'not-a-version', // Invalid version format
        capabilities: [], // Potentially problematic: no capabilities
      });

      const result = await registry.validateProvider('problematic-provider');

      expect(isOk(result)).toBe(true);
      if (isOk(result)) {
        expect(result.value.length).toBeGreaterThan(0);
        expect(result.value.some((error) => error.includes('name'))).toBe(true);
        expect(result.value.some((error) => error.includes('version'))).toBe(
          true
        );
      }
    });

    test('should return error for non-existent provider validation', async () => {
      const result = await registry.validateProvider('non-existent');

      expect(isErr(result)).toBe(true);
      if (isErr(result)) {
        expect(result.error.code).toBe(ErrorCodes.PROVIDER_NOT_FOUND);
      }
    });
  });
});
