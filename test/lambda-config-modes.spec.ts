import {spawnSync} from 'node:child_process';
import {createRequire} from 'node:module';
import {dirname, join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {describe, expect, it, vi} from 'vitest';
import {LambdaConfig} from '#/decorators/lambda';
import * as root from '#/index';

const require = createRequire(import.meta.url);
const tscBin = join(dirname(require.resolve('typescript/package.json')), 'bin', 'tsc');
const projectRoot = fileURLToPath(new URL('..', import.meta.url));
const modeCProject = fileURLToPath(new URL('types/mode-c-lambda/tsconfig.json', import.meta.url));
const otherModeCProjects = [
  fileURLToPath(new URL('types/mode-c/tsconfig.json', import.meta.url)),
  fileURLToPath(new URL('types/mode-c/invalid/tsconfig.json', import.meta.url)),
];

/** Executa o `tsc` do projeto e devolve o código de saída e a saída combinada. */
const tsc = (...args: string[]) => {
  const result = spawnSync(process.execPath, [tscBin, '--pretty', 'false', ...args], {
    cwd: projectRoot,
    encoding: 'utf8',
  });
  expect(result.error).toBeUndefined();
  return {status: result.status, output: `${result.stdout}${result.stderr}`};
};

/** Configuração efetiva de um tsconfig, via `tsc --showConfig`. */
const showConfig = (project: string) => {
  const {status, output} = tsc('-p', project, '--showConfig');
  expect(status).toBe(0);
  return JSON.parse(output) as {compilerOptions: Record<string, unknown>; files: string[]};
};

/** Descriptors próprios de um objeto, na ordem das chaves. */
const descriptorsOf = (target: object) =>
  Reflect.ownKeys(target).map(key => [key, Object.getOwnPropertyDescriptor(target, key)] as const);

const options = {
  name: 'users',
  memorySize: 512,
  environment: {TABLE_NAME: 'users'},
  iamRoleStatements: [{Effect: 'Allow', Action: ['s3:GetObject'], Resource: [{'Fn::GetAtt': ['Bucket', 'Arn']}]}],
} as const;

describe('@LambdaConfig no modo C (decorators TC39)', () => {
  it('o tsconfig da fixture não habilita experimentalDecorators nem emitDecoratorMetadata', () => {
    const config = showConfig(modeCProject);
    expect(config.compilerOptions).not.toHaveProperty('experimentalDecorators');
    expect(config.compilerOptions).not.toHaveProperty('emitDecoratorMetadata');
    expect(config.files).toEqual(['./lambda-config.ts']);
  });

  it('as fixtures de modo C de outras tasks não incluem a fixture de @LambdaConfig', () => {
    for (const project of otherModeCProjects) {
      expect(showConfig(project).files.some(file => file.includes('mode-c-lambda'))).toBe(false);
    }
  });

  it('aplica @LambdaConfig em classe e método sem erros', () => {
    const {status, output} = tsc('-p', modeCProject);
    expect(output).toBe('');
    expect(status).toBe(0);
  });
});

describe('@LambdaConfig em runtime', () => {
  it('forma legada: não altera classe, protótipo nem descriptor e retorna undefined', () => {
    class Target {
      greet(name: string): string {
        return `olá ${name}`;
      }
    }
    const classBefore = descriptorsOf(Target);
    const prototypeBefore = descriptorsOf(Target.prototype);
    const descriptor = Object.getOwnPropertyDescriptor(Target.prototype, 'greet')!;
    const descriptorBefore = {...descriptor};
    const optionsBefore = structuredClone(options);

    expect(LambdaConfig(options)(Target)).toBeUndefined();
    expect(LambdaConfig(options)(Target.prototype, 'greet', descriptor)).toBeUndefined();

    expect(descriptorsOf(Target)).toStrictEqual(classBefore);
    expect(descriptorsOf(Target.prototype)).toStrictEqual(prototypeBefore);
    expect(descriptor).toStrictEqual(descriptorBefore);
    expect(options).toStrictEqual(optionsBefore);
    expect(new Target().greet('mundo')).toBe('olá mundo');
  });

  it('forma TC39: não altera classe nem método, não registra initializers e retorna undefined', () => {
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

    expect(LambdaConfig(options)(Target, classContext as ClassDecoratorContext)).toBeUndefined();
    expect(LambdaConfig(options)(method, methodContext as ClassMethodDecoratorContext)).toBeUndefined();

    expect(addInitializer).not.toHaveBeenCalled();
    expect(Reflect.ownKeys(metadata)).toEqual([]);
    expect(descriptorsOf(Target)).toStrictEqual(classBefore);
    expect(descriptorsOf(Target.prototype)).toStrictEqual(prototypeBefore);
    expect(descriptorsOf(method)).toStrictEqual(methodBefore);
  });

  it('aplicado com sintaxe de decorator, preserva a classe e seus métodos', () => {
    @LambdaConfig(options)
    class Decorated {
      constructor(readonly prefix: string) {}

      @LambdaConfig({timeout: 30})
      greet(name: string): string {
        return `${this.prefix} ${name}`;
      }

      @LambdaConfig({})
      static create(prefix: string): Decorated {
        return new Decorated(prefix);
      }
    }

    expect(Reflect.ownKeys(Decorated.prototype)).toEqual(['constructor', 'greet']);
    expect(Decorated.create('olá').greet('mundo')).toBe('olá mundo');
  });

  it('é exportado pelo barrel raiz', () => {
    expect(root.LambdaConfig).toBe(LambdaConfig);
  });
});
