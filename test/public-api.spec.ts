import {readFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import ts from 'typescript';
import {describe, expect, it} from 'vitest';

/**
 * Inventário e snapshot da superfície pública (REQ-001).
 *
 * Só as entradas `.` e `/runtime` são cobertas: `/testing` e `/plugin` ainda são barrels vazios (`export {}`) de
 * features futuras, então não têm inventário aqui.
 *
 * O teste consome `dist/*.d.mts`, produzido pelo `globalSetup` do projeto `dist` (`test/setup/build-dist.ts`).
 *
 * `v` (namespace de validação, F03 T-001) não é achatado como `declare namespace v_d_exports` — essa forma
 * óbvia (`export * as v from './v'`) faz o bundler de declarações (rolldown-plugin-dts) descartar
 * silenciosamente o reexport do Zod ou as extensões locais (ver `public-api/design.md`, decisão 17). O fix:
 * `v` é uma `const` tipada por interseção (`typeof z & typeof extensions`) + `namespace v { infer/input/output }`
 * de mesmo nome (merge valor+namespace nativo do TS) — o snapshot abaixo reflete essa forma, com o
 * `import * as z from "zod"` real presente e correto.
 */

const dist = new URL('../dist/', import.meta.url);

/** Exports esperados da entrada raiz (`.`), derivados de `src/index.ts`. */
const ROOT_EXPORTS = [
  // #/class/types
  'AdvancedClass',
  'AdvancedClassGuard',
  'AnyAdvancedClass',
  'ClassFactory',
  'InstanceSchemaFactory',
  // #/decorators/di
  'Global',
  'Inject',
  'Injectable',
  'Module',
  'Optional',
  // #/decorators/dual
  'DualClassDecorator',
  'DualClassOrMethodDecorator',
  'DualMethodDecorator',
  'classDecorator',
  'classOrMethodDecorator',
  'methodDecorator',
  'parameterDecorator',
  // #/decorators/http
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
  'HttpResponseHeader',
  // #/decorators/lambda
  'IamResource',
  'IamStatement',
  'LambdaConfig',
  'LambdaConfigOptions',
  // #/decorators/openapi
  'OpenapiBadRequestResponse',
  'OpenapiConflictResponse',
  'OpenapiConsumes',
  'OpenapiCreatedResponse',
  'OpenapiExclude',
  'OpenapiForbiddenResponse',
  'OpenapiNoContentResponse',
  'OpenapiNotFoundResponse',
  'OpenapiOkResponse',
  'OpenapiOperation',
  'OpenapiOperationOptions',
  'OpenapiProduces',
  'OpenapiResponse',
  'OpenapiResponseOptions',
  'OpenapiSecurity',
  'OpenapiTags',
  'OpenapiUnauthorizedResponse',
  'ResponseSchema',
  // #/decorators/pipeline
  'Catch',
  'SetMetadata',
  'UseFilters',
  'UseGuards',
  'UseInterceptors',
  // #/di/providers
  'ClassProvider',
  'DynamicModule',
  'ExistingProvider',
  'FactoryProvider',
  'ModuleMetadata',
  'OnModuleDestroy',
  'OnModuleInit',
  'Provider',
  'Scope',
  'ValueProvider',
  // #/di/tokens
  'InjectionToken',
  'Token',
  'TokenValue',
  'Type',
  // #/http (valores)
  'BadGatewayException',
  'BadRequestException',
  'ConflictException',
  'ExpectationFailedException',
  'FailedDependencyException',
  'ForbiddenException',
  'GatewayTimeoutException',
  'GoneException',
  'HttpException',
  'HttpRequest',
  'HttpResult',
  'HttpStatus',
  'HttpVersionNotSupportedException',
  'ImATeapotException',
  'InsufficientStorageException',
  'InternalServerErrorException',
  'LambdaContext',
  'LengthRequiredException',
  'LockedException',
  'LoopDetectedException',
  'MethodNotAllowedException',
  'MisdirectedException',
  'NetworkAuthenticationRequiredException',
  'NotAcceptableException',
  'NotFoundException',
  'NotImplementedException',
  'PayloadTooLargeException',
  'PaymentRequiredException',
  'PreconditionFailedException',
  'PreconditionRequiredException',
  'ProxyAuthenticationRequiredException',
  'RequestTimeoutException',
  'RequestedRangeNotSatisfiableException',
  'ServiceUnavailableException',
  'TooManyRequestsException',
  'UnauthorizedException',
  'UnprocessableEntityException',
  'UnrecoverableErrorException',
  'UnsupportedMediaTypeException',
  'UriTooLongException',
  // #/http (tipos)
  'HttpMethod',
  'HttpResponseState',
  'UploadedFile',
  // #/pipeline
  'APP_FILTER',
  'APP_GUARD',
  'APP_INTERCEPTOR',
  'ArgumentsHost',
  'CallHandler',
  'CanActivate',
  'ExceptionFilter',
  'ExecutionContext',
  'HttpArgumentsHost',
  'Interceptor',
  // #/pipeline/reflector
  'ReflectTarget',
  'ReflectableDecorator',
  'Reflector',
  // #/validation/meta
  'resolveMeta',
  'validateMeta',
  // #/validation/openapi
  'toOpenapiSchema',
  // #/validation/v (namespace)
  'ByteSize',
  'v',
];

/** Exports esperados da entrada `/runtime`, derivados de `src/runtime/index.ts`. */
const RUNTIME_EXPORTS = ['defineReflectMetadata'];

type PublicDeclaration = {
  /** Nome público do export. */
  name: string;
  /** Declaração já normalizada (sem comentários, reimpressa pelo printer do TypeScript). */
  text: string;
};

type PublicApi = {
  /** Nomes públicos, ordenados e sem duplicatas. */
  names: string[];
  /** Declarações públicas, ordenadas por nome e depois pelo próprio texto. */
  declarations: PublicDeclaration[];
};

const printer = ts.createPrinter({removeComments: true, newLine: ts.NewLineKind.LineFeed});

/** Comparação por code unit, equivalente ao `.sort()` padrão e independente de locale. */
function compare(a: string, b: string): number {
  return a < b ? -1 : a > b ? 1 : 0;
}

function parseDeclarationFile(url: URL): ts.SourceFile {
  const path = fileURLToPath(url);

  return ts.createSourceFile(path, readFileSync(path, 'utf8'), ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
}

/** `./chunk-<hash>.mjs` → URL do `./chunk-<hash>.d.mts` correspondente. */
function declarationUrlOf(from: URL, specifier: string): URL {
  return new URL(specifier.replace(/\.mjs$/, '.d.mts'), from);
}

function isExported(statement: ts.Statement): boolean {
  return (
    ts.canHaveModifiers(statement) &&
    (ts.getModifiers(statement) ?? []).some(modifier => modifier.kind === ts.SyntaxKind.ExportKeyword)
  );
}

/** Nomes declarados por um statement de topo; `[]` para imports, re-exports e statements anônimos. */
function declaredNames(statement: ts.Statement): string[] {
  if (ts.isVariableStatement(statement)) {
    return statement.declarationList.declarations.flatMap(declaration =>
      ts.isIdentifier(declaration.name) ? [declaration.name.text] : []
    );
  }

  if (
    ts.isFunctionDeclaration(statement) ||
    ts.isClassDeclaration(statement) ||
    ts.isInterfaceDeclaration(statement) ||
    ts.isTypeAliasDeclaration(statement) ||
    ts.isEnumDeclaration(statement) ||
    ts.isModuleDeclaration(statement)
  ) {
    return statement.name && ts.isIdentifier(statement.name) ? [statement.name.text] : [];
  }

  return [];
}

type FileIndex = {
  /** Nome local → declarações reimpressas (um nome pode ter várias, por declaration merging). */
  local: Map<string, string[]>;
  /** Nome local → especificador relativo e nome importado, para imports de chunks internos do bundler. */
  internalImports: Map<string, {specifier: string; imported: string}>;
  /** Nome público exportado → nome local correspondente. */
  publicToLocal: Map<string, string>;
};

function indexDeclarationFile(sourceFile: ts.SourceFile): FileIndex {
  const local = new Map<string, string[]>();
  const internalImports = new Map<string, {specifier: string; imported: string}>();
  const publicToLocal = new Map<string, string>();

  for (const statement of sourceFile.statements) {
    if (ts.isImportDeclaration(statement)) {
      const specifier = statement.moduleSpecifier;
      const bindings = statement.importClause?.namedBindings;

      // Só chunks internos gerados pelo bundler (`./...`); dependências externas nunca são reexportadas daqui.
      if (!ts.isStringLiteral(specifier) || !specifier.text.startsWith('.') || !bindings) {
        continue;
      }

      if (ts.isNamedImports(bindings)) {
        for (const element of bindings.elements) {
          internalImports.set(element.name.text, {
            specifier: specifier.text,
            imported: (element.propertyName ?? element.name).text,
          });
        }
      }

      continue;
    }

    if (ts.isExportDeclaration(statement)) {
      if (statement.exportClause && ts.isNamedExports(statement.exportClause)) {
        for (const element of statement.exportClause.elements) {
          publicToLocal.set(element.name.text, (element.propertyName ?? element.name).text);
        }
      }

      continue;
    }

    for (const name of declaredNames(statement)) {
      local.set(name, [...(local.get(name) ?? []), printer.printNode(ts.EmitHint.Unspecified, statement, sourceFile)]);

      if (isExported(statement)) {
        publicToLocal.set(name, name);
      }
    }
  }

  return {local, internalImports, publicToLocal};
}

/**
 * Lê a superfície pública de um `.d.mts` gerado pelo build.
 *
 * A normalização descarta imports e re-exports internos do bundler (inclusive o hash do nome do chunk) e comentários,
 * mantendo só as declarações dos exports públicos. Um export que vem de um chunk interno tem sua declaração resolvida
 * no `.d.mts` do chunk, para que o snapshot cubra a forma real do tipo.
 */
function readPublicApi(url: URL): PublicApi {
  const index = indexDeclarationFile(parseDeclarationFile(url));
  const declarations: PublicDeclaration[] = [];

  for (const [name, localName] of index.publicToLocal) {
    const own = index.local.get(localName);

    if (own) {
      declarations.push(...own.map(text => ({name, text})));
      continue;
    }

    const fromChunk = index.internalImports.get(localName);

    if (!fromChunk) {
      throw new Error(`export "${name}" of ${url.href} has no resolvable declaration`);
    }

    const chunkUrl = declarationUrlOf(url, fromChunk.specifier);
    const chunkIndex = indexDeclarationFile(parseDeclarationFile(chunkUrl));
    const chunkLocalName = chunkIndex.publicToLocal.get(fromChunk.imported);
    const chunkDeclarations = chunkLocalName && chunkIndex.local.get(chunkLocalName);

    if (!chunkDeclarations) {
      throw new Error(`export "${name}" of ${url.href} is not declared in chunk ${fromChunk.specifier}`);
    }

    declarations.push(...chunkDeclarations.map(text => ({name, text})));
  }

  return {
    names: [...new Set(declarations.map(declaration => declaration.name))].sort(),
    // Ordenação por code unit (o `.sort()` padrão), sem locale, para o snapshot ser idêntico em qualquer ambiente.
    declarations: declarations.sort((a, b) => compare(a.name, b.name) || compare(a.text, b.text)),
  };
}

function expectInventory(entry: string, actual: string[], expected: string[]): void {
  const inventory = new Set(expected);
  const shipped = new Set(actual);
  const missing = [...inventory].filter(name => !shipped.has(name)).sort();
  const unexpected = [...shipped].filter(name => !inventory.has(name)).sort();

  expect(missing, `exports do inventário ausentes em dist/${entry}.d.mts: ${missing.join(', ')}`).toEqual([]);
  expect(unexpected, `exports em dist/${entry}.d.mts fora do inventário: ${unexpected.join(', ')}`).toEqual([]);
}

describe('public API surface (REQ-001)', () => {
  it(`root entry (.) exports exactly the ${ROOT_EXPORTS.length} names of the inventory`, () => {
    const {names} = readPublicApi(new URL('index.d.mts', dist));

    expectInventory('index', names, ROOT_EXPORTS);
    expect(names).toEqual([...ROOT_EXPORTS].sort());
  });

  it('/runtime entry exports exactly the names of the inventory', () => {
    const {names} = readPublicApi(new URL('runtime.d.mts', dist));

    expectInventory('runtime', names, RUNTIME_EXPORTS);
    expect(names).toEqual([...RUNTIME_EXPORTS].sort());
  });

  it('root inventory has no duplicates', () => {
    expect([...new Set(ROOT_EXPORTS)]).toHaveLength(ROOT_EXPORTS.length);
  });

  it('root entry (.) keeps its declaration snapshot', () => {
    const {declarations} = readPublicApi(new URL('index.d.mts', dist));

    expect(declarations.map(declaration => declaration.text).join('\n\n')).toMatchSnapshot();
  });
});
