import {defineConfig} from 'tsdown';

/**
 * Build-time toolchain (REQ-002) is never inlined into `dist/`: an import of it stays a bare import, so
 * `test/boundaries.spec.ts` sees it in the esbuild metafile instead of missing code that tsdown copied in.
 */
const buildTimeOnly: RegExp[] = [/^(?:ts-morph|typescript|esbuild)(?:\/|$)/, /^@swc\//];

const shared = {
  platform: 'node',
  target: 'node22',
  outDir: 'dist',
  fixedExtension: true,
  dts: true,
  sourcemap: true,
  deps: {neverBundle: buildTimeOnly},
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
