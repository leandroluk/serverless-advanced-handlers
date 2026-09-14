# Tasks: API Pública — Core (F01a)

**Pré-requisito:** F00 `project-setup` (repositório, build das 4 entradas com barrels vazios, Vitest com typecheck, lint).

**Ondas:**
- **P1** (dependem só da F00): T-001 a T-005.
- **P2:** T-006 a T-008.

**Barrels em execução paralela:** cada task adiciona suas linhas de export ao barrel da sua entrada. Tasks paralelas consolidam o barrel ao fim da onda.

**Gate comum a todas as tasks:** `pnpm check` (oxlint + tsc) além do gate específico.

**Commit:** um commit por task (Conventional Commits), com código, testes e atualização de `STATE.md`/`tasks.md` (Spec Gate).

**Fluxo por task:** subtasks PO → DEV → QA → PO → commit, cada persona em um agente próprio (ver CONVENTIONS.md).

---

## T-001: Entradas do pacote e fronteiras de dependência
- **REQ**: REQ-001, REQ-002
- **Graph node**: `src/index.ts`, `src/runtime/index.ts`, `src/testing/index.ts`, `src/plugin/index.ts` (planejados)
- **What**:
  - Teste que importa as 4 saídas de `dist/` (`index.mjs`, `runtime.mjs`, `testing.mjs`, `plugin.cjs`) e confere a existência dos `.d.ts`.
  - Teste que bundla `dist/index.mjs` e `dist/runtime.mjs` com esbuild (metafile) e falha se algum input vier de `ts-morph`, `typescript`, `esbuild` ou `@swc/*`.
  - Regra `no-restricted-imports` no oxlint para `src/{validation,class,decorators,di,http,pipeline,runtime}/**`.
- **Where**: `test/entrypoints.spec.ts`, `test/boundaries.spec.ts`, `.oxlintrc.json`
- **Depends on**: F00
- **[P]**: P1
- **Done when**:
  - Os dois testes passam.
  - Um import proposital de `ts-morph` em `src/http/` faz `pnpm lint` e `test/boundaries.spec.ts` falharem (verificado e revertido).
- **Gate**: `pnpm build && pnpm vitest run test/entrypoints.spec.ts test/boundaries.spec.ts && pnpm lint`
- **Subtasks**:
  - [ ] PO — critérios de aceite
  - [ ] DEV — implementação + gate
  - [ ] QA — verificação independente
  - [ ] PO — aceite
  - [ ] Commit

## T-002: Primitivas de decorators duais
- **REQ**: REQ-005 (base de REQ-004 e REQ-007)
- **Graph node**: `src/decorators/dual.ts` (planejado)
- **What**:
  - Tipos `DualClassDecorator`, `DualMethodDecorator` e `DualClassOrMethodDecorator`.
  - Factories no-op `classDecorator()`, `methodDecorator()`, `classOrMethodDecorator()` e `parameterDecorator()`.
  - Tsconfig de teste do modo C (sem `experimentalDecorators`).
  - Teste que executa `tsc` no modo C e confirma TS1206 numa fixture com decorator de parâmetro.
- **Where**: `src/decorators/dual.ts`, `test/types/dual-decorators.test-d.ts`, `test/decorator-modes.spec.ts` (+ `test/types/mode-c/tsconfig.json` e fixture)
- **Depends on**: F00
- **[P]**: P1
- **Done when**:
  - Decorators de classe e método passam no typecheck nos modos B e C.
  - A fixture com decorator de parâmetro falha com TS1206 no modo C.
  - As factories não alteram o alvo em runtime.
- **Gate**: `pnpm vitest run --typecheck test/types/dual-decorators.test-d.ts test/decorator-modes.spec.ts`
- **Subtasks**:
  - [ ] PO — critérios de aceite
  - [ ] DEV — implementação + gate
  - [ ] QA — verificação independente
  - [ ] PO — aceite
  - [ ] Commit

## T-003: Tipos de DI (tokens e providers)
- **REQ**: REQ-031, REQ-032, REQ-033, REQ-034, REQ-035 (tipos)
- **Graph node**: `src/di/tokens.ts`, `src/di/providers.ts` (planejados)
- **What**:
  - Tokens: `Type`, `Token`, `TokenValue`, `InjectionToken<T>`.
  - Providers: `Scope` e `ClassProvider` / `ValueProvider` / `FactoryProvider` / `ExistingProvider` / `Provider`, com exclusividade mútua.
  - Módulos e lifecycle: `ModuleMetadata`, `DynamicModule`, `OnModuleInit`, `OnModuleDestroy`.
- **Where**: `src/di/tokens.ts`, `src/di/providers.ts`, `test/types/di.test-d.ts`
- **Depends on**: F00
- **[P]**: P1
- **Done when**: os testes de tipo cobrem:
  - inferência de `TokenValue` para classe e `InjectionToken`;
  - as 5 formas de provider válidas;
  - erro com dois `use*`;
  - erro sem nenhum `use*`;
  - erro com `inject` fora de `useFactory`.
- **Gate**: `pnpm vitest run --typecheck test/types/di.test-d.ts`
- **Subtasks**:
  - [x] PO — critérios de aceite (14 ACs)
  - [x] DEV — implementação + gate (22/22)
  - [x] QA — verificação independente (PASS, sem defeitos)
  - [x] PO — aceite (ACCEPTED)
  - [x] Commit

## T-004: Tipos de dados HTTP
- **REQ**: REQ-042 (`HttpStatus`), REQ-045 (tipos), REQ-053
- **Graph node**: `src/http/types.ts`, `src/http/status.ts` (planejados)
- **What**:
  - `HttpMethod` e `HttpStatus` (enum completo).
  - `HttpRequest` como interface aberta para augmentation.
  - `LambdaContext` (via `@types/aws-lambda`), `UploadedFile extends File` e `HttpResponseState`.
- **Where**: `src/http/types.ts`, `src/http/status.ts`, `test/types/http-types.test-d.ts`
- **Depends on**: F00
- **[P]**: P1
- **Done when**: os testes de tipo comprovam:
  - augmentation de `HttpRequest` com `user` via `declare module`;
  - `UploadedFile` atribuível a `File`;
  - literais de `HttpStatus` corretos.
- **Gate**: `pnpm vitest run --typecheck test/types/http-types.test-d.ts`
- **Subtasks**:
  - [ ] PO — critérios de aceite
  - [ ] DEV — implementação + gate
  - [ ] QA — verificação independente
  - [ ] PO — aceite
  - [ ] Commit

## T-005: Contrato de tipo de `AdvancedClass`
- **REQ**: REQ-020..026 (tipos)
- **Graph node**: `src/class/types.ts` (planejado)
- **What**:
  - Interface `AdvancedClass<S>` e as assinaturas de `Class`, `instance` e `isServerlessAdvancedHandlersClass`, apenas como tipos.
  - Objetivo: decorators e OpenAPI dependem do contrato sem esperar a F04.
- **Where**: `src/class/types.ts`, `test/types/advanced-class.test-d.ts`
- **Depends on**: F00
- **[P]**: P1
- **Done when**: os testes de tipo, usando classes declaradas com `declare`, comprovam:
  - `parse` retornando `InstanceType<this>` na subclasse;
  - `encode` aceitando `output | input`;
  - `instance()` tipando o campo como instância.
- **Gate**: `pnpm vitest run --typecheck test/types/advanced-class.test-d.ts`
- **Subtasks**:
  - [ ] PO — critérios de aceite
  - [ ] DEV — implementação + gate
  - [ ] QA — verificação independente
  - [ ] PO — aceite
  - [ ] Commit

## T-006: Decorators e marcadores de DI
- **REQ**: REQ-030, REQ-031, REQ-033, REQ-007 (`Inject`, `Optional`)
- **Graph node**: `src/decorators/di.ts` (planejado)
- **What**:
  - `Module`, `Global` e `Injectable`.
  - `Inject` (decorator + marcador `Inject<K, T = TokenValue<K>>`) e `Optional` (decorator + marcador).
- **Where**: `src/decorators/di.ts`, `test/types/di-decorators.test-d.ts`
- **Depends on**: T-002, T-003
- **[P]**: P2
- **Done when**:
  - O typecheck passa no modo B com decorators de parâmetro.
  - O typecheck passa no modo C com marcadores.
  - `Inject<typeof TOKEN>` infere o tipo de `InjectionToken<T>`.
  - O mesmo identificador funciona como valor e como tipo.
- **Gate**: `pnpm vitest run --typecheck test/types/di-decorators.test-d.ts`
- **Subtasks**:
  - [ ] PO — critérios de aceite
  - [ ] DEV — implementação + gate
  - [ ] QA — verificação independente
  - [ ] PO — aceite
  - [ ] Commit

## T-007: Decorators e marcadores HTTP
- **REQ**: REQ-040, REQ-041, REQ-042 (`HttpCode`), REQ-043, REQ-045, REQ-050, REQ-007
- **Graph node**: `src/decorators/http.ts` (planejado)
- **What**:
  - `HttpController`, `HttpGet/Post/Put/Patch/Delete/Head/Options`, `HttpCode` e `HttpResponseHeader`.
  - `HttpBody/HttpQuery/HttpParams/HttpHeaders/HttpCookies/HttpForm`, cada um como decorator + marcador.
  - `HttpRequest()` e `LambdaContext()`.
- **Where**: `src/decorators/http.ts`, `test/types/http-decorators.test-d.ts`
- **Depends on**: T-002, T-004, T-005
- **[P]**: P2
- **Done when**:
  - O controller de exemplo da INSIGHT §4.1 passa no typecheck no modo B (decorators) e no modo C (marcadores).
  - Decorators de parâmetro rejeitam argumentos que não sejam `AdvancedClass`.
- **Gate**: `pnpm vitest run --typecheck test/types/http-decorators.test-d.ts`
- **Subtasks**:
  - [ ] PO — critérios de aceite
  - [ ] DEV — implementação + gate
  - [ ] QA — verificação independente
  - [ ] PO — aceite
  - [ ] Commit

## T-008: `HttpResult` e exceções HTTP
- **REQ**: REQ-049, REQ-051
- **Graph node**: `src/http/result.ts`, `src/http/exceptions.ts` (planejados)
- **What**:
  - Classe `HttpResult<T>` (body, status, headers, cookies).
  - `HttpException` e as 8 subclasses com paridade NestJS: status, `getResponse()` e mensagem default igual à descrição do status.
- **Where**: `src/http/result.ts`, `src/http/exceptions.ts`, `test/http-exceptions.spec.ts`
- **Depends on**: T-004
- **[P]**: P2
- **Done when**: os testes unitários validam, para cada exceção:
  - status;
  - `getResponse()` com mensagem padrão e com mensagem customizada (string e objeto);
  - `instanceof HttpException` e `instanceof Error`;
  - além disso, `HttpResult` preserva body e opções.
- **Gate**: `pnpm vitest run test/http-exceptions.spec.ts`
- **Subtasks**:
  - [ ] PO — critérios de aceite
  - [ ] DEV — implementação + gate
  - [ ] QA — verificação independente
  - [ ] PO — aceite
  - [ ] Commit
