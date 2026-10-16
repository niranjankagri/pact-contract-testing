// Vitest settings. Pact test files write to the same pact file, so test files run one after another.
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['test/**/*.test.ts'],
    fileParallelism: false,
    // The Pact mock server is a native library; give it time to start on slow CI machines.
    testTimeout: 30_000,
  },
});
