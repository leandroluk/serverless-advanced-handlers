# Design: API Pública

Base: [spec.md](spec.md) · [context.md](context.md) · [INSIGHT.md](../../../INSIGHT.md). Escopo: **Complex**.

> **Drift / grafo:** projeto greenfield, sem git e sem grafo (modo degradado). Os caminhos de dependência abaixo
> são planejados, não extraídos do grafo.

## Architecture Overview

O pacote tem quatro entradas com fronteiras rígidas. Tudo o que roda na Lambda vem da raiz e de `/runtime`
e é **bundlado** no handler, então o pacote pode ser instalado como `devDependency`.

```mermaid
flowchart TB
    subgraph Root["serverless-advanced-handlers (raiz)"]
        VAL[validation: v, extensões, resolveMeta, toOpenapiSchema]
        CLS[class: Class, instance, guard]
        DEC[decorators + marcadores de tipo: DI, HTTP, pipeline, OpenAPI, LambdaConfig]
        HTTP[http: HttpStatus, HttpResult, exceções, HttpRequest, UploadedFile]
        PIPE[pipeline: contratos, ExecutionContext, Reflector, APP_*]
        CLS --> VAL
        DEC --> CLS
    end
    subgraph Runtime["/runtime (só código gerado)"]
        RT[transporte, handlers HTTP, erros, pipeline, uploads]
    end
    subgraph Plugin["/plugin"]
        CMP[compiler: análise, DI, fatiamento, codegen, schema extractor, OpenAPI]
        BND[bundler: esbuild, SWC (modo B), zip]
        SLS[adapter Serverless v3 / osls 3.x–4.x]
        SLS --> CMP --> BND
    end
    subgraph Testing["/testing"]
        TST[Test, TestingModule, HttpTestApp]
        VIT[/testing/vitest: plugin do Vitest]
        VIT --> CMP
        TST --> RT
    end
    RT --> Root
    CMP -. lê código que importa .-> Root
```

### Regras de dependência (REQ-001, REQ-002)
| Entrada        | Pode importar                                                                                  | Nunca importa                              |
| :------------- | :--------------------------------------------------------------------------------------------- | :----------------------------------------- |
| raiz           | `zod` (peer), `ms`                                                                             | `ts-morph`, `typescript`, `esbuild`, `@swc/core`, AWS SDK |
| `/runtime`     | raiz, builtins do Node, `@aws-sdk/client-s3` e `@aws-sdk/s3-presigned-post` (peers opcionais, só em uploads S3) | `ts-morph`, `typescript`, `esbuild`, `@swc/core` |
| `/testing`     | raiz, `/runtime`, compilador                                                                    | —                                          |
| `/plugin`      | raiz, compilador, bundler, `ts-morph`, `esbuild`, `@swc/core` (peer opcional, exigido no modo B) | —                                          |

**Garantias automatizadas:**
- `oxlint` com `no-restricted-imports` em `src/{validation,class,decorators,http,pipeline,runtime}`.
- Teste que bundla `dist/index.mjs` e `dist/runtime.mjs` com esbuild e falha se o metafile contiver `ts-morph`, `typescript`, `esbuild` ou `@swc`.

### Modelo de execução
- **Decorators e marcadores de tipo não têm comportamento em runtime.** Os decorators são funções no-op com assinatura dupla (legado e TC39); toda a semântica é extraída pelo compilador. Isso refina a REQ-005: a detecção do modo em runtime deixa de ser necessária.
- **Código gerado importa helpers de runtime por funcionalidade** (JSON, multipart, aliases, pipeline, uploads). Um handler sem upload não carrega o parser multipart.

## Dependency Paths (planejados)
- REQ-010..019 → `validation/v.ts` → `validation/extensions/*` → `validation/openapi.ts`
- REQ-020..026 → `class/class-factory.ts` → `validation/v.ts` (reexport de `instance`)
- REQ-004..008, 030..037 → `decorators/di.ts` → `compiler/decorator-mode.ts` → `compiler/ast-analyzer.ts` → `compiler/di-resolver.ts`
- REQ-040..055 → `decorators/http.ts`, `http/*` → `compiler/route-analyzer.ts` → `compiler/code-generator.ts` → `runtime/http/*`
- REQ-060..066 → `decorators/pipeline.ts`, `pipeline/*` → `compiler/metadata-collector.ts` → `runtime/pipeline/*`
- REQ-017, 019, 070..074 → `decorators/openapi.ts` → `compiler/schema-extractor.ts` → `compiler/openapi-generator.ts`
- REQ-080..083 → `decorators/lambda.ts` → `compiler/function-planner.ts` → `plugin/functions.ts`
- REQ-090..094 → `plugin/index.ts` → `plugin/config-schema.ts`, `plugin/hooks.ts` → `bundler/*`
- REQ-100..104 → `testing/test.ts`, `testing/vitest.ts` → `compiler/*` (em memória) → `runtime/*`
- REQ-053, 110..112 → `http/uploaded-file.ts` → `runtime/uploads/*` → `plugin/uploads-resources.ts`

---

## Public Contracts

> Assinaturas de contrato. Tipos de retorno de schemas Zod são os inferidos pelo Zod; detalhes finais saem da implementação de cada feature.

### Validação (`v`, raiz) — F03
```ts
// validation/v.ts  →  export * as v from './validation/v'
export * from 'zod';
export { instance } from '../class/class-factory';

export type ByteSize = number | `${number}${'B' | 'KB' | 'MB' | 'GB'}`;

export function boolish(opts?: { truthy?: string[]; falsy?: string[] }): z.ZodType<boolean, boolean | string>;
export function delimited<T extends z.ZodType>(element: T, opts?: { separator?: string }): z.ZodType<z.output<T>[], string | string[]>;
export function duration(): z.ZodType<number, string | number>;
export function datetime(): z.ZodType<Date, string | Date>;
export function timestamp(): z.ZodType<Date, string | Date | undefined>;
export function file(opts?: { minSize?: ByteSize; maxSize?: ByteSize; mimetypes?: string[] }): z.ZodFile;

declare module 'zod' {
  interface GlobalMeta {
    name?: string;       // nome no transporte (REQ-046)
    examples?: $input[]; // tipado pelo input do schema
  }
}

// raiz
export function resolveMeta(schema: z.ZodType): z.GlobalMeta;
export function toOpenapiSchema(schema: z.ZodType, opts: { specVersion: '3.0' | '3.1' }): JsonSchemaObject;
```

### Classes (raiz) — F04
```ts
export interface AdvancedClass<S extends z.ZodObject = z.ZodObject> {
  new (data: z.output<S>): z.output<S>;
  readonly object: S;
  readonly shape: S['shape'];
  readonly schema: z.ZodCodec<S, z.ZodType<z.output<S>>>;
  omit: S['omit'];
  pick: S['pick'];
  partial: S['partial'];
  extend: S['extend'];
  parse<T extends AbstractType>(this: T, input: unknown): InstanceType<T>;
  safeParse<T extends AbstractType>(this: T, input: unknown): z.ZodSafeParseResult<InstanceType<T>>;
  encode(value: z.output<S> | z.input<S>): z.input<S>;
}
export function Class<S extends z.ZodObject>(source: S | AdvancedClass<S>): AdvancedClass<S>;
export function instance<T extends AdvancedClass>(cls: T): z.ZodCodec<T['object'], z.ZodType<InstanceType<T>>>;
export function isServerlessAdvancedHandlersClass(value: unknown): value is AdvancedClass;
```

### Injeção de dependência (raiz) — F05
```ts
export type Type<T = unknown> = abstract new (...args: never[]) => T;
export class InjectionToken<T> { constructor(description: string); }
export type Token<T = unknown> = Type<T> | InjectionToken<T> | string | symbol;
export type TokenValue<K> = K extends Type<infer T> ? T : K extends InjectionToken<infer T> ? T : unknown;

export enum Scope { DEFAULT = 'default', REQUEST = 'request' }

type UseKey = 'useClass' | 'useValue' | 'useFactory' | 'useExisting' | 'inject';
type Forbid<K extends UseKey> = { [P in Exclude<UseKey, K>]?: never };

export type ClassProvider<T = unknown> = { provide: Token<T>; useClass: Type<T>; scope?: Scope } & Forbid<'useClass'>;
export type ValueProvider<T = unknown> = { provide: Token<T>; useValue: T } & Forbid<'useValue'>;
export type FactoryProvider<T = unknown> = {
  provide: Token<T>;
  useFactory: (...deps: never[]) => T | Promise<T>;
  inject?: readonly (Token | { token: Token; optional: true })[];
  scope?: Scope;
} & Forbid<'useFactory' | 'inject'>;
export type ExistingProvider<T = unknown> = { provide: Token<T>; useExisting: Token<T> } & Forbid<'useExisting'>;
export type Provider<T = unknown> = Type<T> | ClassProvider<T> | ValueProvider<T> | FactoryProvider<T> | ExistingProvider<T>;

export interface ModuleMetadata {
  imports?: readonly (Type | DynamicModule)[];
  controllers?: readonly Type[];
  providers?: readonly Provider[];
  exports?: readonly (Token | DynamicModule)[];
}
export interface DynamicModule extends ModuleMetadata { module: Type; global?: boolean }

export function Module(metadata: ModuleMetadata): DualClassDecorator;
export function Global(): DualClassDecorator;
export function Injectable(options?: { scope?: Scope }): DualClassDecorator;

// decorator (modos A/B) + marcador de tipo (todos os modos) com o mesmo nome
export function Inject(token: Token): ParameterDecorator;
export type Inject<K extends Token, T = TokenValue<K>> = T;
export function Optional(): ParameterDecorator;
export type Optional<T> = T | undefined;

export interface OnModuleInit { onModuleInit(): void | Promise<void> }
export interface OnModuleDestroy { onModuleDestroy(): void | Promise<void> }

export type DualClassDecorator = LegacyClassDecorator & StandardClassDecorator;
export type DualMethodDecorator = LegacyMethodDecorator & StandardMethodDecorator;
```

### HTTP (raiz) — F07
```ts
export function HttpController(prefix?: string): DualClassDecorator;
export function HttpGet(path?: string): DualMethodDecorator; // + HttpPost, HttpPut, HttpPatch, HttpDelete, HttpHead, HttpOptions
export function HttpCode(status: HttpStatus | number): DualMethodDecorator;
export function HttpResponseHeader(name: string, value: string): DualMethodDecorator;

// parâmetros: decorator + marcador de tipo com o mesmo nome (REQ-043, REQ-007)
export function HttpBody(cls?: AdvancedClass): ParameterDecorator;
export type HttpBody<T> = T;
// idem: HttpQuery, HttpParams, HttpHeaders, HttpCookies, HttpForm

export function HttpRequest(): ParameterDecorator;
export interface HttpRequest {              // interface aberta para augmentation (ex.: user)
  readonly method: HttpMethod;
  readonly path: string;                    // path real
  readonly route: string;                   // padrão da rota: /users/:id
  readonly headers: Readonly<Record<string, string>>;
  readonly query: Readonly<Record<string, string | string[]>>;
  readonly params: Readonly<Record<string, string>>;
  readonly cookies: Readonly<Record<string, string>>;
  readonly rawBody?: Buffer;
  readonly sourceIp?: string;
  readonly event: APIGatewayProxyEventV2 | APIGatewayProxyEvent;
}
export function LambdaContext(): ParameterDecorator;
export type LambdaContext = import('aws-lambda').Context;

export enum HttpStatus { OK = 200, CREATED = 201, NO_CONTENT = 204 /* ... */ }
export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE' | 'HEAD' | 'OPTIONS';

export class HttpResult<T = unknown> {
  constructor(body: T, init?: { status?: HttpStatus | number; headers?: Record<string, string>; cookies?: string[] });
}

export class HttpException extends Error {
  constructor(status: HttpStatus | number, response?: string | Record<string, unknown>);
  readonly status: number;
  getResponse(): string | Record<string, unknown>;
}
// BadRequestException, UnauthorizedException, ForbiddenException, NotFoundException, ConflictException,
// UnprocessableEntityException, TooManyRequestsException, InternalServerErrorException
//   constructor(message?: string | Record<string, unknown>)

export interface UploadedFile extends File {
  readonly fieldname: string;
  readonly location?: { readonly bucket: string; readonly key: string };
}
```

### Pipeline (raiz) — F08
```ts
export interface ArgumentsHost {
  getType(): 'http';
  getArgs(): unknown[];
  switchToHttp(): HttpArgumentsHost;
  switchToRpc(): never; // lança erro no v1
  switchToWs(): never;  // lança erro no v1
  getLambdaContext(): LambdaContext;
}
export interface HttpArgumentsHost {
  getRequest<T = HttpRequest>(): T;
  getResponse<T = HttpResponseState>(): T;
}
export interface HttpResponseState { status?: number; headers: Record<string, string>; cookies: string[] }
export interface ExecutionContext extends ArgumentsHost {
  getClass<T = unknown>(): Type<T>;
  getHandler(): (...args: never[]) => unknown; // referência do método (com id estável gerado no build)
}

export interface CanActivate { canActivate(context: ExecutionContext): boolean | Promise<boolean> }
export interface CallHandler<T = unknown> { handle(): Promise<T> }
export interface Interceptor<T = unknown, R = unknown> { intercept(context: ExecutionContext, next: CallHandler<T>): Promise<R> }
export interface ExceptionFilter<E = unknown> { catch(exception: E, host: ArgumentsHost): unknown | Promise<unknown> }

export function UseGuards(...guards: Type<CanActivate>[]): DualClassDecorator & DualMethodDecorator;
export function UseInterceptors(...interceptors: Type<Interceptor>[]): DualClassDecorator & DualMethodDecorator;
export function UseFilters(...filters: Type<ExceptionFilter>[]): DualClassDecorator & DualMethodDecorator;
export function Catch(...exceptions: Type<Error>[]): DualClassDecorator; // REQ-066

export const APP_GUARD: InjectionToken<CanActivate>;
export const APP_INTERCEPTOR: InjectionToken<Interceptor>;
export const APP_FILTER: InjectionToken<ExceptionFilter>;

export function SetMetadata<V>(key: string | symbol, value: V): DualClassDecorator & DualMethodDecorator;
export interface ReflectableDecorator<T> { (value: T): DualClassDecorator & DualMethodDecorator; readonly key: symbol }
export class Reflector {
  static createDecorator<T>(options?: { key?: string }): ReflectableDecorator<T>;
  get<T>(decorator: ReflectableDecorator<T>, target: ReflectTarget): T | undefined;
  get<T = unknown>(key: string | symbol, target: ReflectTarget): T | undefined;
  getAllAndOverride<T>(decoratorOrKey: ReflectableDecorator<T> | string | symbol, targets: readonly ReflectTarget[]): T | undefined;
  getAllAndMerge<T>(decoratorOrKey: ReflectableDecorator<T[]> | string | symbol, targets: readonly ReflectTarget[]): T[];
}
type ReflectTarget = Type | ((...args: never[]) => unknown);
```

### OpenAPI (raiz) — F09
```ts
type ResponseSchema = AdvancedClass | readonly [AdvancedClass]; // [Cls] = array
export interface OpenapiResponseOptions { status: HttpStatus | number; description: string; schema?: ResponseSchema }

export function OpenapiTags(...tags: string[]): DualClassDecorator & DualMethodDecorator;
export function OpenapiOperation(options: { summary?: string; description?: string; operationId?: string; deprecated?: boolean }): DualMethodDecorator;
export function OpenapiConsumes(...mediaTypes: string[]): DualClassDecorator & DualMethodDecorator;
export function OpenapiProduces(...mediaTypes: string[]): DualClassDecorator & DualMethodDecorator;
export function OpenapiResponse(options: OpenapiResponseOptions): DualMethodDecorator;
// OpenapiOkResponse, OpenapiCreatedResponse, OpenapiNoContentResponse, OpenapiBadRequestResponse,
// OpenapiUnauthorizedResponse, OpenapiForbiddenResponse, OpenapiNotFoundResponse, OpenapiConflictResponse
//   (options: Omit<OpenapiResponseOptions, 'status'>)
export function OpenapiSecurity(name: string, scopes?: string[]): DualClassDecorator & DualMethodDecorator;
export function OpenapiExclude(): DualClassDecorator & DualMethodDecorator;
```

### Configuração da Lambda (raiz) — F10
```ts
export interface LambdaConfigOptions {
  name?: string;                       // fixa a chave da função (REQ-081)
  memorySize?: number;
  timeout?: number;
  reservedConcurrency?: number;
  environment?: Record<string, string>;
  iamRoleStatements?: readonly IamStatement[];
  description?: string;
  tags?: Record<string, string>;
}
export function LambdaConfig(options: LambdaConfigOptions): DualClassDecorator & DualMethodDecorator;
```

### Configuração do plugin (`/plugin`) — F10
Definida como schema Zod (fonte única). Dele saem:
- o tipo `AdvancedHandlersConfig`;
- os defaults (`parse`);
- o JSON Schema draft-07, sem `$schema`, registrado em `configSchemaHandler.defineCustomProperties` (REQ-090).

```ts
export interface AdvancedHandlersConfig {
  entrypoint?: string;                         // 'src/app.module.ts'
  outDir?: string;                             // '.serverless-advanced'
  target?: 'node22' | 'node24';                // 'node24'
  granularity?: 'method' | 'controller';       // 'method'
  minify?: boolean;                            // true
  sourcemap?: boolean;                         // true
  cors?: boolean | CorsOptions;                // false
  openapi?: { enabled?: boolean; specVersion?: '3.0' | '3.1'; title?: string; version?: string; docsPath?: string; jsonPath?: string };
  responses?: { missingSchema?: 'error' | 'warn' };        // 'error'
  errors?: { format?: 'nestjs' | 'problem-json' };          // 'nestjs'
  uploads?: { inlineLimit?: ByteSize; bucket?: 'auto' | string; tmpPrefix?: string; expiration?: string; urlTtl?: string };
}
export default class ServerlessAdvancedHandlersPlugin { /* hooks — ver INSIGHT §5 */ }
```

### Testes (`/testing`) — F11
```ts
export class Test {
  static createTestingModule(metadata: ModuleMetadata): TestingModuleBuilder;
}

type OverrideKey = 'useClass' | 'useValue' | 'useFactory' | 'inject';
type OverrideForbid<K extends OverrideKey> = { [P in Exclude<OverrideKey, K>]?: never };
export type ProviderOverride<K extends Token = Token, T = TokenValue<K>> =
  | ({ provide: K; useValue: Partial<T> } & OverrideForbid<'useValue'>)
  | ({ provide: K; useClass: Type<T> } & OverrideForbid<'useClass'>)
  | ({ provide: K; useFactory: (...deps: never[]) => T | Promise<T>; inject?: readonly Token[] } & OverrideForbid<'useFactory' | 'inject'>);

export interface TestingModuleBuilder {
  overrideProvider<const K extends readonly Token[]>(...overrides: { [I in keyof K]: ProviderOverride<K[I]> }): TestingModuleBuilder;
  overrideGuard<const K extends readonly Type<CanActivate>[]>(...overrides: { [I in keyof K]: ProviderOverride<K[I]> }): TestingModuleBuilder;
  overrideInterceptor<const K extends readonly Type<Interceptor>[]>(...overrides: { [I in keyof K]: ProviderOverride<K[I]> }): TestingModuleBuilder;
  overrideFilter<const K extends readonly Type<ExceptionFilter>[]>(...overrides: { [I in keyof K]: ProviderOverride<K[I]> }): TestingModuleBuilder;
  compile(): Promise<TestingModule>;
}
export interface TestingModule {
  get<K extends Token>(token: K): TokenValue<K>;
  createHttpApp(options?: Pick<AdvancedHandlersConfig, 'errors' | 'responses'>): Promise<HttpTestApp>;
  close(): Promise<void>; // executa onModuleDestroy
}
export interface HttpTestApp {
  inject(request: {
    method: HttpMethod;
    path: string;
    headers?: Record<string, string>;
    query?: Record<string, string | string[]>;
    cookies?: Record<string, string>;
    body?: unknown;
  }): Promise<{ status: number; headers: Record<string, string>; cookies: string[]; body: unknown; rawBody: string }>;
}

// /testing/vitest
export function serverlessAdvancedHandlers(options?: { tsconfig?: string }): import('vite').Plugin;
```

**Como `Test.createTestingModule` obtém a DI sem reflexão:**
1. O plugin do Vitest executa o analisador sobre cada arquivo de teste.
2. Para cada chamada `Test.createTestingModule({...})` com metadados analisáveis, ele gera um container em módulo virtual (`virtual:sah-testing/<hash>`).
3. A chamada é reescrita para receber esse container como argumento interno.
4. Sem o plugin configurado, a chamada lança `SAH010`.

### Uploads — F12
```ts
// resposta do endpoint companheiro POST <rota>/uploads (REQ-111), indexada pelo nome do campo
export type UploadTicketsResponse = Record<string, {
  url: string;
  fields: Record<string, string>; // campos do presigned POST
  uploadToken: string;
  expiresAt: string;              // ISO 8601
}>;
```

### Runtime (`/runtime`) — interno (REQ-120)
- API sem garantia de estabilidade; é versionada junto com o plugin.
- Módulos pequenos e independentes (`http/json`, `http/multipart`, `http/transport`, `http/errors`, `pipeline/*`, `uploads/*`), importados seletivamente pelo código gerado.

---

## Catálogo de Erros de Build (REQ-091)

Formato: `[serverless-advanced-handlers] SAH<NNN> <mensagem> at <arquivo>:<linha>`. Códigos são estáveis; novos códigos só são adicionados no fim de cada faixa.

| Faixa     | Área                  | Códigos iniciais                                                                                                                                                                                   |
| :-------- | :-------------------- | :------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `SAH0xx`  | Ambiente e config     | `001` config inválida · `002` entrypoint não encontrado · `003` tsconfig não encontrado · `004` framework não suportado · `005` dependência opcional ausente (ex.: `@swc/core` no modo B) · `010` plugin de testes não configurado |
| `SAH1xx`  | Módulos e DI          | `100` configuração não analisável · `101` provider não encontrado · `102` dependência circular · `103` tipo sem valor em runtime exige `@Inject`/`Inject<>` · `104` provider não exportado · `105` módulo dinâmico não analisável |
| `SAH2xx`  | HTTP                  | `200` classe de transporte não é `Class()` · `201` argumento do decorator diverge do tipo · `202` `:param` ausente na classe · `203` parâmetro da classe ausente na rota · `204` rota duplicada · `205` resposta sem schema · `206` decorator de parâmetro no modo C |
| `SAH3xx`  | Pipeline              | `300` guard/interceptor/filter não é classe injetável · `301` valor de metadado não analisável                                                                                                   |
| `SAH4xx`  | Schemas e OpenAPI     | `400` chave de meta desconhecida · `401` componente com nome duplicado · `402` `operationId` duplicado · `403` falha ao carregar DTO no extractor                                                  |
| `SAH5xx`  | Lambda e empacotamento | `500` `@LambdaConfig` não analisável · `501` chave de função duplicada                                                                                                                            |
| `SAH9xx`  | Warnings              | `900` fallback de fatiamento · `901` modo C com bibliotecas legadas · `902` resposta sem schema (`missingSchema: warn`) · `903` DTO com efeito colateral suspeito · `904` limite estimado de recursos CloudFormation |

---

## New Components

| Componente                         | Responsabilidade                                                                 | Local                                   | Feature |
| :--------------------------------- | :------------------------------------------------------------------------------- | :-------------------------------------- | :------ |
| Namespace `v`                      | Reexport do Zod + extensões + augmentation de metadados                          | `src/validation/v.ts`, `extensions/*`   | F03     |
| Meta & OpenAPI schema              | `resolveMeta`, validação strict, `toOpenapiSchema`, mapa de aliases              | `src/validation/{meta,openapi}.ts`      | F03     |
| Class factory                      | `Class`, `instance`, `isServerlessAdvancedHandlersClass`                         | `src/class/class-factory.ts`            | F04     |
| Decorators e marcadores            | Funções no-op duais + tipos marcadores                                           | `src/decorators/*`                      | F05–F10 |
| Tipos HTTP                         | `HttpStatus`, `HttpResult`, exceções, `HttpRequest`, `UploadedFile`              | `src/http/*`                            | F07     |
| Contratos de pipeline              | `ExecutionContext`, `Reflector`, `APP_*`, interfaces                             | `src/pipeline/*`                        | F08     |
| Detector de modo                   | Lê tsconfig efetivo → A/B/C                                                      | `src/compiler/decorator-mode.ts`        | F05     |
| Analisador e resolvedor            | Módulos, rotas, DI, subconjunto analisável                                       | `src/compiler/{ast-analyzer,route-analyzer,di-resolver}.ts` | F05/F07 |
| Coletor de metadados               | `SetMetadata`/`createDecorator` → mapa estático                                  | `src/compiler/metadata-collector.ts`    | F08     |
| Slicer                             | Fatiamento transitivo + fallbacks + source maps                                  | `src/compiler/slicer.ts`                | F06     |
| Planejador de funções              | Chaves, `@LambdaConfig`, granularidade, precedência                              | `src/compiler/function-planner.ts`      | F10     |
| Gerador de código                  | Handlers e containers de teste                                                   | `src/compiler/code-generator.ts`        | F07/F11 |
| Schema extractor + gerador OpenAPI | Execução de DTOs em processo filho + spec 3.0/3.1                                | `src/compiler/{schema-extractor,openapi-generator}.ts` | F09 |
| Bundler                            | esbuild ESM, banner `createRequire`, SWC no modo B, zip                          | `src/bundler/*`                         | F10     |
| Adapter Serverless                 | Hooks, schema de config, registro de funções, recursos de upload                 | `src/plugin/*`                          | F10/F12 |
| Runtime HTTP                       | Transporte, aliases, erros (nestjs/problem-json), `HttpResult`                   | `src/runtime/http/*`                    | F07     |
| Runtime pipeline                   | Execução de filters/guards/interceptors, `ExecutionContext`, `Reflector`         | `src/runtime/pipeline/*`                | F08     |
| Runtime uploads                    | Multipart inline, presign, `uploadToken`, `S3UploadedFile`                       | `src/runtime/uploads/*`                 | F12     |
| Testing                            | `Test`, `TestingModule`, `HttpTestApp`, plugin Vitest                            | `src/testing/*`                         | F11     |

## Modified Components
Nenhum (greenfield).

## Risks
- **Grafo indisponível:** sem God Nodes calculados. Componentes de maior raio de impacto, por análise: `compiler/slicer.ts`, `compiler/di-resolver.ts` e `compiler/code-generator.ts`, pois todos os handlers dependem deles.
- **Plugin do Vitest reescrevendo chamadas:** frágil se `createTestingModule` receber metadados dinâmicos. Mitigação: exigir metadados analisáveis (`SAH100`) e testes dedicados.
- **Superfície pública grande:** ~150 exports na raiz. Mitigação: testes de tipo (`*.test-d.ts`) por área e snapshot da API pública (`.d.ts`) para detectar quebras.
- **Mesmo identificador para valor e tipo** (`HttpBody`, `Inject`...): validado em protótipo, mas precisa de teste com `verbatimModuleSyntax` e `isolatedModules`.
- **Peers opcionais** (`@swc/core`, AWS SDK de S3): erro claro (`SAH005`) quando o recurso é usado sem a dependência.

## Decision Log
1. **Decorators e marcadores são no-op em runtime;** a semântica vem do compilador. Refina a REQ-005: a assinatura dupla continua, mas a detecção de modo em runtime é desnecessária.
2. **Decorator de parâmetro e marcador de tipo compartilham o identificador** (`HttpBody`, `HttpQuery`, `HttpParams`, `HttpHeaders`, `HttpCookies`, `HttpForm`, `Inject`, `Optional`, `HttpRequest`, `LambdaContext`). Um único import serve aos três modos.
3. **`Inject<K, T = TokenValue<K>>`** infere o tipo de `InjectionToken<T>`; tokens string/symbol informam `T` explicitamente.
4. **Providers de `@Module` e overrides de teste usam unions com exclusividade mútua.** Nos overrides, `useValue` é `Partial<T>`.
5. **`HttpRequest` é uma interface aberta para augmentation** (ex.: `user` anexado por guards).
6. **Guards, interceptors e filters são referenciados apenas por classe** (resolvidos pela DI AOT); instâncias literais (`new Guard()`) não são suportadas.
7. **`@Catch(...exceptions)` adicionado** para filters (lacuna da spec → nova REQ-066).
8. **Resposta em array declarada como `schema: [Cls]`;** o tipo de retorno `Cls[]` também é inferido.
9. **Runtime modular:** o código gerado importa só os helpers necessários ao handler.
10. **Config do plugin tem o schema Zod como fonte única**, que gera o tipo, os defaults e o JSON Schema draft-07 do `configSchemaHandler`.
11. **O pacote pode ser `devDependency`,** porque o código de runtime é bundlado nos handlers.
12. **O plugin do Vitest injeta containers gerados** nas chamadas `Test.createTestingModule`.
13. **Erros de build com códigos `SAH` por faixa,** estáveis e documentados.
14. **Tipos AWS via `@types/aws-lambda`** (dependência apenas de tipos).
