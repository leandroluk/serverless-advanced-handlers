import {spawnSync} from 'node:child_process';
import {createRequire} from 'node:module';
import {dirname, join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {describe, expect, it, vi} from 'vitest';
import {Global, Inject, Injectable, Module, Optional} from '#/decorators/di';
import {InjectionToken} from '#/di/tokens';
import {Scope} from '#/di/providers';
import * as root from '#/index';

const require = createRequire(import.meta.url);
const tscBin = join(dirname(require.resolve('typescript/package.json')), 'bin', 'tsc');
const projectRoot = fileURLToPath(new URL('..', import.meta.url));
const modeCProject = fileURLToPath(new URL('types/mode-c-di/tsconfig.json', import.meta.url));
const modeCInvalidProject = fileURLToPath(new URL('types/mode-c-di/invalid/tsconfig.json', import.meta.url));
const t002ModeCProject = fileURLToPath(new URL('types/mode-c/tsconfig.json', import.meta.url));
const t002ModeCInvalidProject = fileURLToPath(new URL('types/mode-c/invalid/tsconfig.json', import.meta.url));

/** Executa o `tsc` do projeto e devolve o código de saída e a saída combinada. */
const tsc = (...args: string[]) => {
  const result = spawnSync(process.execPath, [tscBin, '--pretty', 'false', ...args], {
    cwd: projectRoot,
    encoding: 'utf8',
  });
  expect(result.error).toBeUndefined();
  return {status: result.status, output: `${result.stdout}${result.stderr}`};
};

/** Configuração efetiva de um tsconfig (`tsc --showConfig`). */
const showConfig = (project: string) => {
  const {status, output} = tsc('-p', project, '--showConfig');
  expect(status).toBe(0);
  return JSON.parse(output) as {compilerOptions: Record<string, unknown>; files: string[]};
};

// Pares [chave, descriptor] em vez de objeto: uma chave própria `constructor` (protótipos) quebraria a
// checagem de tipo do `toStrictEqual`.
/** Descriptors próprios de um objeto, na ordem das chaves. */
const descriptorsOf = (target: object) =>
  Reflect.ownKeys(target).map(key => [key, Object.getOwnPropertyDescriptor(target, key)] as const);

/** Resumo comparável entre objetos distintos: flags de cada descriptor e o tipo do valor. */
const shapeOf = (target: object) =>
  descriptorsOf(target).map(([key, descriptor]) => {
    const {value, get, set, ...flags} = descriptor!;
    return [key, {...flags, type: typeof value, accessor: get !== undefined || set !== undefined}] as const;
  });

const CONFIG = new InjectionToken<{url: string}>('CONFIG');

/** Decorators de classe de DI, com argumentos representativos. */
const classDecorators = () => [
  Module({providers: [], exports: [CONFIG]}),
  Global(),
  Injectable(),
  Injectable({scope: Scope.REQUEST}),
];

/** Decorators de parâmetro de DI, com argumentos representativos. */
const parameterDecorators = () => [Inject(CONFIG), Inject('TOKEN'), Inject(Symbol('TOKEN')), Optional()];

describe('modo C (decorators TC39) com decorators e marcadores de DI', () => {
  it('os tsconfigs das fixtures não habilitam experimentalDecorators nem emitDecoratorMetadata', () => {
    for (const [project, fixture] of [
      [modeCProject, './di-decorators-and-markers.ts'],
      [modeCInvalidProject, './inject-parameter-decorator.ts'],
    ] as const) {
      const config = showConfig(project);
      expect(config.compilerOptions).not.toHaveProperty('experimentalDecorators');
      expect(config.compilerOptions).not.toHaveProperty('emitDecoratorMetadata');
      expect(config.files).toEqual([fixture]);
    }
  });

  it('os tsconfigs de modo C da T-002 não incluem as fixtures de DI', () => {
    for (const project of [t002ModeCProject, t002ModeCInvalidProject]) {
      const {files} = showConfig(project);
      expect(files.length).toBeGreaterThan(0);
      expect(files.filter(file => /mode-c-di|di-decorators-and-markers|inject-parameter-decorator/.test(file))).toEqual(
        []
      );
    }
  });

  it('aceita @Module, @Global, @Injectable e os marcadores Inject<...> e Optional<...>', () => {
    const {status, output} = tsc('-p', modeCProject);
    expect(output).toBe('');
    expect(status).toBe(0);
  });

  it('rejeita @Inject(TOKEN) em parâmetro com TS1206', () => {
    const {status, output} = tsc('-p', modeCInvalidProject);
    expect(status).not.toBe(0);
    expect(output).toContain('TS1206');
    expect(new Set(output.match(/error TS\d+/g))).toEqual(new Set(['error TS1206']));
    for (const line of output.trim().split(/\r?\n/)) {
      expect(line).toMatch(
        /^test[/\\]types[/\\]mode-c-di[/\\]invalid[/\\]inject-parameter-decorator\.ts\(\d+,\d+\): error TS1206:/
      );
    }
  });
});

describe('decorators de DI em runtime', () => {
  it('forma legada: não alteram classe nem construtor e retornam undefined', () => {
    class Target {
      constructor(readonly url: string) {}
    }
    const classBefore = descriptorsOf(Target);
    const prototypeBefore = descriptorsOf(Target.prototype);

    for (const decorator of classDecorators()) {
      expect(decorator(Target)).toBeUndefined();
    }
    for (const decorator of parameterDecorators()) {
      expect(decorator(Target, undefined, 0)).toBeUndefined();
    }

    expect(descriptorsOf(Target)).toStrictEqual(classBefore);
    expect(descriptorsOf(Target.prototype)).toStrictEqual(prototypeBefore);
    expect(Target.prototype.constructor).toBe(Target);
    expect(new Target('postgres://localhost').url).toBe('postgres://localhost');
  });

  it('forma TC39: não alteram a classe, não registram initializers e retornam undefined', () => {
    class Target {}
    const classBefore = descriptorsOf(Target);
    const prototypeBefore = descriptorsOf(Target.prototype);
    const addInitializer = vi.fn();
    const metadata = {};
    const context = Object.freeze({kind: 'class', name: 'Target', addInitializer, metadata});

    for (const decorator of classDecorators()) {
      expect(decorator(Target, context as ClassDecoratorContext)).toBeUndefined();
    }

    expect(addInitializer).not.toHaveBeenCalled();
    expect(Reflect.ownKeys(metadata)).toEqual([]);
    expect(descriptorsOf(Target)).toStrictEqual(classBefore);
    expect(descriptorsOf(Target.prototype)).toStrictEqual(prototypeBefore);
  });

  it('aplicados com sintaxe de decorator, preservam classe, construtor e parâmetros', () => {
    class Plain {
      constructor(
        readonly config: {url: string},
        readonly logger?: string
      ) {}

      url(): string {
        return this.config.url;
      }
    }

    @Global()
    @Module({providers: [], exports: [CONFIG]})
    @Injectable({scope: Scope.REQUEST})
    class Decorated {
      constructor(
        @Inject(CONFIG) readonly config: {url: string},
        @Inject('LOGGER') @Optional() readonly logger?: string
      ) {}

      url(): string {
        return this.config.url;
      }
    }

    expect(shapeOf(Decorated)).toStrictEqual(shapeOf(Plain));
    expect(shapeOf(Decorated.prototype)).toStrictEqual(shapeOf(Plain.prototype));
    expect(Decorated.length).toBe(Plain.length);
    expect(Decorated.prototype.constructor).toBe(Decorated);
    expect(Reflect.ownKeys(new Decorated({url: 'x'}, 'log'))).toEqual(['config', 'logger']);
    expect(new Decorated({url: 'postgres://localhost'}).url()).toBe('postgres://localhost');
  });

  it('são exportados pelo barrel raiz', () => {
    expect(root.Module).toBe(Module);
    expect(root.Global).toBe(Global);
    expect(root.Injectable).toBe(Injectable);
    expect(root.Inject).toBe(Inject);
    expect(root.Optional).toBe(Optional);
  });
});
