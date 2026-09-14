/// <reference types="vitest" />
import {resolve} from 'node:path';
import {defineConfig} from 'vitest/config';

export default defineConfig({
  resolve: {
    alias: [{find: /^#\/(.*)/, replacement: `${resolve(process.cwd(), 'src')}/$1`}],
  },
  test: {
    globals: true,
    passWithNoTests: true,
    watch: false,
    include: ['{src,test}/**/*.{e2e-test,e2e-spec,test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}'],
    typecheck: {
      enabled: true,
      include: ['**/*.test-d.ts'],
      tsconfig: './tsconfig.json',
    },
    coverage: {
      provider: 'v8',
      reportsDirectory: './.coverage',
      include: ['src/**/*.{js,mjs,cjs,ts,mts,cts,jsx,tsx}'],
      exclude: ['**/index.ts', '**/index.js', '**/index.mjs', '**/*.d.ts', '**/*.d.mts'],
    },
    testTimeout: 60000,
    hookTimeout: 30000,
  },
});
