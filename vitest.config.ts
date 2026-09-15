/// <reference types="vitest" />
import {resolve} from 'node:path';
import {configDefaults, defineConfig} from 'vitest/config';

/** Specs that exercise the built package; the `dist` project builds it once per run (`test/setup/build-dist.ts`). */
const distSpecs = ['test/entrypoints.spec.ts', 'test/boundaries.spec.ts', 'test/public-api.spec.ts'];

export default defineConfig({
  resolve: {
    alias: [{find: /^#\/(.*)/, replacement: `${resolve(process.cwd(), 'src')}/$1`}],
  },
  test: {
    globals: true,
    passWithNoTests: true,
    watch: false,
    coverage: {
      provider: 'v8',
      reportsDirectory: './.coverage',
      include: ['src/**/*.{js,mjs,cjs,ts,mts,cts,jsx,tsx}'],
      exclude: ['**/index.ts', '**/index.js', '**/index.mjs', '**/*.d.ts', '**/*.d.mts'],
    },
    testTimeout: 60000,
    hookTimeout: 30000,
    projects: [
      {
        extends: true,
        test: {
          name: 'unit',
          include: ['{src,test}/**/*.{e2e-test,e2e-spec,test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}'],
          exclude: [...configDefaults.exclude, ...distSpecs],
          typecheck: {
            enabled: true,
            include: ['**/*.test-d.ts'],
            tsconfig: './tsconfig.json',
          },
        },
      },
      {
        extends: true,
        test: {
          name: 'dist',
          include: distSpecs,
          globalSetup: ['test/setup/build-dist.ts'],
        },
      },
    ],
  },
});
