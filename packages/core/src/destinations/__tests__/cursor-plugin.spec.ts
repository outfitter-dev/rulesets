// TLDR: Tests for cursor destination plugin (mixd-v0)
import { cursorPlugin } from '../cursor-plugin';
import { describe, it, expect } from 'vitest';

describe('cursorPlugin', () => {
  it('exposes name', () => {
    expect(cursorPlugin.name).toBe('cursor');
  });
});
