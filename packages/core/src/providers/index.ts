// Modern provider registry for Rulesets
// Implements Provider terminology while maintaining backwards compatibility

import type { DestinationPlugin, Provider } from '@rulesets/types';

// Import classes for instantiation
import { AmpProvider } from './amp-provider';
import { ClaudeCodeProvider } from './claude-code-provider';
import { CodexProvider } from './codex-provider';
import { CursorProvider } from './cursor-provider';
import { OpenCodeProvider } from './opencode-provider';
import { WindsurfProvider } from './windsurf-provider';

// Create singleton instances of modern providers
export const cursorProvider = new CursorProvider();
export const windsurfProvider = new WindsurfProvider();
export const claudeCodeProvider = new ClaudeCodeProvider();
export const codexProvider = new CodexProvider();
export const ampProvider = new AmpProvider();
export const openCodeProvider = new OpenCodeProvider();

// Modern provider registry - primary export for new code
export const providers: ReadonlyMap<string, Provider> = new Map<
  string,
  Provider
>([
  ['cursor', cursorProvider],
  ['windsurf', windsurfProvider],
  ['claude-code', claudeCodeProvider],
  ['codex-cli', codexProvider],
  ['amp', ampProvider],
  ['opencode', openCodeProvider],
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
  ['codex-cli', codexProvider as unknown as DestinationPlugin],
  ['amp', ampProvider as unknown as DestinationPlugin],
  ['opencode', openCodeProvider as unknown as DestinationPlugin],
]);

// Legacy aliases for backwards compatibility
// @deprecated - Use provider functions instead. Will be removed in v1.0
export const cursorPlugin = cursorProvider;
export const windsurfPlugin = windsurfProvider;
export const claudeCodePlugin = claudeCodeProvider;
export const codexPlugin = codexProvider;
export const ampPlugin = ampProvider;
export const openCodePlugin = openCodeProvider;

// Export types for modern usage
export type { Provider } from '@rulesets/types';
// Export classes for testing and extension
export { AmpProvider } from './amp-provider';
export { ClaudeCodeProvider } from './claude-code-provider';
export { CodexProvider } from './codex-provider';
export { CursorProvider } from './cursor-provider';
export { OpenCodeProvider } from './opencode-provider';
export { WindsurfProvider } from './windsurf-provider';
