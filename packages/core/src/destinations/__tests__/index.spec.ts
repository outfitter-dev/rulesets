// TLDR: Tests for the destinations index module (mixd-v0)

import { describe, it, expect } from 'vitest';
import { cursorPlugin, windsurfPlugin, plugins, getPlugin } from '../index';
import { CursorPlugin } from '../cursor-plugin';
import { WindsurfPlugin } from '../windsurf-plugin';

describe('Destinations module', () => {
  it('should export plugin instances', () => {
    expect(cursorPlugin).toBeInstanceOf(CursorPlugin);
    expect(windsurfPlugin).toBeInstanceOf(WindsurfPlugin);
  });

  it('should have all plugins in the plugins map', () => {
    expect(plugins.cursor).toBe(cursorPlugin);
    expect(plugins.windsurf).toBe(windsurfPlugin);
  });

  it('should return the correct plugin when using getPlugin', () => {
    expect(getPlugin('cursor')).toBe(cursorPlugin);
    expect(getPlugin('windsurf')).toBe(windsurfPlugin);
    expect(getPlugin('non-existent')).toBeUndefined();
  });
});