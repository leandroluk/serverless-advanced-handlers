import {defineConfig} from 'tsdown';

const shared = {
  platform: 'node',
  target: 'node22',
  outDir: 'dist',
  fixedExtension: true,
  dts: true,
  sourcemap: true,
} as const;

export default defineConfig([
  {
    ...shared,
    entry: {
      index: 'src/index.ts',
      runtime: 'src/runtime/index.ts',
      testing: 'src/testing/index.ts',
    },
    format: 'esm',
    clean: true,
  },
  {
    ...shared,
    entry: {
      plugin: 'src/plugin/index.ts',
    },
    format: 'cjs',
    clean: false,
  },
]);
