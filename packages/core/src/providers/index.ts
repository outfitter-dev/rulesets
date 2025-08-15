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
class ReadOnlyProviderMap implements ReadonlyMap<string, Provider> {
  private readonly _map: Map<string, Provider>;

  constructor(entries: [string, Provider][]) {
    this._map = new Map(entries);
  }

  get size(): number {
    return this._map.size;
  }

  get(key: string): Provider | undefined {
    return this._map.get(key);
  }

  has(key: string): boolean {
    return this._map.has(key);
  }

  keys(): MapIterator<string> {
    return this._map.keys() as MapIterator<string>;
  }

  values(): MapIterator<Provider> {
    return this._map.values() as MapIterator<Provider>;
  }

  entries(): MapIterator<[string, Provider]> {
    return this._map.entries() as MapIterator<[string, Provider]>;
  }

  forEach(callbackfn: (value: Provider, key: string, map: ReadonlyMap<string, Provider>) => void): void {
    this._map.forEach((value, key) => callbackfn(value, key, this as ReadonlyMap<string, Provider>));
  }

  [Symbol.iterator](): MapIterator<[string, Provider]> {
    return this._map[Symbol.iterator]() as MapIterator<[string, Provider]>;
  }
}

export const providers: ReadonlyMap<string, Provider> = new ReadOnlyProviderMap([
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
class ReadOnlyDestinationMap implements ReadonlyMap<string, DestinationPlugin> {
  private readonly _map: Map<string, DestinationPlugin>;

  constructor(entries: [string, DestinationPlugin][]) {
    this._map = new Map(entries);
  }

  get size(): number {
    return this._map.size;
  }

  get(key: string): DestinationPlugin | undefined {
    return this._map.get(key);
  }

  has(key: string): boolean {
    return this._map.has(key);
  }

  keys(): MapIterator<string> {
    return this._map.keys() as MapIterator<string>;
  }

  values(): MapIterator<DestinationPlugin> {
    return this._map.values() as MapIterator<DestinationPlugin>;
  }

  entries(): MapIterator<[string, DestinationPlugin]> {
    return this._map.entries() as MapIterator<[string, DestinationPlugin]>;
  }

  forEach(callbackfn: (value: DestinationPlugin, key: string, map: ReadonlyMap<string, DestinationPlugin>) => void): void {
    this._map.forEach((value, key) => callbackfn(value, key, this as ReadonlyMap<string, DestinationPlugin>));
  }

  [Symbol.iterator](): MapIterator<[string, DestinationPlugin]> {
    return this._map[Symbol.iterator]() as MapIterator<[string, DestinationPlugin]>;
  }
}

export const destinations: ReadonlyMap<string, DestinationPlugin> = new ReadOnlyDestinationMap([
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
