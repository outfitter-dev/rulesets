// TLDR: Tests for windsurf destination plugin (mixd-v0)
import { windsurfPlugin } from '../windsurf-plugin';
import { describe, it, expect } from 'vitest';

describe('windsurfPlugin', () => {
  it('exposes name', () => {
    expect(windsurfPlugin.name).toBe('windsurf');
  });
});
