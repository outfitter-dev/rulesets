// TLDR: Export destination plugin instances for use in Mixdown (mixd-v0)
import { CursorPlugin } from './cursor-plugin';
import { WindsurfPlugin } from './windsurf-plugin';
import type { DestinationPlugin } from '../interfaces';

// Create singleton instances
export const cursorPlugin = new CursorPlugin();
export const windsurfPlugin = new WindsurfPlugin();

// Export as a map for easy lookup
export const destinations: Map<string, DestinationPlugin> = new Map([
  ['cursor', cursorPlugin],
  ['windsurf', windsurfPlugin],
]);

// Export classes for testing and extension
export { CursorPlugin, WindsurfPlugin };