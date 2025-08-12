/**
 * Bun test setup file
 * This file is preloaded before running tests as configured in bunfig.toml
 */

import { afterAll, afterEach, beforeAll, beforeEach } from 'bun:test';

// Global test setup
beforeAll(() => {
  // Set up test environment variables
  process.env.NODE_ENV = 'test';
  // console.log('🧪 Starting test suite...');
});

// Clean up after all tests
afterAll(() => {
  // console.log('✅ Test suite completed');
});

// Reset mocks before each test
beforeEach(() => {
  // Reset any global mocks or state
});

// Clean up after each test
afterEach(() => {
  // Clean up test artifacts
});

// Mock common modules if needed
// Bun.mock("./some-module", () => ({
//   default: () => "mocked value"
// }));

// Add custom matchers if needed
// expect.extend({
//   toBeWithinRange(received: number, floor: number, ceiling: number) {
//     const pass = received >= floor && received <= ceiling;
//     return {
//       pass,
//       message: () =>
//         pass
//           ? `expected ${received} not to be within range ${floor} - ${ceiling}`
//           : `expected ${received} to be within range ${floor} - ${ceiling}`,
//     };
//   },
// });
