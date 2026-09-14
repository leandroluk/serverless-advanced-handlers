import {spawnSync} from 'node:child_process';
import {createRequire} from 'node:module';
import {dirname, join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {describe, expect, it, vi} from 'vitest';
import {classDecorator, classOrMethodDecorator, methodDecorator, parameterDecorator} from '#/decorators/dual';
import * as root from '#/index';

const require = createRequire(import.meta.url);
const tscBin = join(dirname(require.resolve('typescript/package.json')), 'bin', 'tsc');
const projectRoot = fileURLToPath(new URL('..', import.meta.url));
const modeCProject = fileURLToPath(new URL('types/mode-c/tsconfig.json', import.meta.url));
const modeCInvalidProject = fileURLToPath(new URL('types/mode-c/invalid/tsconfig.json', import.meta.url));

/** Executa o `tsc` do projeto e devolve o código de saída e a saída combinada. */
const tsc = (...args: string[]) => {
  const result = spawnSync(process.execPath, [tscBin, '--pretty', 'false', ...args], {
    cwd: projectRoot,
    encoding: 'utf8',
  });
  expect(result.error).toBeUndefined();
  return {status: result.status, output: `${result.stdout}${result.stderr}`};
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

describe('modo C (decorators TC39)', () => {
  it('os tsconfigs das fixtures não habilitam experimentalDecorators nem emitDecoratorMetadata', () => {
    for (const [project, fixture] of [
      [modeCProject, './class-and-method-decorators.ts'],
      [modeCInvalidProject, './parameter-decorator.ts'],
    ] as const) {
      const {status, output} = tsc('-p', project, '--showConfig');
      expect(status).toBe(0);
      const config = JSON.parse(output) as {compilerOptions: Record<string, unknown>; files: string[]};
      expect(config.compilerOptions).not.toHaveProperty('experimentalDecorators');
      expect(config.compilerOptions).not.toHaveProperty('emitDecoratorMetadata');
      expect(config.files).toEqual([fixture]);
    }
  });

  it('aceita decorators duais de classe e de método', () => {
    const {status, output} = tsc('-p', modeCProject);
    expect(output).toBe('');
    expect(status).toBe(0);
  });

  it('rejeita decorator de parâmetro com TS1206', () => {
    const {status, output} = tsc('-p', modeCInvalidProject);
    expect(status).not.toBe(0);
    expect(output).toContain('TS1206');
    expect(new Set(output.match(/error TS\d+/g))).toEqual(new Set(['error TS1206']));
    for (const line of output.trim().split(/\r?\n/)) {
      expect(line).toMatch(
        /^test[/\\]types[/\\]mode-c[/\\]invalid[/\\]parameter-decorator\.ts\(\d+,\d+\): error TS1206:/
      );
    }
  });
});

describe('factories de decorators duais em runtime', () => {
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

    expect(classDecorator()(Target)).toBeUndefined();
    expect(classOrMethodDecorator()(Target)).toBeUndefined();
    expect(methodDecorator()(Target.prototype, 'greet', descriptor)).toBeUndefined();
    expect(classOrMethodDecorator()(Target.prototype, 'greet', descriptor)).toBeUndefined();
    expect(parameterDecorator()(Target.prototype, 'greet', 0)).toBeUndefined();
    expect(parameterDecorator()(Target, undefined, 0)).toBeUndefined();

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

    expect(classDecorator()(Target, classContext as ClassDecoratorContext)).toBeUndefined();
    expect(classOrMethodDecorator()(Target, classContext as ClassDecoratorContext)).toBeUndefined();
    expect(methodDecorator()(method, methodContext as ClassMethodDecoratorContext)).toBeUndefined();
    expect(classOrMethodDecorator()(method, methodContext as ClassMethodDecoratorContext)).toBeUndefined();

    expect(addInitializer).not.toHaveBeenCalled();
    expect(Reflect.ownKeys(metadata)).toEqual([]);
    expect(descriptorsOf(Target)).toStrictEqual(classBefore);
    expect(descriptorsOf(Target.prototype)).toStrictEqual(prototypeBefore);
    expect(descriptorsOf(method)).toStrictEqual(methodBefore);
  });

  it('aplicadas com sintaxe de decorator, preservam classe, métodos e descriptors', () => {
    class Plain {
      constructor(readonly prefix: string) {}

      greet(name: string): string {
        return `${this.prefix} ${name}`;
      }

      static create(prefix: string): Plain {
        return new Plain(prefix);
      }
    }

    @classDecorator()
    @classOrMethodDecorator()
    class Decorated {
      constructor(@parameterDecorator() readonly prefix: string) {}

      @methodDecorator()
      @classOrMethodDecorator()
      greet(@parameterDecorator() name: string): string {
        return `${this.prefix} ${name}`;
      }

      @methodDecorator()
      @classOrMethodDecorator()
      static create(@parameterDecorator() prefix: string): Decorated {
        return new Decorated(prefix);
      }
    }

    expect(shapeOf(Decorated)).toStrictEqual(shapeOf(Plain));
    expect(shapeOf(Decorated.prototype)).toStrictEqual(shapeOf(Plain.prototype));
    expect(Decorated.create('olá').greet('mundo')).toBe('olá mundo');
  });

  it('são exportadas pelo barrel raiz', () => {
    expect(root.classDecorator).toBe(classDecorator);
    expect(root.methodDecorator).toBe(methodDecorator);
    expect(root.classOrMethodDecorator).toBe(classOrMethodDecorator);
    expect(root.parameterDecorator).toBe(parameterDecorator);
  });
});
