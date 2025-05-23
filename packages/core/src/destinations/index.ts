// TLDR: Exports destination plugins for Mixdown (mixd-v0)

import { CursorPlugin } from './cursor-plugin';
import { WindsurfPlugin } from './windsurf-plugin';

export { CursorPlugin, WindsurfPlugin };

// Export plugin instances for convenient usage
export const cursorPlugin = new CursorPlugin();
export const windsurfPlugin = new WindsurfPlugin();

// Map of all available plugins by name
export const plugins = {
  [cursorPlugin.name]: cursorPlugin,
  [windsurfPlugin.name]: windsurfPlugin,
};

/**
 * Get a destination plugin by name
 * TLDR: Returns a plugin instance by name (mixd-v0)
 * 
 * @param name - The name of the plugin to get
 * @returns The plugin instance, or undefined if not found
 */
export function getPlugin(name: string) {
  return plugins[name];
}