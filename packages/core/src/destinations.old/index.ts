// TLDR: Export destination plugin instances for use in Rulesets (mixd-v0)
// TLDR: v0.1.0 Basic plugin registry with Cursor and Windsurf support

import type { DestinationPlugin } from '../interfaces';

// Export from modules for testing and extension
export { CursorPlugin } from './cursor-plugin';
export { WindsurfPlugin } from './windsurf-plugin';

// Import classes for instantiation
import { CursorPlugin } from './cursor-plugin';
import { WindsurfPlugin } from './windsurf-plugin';

// Create singleton instances
export const cursorPlugin = new CursorPlugin();
export const windsurfPlugin = new WindsurfPlugin();

// Export as a map for easy lookup
export const destinations: ReadonlyMap<string, DestinationPlugin> = new Map([
  ['cursor', cursorPlugin as DestinationPlugin],
  ['windsurf', windsurfPlugin as DestinationPlugin],
]);
