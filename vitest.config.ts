import { defineConfig, Plugin } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';

// Plugin to handle CSS imports in tests
const cssPlugin = (): Plugin => ({
  name: 'vitest-css-plugin',
  transform(code, id) {
    if (id.endsWith('.css')) {
      return {
        code: 'export default {}',
        map: null,
      };
    }
  },
});

export default defineConfig({
  plugins: [react(), cssPlugin()],
  test: {
    name: 'codechat-tests',
    environment: 'happy-dom',
    globals: true,
    setupFiles: ['./tests/setup.ts'],
    css: false,
    server: {
      deps: {
        external: ['katex'],
      },
    },
    include: [
      'tests/unit/**/*.test.{ts,tsx}',
      'tests/integration/**/*.test.{ts,tsx}',
    ],
    exclude: [
      'node_modules',
      '.next',
      'tests/e2e/**/*',
    ],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html', 'lcov'],
      exclude: [
        'node_modules/',
        '.next/',
        'tests/',
        '**/*.config.{js,ts}',
        '**/*.d.ts',
        '**/types/**',
        'lib/db/migrations/**',
      ],
      all: true,
      lines: 80,
      functions: 80,
      branches: 75,
      statements: 80,
    },
    testTimeout: 30000,
    hookTimeout: 30000,
    pool: 'threads',
    poolOptions: {
      threads: {
        singleThread: false,
        isolate: true,
      },
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './'),
    },
  },
});
