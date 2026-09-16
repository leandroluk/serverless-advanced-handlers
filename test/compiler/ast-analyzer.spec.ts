import {readFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {
  ModuleKind,
  ModuleResolutionKind,
  Project,
  ScriptTarget,
  SyntaxKind,
  type ClassDeclaration,
  type ConstructorDeclaration,
  type Node,
  type SourceFile,
  type Type,
} from 'ts-morph';
import {beforeAll, describe, expect, it} from 'vitest';
import {
  readAnalyzableArray,
  readDecoratorArgument,
  resolveIdentifierToClass,
  resolveTypeToClass,
} from '#/compiler/ast-analyzer';
import {CompilerError} from '#/compiler/errors';

/** Caminho de uma fixture, sempre com `/`: é assim que o `ts-morph` indexa os arquivos do projeto. */
const fixturePath = (relative: string): string =>
  `${fileURLToPath(new URL('fixtures/ast-analyzer/', import.meta.url))}${relative}`.replaceAll('\\', '/');

/** Linha (1-based) da primeira linha da fixture que contém `text`, lida do disco — não da AST. */
const lineOf = (relative: string, text: string): number => {
  const lines = readFileSync(fixturePath(relative), 'utf8').split(/\r?\n/);
  const index = lines.findIndex(line => line.includes(text));
  expect(index).toBeGreaterThanOrEqual(0);
  return index + 1;
};

/** Elementos aceitos num array de metadados de módulo (`providers`, `imports`, ...). */
const METADATA_KINDS = [SyntaxKind.Identifier, SyntaxKind.ObjectLiteralExpression, SyntaxKind.CallExpression] as const;

describe('ast-analyzer', () => {
  let project: Project;
  let arrays: SourceFile;
  let consumers: SourceFile;
  let modules: SourceFile;
  let consumerConstructor: ConstructorDeclaration;

  beforeAll(() => {
    project = new Project({
      compilerOptions: {
        target: ScriptTarget.ES2023,
        module: ModuleKind.ESNext,
        moduleResolution: ModuleResolutionKind.Bundler,
        strict: true,
        experimentalDecorators: true,
        emitDecoratorMetadata: true,
      },
    });
    project.addSourceFilesAtPaths(`${fixturePath('')}**/*.ts`);

    arrays = project.getSourceFileOrThrow(fixturePath('arrays.ts'));
    consumers = project.getSourceFileOrThrow(fixturePath('consumers.ts'));
    modules = project.getSourceFileOrThrow(fixturePath('modules.ts'));
    consumerConstructor = consumers.getClassOrThrow('Consumer').getConstructors()[0]!;
  });

  /** Inicializador da chave `providers` do `@Module({...})` da classe indicada, em `arrays.ts`. */
  const providersOf = (className: string): Node | undefined =>
    readDecoratorArgument(arrays.getClassOrThrow(className), 'Module')
      ?.asKindOrThrow(SyntaxKind.ObjectLiteralExpression)
      .getPropertyOrThrow('providers')
      .asKindOrThrow(SyntaxKind.PropertyAssignment)
      .getInitializer();

  /** Nó identificador do tipo de um parâmetro do construtor de `Consumer` (`readonly x: Foo`). */
  const typeNameOf = (parameterName: string): Node =>
    consumerConstructor
      .getParameterOrThrow(parameterName)
      .getTypeNodeOrThrow()
      .asKindOrThrow(SyntaxKind.TypeReference)
      .getTypeName();

  /** Executa `run`, exige um `SAH100` e devolve o erro, já conferindo arquivo e linha do elemento culpado. */
  const expectSah100 = (run: () => unknown, relative: string, text: string): CompilerError => {
    let caught: unknown;
    try {
      run();
    } catch (error) {
      caught = error;
    }

    expect(caught).toBeInstanceOf(CompilerError);
    const error = caught as CompilerError;

    expect(error.code).toBe('100');
    expect(error.filePath).toBe(project.getSourceFileOrThrow(fixturePath(relative)).getFilePath());
    expect(error.line).toBe(lineOf(relative, text));
    expect(error.message).toContain('] SAH100 ');
    expect(error.message).toContain(`at ${error.filePath}:${error.line}`);
    return error;
  };

  describe('readDecoratorArgument', () => {
    it('devolve o primeiro argumento do decorator procurado', () => {
      const argument = readDecoratorArgument(modules.getClassOrThrow('WithArgumentModule'), 'Module');

      expect(argument?.getKind()).toBe(SyntaxKind.ObjectLiteralExpression);
      expect(argument?.getText()).toBe('{imports: [], providers: [Logger]}');
    });

    it('devolve `undefined` quando o decorator não existe, sem lançar', () => {
      expect(readDecoratorArgument(modules.getClassOrThrow('PlainService'), 'Module')).toBeUndefined();
      expect(readDecoratorArgument(modules.getClassOrThrow('WithArgumentModule'), 'Global')).toBeUndefined();
      expect(readDecoratorArgument(modules.getClassOrThrow('NoArgumentService'), 'Module')).toBeUndefined();
    });

    it('devolve `undefined` quando o decorator existe mas não tem argumento', () => {
      expect(readDecoratorArgument(modules.getClassOrThrow('NoArgumentService'), 'Injectable')).toBeUndefined();
      expect(readDecoratorArgument(modules.getClassOrThrow('MarkerService'), 'Marker')).toBeUndefined();
    });

    it('devolve `undefined` para nós que não aceitam decorator, sem lançar', () => {
      expect(readDecoratorArgument(modules, 'Module')).toBeUndefined();
      expect(readDecoratorArgument(arrays.getVariableDeclarationOrThrow('FLAG'), 'Module')).toBeUndefined();
    });

    it('lê decorator de parâmetro, não só de classe', () => {
      const parameter = consumers.getClassOrThrow('TokenConsumer').getConstructors()[0]!.getParameters()[0]!;

      expect(readDecoratorArgument(parameter, 'Inject')?.getText()).toBe('CONFIG_TOKEN');
      expect(readDecoratorArgument(parameter, 'Optional')).toBeUndefined();
    });
  });

  describe('readAnalyzableArray', () => {
    it('devolve os elementos de um array literal analisável, na ordem do código', () => {
      const elements = readAnalyzableArray(providersOf('ValidArrayModule'), METADATA_KINDS);

      expect(elements.map(element => element.getText())).toEqual(['Alpha', 'Beta', 'Logger']);
    });

    it('aceita identificadores, objetos literais e chamadas quando permitidos', () => {
      const elements = readAnalyzableArray(providersOf('MixedKindsModule'), METADATA_KINDS);

      expect(elements.map(element => element.getKind())).toEqual([
        SyntaxKind.Identifier,
        SyntaxKind.ObjectLiteralExpression,
        SyntaxKind.CallExpression,
      ]);
    });

    it('devolve array vazio para `undefined`/`null` (chave de metadado ausente), sem erro', () => {
      expect(readAnalyzableArray(undefined, METADATA_KINDS)).toEqual([]);
      expect(readAnalyzableArray(null, METADATA_KINDS)).toEqual([]);
    });

    it('devolve array vazio para um array literal vazio', () => {
      expect(readAnalyzableArray(providersOf('EmptyArrayModule'), METADATA_KINDS)).toEqual([]);
    });

    it('lança SAH100 com arquivo e linha do `SpreadElement`', () => {
      const error = expectSah100(
        () => readAnalyzableArray(providersOf('SpreadArrayModule'), METADATA_KINDS),
        'arrays.ts',
        'providers: [Alpha, ...EXTRA]'
      );

      expect(error.message).toContain('SpreadElement');
    });

    it('lança SAH100 com arquivo e linha da `ConditionalExpression`', () => {
      const error = expectSah100(
        () => readAnalyzableArray(providersOf('ConditionalArrayModule'), METADATA_KINDS),
        'arrays.ts',
        'FLAG ? Alpha : Beta]'
      );

      expect(error.message).toContain('ConditionalExpression');
    });

    it('reporta o primeiro elemento inválido quando há mais de um', () => {
      const error = expectSah100(
        () => readAnalyzableArray(providersOf('FirstOffenderModule'), METADATA_KINDS),
        'arrays.ts',
        'FLAG ? Beta : Alpha'
      );

      expect(error.message).toContain('ConditionalExpression');
      expect(error.message).not.toContain('SpreadElement');
    });

    it('respeita `allowedKinds`: o mesmo array passa ou falha conforme o que é permitido', () => {
      const providers = providersOf('MixedKindsModule');

      expect(readAnalyzableArray(providers, METADATA_KINDS)).toHaveLength(3);
      const error = expectSah100(
        () => readAnalyzableArray(providers, [SyntaxKind.Identifier]),
        'arrays.ts',
        '{provide: Alpha, useClass: Beta}'
      );

      expect(error.message).toContain('ObjectLiteralExpression');
      expect(error.message).toContain('Identifier');
    });

    it('lança SAH100 quando o valor não é sequer um array literal', () => {
      const error = expectSah100(
        () => readAnalyzableArray(providersOf('NotAnArrayModule'), METADATA_KINDS),
        'arrays.ts',
        'providers: Alpha'
      );

      expect(error.message).toContain('expected a static array literal');
    });
  });

  describe('resolveIdentifierToClass', () => {
    it('resolve um identificador local à sua `ClassDeclaration`', () => {
      const [alpha] = readAnalyzableArray(providersOf('ValidArrayModule'), METADATA_KINDS);
      const resolved = resolveIdentifierToClass(alpha!);

      expect(resolved?.getName()).toBe('Alpha');
      expect(resolved?.getSourceFile().getFilePath()).toBe(arrays.getFilePath());
    });

    it('resolve através de barrels encadeados (`export * from` em duas camadas)', () => {
      expect(arrays.getImportDeclarations().map(node => node.getModuleSpecifierValue())).toContain('./barrel');

      const logger = readAnalyzableArray(providersOf('ValidArrayModule'), METADATA_KINDS)[2]!;
      const resolved = resolveIdentifierToClass(logger);

      expect(logger.getText()).toBe('Logger');
      expect(resolved?.getName()).toBe('Logger');
      expect(resolved?.getSourceFile().getFilePath()).toBe(fixturePath('services/logger.ts'));
    });

    it('resolve o identificador de um tipo de parâmetro que aponta para classe', () => {
      expect(resolveIdentifierToClass(typeNameOf('logger'))?.getName()).toBe('Logger');
    });

    it('devolve `undefined` para interface, type alias e genérico, sem lançar', () => {
      expect(resolveIdentifierToClass(typeNameOf('config'))).toBeUndefined();
      expect(resolveIdentifierToClass(typeNameOf('alias'))).toBeUndefined();
      expect(resolveIdentifierToClass(typeNameOf('pending'))).toBeUndefined();
    });

    it('devolve `undefined` para primitivo e para token const, sem lançar', () => {
      const primitive = consumerConstructor.getParameterOrThrow('name').getTypeNodeOrThrow();
      const token = readDecoratorArgument(
        consumers.getClassOrThrow('TokenConsumer').getConstructors()[0]!.getParameters()[0]!,
        'Inject'
      )!;

      expect(primitive.getKind()).toBe(SyntaxKind.StringKeyword);
      expect(resolveIdentifierToClass(primitive)).toBeUndefined();
      expect(resolveIdentifierToClass(token)).toBeUndefined();
    });
  });

  describe('resolveTypeToClass', () => {
    /** Tipo de um parâmetro do construtor de `Consumer`. */
    const typeOf = (parameterName: string) => consumerConstructor.getParameterOrThrow(parameterName).getType();

    it('resolve o tipo de um parâmetro à classe concreta, através do barrel encadeado', () => {
      const resolved = resolveTypeToClass(typeOf('logger'));

      expect(resolved?.getName()).toBe('Logger');
      expect(resolved?.getSourceFile().getFilePath()).toBe(fixturePath('services/logger.ts'));
    });

    it('devolve `undefined` para interface e type alias, sem lançar', () => {
      expect(resolveTypeToClass(typeOf('config'))).toBeUndefined();
      expect(resolveTypeToClass(typeOf('alias'))).toBeUndefined();
    });

    it('devolve `undefined` para primitivo', () => {
      expect(typeOf('name').isString()).toBe(true);
      expect(resolveTypeToClass(typeOf('name'))).toBeUndefined();
    });

    it('não desembrulha genérico: `Promise<Logger>` devolve `undefined`', () => {
      expect(typeOf('pending').getText()).toContain('Promise<');
      expect(resolveTypeToClass(typeOf('pending'))).toBeUndefined();
    });

    it('não desembrulha união: `Logger | Alpha` devolve `undefined`', () => {
      expect(typeOf('either').isUnion()).toBe(true);
      expect(resolveTypeToClass(typeOf('either'))).toBeUndefined();
    });
  });

  describe('contrato de tipos', () => {
    it('não aceita chamadas fora das assinaturas publicadas', () => {
      // Só o `tsc` executa este corpo: as chamadas inválidas existem para os `@ts-expect-error`.
      const contract = (node: Node, type: Type): void => {
        // @ts-expect-error o nome do decorator é obrigatório
        readDecoratorArgument(node);
        // @ts-expect-error `allowedKinds` é obrigatório — nunca há um conjunto "padrão" implícito
        readAnalyzableArray(node);
        // @ts-expect-error `allowedKinds` é uma lista de `SyntaxKind`, não de strings
        readAnalyzableArray(node, ['Identifier']);
        // @ts-expect-error `resolveTypeToClass` recebe um `Type`, não um `Node`
        resolveTypeToClass(node);
        // @ts-expect-error `resolveIdentifierToClass` recebe um `Node`, não um `Type`
        resolveIdentifierToClass(type);
        // @ts-expect-error o resultado é opcional: quem chama decide se a ausência é erro
        const _declaration: ClassDeclaration = resolveIdentifierToClass(node);
      };

      expect(contract).toBeInstanceOf(Function);
      expect(resolveIdentifierToClass(modules.getClassOrThrow('WithArgumentModule'))?.getName()).toBe(
        'WithArgumentModule'
      );
    });
  });
});
