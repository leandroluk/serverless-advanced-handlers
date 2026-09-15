import {spawnSync} from 'node:child_process';
import {createRequire} from 'node:module';
import {dirname, join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {describe, expect, it, vi} from 'vitest';
import {
  HttpBody,
  HttpCode,
  HttpController,
  HttpCookies,
  HttpDelete,
  HttpForm,
  HttpGet,
  HttpHead,
  HttpHeaders,
  HttpOptions,
  HttpParams,
  HttpPatch,
  HttpPost,
  HttpPut,
  HttpQuery,
  HttpResponseHeader,
} from '#/decorators/http';
import * as decoratorsHttp from '#/decorators/http';
import * as httpBarrel from '#/http';
import {HttpStatus} from '#/http/status';
import {HttpRequest, LambdaContext} from '#/http/types';
import * as root from '#/index';

const require = createRequire(import.meta.url);
const tscBin = join(dirname(require.resolve('typescript/package.json')), 'bin', 'tsc');
const projectRoot = fileURLToPath(new URL('..', import.meta.url));
const modeCProject = fileURLToPath(new URL('types/mode-c-http/tsconfig.json', import.meta.url));
const modeCInvalidProject = fileURLToPath(new URL('types/mode-c-http/invalid/tsconfig.json', import.meta.url));
const decoratorModesProject = fileURLToPath(new URL('types/mode-c/tsconfig.json', import.meta.url));
const decoratorModesInvalidProject = fileURLToPath(new URL('types/mode-c/invalid/tsconfig.json', import.meta.url));

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

/** Descriptors próprios de um objeto, na ordem das chaves. */
const descriptorsOf = (target: object) =>
  Reflect.ownKeys(target).map(key => [key, Object.getOwnPropertyDescriptor(target, key)] as const);

/** Resumo comparável entre objetos distintos: flags de cada descriptor e o tipo do valor. */
const shapeOf = (target: object) =>
  descriptorsOf(target).map(([key, descriptor]) => {
    const {value, get, set, ...flags} = descriptor!;
    return [key, {...flags, type: typeof value, accessor: get !== undefined || set !== undefined}] as const;
  });

const classDecorators = [HttpController(), HttpController('users')];
const methodDecorators = [
  HttpGet(),
  HttpGet('/:id'),
  HttpPost('/'),
  HttpPut('/:id'),
  HttpPatch('/:id'),
  HttpDelete('/:id'),
  HttpHead('/'),
  HttpOptions('/'),
  HttpCode(HttpStatus.CREATED),
  HttpCode(204),
  HttpResponseHeader('cache-control', 'no-store'),
];
const parameterDecorators = [
  HttpBody(),
  HttpQuery(),
  HttpParams(),
  HttpHeaders(),
  HttpCookies(),
  HttpForm(),
  HttpRequest(),
  LambdaContext(),
];

describe('decorators HTTP no modo C (decorators TC39)', () => {
  it('os tsconfigs das fixtures não habilitam experimentalDecorators nem emitDecoratorMetadata', () => {
    for (const [project, fixture] of [
      [modeCProject, './users-controller.ts'],
      [modeCInvalidProject, './parameter-decorator.ts'],
    ] as const) {
      const config = showConfig(project);
      expect(config.compilerOptions).not.toHaveProperty('experimentalDecorators');
      expect(config.compilerOptions).not.toHaveProperty('emitDecoratorMetadata');
      expect(config.files).toEqual([fixture]);
    }
  });

  it('os tsconfigs de modo C da T-002 não incluem as fixtures HTTP', () => {
    for (const project of [decoratorModesProject, decoratorModesInvalidProject]) {
      for (const file of showConfig(project).files) {
        expect(file).not.toMatch(/mode-c-http|users-controller/);
      }
    }
  });

  it('aceita decorators de classe e de método com marcadores nos parâmetros', () => {
    const {status, output} = tsc('-p', modeCProject);
    expect(output).toBe('');
    expect(status).toBe(0);
  });

  it('rejeita decorator de parâmetro HTTP com TS1206', () => {
    const {status, output} = tsc('-p', modeCInvalidProject);
    expect(status).not.toBe(0);
    expect(output).toContain('TS1206');
    expect(new Set(output.match(/error TS\d+/g))).toEqual(new Set(['error TS1206']));
    for (const line of output.trim().split(/\r?\n/)) {
      expect(line).toMatch(
        /^test[/\\]types[/\\]mode-c-http[/\\]invalid[/\\]parameter-decorator\.ts\(\d+,\d+\): error TS1206:/
      );
    }
  });
});

describe('decorators HTTP em runtime', () => {
  it('forma legada: não alteram classe, protótipo nem descriptor e retornam undefined', () => {
    class Target {
      greet(name: string): string {
        return `olá ${name}`;
      }
    }
    const classBefore = descriptorsOf(Target);
    const prototypeBefore = descriptorsOf(Target.prototype);
    const descriptor = Object.getOwnPropertyDescriptor(Target.prototype, 'greet')!;
    const descriptorBefore = {...descriptor};

    for (const decorator of classDecorators) {
      expect(decorator(Target)).toBeUndefined();
    }
    for (const decorator of methodDecorators) {
      expect(decorator(Target.prototype, 'greet', descriptor)).toBeUndefined();
    }
    for (const decorator of parameterDecorators) {
      expect(decorator(Target.prototype, 'greet', 0)).toBeUndefined();
      expect(decorator(Target, undefined, 0)).toBeUndefined();
    }

    expect(descriptorsOf(Target)).toStrictEqual(classBefore);
    expect(descriptorsOf(Target.prototype)).toStrictEqual(prototypeBefore);
    expect(descriptor).toStrictEqual(descriptorBefore);
    expect(new Target().greet('mundo')).toBe('olá mundo');
  });

  it('forma TC39: não alteram classe nem método, não registram initializers e retornam undefined', () => {
    class Target {
      greet(name: string): string {
        return `olá ${name}`;
      }
    }
    const method = Target.prototype.greet;
    const classBefore = descriptorsOf(Target);
    const prototypeBefore = descriptorsOf(Target.prototype);
    const methodBefore = descriptorsOf(method);
    const addInitializer = vi.fn();
    const metadata = {};
    const classContext = Object.freeze({kind: 'class', name: 'Target', addInitializer, metadata});
    const methodContext = Object.freeze({
      kind: 'method',
      name: 'greet',
      static: false,
      private: false,
      access: {has: () => true, get: () => method},
      addInitializer,
      metadata,
    });

    for (const decorator of classDecorators) {
      expect(decorator(Target, classContext as ClassDecoratorContext)).toBeUndefined();
    }
    for (const decorator of methodDecorators) {
      expect(decorator(method, methodContext as ClassMethodDecoratorContext)).toBeUndefined();
    }

    expect(addInitializer).not.toHaveBeenCalled();
    expect(Reflect.ownKeys(metadata)).toEqual([]);
    expect(descriptorsOf(Target)).toStrictEqual(classBefore);
    expect(descriptorsOf(Target.prototype)).toStrictEqual(prototypeBefore);
    expect(descriptorsOf(method)).toStrictEqual(methodBefore);
  });

  it('aplicados com sintaxe de decorator, preservam classe, métodos e descriptors', () => {
    class Plain {
      constructor(readonly prefix: string) {}

      create(body: unknown, query: unknown): string {
        return `${this.prefix} ${String(body)} ${String(query)}`;
      }

      read(params: unknown, headers: unknown, cookies: unknown, form: unknown): unknown[] {
        return [params, headers, cookies, form];
      }

      static handle(req: unknown, ctx: unknown): unknown[] {
        return [req, ctx];
      }
    }

    @HttpController('users')
    class Decorated {
      constructor(readonly prefix: string) {}

      @HttpPost('/')
      @HttpCode(HttpStatus.CREATED)
      @HttpResponseHeader('x-a', 'b')
      create(@HttpBody() body: unknown, @HttpQuery() query: unknown): string {
        return `${this.prefix} ${String(body)} ${String(query)}`;
      }

      @HttpGet('/:id')
      @HttpPut('/:id')
      @HttpPatch('/:id')
      @HttpDelete('/:id')
      read(
        @HttpParams() params: unknown,
        @HttpHeaders() headers: unknown,
        @HttpCookies() cookies: unknown,
        @HttpForm() form: unknown
      ): unknown[] {
        return [params, headers, cookies, form];
      }

      @HttpHead()
      @HttpOptions()
      static handle(@HttpRequest() req: unknown, @LambdaContext() ctx: unknown): unknown[] {
        return [req, ctx];
      }
    }

    expect(shapeOf(Decorated)).toStrictEqual(shapeOf(Plain));
    expect(shapeOf(Decorated.prototype)).toStrictEqual(shapeOf(Plain.prototype));
    expect(new Decorated('olá').create('a', 'b')).toBe('olá a b');
    expect(new Decorated('x').read(1, 2, 3, 4)).toEqual([1, 2, 3, 4]);
    expect(Decorated.handle('req', 'ctx')).toEqual(['req', 'ctx']);
  });

  it('são exportados pelo barrel raiz com um único HttpRequest e LambdaContext', () => {
    for (const [name, value] of Object.entries(decoratorsHttp)) {
      expect(root).toHaveProperty(name, value);
    }
    expect(root.HttpRequest).toBe(HttpRequest);
    expect(root.LambdaContext).toBe(LambdaContext);
    expect(httpBarrel.HttpRequest).toBe(HttpRequest);
    expect(httpBarrel.LambdaContext).toBe(LambdaContext);
    expect(decoratorsHttp.HttpRequest).toBe(HttpRequest);
    expect(decoratorsHttp.LambdaContext).toBe(LambdaContext);
    expect(Object.keys(decoratorsHttp).sort()).toEqual(
      [
        'HttpBody',
        'HttpCode',
        'HttpController',
        'HttpCookies',
        'HttpDelete',
        'HttpForm',
        'HttpGet',
        'HttpHead',
        'HttpHeaders',
        'HttpOptions',
        'HttpParams',
        'HttpPatch',
        'HttpPost',
        'HttpPut',
        'HttpQuery',
        'HttpRequest',
        'HttpResponseHeader',
        'LambdaContext',
      ].sort()
    );
  });
});
