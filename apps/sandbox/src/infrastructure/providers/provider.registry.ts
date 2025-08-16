/**

- @fileoverview ProviderRegistry implementation
-
- Manages registration, validation, and querying of compilation providers
- with proper error handling and type safety.
 */

import {
  CommonSuggestions,
  createRecoverySuggestion,
  ErrorCodes,
  SandboxError,
} from '@/domain/errors';
import type {
  IProviderRegistry,
  ServiceProviderInfo,
} from '@/domain/interfaces';
import { Err, Ok, type Result } from '@/shared/types/result';

/**

- Provider error for provider-specific operations
 */
class ProviderError extends SandboxError {
  constructor(
    code: string,
    message: string,
    context: Record<string, unknown> = {},
    cause?: Error
  ) {
    super(
      code,
      message,
      'provider',
      'error',
      context,
      [
        CommonSuggestions.validateInput,
        CommonSuggestions.checkConfiguration,
        createRecoverySuggestion(
          'Check provider documentation for correct configuration',
          'check-docs'
        ),
      ],
      cause
    );
  }
}

/**

- ProviderRegistry implementation for managing compilation providers
 */
export class ProviderRegistry implements IProviderRegistry {
  private readonly providers = new Map<string, ServiceProviderInfo>();

  async register(
    provider: ServiceProviderInfo
  ): Promise<Result<void, SandboxError>> {
    try {
      // Validate provider before registration
      const validationResult = this.validateProviderInfo(provider);
      if (!validationResult.success) {
        return validationResult;
      }

      // Check for duplicate registration
      if (this.providers.has(provider.id)) {
        return Err(
          new ProviderError(
            ErrorCodes.PROVIDER_INVALID,
            `Provider '${provider.id}' is already registered`,
            { providerId: provider.id }
          )
        );
      }

      // Register the provider
      this.providers.set(provider.id, { ...provider });

      return Ok(undefined);
    } catch (error) {
      return Err(
        new ProviderError(
          ErrorCodes.INTERNAL_ERROR,
          `Failed to register provider: ${(error as Error).message}`,
          { providerId: provider.id },
          error as Error
        )
      );
    }
  }

  async unregister(providerId: string): Promise<Result<void, SandboxError>> {
    try {
      if (!this.providers.has(providerId)) {
        return Err(
          new ProviderError(
            ErrorCodes.PROVIDER_NOT_FOUND,
            `Provider '${providerId}' is not registered`,
            { providerId }
          )
        );
      }

      this.providers.delete(providerId);
      return Ok(undefined);
    } catch (error) {
      return Err(
        new ProviderError(
          ErrorCodes.INTERNAL_ERROR,
          `Failed to unregister provider: ${(error as Error).message}`,
          { providerId },
          error as Error
        )
      );
    }
  }

  async getProvider(
    providerId: string
  ): Promise<Result<ServiceProviderInfo, SandboxError>> {
    try {
      const provider = this.providers.get(providerId);
      if (!provider) {
        return Err(
          new ProviderError(
            ErrorCodes.PROVIDER_NOT_FOUND,
            `Provider '${providerId}' is not registered`,
            { providerId }
          )
        );
      }

      return Ok({ ...provider });
    } catch (error) {
      return Err(
        new ProviderError(
          ErrorCodes.INTERNAL_ERROR,
          `Failed to get provider: ${(error as Error).message}`,
          { providerId },
          error as Error
        )
      );
    }
  }

  async listProviders(
    enabledOnly = false
  ): Promise<Result<readonly ServiceProviderInfo[], SandboxError>> {
    try {
      let providers = Array.from(this.providers.values());

      if (enabledOnly) {
        providers = providers.filter((provider) => provider.enabled);
      }

      // Return deep copies to prevent mutation
      return Ok(providers.map((provider) => ({ ...provider })));
    } catch (error) {
      return Err(
        new ProviderError(
          ErrorCodes.INTERNAL_ERROR,
          `Failed to list providers: ${(error as Error).message}`,
          { enabledOnly },
          error as Error
        )
      );
    }
  }

  async isProviderAvailable(
    providerId: string
  ): Promise<Result<boolean, SandboxError>> {
    try {
      const provider = this.providers.get(providerId);
      return Ok(provider ? provider.enabled : false);
    } catch (error) {
      return Err(
        new ProviderError(
          ErrorCodes.INTERNAL_ERROR,
          `Failed to check provider availability: ${(error as Error).message}`,
          { providerId },
          error as Error
        )
      );
    }
  }

  async getProvidersByCapability(
    capability: string
  ): Promise<Result<readonly ServiceProviderInfo[], SandboxError>> {
    try {
      const matchingProviders = Array.from(this.providers.values()).filter(
        (provider) =>
          provider.enabled && provider.capabilities.includes(capability)
      );

      // Return deep copies to prevent mutation
      return Ok(matchingProviders.map((provider) => ({ ...provider })));
    } catch (error) {
      return Err(
        new ProviderError(
          ErrorCodes.INTERNAL_ERROR,
          `Failed to get providers by capability: ${(error as Error).message}`,
          { capability },
          error as Error
        )
      );
    }
  }

  async validateProvider(
    providerId: string
  ): Promise<Result<readonly string[], SandboxError>> {
    try {
      const provider = this.providers.get(providerId);
      if (!provider) {
        return Err(
          new ProviderError(
            ErrorCodes.PROVIDER_NOT_FOUND,
            `Provider '${providerId}' is not registered`,
            { providerId }
          )
        );
      }

      const errors = this.validateProviderConfiguration(provider);
      return Ok(errors);
    } catch (error) {
      return Err(
        new ProviderError(
          ErrorCodes.INTERNAL_ERROR,
          `Failed to validate provider: ${(error as Error).message}`,
          { providerId },
          error as Error
        )
      );
    }
  }

  /**

- Validates provider information before registration
   */
  private validateProviderInfo(
    provider: ServiceProviderInfo
  ): Result<void, SandboxError> {
    const errors: string[] = [];

    // Validate required fields
    if (
      !provider.id ||
      typeof provider.id !== 'string' ||
      provider.id.trim() === ''
    ) {
      errors.push('Provider ID is required and must be a non-empty string');
    }

    if (
      !provider.name ||
      typeof provider.name !== 'string' ||
      provider.name.trim() === ''
    ) {
      errors.push('Provider name is required and must be a non-empty string');
    }

    if (!provider.description || typeof provider.description !== 'string') {
      errors.push('Provider description is required and must be a string');
    }

    if (!provider.version || typeof provider.version !== 'string') {
      errors.push('Provider version is required and must be a string');
    }

    if (typeof provider.enabled !== 'boolean') {
      errors.push('Provider enabled flag must be a boolean');
    }

    if (!Array.isArray(provider.capabilities)) {
      errors.push('Provider capabilities must be an array');
    }

    if (typeof provider.metadata !== 'object' || provider.metadata === null) {
      errors.push('Provider metadata must be an object');
    }

    // Validate version format (basic semantic version check)
    if (provider.version && !this.isValidSemanticVersion(provider.version)) {
      errors.push(
        'Provider version must be a valid semantic version (e.g., 1.0.0)'
      );
    }

    // Validate provider ID format (alphanumeric, hyphens, underscores)
    if (provider.id && !this.isValidProviderId(provider.id)) {
      errors.push(
        'Provider ID must contain only alphanumeric characters, hyphens, and underscores'
      );
    }

    if (errors.length > 0) {
      return Err(
        new ProviderError(
          ErrorCodes.VALIDATION_FAILED,
          `Provider validation failed: ${errors.join(', ')}`,
          { providerId: provider.id, errors }
        )
      );
    }

    return Ok(undefined);
  }

  /**

- Validates provider configuration and returns any issues
   */
  private validateProviderConfiguration(
    provider: ServiceProviderInfo
  ): string[] {
    const errors: string[] = [];

    // Check for empty name
    if (!provider.name || provider.name.trim() === '') {
      errors.push('Provider name cannot be empty');
    }

    // Check version format
    if (!this.isValidSemanticVersion(provider.version)) {
      errors.push(`Invalid version format: ${provider.version}`);
    }

    // Check if provider has any capabilities
    if (provider.capabilities.length === 0) {
      errors.push('Provider should have at least one capability');
    }

    // Validate capability names
    const validCapabilities = [
      'template_processing',
      'variable_substitution',
      'block_filtering',
      'syntax_highlighting',
      'validation',
      'minification',
      'source_maps',
      'hot_reload',
      'incremental_compilation',
    ];

    for (const capability of provider.capabilities) {
      if (!validCapabilities.includes(capability)) {
        errors.push(`Unknown capability: ${capability}`);
      }
    }

    // Validate metadata structure if it contains known fields
    if (
      provider.metadata.configSchema &&
      typeof provider.metadata.configSchema !== 'object'
    ) {
      errors.push('configSchema in metadata must be an object');
    }

    return errors;
  }

  /**

- Validates semantic version format
   */
  private isValidSemanticVersion(version: string): boolean {
    const semVerRegex =
      /^(\d+)\.(\d+)\.(\d+)(?:-([0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*))?(?:\+([0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*))?$/;
    return semVerRegex.test(version);
  }

  /**

- Validates provider ID format
   */
  private isValidProviderId(id: string): boolean {
    const providerIdRegex = /^[a-zA-Z0-9_-]+$/;
    return providerIdRegex.test(id);
  }
}
