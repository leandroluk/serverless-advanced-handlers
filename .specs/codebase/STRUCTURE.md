# Structure

Gerado a partir do código real (`src/`, 23 arquivos, ~1470 linhas) e do grafo (`.specs/graph/graph.json`, 930 nós/1890 arestas/43 comunidades — build `--code-only`, sem indexação semântica de `.specs/*.md` por falta de chave de LLM).

## Entradas do pacote (`package.json` exports)

| Subpath      | Arquivo                | Estado                                                        |
| :----------- | :---------------------- | :-------------------------------------------------------------- |
| `.`          | `src/index.ts`          | Superfície declarativa completa (130 exports nomeados/tipos)    |
| `./runtime`  | `src/runtime/index.ts`  | Só `defineReflectMetadata` (usado pelo código gerado, F08)       |
| `./testing`  | `src/testing/index.ts`  | Vazio (`export {}`) — feature futura                             |
| `./plugin`   | `src/plugin/index.ts`   | Vazio (`export {}`), CJS — feature futura                        |

## Módulos de `src/`

```
src/
├── class/
│   └── types.ts            # AdvancedClass, AnyAdvancedClass, ClassFactory, InstanceSchemaFactory
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
1. `HttpStatus` — 74 arestas (usado por exceptions, decorators HTTP e OpenAPI)
2. `HttpException` — 42 arestas (base de todas as 43 subclasses)
3. `methodDecorator()` / `classOrMethodDecorator()` — núcleo do padrão dual (modos A/B/C)
4. `compilerOptions` — repetido pelos 5 tsconfigs de fixture `mode-c-*` (esperado, não é acoplamento real)

## Observações
- Nenhum ciclo de import detectado.
- 355 nós isolados (≤1 conexão) — majoritariamente DTOs/fixtures de teste usados só localmente (`CreateUserBody`, `ListUsersQuery`, etc.), não sinaliza problema.
- O grafo foi construído com `--code-only` (sem `GEMINI_API_KEY`/`ANTHROPIC_API_KEY`/etc.) — não conecta `REQ-NNN` das specs aos módulos que os implementam. Ver `## Degraded Mode` em STATE.md.
- `graphify update . --no-viz --code-only` deve ser rodado manualmente após cada commit (o hook de pós-commit automático não pôde ser instalado nesta sessão — bloqueado pelo classificador de auto mode; ver STATE.md).
