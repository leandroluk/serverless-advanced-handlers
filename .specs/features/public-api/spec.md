# Spec: API Pública (modelagem do contrato)

## Summary
Define o contrato público do `serverless-advanced-handlers`: tudo o que o desenvolvedor importa, escreve
ou configura para construir uma API no estilo NestJS que roda como Lambdas granulares. Esta spec é o
contrato guarda-chuva — as features de implementação do [ROADMAP](../../project/ROADMAP.md) referenciam
os REQs daqui, e algoritmos internos ficam nos `design.md` de cada feature. Base: [INSIGHT.md](../../../INSIGHT.md).
Escopo: **Complex**.

## Requirements

### Pacote & entradas
- REQ-001: O pacote expõe quatro entradas: `serverless-advanced-handlers` (API do desenvolvedor), `/runtime` (consumida só por código gerado), `/testing` (testes) e `/plugin` (plugin Serverless).
- REQ-002: Nenhum import da entrada raiz ou de `/runtime` pode levar `ts-morph`, `esbuild` ou `typescript` para o bundle da Lambda.
- REQ-003: Requisitos de ambiente: `zod` `^4` como peer dependency (mínimo a confirmar; codecs exigem ≥ 4.1), TypeScript ≥ 5 (modo de decorators conforme REQ-004), Node.js 22/24 e um destes frameworks: **Serverless Framework v3**, **osls 3.x** ou **osls 4.x** (`frameworkVersion: '3 || 4'`). O osls, fork open-source do v3 sem login nem licença, é o recomendado por ser mantido. O Serverless Framework v4 upstream não é alvo.
- REQ-004: O compilador detecta o modo de decorators pelo tsconfig efetivo (incluindo `extends`) e o exibe no início do build: **A** `experimentalDecorators` sem `emitDecoratorMetadata`; **B** `experimentalDecorators` + `emitDecoratorMetadata` (**modo padrão** — usado na documentação, nos exemplos e na configuração recomendada); **C** decorators TC39 (sem `experimentalDecorators`).
- REQ-005: Decorators de classe e de método são as mesmas funções nos três modos (assinatura dupla); em runtime são no-op, e a semântica é extraída pelo compilador.
- REQ-006: No modo B, a DI continua AOT (sem leitura de `design:paramtypes`). Arquivos que ainda contêm decorators após o fatiamento (ex.: entidades TypeORM) são transformados com SWC (`decoratorMetadata: true`) antes do bundle do esbuild; arquivos sem decorators remanescentes seguem só pelo esbuild. `import 'reflect-metadata'` é injetado no topo dos handlers quando o pacote é dependência do projeto. Nos testes, o Vitest usa `unplugin-swc`.
- REQ-007: Marcadores de tipo equivalentes aos decorators de parâmetro, válidos nos três modos e obrigatórios no modo C: `HttpBody<T>`, `HttpQuery<T>`, `HttpParams<T>`, `HttpHeaders<T>`, `HttpCookies<T>`, `HttpForm<T>`, `Inject<typeof TOKEN, T>`, `Optional<T>`, `HttpRequest` e `LambdaContext`. Nos modos A e B as duas sintaxes são aceitas (decorators são a forma principal na documentação); no modo C, decorator de parâmetro gera erro de build com sugestão do marcador equivalente.
- REQ-008: No modo C, o build emite warning quando o projeto depende de bibliotecas que exigem decorators legados ou metadata (ex.: `typeorm`, `class-transformer`, `class-validator`).
### Validação — namespace `v`
- REQ-010: `v` reexporta todo o Zod 4 (valores e tipos, incluindo `v.infer`, `v.input`, `v.output`); exports próprios têm precedência sobre os do Zod.
- REQ-011: `v.boolish({ truthy?, falsy? })` aceita `boolean` ou string (default truthy `true|1|yes|on`, falsy `false|0|no|off`, case-insensitive); outros valores geram issue; encode retorna `boolean`; JSON Schema `boolean`.
- REQ-012: `v.delimited(element, { separator? })` é codec `string | string[]` → `T[]` (separador default `,`, com trim e remoção de itens vazios); encode faz join.
- REQ-013: `v.duration()` é codec `string` (formato `ms`) `| number` → inteiro ≥ 0 em milissegundos; string inválida gera issue.
- REQ-014: `v.datetime()` é codec ISO 8601 (com offset) `| Date` → `Date`; encode retorna ISO string; JSON Schema `string` / `date-time`. `v.timestamp()` é `v.datetime()` com default `new Date()`.
- REQ-015: `v.file({ minSize?, maxSize?, mimetypes? })` retorna `ZodFile`, com `ByteSize = number | \`${number}${'B' | 'KB' | 'MB' | 'GB'}\``; sem argumentos equivale a `z.file()`.
- REQ-016: Metadados tipados por augmentation do `GlobalMeta`: `name?: string` (nome do campo no transporte) e `examples?: $input[]`; `id` é reservado e preenchido pelo framework com o nome da classe.
- REQ-017: O build falha, indicando o caminho do campo, quando um metadado contém chave desconhecida.
- REQ-018: `resolveMeta(schema)` mescla metadados através de `optional`, `nullable`, `default`, `prefault`, `catch` e `readonly`, do schema interno para o externo (o externo vence).
- REQ-019: `toOpenapiSchema(schema, { specVersion: '3.0' | '3.1' })` gera JSON Schema no formato de transporte, com representação correta das extensões e propriedades renomeadas por `meta.name`.

### Classes — `Class()`
- REQ-020: `Class(source)` aceita um `ZodObject` ou outra classe criada por `Class()` e retorna uma classe base para `extends`.
- REQ-021: Estáticos: `object` (ZodObject puro), `shape`, `schema` (codec objeto → instância), `omit`, `pick` e `partial` (reconstruídos a partir do shape, sem herdar refinements) e `extend`.
- REQ-022: `Cls.parse(input)` e `Cls.safeParse(input)` validam e retornam instância da subclasse chamadora, tipada como `InstanceType<this>`.
- REQ-023: `Cls.encode(value)` aceita instância ou objeto plano (inclusive em classes aninhadas via `v.instance`), tanto em runtime quanto na tipagem (`z.output<S> | z.input<S>`), aplica codecs no sentido encode e remove chaves desconhecidas.
- REQ-024: `new Cls(data)` atribui os dados sem validar.
- REQ-025: `isServerlessAdvancedHandlersClass(value)` é type guard verdadeiro somente para classes `Class()` e suas subclasses (marcador `Symbol.for('serverless-advanced-handlers.class')`).
- REQ-026: `v.instance(Cls)` referencia outra classe `Class()` em um campo: em runtime o valor é instância de `Cls` e o tipo estático é `InstanceType<typeof Cls>` (ex.: `Order.parse(data).owner.displayName` tipado).

### Injeção de dependência
- REQ-030: `@Module({ imports?, controllers?, providers?, exports? })` e `@Global()`.
- REQ-031: `@Injectable({ scope? })` com `Scope.DEFAULT` (singleton por Lambda, top-level) e `Scope.REQUEST` (instância por invocação).
- REQ-032: Formas de provider: classe, `{ provide, useClass }`, `{ provide, useValue }`, `{ provide, useFactory, inject? }` (factory síncrona ou `async`) e `{ provide, useExisting }`.
- REQ-033: Tokens: classe, string, `Symbol` constante e `new InjectionToken<T>(description)`; `@Inject(token)` e `@Optional()` em parâmetros de construtor.
- REQ-034: Módulos dinâmicos: método estático que retorna `DynamicModule` (`{ module, imports?, providers?, exports?, global? }`), com argumentos literais, constantes importadas ou `process.env.*`.
- REQ-035: Lifecycle: `OnModuleInit.onModuleInit()` é aguardado no cold start (top-level await); `OnModuleDestroy.onModuleDestroy()` é best effort.
- REQ-036: Configuração de módulo fora do subconjunto analisável (INSIGHT §6.2) gera erro de build com código, arquivo e linha.
- REQ-037: Dependência circular gera erro de build exibindo o ciclo completo.

### HTTP
- REQ-040: `@HttpController(prefix?)`.
- REQ-041: `@HttpGet`, `@HttpPost`, `@HttpPut`, `@HttpPatch`, `@HttpDelete`, `@HttpHead`, `@HttpOptions` com `path?` na sintaxe `/:param` (convertida para `/{param}` no API Gateway).
- REQ-042: Status default com paridade NestJS (`201` para POST, `200` para os demais); `@HttpCode(status)` sobrescreve; enum `HttpStatus`.
- REQ-043: Parâmetros `@HttpBody`, `@HttpQuery`, `@HttpParams`, `@HttpHeaders`, `@HttpCookies` e `@HttpForm` recebem uma classe `Class()` opcional; sem argumento, o compilador usa o tipo anotado; argumento e tipo divergentes geram erro de build. Não existe decorator de campo isolado (`@HttpParam('id')`).
- REQ-044: O build valida que cada `:param` da rota existe na classe de `@HttpParams` e que a classe não declara parâmetros ausentes na rota.
- REQ-045: Escape hatches: `@HttpRequest()` (requisição normalizada: método, path, headers, query, cookies, corpo bruto e evento original) e `@LambdaContext()` (objeto `Context` da AWS).
- REQ-046: Aliases `meta.name` são aplicados na entrada (body, query, params, headers, cookies, form) e na saída (resposta); quando um campo tem `name`, somente o nome de transporte é aceito.
- REQ-047: Normalização de entrada: headers em lowercase (payloads v1 e v2), query de v1 (`multiValueQueryStringParameters`) e v2 (valores unidos por vírgula), corpo base64 decodificado e JSON inválido respondido com 400.
- REQ-048: A resposta é serializada com `Cls.encode` + aliases, onde `Cls` vem do `schema` de `@Openapi*Response` ou do tipo de retorno (`Cls`, `Promise<Cls>`, `Cls[]`, `HttpResult<Cls>`).
- REQ-054: Rota que retorna corpo sem classe `Class()` identificável gera **erro de build** por padrão; com `responses.missingSchema: warn` gera warning e serializa com `JSON.stringify`. Métodos `void` / `Promise<void>` não exigem schema.
- REQ-049: O método pode retornar `new HttpResult(body, { status?, headers?, cookies? })` para controle dinâmico da resposta, mantendo a serialização do body pelo schema.
- REQ-050: `@HttpResponseHeader(name, value)` define headers estáticos de resposta.
- REQ-051: Exceções com paridade NestJS: `HttpException(status, body?)` e subclasses `BadRequestException`, `UnauthorizedException`, `ForbiddenException`, `NotFoundException`, `ConflictException`, `UnprocessableEntityException`, `TooManyRequestsException` e `InternalServerErrorException`.
- REQ-052: Falha de validação responde 400 listando issues com caminho (usando nomes de transporte), código e mensagem.
- REQ-055: Formato do corpo de erro definido por `errors.format`: `nestjs` (default — `{ statusCode, message, error }`, com `message` como lista `"<caminho>: <mensagem>"` em erros de validação) ou `problem-json` (RFC 9457, `Content-Type: application/problem+json`, com `errors: [{ path, code, message }]`). Filters podem substituir qualquer formato.
- REQ-053: `UploadedFile` estende o `File` da Web com `fieldname` e `location?: { bucket, key }`.

### Pipeline de requisição
- REQ-060: `@UseGuards`, `@UseInterceptors` e `@UseFilters` em controller e método; globais registrados como providers `APP_GUARD`, `APP_INTERCEPTOR` e `APP_FILTER` (paridade NestJS).
- REQ-061: Ordem de execução fixa: filters → guards (global → controller → método) → interceptors (antes) → validação → método → interceptors (depois) → encode da resposta.
- REQ-062: Contratos `CanActivate.canActivate(ctx: ExecutionContext)`, `Interceptor.intercept(ctx: ExecutionContext, next: CallHandler)` com `next.handle(): Promise<unknown>` (sem RxJS) e `ExceptionFilter.catch(error, host: ArgumentsHost)`.
- REQ-063: Metadados customizados via `SetMetadata(key, value)` e `Reflector.createDecorator<T>()` com valores estaticamente analisáveis; o compilador grava os valores no handler gerado e o provider `Reflector` os lê em runtime (decorators são removidos das fatias). `Reflector` expõe `get`, `getAllAndOverride` e `getAllAndMerge` (paridade NestJS).
- REQ-065: `ExecutionContext` com paridade NestJS: `getType()` (`'http'`), `getClass()`, `getHandler()` e `switchToHttp()` → `getRequest()` (requisição normalizada da REQ-045, mutável para anexar dados como `user`) e `getResponse()` (status, headers e cookies mutáveis); `getLambdaContext()` expõe o `Context` da AWS. `switchToRpc()` e `switchToWs()` lançam erro no v1.
- REQ-064: Guards, interceptors e filters são providers referenciados por classe e seguem a mesma DI AOT e o mesmo fatiamento.
- REQ-066: `@Catch(...exceptions)` declara quais exceções um `ExceptionFilter` trata; sem argumentos, trata todas.

### OpenAPI
- REQ-070: Decorators `@OpenapiTags(...tags)`, `@OpenapiOperation({ summary?, description?, operationId?, deprecated? })`, `@OpenapiConsumes(...types)`, `@OpenapiProduces(...types)`, `@OpenapiResponse({ status, description, schema? })` (`schema` aceita `Cls` ou `[Cls]` para arrays) com atalhos (`Ok`, `Created`, `NoContent`, `BadRequest`, `Unauthorized`, `Forbidden`, `NotFound`, `Conflict`), `@OpenapiSecurity(name, scopes?)` e `@OpenapiExclude()`.
- REQ-071: Componentes são nomeados pelo nome da classe; nomes iguais em classes distintas geram erro de build.
- REQ-072: `operationId` default `<Controller>.<method>`; duplicidade gera erro de build.
- REQ-073: Quando nenhum `@Openapi*Response` declara `schema`, o response é inferido do tipo de retorno (`Cls` ou `Promise<Cls>`).
- REQ-074: A especificação é emitida em OpenAPI 3.1 ou 3.0 conforme `openapi.specVersion`.

### Configuração da Lambda
- REQ-080: `@LambdaConfig({ name?, memorySize?, timeout?, reservedConcurrency?, environment?, iamRoleStatements?, description?, tags? })` em controller e método (método sobrescreve controller), com valores estaticamente analisáveis.
- REQ-081: Chave de função determinística `<controller>-<method>` em kebab-case (sem o sufixo `Controller`); `@LambdaConfig({ name })` fixa a chave para sobreviver a renomeações; nomes finais acima de 64 caracteres são encurtados com hash estável.
- REQ-082: Precedência de configuração: `functions.<chave>` no `serverless.yml` > método > controller > `provider`.
- REQ-083: `granularity: controller` agrupa os métodos de um controller em uma única Lambda com roteamento interno, sem mudar a API do desenvolvedor.

### Plugin & build
- REQ-090: Registro via `plugins: [serverless-advanced-handlers/plugin]` e configuração em `custom.advancedHandlers` validada por schema (campos da INSIGHT §8), registrado via `configSchemaHandler` — obrigatório no osls 4, que falha com configuração inválida por padrão.
- REQ-091: Erros de build padronizados como `[serverless-advanced-handlers] SAH<NNN> <mensagem> at <arquivo>:<linha>`, com códigos estáveis e documentados.
- REQ-092: Warnings de fallback de fatiamento informam método, motivo e local.
- REQ-093: `custom.advancedHandlers` aceita `responses.missingSchema` (`error` | `warn`, default `error`) e `errors.format` (`nestjs` | `problem-json`, default `nestjs`).
- REQ-094: O plugin funciona no Serverless Framework v3, no osls 3.x e no osls 4.x usando apenas a API de plugins comum aos três, sem APIs removidas no osls 4 (`provider.request()`, `provider.sdk`, `provider.getCredentials()`, `variableResolvers`, `package.include`/`package.exclude`); opções de CLI declaram `type`; chamadas à AWS, se necessárias, usam AWS SDK v3.

### Testes
- REQ-100: `Test.createTestingModule({ imports?, controllers?, providers? })` com `.compile()` e `moduleRef.get(token)` (paridade NestJS).
- REQ-101: `overrideProvider(...overrides)` recebe objetos no mesmo formato dos providers de `@Module` (REQ-032) — `{ provide, useValue }`, `{ provide, useClass }` ou `{ provide, useFactory, inject? }` —, sem a API encadeada do NestJS (`overrideProvider(token).useValue(...)`). As três formas são mutuamente excludentes na tipagem (erro de compilação com nenhuma ou mais de uma) e em runtime; `inject` só é aceito com `useFactory`; o tipo de `useClass` e do retorno de `useFactory` é o do token, e `useValue` aceita `Partial` desse tipo para mocks.
- REQ-104: `overrideGuard`, `overrideInterceptor` e `overrideFilter` usam o mesmo formato de objeto da REQ-101.
- REQ-102: `moduleRef.createHttpApp()` expõe `app.inject({ method, path, headers?, query?, body? })`, executando em memória o pipeline completo (transporte, guards, validação, serialização) sem AWS.
- REQ-103: Integração com Vitest via `serverless-advanced-handlers/testing/vitest`, que executa o compilador para os módulos usados nos testes.

### Uploads
- REQ-110: Uma rota cuja soma de `maxSize` dos campos `v.file()` excede `uploads.inlineLimit` passa a operar em modo S3.
- REQ-111: No modo S3, o endpoint companheiro `POST <rota>/uploads` aplica os mesmos guards da rota e retorna, por campo, `{ url, fields, uploadToken, expiresAt }`.
- REQ-112: A rota aceita `uploadToken` no lugar do arquivo e entrega ao controller o mesmo `UploadedFile`, com `location` preenchido.

### Runtime
- REQ-120: `serverless-advanced-handlers/runtime` é consumido apenas por código gerado; compatibilidade garantida somente com a mesma versão do plugin.

## Affected Components (from graph)
Projeto greenfield e grafo indisponível (modo degradado). Componentes planejados conforme INSIGHT §9:
- `src/validation/*` — REQ-010..019
- `src/class/class-factory.ts` — REQ-020..026
- `src/decorators/*` — REQ-030..035, 040..053, 060..063, 070, 080
- `src/compiler/di-resolver.ts` ⚠️ alto risco — contrato do subconjunto analisável (REQ-036, 037)
- `src/compiler/slicer.ts` ⚠️ alto risco — correção de todos os bundles depende dele (REQ-063, 064, 092)
- `src/compiler/schema-extractor.ts`, `openapi-generator.ts` — REQ-017, 071..074
- `src/runtime/*` — REQ-045..055, 061, 065, 120
- `src/testing/*` — REQ-100..103
- `src/plugin.ts`, `src/bundler/*` — REQ-080..083, 090..092, 110..112
- `src/compiler/decorator-mode.ts`, `src/bundler/swc-transform.ts`, `src/decorators/*` — REQ-004..008

## Out of Scope
- Protocolos não-HTTP (SQS, EventBridge, AMQP, GraphQL, gRPC) — visão futura (INSIGHT §7.5).
- WebSockets, response streaming e SSE.
- Serverless Framework v4 upstream (exige login/licença) — compatibilidade não garantida.
- Uso de `reflect-metadata` pela DI do framework (o modo B existe apenas para compatibilidade com bibliotecas de terceiros).
- Validação de arquivo por magic bytes (`verifyMagicBytes`) — adiada.
- Helper de cliente para o fluxo de upload S3 — adiado.
- Algoritmos internos (fatiamento, extração de schemas, hooks) — pertencem aos `design.md` das features.

## Open Questions
- Q1–Q4: resolvidas em 2026-09-14 — ver [context.md](context.md).
- Q5 (REQ-090, REQ-094): o loader de plugins do Serverless v3 e do osls (3.x e 4.x) resolve `serverless-advanced-handlers/plugin`, e o schema do osls aceita `nodejs24.x`? — validação técnica da F02, não bloqueia o Design.
