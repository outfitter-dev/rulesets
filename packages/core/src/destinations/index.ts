import type { DestinationPlugin } from '../interfaces';
import { CursorPlugin } from './cursor-plugin';
import { WindsurfPlugin } from './windsurf-plugin';

// Create singleton instances
export const cursorPlugin = new CursorPlugin();
export const windsurfPlugin = new WindsurfPlugin();

// Export as a map for easy lookup
export const destinations: ReadonlyMap<string, DestinationPlugin> = new Map([
  ['cursor', cursorPlugin],
  ['windsurf', windsurfPlugin],
]);

// Re-export classes for testing and extension
// biome-ignore lint/performance/noBarrelFile: Destination plugin exports
export { CursorPlugin } from './cursor-plugin';
export { WindsurfPlugin } from './windsurf-plugin';
