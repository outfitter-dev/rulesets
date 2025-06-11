// :M: tldr: Export destination plugin instances for use in Rulesets
// :M: v0.1.0: Basic plugin registry with Cursor and Windsurf support
import { CursorPlugin } from './cursor-plugin';
import { WindsurfPlugin } from './windsurf-plugin';
import type { DestinationPlugin } from '../interfaces';

// Create singleton instances
export const cursorPlugin = new CursorPlugin();
export const windsurfPlugin = new WindsurfPlugin();

// Export as a map for easy lookup
export const destinations: ReadonlyMap<string, DestinationPlugin> = new Map([
  ['cursor', cursorPlugin],
  ['windsurf', windsurfPlugin],
]);

// Export classes for testing and extension
export { CursorPlugin, WindsurfPlugin };