import { defineConfig, configDefaults } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';

const coreTestGlobs = [
  'src/services/**/*.test.{ts,tsx}',
  'src/hooks/**/*.test.{ts,tsx}',
  'src/lib/**/*.test.{ts,tsx}',
  'tests/readiness.service.test.ts',
  'tests/streaming-sections.test.ts',
  'tests/telemetry.readiness.test.ts',
];

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    globals: true,
    css: true,
    include: coreTestGlobs,
    exclude: [
      ...configDefaults.exclude,
      'tests/e2e/**',
      'notion-mcp-server/**',
      'apify-actors/**',
    ],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov', 'json-summary', 'json'],
      reportsDirectory: 'coverage-core',
      all: false,
      include: [
        'src/services/**/*.{ts,tsx}',
        'src/hooks/**/*.{ts,tsx}',
        'src/lib/**/*.{ts,tsx}',
        'src/pages/api/**/*.{ts,tsx}',
        'src/utils/**/*.{ts,tsx}',
      ],
      exclude: [
        '**/*.test.*',
        '**/*.spec.*',
        '**/__tests__/**',
        'src/test/**',
        'tests/**',
      ],
      reportOnFailure: true,
      thresholds: {
        lines: 30,
        functions: 25,
        statements: 30,
        branches: 45,
      },
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
});
