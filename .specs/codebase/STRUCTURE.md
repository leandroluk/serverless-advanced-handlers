# Structure

Gerado a partir do código real (`src/`) e do grafo (`.specs/graph/graph.json`, 1033 nós/2058 arestas/49 comunidades — build `--code-only`, sem indexação semântica de `.specs/*.md` por falta de chave de LLM; a rotulagem de comunidades também depende de LLM, então nomes novos desde a última rotulagem aparecem como o nó-hub cru, ex. `extensions.ts`).

## Entradas do pacote (`package.json` exports)

| Subpath      | Arquivo                | Estado                                                        |
| :----------- | :---------------------- | :-------------------------------------------------------------- |
| `.`          | `src/index.ts`          | Superfície declarativa + `v`/`Class()`/`toOpenapiSchema` (137 exports nomeados/tipos) |
| `./runtime`  | `src/runtime/index.ts`  | Só `defineReflectMetadata` (usado pelo código gerado, F08)       |
| `./testing`  | `src/testing/index.ts`  | Vazio (`export {}`) — feature futura                             |
| `./plugin`   | `src/plugin/index.ts`   | Vazio (`export {}`), CJS — feature futura                        |

## Módulos de `src/`

```
src/
├── class/
│   ├── types.ts             # AdvancedClass, AnyAdvancedClass, ClassFactory, InstanceSchemaFactory, AdvancedClassGuard (tipos, API travada)
│   └── class-factory.ts      # Class(source), isServerlessAdvancedHandlersClass() — runtime (F04 T-001)
├── validation/
│   ├── v.ts                  # namespace v: reexport do Zod 4 + extensões (const + namespace merge, ver design.md decisão 17)
│   ├── extensions.ts           # boolish, delimited, duration, datetime, timestamp, file, parseBytes + registry de JSON Schema
│   ├── meta.ts                  # resolveMeta (merge via wrappers), validateMeta (allowlist de chaves)
│   └── openapi.ts                 # toOpenapiSchema (F03, completa)
├── decorators/
│   ├── dual.ts              # DualClassDecorator, DualMethodDecorator, DualClassOrMethodDecorator (base p/ modos A/B/C)
│   ├── di.ts                 # Module, Injectable, Inject, Optional, Global + marcadores de tipo
│   ├── http.ts                # HttpController, HttpGet/Post/..., HttpBody(), HttpQuery(), etc.
│   ├── lambda.ts               # LambdaConfig (nome, memória, timeout, IAM, env, tags)
│   ├── openapi.ts               # OpenapiTags/Operation/Response + 8 atalhos de status, Security, Exclude
│   └── pipeline.ts               # UseGuards, UseInterceptors, UseFilters, Catch, SetMetadata
├── di/
│   ├── tokens.ts             # Type, InjectionToken<T> (nominal), Token, TokenValue
│   └── providers.ts           # Provider, ClassProvider, ValueProvider, FactoryProvider, ExistingProvider, Scope, ModuleMetadata, DynamicModule, OnModuleInit/Destroy
├── http/
│   ├── status.ts             # HttpStatus (paridade NestJS, 56 membros + 511) e reason phrases
│   ├── exceptions.ts          # HttpException + 43 subclasses (8 NestJS-parity da T-008 + 35 da ampliação 4xx/5xx)
│   ├── result.ts               # HttpResult (status/headers/cookies dinâmicos)
│   ├── types.ts                 # HttpRequest()/LambdaContext() (função + type marker), UploadedFile, HttpMethod
│   └── index.ts                  # barrel do módulo
├── pipeline/
│   ├── contracts.ts          # ArgumentsHost, HttpArgumentsHost, ExecutionContext, CanActivate, CallHandler, Interceptor, ExceptionFilter
│   ├── tokens.ts               # APP_GUARD, APP_INTERCEPTOR, APP_FILTER
│   ├── reflector.ts             # Reflector.createDecorator<T>(), get/getAllAndOverride/getAllAndMerge
│   ├── metadata-registry.ts      # WeakMap interno; defineReflectMetadata/getReflectMetadata
│   └── index.ts                   # barrel do módulo
├── runtime/index.ts          # exporta só defineReflectMetadata (para código gerado em F08)
├── testing/index.ts           # placeholder — feature futura
├── plugin/index.ts             # placeholder (CJS) — feature futura
└── index.ts                     # barrel raiz — consolida todos os módulos acima
```

## Comunidades do grafo (visão macro)

As 3 maiores comunidades (por nº de nós) são código de produção; as demais em sua maioria são fixtures de teste (`mode-c-*`) e configuração de build:

| Comunidade                      | Nós | Cobertura                                                        |
| :------------------------------- | --: | :----------------------------------------------------------------- |
| HTTP Route Decorators            |  62 | `src/decorators/http.ts` (decorators de rota e parâmetro)          |
| HTTP Exception Classes           |  48 | `src/http/exceptions.ts` (43 subclasses de `HttpException`)         |
| HTTP Status Codes                |  57 | `src/http/status.ts` (`HttpStatus`, reason phrases)                  |
| OpenAPI Response Decorators      |  37 | `src/decorators/openapi.ts`                                          |
| Lambda Config & IAM              |  21 | `src/decorators/lambda.ts`                                            |
| DI Provider Definitions          |  20 | `src/di/providers.ts`                                                   |
| DI Tokens & Pipeline Contracts   |  17 | `src/di/tokens.ts` + `src/pipeline/contracts.ts`/`tokens.ts`             |
| Advanced Class Types             |  16 | `src/class/types.ts`                                                      |
| Pipeline Metadata Decorators     |  14 | `src/decorators/pipeline.ts`                                               |
| Metadata Reflection Registry     |  11 | `src/pipeline/reflector.ts` + `src/pipeline/metadata-registry.ts`           |

Relatório completo: [`.specs/graph/GRAPH_REPORT.md`](../graph/GRAPH_REPORT.md).

## God Nodes (mais conectados)
1. `HttpStatus` — 73 arestas (usado por exceptions, decorators HTTP e OpenAPI)
2. `HttpException` — 41 arestas (base de todas as 43 subclasses)
3. `methodDecorator()` / `classOrMethodDecorator()` — núcleo do padrão dual (modos A/B/C)
4. `vitest` — 27 arestas (dependência de teste mais compartilhada do projeto)
5. `compilerOptions` — repetido pelos tsconfigs de fixture `mode-c-*` (esperado, não é acoplamento real)

## Observações
- Nenhum ciclo de import detectado.
- Módulos novos desde a última atualização (F03 `validation-engine` completa, F04 `class-factory` T-001): `src/validation/{v,extensions,meta,openapi}.ts`, `src/class/class-factory.ts`.
- O grafo foi construído com `--code-only` (sem `GEMINI_API_KEY`/`ANTHROPIC_API_KEY`/etc.) — não conecta `REQ-NNN` das specs aos módulos que os implementam. Ver `## Degraded Mode` em STATE.md.
- `graphify update . --no-viz --code-only` deve ser rodado manualmente após cada commit (o hook de pós-commit automático não pôde ser instalado nesta sessão — bloqueado pelo classificador de auto mode; ver STATE.md).
