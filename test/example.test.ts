/**
 * Example test file demonstrating Bun's built-in test runner
 */

import { describe, expect, it, mock, spyOn, test } from 'bun:test';

// Define a top-level regex to satisfy Biome's performance rule
const BUN_REGEX = /^B/;

// Define Bun types for globalThis
interface BunGlobal {
  sleep?: (ms: number) => Promise<void>;
  file?: (path: string) => { json: () => Promise<unknown> };
}

interface CustomGlobalThis extends GlobalThis {
  Bun?: BunGlobal;
}

describe('Bun Test Runner Examples', () => {
  describe('Basic assertions', () => {
    it('should perform arithmetic correctly', () => {
      expect(2 + 2).toBe(4);
      expect(0.1 + 0.2).toBeCloseTo(0.3);
    });

    it('should handle strings', () => {
      expect('hello world').toContain('world');
      expect('Bun').toMatch(BUN_REGEX);
    });

    it('should handle arrays and objects', () => {
      expect([1, 2, 3]).toHaveLength(3);
      expect({ name: 'Bun', fast: true }).toHaveProperty('fast', true);
    });
  });

  describe('Async tests', () => {
    it('should handle promises', async () => {
      const promise = Promise.resolve('success');
      await expect(promise).resolves.toBe('success');
    });

    it('should handle async/await', async () => {
      const asyncFn = async () => {
        await (globalThis as CustomGlobalThis).Bun?.sleep?.(10);
        return 'done';
      };
      const result = await asyncFn();
      expect(result).toBe('done');
    });
  });

  describe('Mocking', () => {
    it('should mock functions', () => {
      const mockFn = mock(() => 'mocked');
      expect(mockFn()).toBe('mocked');
      expect(mockFn).toHaveBeenCalledTimes(1);
    });

    it('should spy on methods', () => {
      const obj = {
        method: (x: number) => x * 2,
      };
      const spy = spyOn(obj, 'method');

      const result = obj.method(5);
      expect(result).toBe(10);
      expect(spy).toHaveBeenCalledWith(5);
    });
  });

  describe('File system tests', () => {
    it('should read files with Bun.file', async () => {
      const file = (globalThis as CustomGlobalThis).Bun?.file?.('package.json');
      const contents = await file.json();
      expect(contents.name).toBe('rulesets');
    });
  });

  describe('Performance tests', () => {
    test('should complete within time limit', () => {
      const start = performance.now();
      // Simulate some work
      for (let i = 0; i < 1000; i++) {
        Math.sqrt(i);
      }
      const duration = performance.now() - start;
      expect(duration).toBeLessThan(10); // Should complete in less than 10ms
    });
  });
});

// Test with .todo for pending tests
test.todo('implement advanced feature');

// Test with .skip to skip tests
test('skip this test temporarily', () => {
  // This won't run
});

// Test with .only to run only specific tests (useful during development)
// test.only("focus on this test", () => {
//   expect(true).toBe(true);
// });
