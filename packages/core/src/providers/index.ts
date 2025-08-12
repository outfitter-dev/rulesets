// Modern provider registry for Rulesets
// Implements Provider terminology while maintaining backwards compatibility

import type { DestinationPlugin, Provider } from '@rulesets/types';
import { CursorProvider } from './cursor-provider';
import { WindsurfProvider } from './windsurf-provider';
import { ClaudeCodeProvider } from './claude-code-provider';

// Create singleton instances of modern providers
export const cursorProvider = new CursorProvider();
export const windsurfProvider = new WindsurfProvider();
export const claudeCodeProvider = new ClaudeCodeProvider();

// Modern provider registry - primary export for new code
export const providers: ReadonlyMap<string, Provider> = new Map<string, Provider>([
  ['cursor', cursorProvider],
  ['windsurf', windsurfProvider],
  ['claude-code', claudeCodeProvider],
]);

// Provider lookup utilities for modern code
export function getProvider(id: string): Provider | undefined {
  return providers.get(id);
}

export function getAllProviders(): Provider[] {
  return Array.from(providers.values());
}

export function getProviderIds(): string[] {
  return Array.from(providers.keys());
}

// Backwards compatibility layer for legacy destination terminology
// @deprecated - Use providers instead. Will be removed in v1.0
export const destinations: ReadonlyMap<string, DestinationPlugin> = new Map<
  string,
  DestinationPlugin
>([
  ['cursor', cursorProvider as unknown as DestinationPlugin],
  ['windsurf', windsurfProvider as unknown as DestinationPlugin],
  ['claude-code', claudeCodeProvider as unknown as DestinationPlugin],
]);

// Legacy aliases for backwards compatibility
// @deprecated - Use provider functions instead. Will be removed in v1.0
export const cursorPlugin = cursorProvider;
export const windsurfPlugin = windsurfProvider;
export const claudeCodePlugin = claudeCodeProvider;

// Export classes for testing and extension
export { CursorProvider, WindsurfProvider, ClaudeCodeProvider };

// Export types for modern usage
export type { Provider } from '@rulesets/types';