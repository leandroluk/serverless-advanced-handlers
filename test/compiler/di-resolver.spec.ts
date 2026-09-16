import {readFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {
  ModuleKind,
  ModuleResolutionKind,
  Project,
  ScriptTarget,
  type ClassDeclaration,
  type VariableDeclaration,
} from 'ts-morph';
import {beforeAll, describe, expect, it} from 'vitest';
import {resolveAppGraph, type AppGraph, type ProviderResolution, type TokenKey} from '#/compiler/di-resolver';
import {CompilerError} from '#/compiler/errors';

/** Raiz das fixtures, sempre com `/`: é assim que o `ts-morph` indexa os arquivos do projeto. */
const FIXTURE_ROOT = fileURLToPath(new URL('fixtures/di-resolver/', import.meta.url)).replaceAll('\\', '/');
/** `src/` do pacote, para o alias `#/` das fixtures resolver dentro do projeto do `ts-morph`. */
const SRC_ROOT = fileURLToPath(new URL('../../src/', import.meta.url)).replaceAll('\\', '/');

const fixturePath = (relative: string): string => `${FIXTURE_ROOT}${relative}`;

/** Linha (1-based) da primeira linha da fixture que contém `text`, lida do disco — não da AST. */
const lineOf = (relative: string, text: string): number => {
  const lines = readFileSync(fixturePath(relative), 'utf8').split(/\r?\n/);
  const index = lines.findIndex(line => line.includes(text));
  expect(index).toBeGreaterThanOrEqual(0);
  return index + 1;
};

describe('di-resolver', () => {
  let project: Project;

  beforeAll(() => {
    project = new Project({
      compilerOptions: {
        target: ScriptTarget.ES2023,
        module: ModuleKind.ESNext,
        moduleResolution: ModuleResolutionKind.Bundler,
        strict: true,
        experimentalDecorators: true,
        emitDecoratorMetadata: true,
        paths: {'#/*': [`${SRC_ROOT}*`]},
      },
    });
    project.addSourceFilesAtPaths(`${FIXTURE_ROOT}**/*.ts`);
  });

  const classOf = (relative: string, name: string): ClassDeclaration =>
    project.getSourceFileOrThrow(fixturePath(relative)).getClassOrThrow(name);

  const variableOf = (relative: string, name: string): VariableDeclaration =>
    project.getSourceFileOrThrow(fixturePath(relative)).getVariableDeclarationOrThrow(name);

  const resolveFrom = (relative: string, name: string): AppGraph => resolveAppGraph(project, classOf(relative, name));

  /** Executa `run`, exige o `CompilerError` de código `code` e devolve o erro já com o formato conferido. */
  const expectError = (run: () => unknown, code: string): CompilerError => {
    let caught: unknown;
    try {
      run();
    } catch (error) {
      caught = error;
    }

    expect(caught).toBeInstanceOf(CompilerError);
    const error = caught as CompilerError;

    expect(error.code).toBe(code);
    expect(error.message).toContain(`] SAH${code} `);
    expect(error.message).toContain(`at ${error.filePath}:${error.line}`);
    return error;
  };

  /** Igual a `expectError`, conferindo também o arquivo e a linha do nó culpado. */
  const expectErrorAt = (run: () => unknown, code: string, relative: string, text: string): CompilerError => {
    const error = expectError(run, code);

    expect(error.filePath).toBe(project.getSourceFileOrThrow(fixturePath(relative)).getFilePath());
    expect(error.line).toBe(lineOf(relative, text));
    return error;
  };

  describe('varredura de módulos', () => {
    let graph: AppGraph;

    beforeAll(() => {
      graph = resolveFrom('app/app.module.ts', 'AppModule');
    });

    it('visita recursivamente a cadeia `AppModule → UsersModule → DatabaseModule` e os demais imports', () => {
      const names = [...graph.modules.keys()].map(classDecl => classDecl.getName());

      expect(graph.rootModule.classDecl).toBe(classOf('app/app.module.ts', 'AppModule'));
      expect(graph.modules.get(classOf('app/app.module.ts', 'AppModule'))).toBe(graph.rootModule);
      expect(names).toEqual([
        'AppModule',
        'AuditModule',
        'ConfigModule',
        'UsersModule',
        'DatabaseModule',
        'ReportsModule',
      ]);
    });

    it('mantém `imports` na ordem do código, resolvendo módulo estático e dinâmico da mesma forma', () => {
      expect(graph.rootModule.imports.map(node => node.classDecl.getName())).toEqual([
        'AuditModule',
        'ConfigModule',
        'UsersModule',
        'ReportsModule',
      ]);
    });

    it('reusa o mesmo `ModuleNode` quando dois módulos importam o mesmo módulo', () => {
      const [users, reports] = [
        graph.modules.get(classOf('app/users.module.ts', 'UsersModule')),
        graph.modules.get(classOf('app/reports.module.ts', 'ReportsModule')),
      ];
      const database = graph.modules.get(classOf('app/database.module.ts', 'DatabaseModule'));

      expect(users?.imports[0]).toBe(database);
      expect(reports?.imports[0]).toBe(database);
    });

    it('termina a varredura com módulos que se importam mutuamente', () => {
      const mutual = resolveFrom('valid/mutual-left.module.ts', 'MutualLeftModule');
      const left = mutual.modules.get(classOf('valid/mutual-left.module.ts', 'MutualLeftModule'));
      const right = mutual.modules.get(classOf('valid/mutual-right.module.ts', 'MutualRightModule'));

      expect(mutual.modules.size).toBe(2);
      expect(left?.imports[0]).toBe(right);
      expect(right?.imports[0]).toBe(left);
    });

    it('marca `isGlobal` só no módulo decorado com `@Global()`', () => {
      const flags = [...graph.modules.values()].map(node => [node.classDecl.getName(), node.isGlobal]);

      expect(flags).toEqual([
        ['AppModule', false],
        ['AuditModule', true],
        ['ConfigModule', false],
        ['UsersModule', false],
        ['DatabaseModule', false],
        ['ReportsModule', false],
      ]);
    });

    it('coleta os controllers do módulo e da aplicação inteira', () => {
      const controller = classOf('app/app.module.ts', 'UsersController');

      expect(graph.rootModule.controllers).toEqual([controller]);
      expect(graph.controllers).toEqual([controller]);
    });

    it('guarda em cada módulo só os providers que ele próprio declara', () => {
      const database = graph.modules.get(classOf('app/database.module.ts', 'DatabaseModule'));

      expect(database?.providers.map(provider => provider.kind)).toEqual(['useValue', 'class', 'class']);
      expect(database?.providers.every(provider => provider.sourceModule === database)).toBe(true);
    });

    it('resolve `exports` a tokens, incluindo `InjectionToken` e `Symbol`', () => {
      const audit = graph.modules.get(classOf('app/audit.module.ts', 'AuditModule'));

      expect(audit?.exports).toEqual([
        classOf('app/audit.module.ts', 'AuditLogger'),
        variableOf('app/tokens.ts', 'AUDIT_SINK'),
        variableOf('app/tokens.ts', 'TRACE_ID'),
      ]);
    });

    it('trata `X.forRoot({...})` como o módulo `X`, com a DI vindo do `@Module` estático (REQ-034)', () => {
      const config = graph.modules.get(classOf('app/config.module.ts', 'ConfigModule'));

      expect(config?.classDecl.getName()).toBe('ConfigModule');
      expect(config?.providers.map(provider => provider.kind)).toEqual(['useValue', 'class']);
      expect(config?.exports).toEqual([classOf('app/config.module.ts', 'ConfigService')]);
    });
  });

  describe('registro de providers e formas de provider', () => {
    let graph: AppGraph;

    beforeAll(() => {
      graph = resolveFrom('app/app.module.ts', 'AppModule');
    });

    const providerOf = (token: TokenKey): ProviderResolution => {
      const provider = graph.providers.get(token);
      expect(provider).toBeDefined();
      return provider as ProviderResolution;
    };

    it('registra todos os providers de todos os módulos, com o módulo de origem', () => {
      expect(graph.providers.size).toBe(16);
      expect(providerOf(classOf('app/database.module.ts', 'Database')).sourceModule.classDecl.getName()).toBe(
        'DatabaseModule'
      );
      expect(providerOf(variableOf('app/tokens.ts', 'AUDIT_SINK')).sourceModule.classDecl.getName()).toBe(
        'AuditModule'
      );
    });

    it('classe simples vira `kind: class`, escopo default e `classDecl` preenchido', () => {
      const connection = classOf('app/database.module.ts', 'Connection');
      const provider = providerOf(connection);

      expect(provider.kind).toBe('class');
      expect(provider.classDecl).toBe(connection);
      expect(provider.scope).toBe('default');
      expect(provider.factoryDecl).toBeUndefined();
      expect(provider.existingToken).toBeUndefined();
    });

    it('lê `Scope.REQUEST` de `@Injectable({scope})` (REQ-031)', () => {
      expect(providerOf(classOf('app/users.module.ts', 'UsersService')).scope).toBe('request');
      expect(providerOf(classOf('app/users.module.ts', 'UsersRepository')).scope).toBe('default');
    });

    it('`useValue` não tem dependências e aceita token string literal', () => {
      const provider = providerOf('reports.version');

      expect(provider.kind).toBe('useValue');
      expect(provider.token).toBe('reports.version');
      expect(provider.deps).toEqual([]);
      expect(provider.classDecl).toBeUndefined();
    });

    it('`useClass` aponta para a classe alvo e lê o construtor dela', () => {
      const provider = providerOf(variableOf('app/reports.module.ts', 'MAILER'));

      expect(provider.kind).toBe('useClass');
      expect(provider.classDecl).toBe(classOf('app/reports.module.ts', 'SmtpMailer'));
      expect(provider.deps).toEqual([]);
    });

    it('`useExisting` guarda o token aliasado', () => {
      const provider = providerOf(variableOf('app/reports.module.ts', 'LEGACY_MAILER'));

      expect(provider.kind).toBe('useExisting');
      expect(provider.existingToken).toBe(variableOf('app/reports.module.ts', 'MAILER'));
      expect(provider.deps).toEqual([]);
    });

    it('`useFactory` guarda a função e resolve `inject`, incluindo `{token, optional: true}`', () => {
      const provider = providerOf(variableOf('app/reports.module.ts', 'REPORT_BUILDER'));

      expect(provider.kind).toBe('useFactory');
      expect(provider.factoryDecl?.getText()).toContain('new ReportBuilder(database, flags)');
      expect(provider.deps).toEqual([
        classOf('app/database.module.ts', 'Database'),
        variableOf('app/tokens.ts', 'FEATURE_FLAGS'),
      ]);
      expect([...provider.optionalDeps]).toEqual([1]);
    });

    it('indexa tokens `InjectionToken` e `Symbol` pela `VariableDeclaration`, e strings pelo valor', () => {
      const tokens = [...graph.providers.keys()];

      expect(tokens).toContain(variableOf('app/tokens.ts', 'DATABASE_URL'));
      expect(tokens).toContain(variableOf('app/tokens.ts', 'TRACE_ID'));
      expect(tokens).toContain('reports.version');
    });
  });

  describe('resolução de dependências', () => {
    let graph: AppGraph;

    beforeAll(() => {
      graph = resolveFrom('app/app.module.ts', 'AppModule');
    });

    it('resolve parâmetro de construtor pelo tipo quando ele aponta para uma classe', () => {
      const provider = graph.providers.get(classOf('app/database.module.ts', 'Database'));

      expect(provider?.deps).toEqual([
        classOf('app/database.module.ts', 'Connection'),
        classOf('app/audit.module.ts', 'AuditLogger'),
      ]);
      expect(provider?.optionalDeps.size).toBe(0);
    });

    it('resolve parâmetro por `@Inject(token)`, inclusive com tipo de interface', () => {
      const provider = graph.providers.get(classOf('app/config.module.ts', 'ConfigService'));

      expect(provider?.deps).toEqual([variableOf('app/config.module.ts', 'CONFIG_OPTIONS')]);
    });

    it('resolve `@Inject` com token `InjectionToken`, `Symbol` e string literal no mesmo construtor', () => {
      const connection = graph.providers.get(classOf('app/database.module.ts', 'Connection'));
      const reports = graph.providers.get(classOf('app/reports.module.ts', 'ReportsService'));

      expect(connection?.deps).toEqual([
        variableOf('app/tokens.ts', 'DATABASE_URL'),
        variableOf('app/tokens.ts', 'TRACE_ID'),
      ]);
      expect(reports?.deps).toEqual([
        variableOf('app/reports.module.ts', 'REPORT_BUILDER'),
        variableOf('app/reports.module.ts', 'LEGACY_MAILER'),
        'reports.version',
      ]);
    });

    it('classe sem construtor fica sem dependências', () => {
      expect(graph.providers.get(classOf('app/audit.module.ts', 'AuditLogger'))?.deps).toEqual([]);
    });

    it('`@Optional()` com token ausente não é erro e não vira aresta do grafo', () => {
      const flags = variableOf('app/tokens.ts', 'FEATURE_FLAGS');

      expect(graph.providers.has(flags)).toBe(false);
      expect(graph.order).not.toContain(flags);
      expect(graph.controllers).toHaveLength(1);
    });

    it('resolve parâmetro de interface com `@Inject(TOKEN)` sem disparar SAH103', () => {
      const resolved = resolveFrom('invalid/parameters.ts', 'InjectedParameterModule');
      const consumer = resolved.providers.get(classOf('invalid/parameters.ts', 'InjectedConsumer'));

      expect(consumer?.deps).toEqual([variableOf('invalid/parameters.ts', 'CLOCK')]);
    });
  });

  describe('lookup de escopo', () => {
    it('torna visível de qualquer módulo o que um `@Global()` exporta (REQ-030)', () => {
      const graph = resolveFrom('global/visibility.ts', 'SharedGlobalRootModule');
      const consumer = graph.providers.get(classOf('global/visibility.ts', 'SharedGlobalConsumer'));

      expect(consumer?.sourceModule.classDecl.getName()).toBe('SharedGlobalChildModule');
      expect(consumer?.sourceModule.imports).toEqual([]);
      expect(consumer?.deps).toEqual([classOf('global/visibility.ts', 'GlobalShared')]);
    });

    it('o módulo `@Global()` só publica o que está em `exports`', () => {
      const error = expectErrorAt(
        () => resolveFrom('global/visibility.ts', 'HiddenGlobalRootModule'),
        '101',
        'global/visibility.ts',
        'constructor(readonly hidden: GlobalHidden)'
      );

      expect(error.message).toContain('`GlobalHidden`');
      expect(error.message).toContain('HiddenGlobalChildModule');
    });

    it('SAH101 quando nenhum módulo visível declara o token', () => {
      const error = expectErrorAt(
        () => resolveFrom('invalid/scope.ts', 'MissingTokenModule'),
        '101',
        'invalid/scope.ts',
        '@Inject(ORPHAN_TOKEN) readonly value'
      );

      expect(error.message).toContain('ORPHAN_TOKEN');
      expect(error.message).toContain('MissingTokenModule');
    });

    it('SAH104 — e não SAH101 — quando o provider existe no módulo importado mas não é exportado', () => {
      const error = expectErrorAt(
        () => resolveFrom('invalid/scope.ts', 'NotExportedModule'),
        '104',
        'invalid/scope.ts',
        'constructor(readonly secret: Secret)'
      );

      expect(error.message).toContain('is not');
      expect(error.message).toContain('`exports`');
      expect(error.message).toContain('SecretModule');
      expect(error.message).toContain('NotExportedModule');
    });

    it('SAH101 — e não SAH104 — quando o módulo dono nem sequer é importado', () => {
      const error = expectError(() => resolveFrom('invalid/scope.ts', 'HiddenModule'), '101');

      expect(error.message).toContain('`Secret`');
      expect(error.message).toContain('HiddenModule');
    });

    it('`exports` não é transitivo: um módulo intermediário precisa reexportar o token', () => {
      const error = expectError(() => resolveFrom('invalid/scope.ts', 'NotTransitiveModule'), '101');

      expect(error.message).toContain('`Shared`');
      expect(error.message).toContain('NotTransitiveModule');
    });

    it('reexport explícito do token importado funciona', () => {
      const graph = resolveFrom('valid/re-export.module.ts', 'ReExportRootModule');
      const scheduler = graph.providers.get(classOf('valid/re-export.module.ts', 'Scheduler'));

      expect(scheduler?.deps).toEqual([classOf('valid/re-export.module.ts', 'Clock')]);
      expect(graph.order).toContain(classOf('valid/re-export.module.ts', 'Clock'));
    });
  });

  describe('ciclo de dependências (SAH102)', () => {
    it('reporta o ciclo completo de 2 classes', () => {
      const error = expectError(() => resolveFrom('invalid/cycles.ts', 'CycleOfTwoModule'), '102');

      expect(error.message).toContain('Alpha -> Beta -> Alpha');
      expect(error.filePath).toBe(project.getSourceFileOrThrow(fixturePath('invalid/cycles.ts')).getFilePath());
    });

    it('reporta o ciclo completo de 3 classes', () => {
      const error = expectError(() => resolveFrom('invalid/cycles.ts', 'CycleOfThreeModule'), '102');

      expect(error.message).toContain('One -> Two -> Three -> One');
    });

    it('reporta a auto-referência como ciclo de um nó', () => {
      const error = expectError(() => resolveFrom('invalid/cycles.ts', 'SelfCycleModule'), '102');

      expect(error.message).toContain('SelfReferencing -> SelfReferencing');
    });
  });

  describe('ordenação topológica', () => {
    let graph: AppGraph;

    beforeAll(() => {
      graph = resolveFrom('app/app.module.ts', 'AppModule');
    });

    const positionOf = (token: TokenKey): number => {
      const index = graph.order.indexOf(token);
      expect(index).toBeGreaterThanOrEqual(0);
      return index;
    };

    it('inclui todos os providers exatamente uma vez', () => {
      expect(graph.order).toHaveLength(graph.providers.size);
      expect(new Set(graph.order).size).toBe(graph.order.length);
    });

    it('coloca as folhas antes de quem depende delas, em toda a cadeia', () => {
      const chain: TokenKey[] = [
        variableOf('app/tokens.ts', 'DATABASE_URL'),
        classOf('app/database.module.ts', 'Connection'),
        classOf('app/database.module.ts', 'Database'),
        classOf('app/users.module.ts', 'UsersRepository'),
        classOf('app/users.module.ts', 'UsersService'),
      ];
      const positions = chain.map(positionOf);

      expect(positions).toEqual([...positions].sort((left, right) => left - right));
      expect(positionOf(classOf('app/audit.module.ts', 'AuditLogger'))).toBeLessThan(
        positionOf(classOf('app/database.module.ts', 'Database'))
      );
    });

    it('respeita a aresta de `useExisting` e as de `useFactory`', () => {
      expect(positionOf(variableOf('app/reports.module.ts', 'MAILER'))).toBeLessThan(
        positionOf(variableOf('app/reports.module.ts', 'LEGACY_MAILER'))
      );
      expect(positionOf(classOf('app/database.module.ts', 'Database'))).toBeLessThan(
        positionOf(variableOf('app/reports.module.ts', 'REPORT_BUILDER'))
      );
      expect(positionOf(variableOf('app/reports.module.ts', 'REPORT_BUILDER'))).toBeLessThan(
        positionOf(classOf('app/reports.module.ts', 'ReportsService'))
      );
    });

    it('não inclui controllers na ordem de providers', () => {
      expect(graph.order).not.toContain(classOf('app/app.module.ts', 'UsersController'));
    });
  });

  describe('metadados fora do subconjunto analisável (SAH100)', () => {
    it('rejeita `SpreadElement` num array de providers', () => {
      const error = expectErrorAt(
        () => resolveFrom('invalid/arrays.ts', 'SpreadProvidersModule'),
        '100',
        'invalid/arrays.ts',
        'providers: [ArrayService, ...EXTRA_PROVIDERS]'
      );

      expect(error.message).toContain('SpreadElement');
    });

    it('rejeita chamada não reconhecida num array de providers', () => {
      const error = expectErrorAt(
        () => resolveFrom('invalid/arrays.ts', 'CallProvidersModule'),
        '100',
        'invalid/arrays.ts',
        'providers: [makeProvider()]'
      );

      expect(error.message).toContain('CallExpression');
    });

    it('rejeita um valor que não é sequer um array literal', () => {
      const error = expectErrorAt(
        () => resolveFrom('invalid/arrays.ts', 'NotAnArrayModule'),
        '100',
        'invalid/arrays.ts',
        '@Module({providers: ArrayService})'
      );

      expect(error.message).toContain('expected a static array literal');
    });

    it('rejeita chave desconhecida em `@Module`', () => {
      const error = expectErrorAt(
        () => resolveFrom('invalid/arrays.ts', 'UnknownKeyModule'),
        '100',
        'invalid/arrays.ts',
        'extras: [ArrayService]'
      );

      expect(error.message).toContain('imports, controllers, providers, exports');
    });

    it('rejeita classe sem `@Module` em `imports`', () => {
      const error = expectErrorAt(
        () => resolveFrom('invalid/imports.ts', 'MissingModuleDecoratorModule'),
        '100',
        'invalid/imports.ts',
        'export class PlainClass'
      );

      expect(error.message).toContain('`@Module({...})`');
    });

    it('rejeita chamada que não é `Module.staticMethod(...)` em `imports`', () => {
      const error = expectErrorAt(
        () => resolveFrom('invalid/imports.ts', 'UnknownCallModule'),
        '100',
        'invalid/imports.ts',
        'imports: [makeModule()]'
      );

      expect(error.message).toContain('Module.staticMethod');
    });

    it('rejeita provider objeto sem nenhuma chave `use*`', () => {
      const error = expectErrorAt(
        () => resolveFrom('invalid/metadata.ts', 'NoUseKeyModule'),
        '100',
        'invalid/metadata.ts',
        'providers: [{provide: METADATA_TOKEN}]'
      );

      expect(error.message).toContain('exactly one of');
    });

    it('rejeita `inject` sem `useFactory`', () => {
      const error = expectErrorAt(
        () => resolveFrom('invalid/metadata.ts', 'InjectWithoutFactoryModule'),
        '100',
        'invalid/metadata.ts',
        'inject: [MetadataService]'
      );

      expect(error.message).toContain('`inject` is only valid together with `useFactory`');
    });

    it('rejeita `scope` que não é literal', () => {
      const error = expectErrorAt(
        () => resolveFrom('invalid/metadata.ts', 'RuntimeScopeModule'),
        '100',
        'invalid/metadata.ts',
        '@Injectable({scope: computeScope()})'
      );

      expect(error.message).toContain('Scope.REQUEST');
    });
  });

  describe('parâmetro que não resolve a uma classe (SAH103)', () => {
    it('reporta o parâmetro de interface sem `@Inject`, com arquivo e linha', () => {
      const error = expectErrorAt(
        () => resolveFrom('invalid/parameters.ts', 'InterfaceParameterModule'),
        '103',
        'invalid/parameters.ts',
        'constructor(readonly clock: Clock)'
      );

      expect(error.message).toContain('`clock`');
      expect(error.message).toContain('InterfaceConsumer');
      expect(error.message).toContain('`Clock`');
    });

    it('reporta o parâmetro primitivo sem `@Inject`', () => {
      const error = expectErrorAt(
        () => resolveFrom('invalid/parameters.ts', 'PrimitiveParameterModule'),
        '103',
        'invalid/parameters.ts',
        'constructor(readonly retries: number)'
      );

      expect(error.message).toContain('`number`');
    });
  });

  describe('módulo dinâmico (SAH105)', () => {
    it('aceita objeto literal com literais, const importada e `process.env.*`', () => {
      expect(() => resolveFrom('app/app.module.ts', 'AppModule')).not.toThrow();
    });

    it('rejeita argumento que não é objeto literal', () => {
      const error = expectErrorAt(
        () => resolveFrom('invalid/dynamic.ts', 'IdentifierArgumentModule'),
        '105',
        'invalid/dynamic.ts',
        'FeatureModule.forRoot(FEATURE_OPTIONS)'
      );

      expect(error.message).toContain('expects an object literal argument');
    });

    it('rejeita valor de propriedade calculado em runtime', () => {
      const error = expectErrorAt(
        () => resolveFrom('invalid/dynamic.ts', 'ComputedArgumentModule'),
        '105',
        'invalid/dynamic.ts',
        'retries: computeRetries()}'
      );

      expect(error.message).toContain('computeRetries()');
    });

    it('valida os valores de objetos aninhados', () => {
      const error = expectErrorAt(
        () => resolveFrom('invalid/dynamic.ts', 'NestedArgumentModule'),
        '105',
        'invalid/dynamic.ts',
        'nested: {region: computeRetries.name}'
      );

      expect(error.message).toContain('computeRetries.name');
    });
  });

  describe('contrato de tipos', () => {
    it('não aceita chamadas fora da assinatura publicada', () => {
      // Só o `tsc` executa este corpo: as chamadas inválidas existem para os `@ts-expect-error`.
      const contract = (classDecl: ClassDeclaration): void => {
        // @ts-expect-error o módulo raiz é obrigatório
        resolveAppGraph(project);
        // @ts-expect-error o módulo raiz é uma `ClassDeclaration`, não um nome
        resolveAppGraph(project, 'AppModule');
        // @ts-expect-error `AppGraph.order` é somente leitura na prática: nunca recebe outro tipo de chave
        const _order: number[] = resolveAppGraph(project, classDecl).order;
        // @ts-expect-error `providers` é indexado por `TokenKey`, não por `string` arbitrária a título de nome
        const _provider: ProviderResolution = resolveAppGraph(project, classDecl).providers.get(classDecl);
      };

      expect(contract).toBeInstanceOf(Function);
    });
  });
});
