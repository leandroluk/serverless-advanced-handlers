import {build} from 'esbuild';
import {fileURLToPath} from 'node:url';
import {describe, expect, it} from 'vitest';

const root = fileURLToPath(new URL('../', import.meta.url));

/** Build-time packages that must never reach a Lambda bundle (REQ-002). */
const forbidden = /(?:^|\/)node_modules\/(?:ts-morph|typescript|esbuild|@swc\/[^/]+)\//;

async function bundledInputs(entry: string): Promise<string[]> {
  const {metafile} = await build({
    absWorkingDir: root,
    entryPoints: [entry],
    bundle: true,
    metafile: true,
    platform: 'node',
    format: 'esm',
    write: false,
    logLevel: 'silent',
  });

  return Object.keys(metafile.inputs).map(input => input.replaceAll('\\', '/'));
}

describe('dependency boundaries (REQ-002)', () => {
  it.each(['dist/index.mjs', 'dist/runtime.mjs'])(
    '%s does not bundle ts-morph, typescript, esbuild or @swc/*',
    async entry => {
      const inputs = await bundledInputs(entry);

      expect(inputs).toContain(entry);
      expect(inputs.filter(input => forbidden.test(input))).toEqual([]);
    }
  );
});
