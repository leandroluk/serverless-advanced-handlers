import {existsSync, readFileSync} from 'node:fs';
import {createRequire} from 'node:module';
import {fileURLToPath} from 'node:url';
import {describe, expect, it} from 'vitest';

const root = new URL('../', import.meta.url);
const dist = new URL('dist/', root);

describe('package entry points (REQ-001)', () => {
  it.each(['index', 'runtime', 'testing'])('dist/%s.mjs is importable and ships its .d.mts', async name => {
    const mod: unknown = await import(new URL(`${name}.mjs`, dist).href);

    expect(mod).toBeTypeOf('object');
    expect(existsSync(new URL(`${name}.d.mts`, dist))).toBe(true);
  });

  it('dist/plugin.cjs is requirable and ships its .d.cts', () => {
    const require = createRequire(import.meta.url);
    const mod: unknown = require(fileURLToPath(new URL('plugin.cjs', dist)));

    expect(mod).toBeTypeOf('object');
    expect(existsSync(new URL('plugin.d.cts', dist))).toBe(true);
  });

  it('package.json exposes exactly the four entries, all pointing to built files', () => {
    const pkg = JSON.parse(readFileSync(new URL('package.json', root), 'utf8')) as {
      exports: Record<string, Record<string, string>>;
    };

    const targets = Object.values(pkg.exports).flatMap(conditions => Object.values(conditions));

    expect(Object.keys(pkg.exports)).toEqual(['.', './runtime', './testing', './plugin']);
    expect(targets.filter(target => !existsSync(new URL(target, root)))).toEqual([]);
  });
});
