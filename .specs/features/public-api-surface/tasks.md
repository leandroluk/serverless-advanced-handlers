# Tasks: API Pública — Surface (F01b)

**Pré-requisito:** [public-api-core](../public-api-core/tasks.md) concluída (referências `core/T-00N`).

**Ondas:**
- **P1:** T-001, T-002 e T-003.
- **P2:** T-004.
- **P3:** T-005.

**Gate comum a todas as tasks:** `pnpm check` (oxlint + tsc) além do gate específico.

**Commit:** um commit por task (Conventional Commits), com código, testes e atualização de `STATE.md`/`tasks.md` (Spec Gate).

**Fluxo por task:** subtasks PO → DEV → QA → PO → commit, cada persona em um agente próprio (ver CONVENTIONS.md).

---

## T-001: Contratos de pipeline e tokens globais
- **REQ**: REQ-060 (tokens), REQ-062, REQ-065
- **Graph node**: `src/pipeline/contracts.ts`, `src/pipeline/tokens.ts` (planejados)
- **What**:
  - Interfaces `ArgumentsHost`, `HttpArgumentsHost`, `ExecutionContext`, `CanActivate`, `CallHandler`, `Interceptor` e `ExceptionFilter`.
  - Tokens `APP_GUARD`, `APP_INTERCEPTOR` e `APP_FILTER`.
- **Where**: `src/pipeline/contracts.ts`, `src/pipeline/tokens.ts`, `test/types/pipeline.test-d.ts`
- **Depends on**: core/T-003, core/T-004
- **[P]**: P1
- **Done when**:
  - Um guard de roles, um interceptor de logging e um filter de exemplo (estilo NestJS) passam no typecheck.
  - `switchToRpc()` é tipado como `never`.
- **Gate**: `pnpm vitest run --typecheck test/types/pipeline.test-d.ts`
- **Subtasks**:
  - [x] PO — critérios de aceite (10 ACs; somente contratos de tipo + tokens)
  - [x] DEV — implementação + gate (17/17; retomada após limite de sessão)
  - [x] QA — verificação independente (PASS, sem defeitos)
  - [x] PO — aceite (ACCEPTED)
  - [x] Commit

## T-002: Decorators OpenAPI
- **REQ**: REQ-070
- **Graph node**: `src/decorators/openapi.ts` (planejado)
- **What**: `OpenapiTags`, `OpenapiOperation`, `OpenapiConsumes`, `OpenapiProduces`, `OpenapiResponse` e os 8 atalhos, `OpenapiSecurity` e `OpenapiExclude`.
- **Where**: `src/decorators/openapi.ts`, `test/types/openapi-decorators.test-d.ts`
- **Depends on**: core/T-002, core/T-004, core/T-005
- **[P]**: P1
- **Done when**:
  - `schema` aceita `Cls` e `[Cls]` e rejeita `v.object` cru.
  - `status` aceita `HttpStatus` e número.
  - Os atalhos não aceitam `status`.
- **Gate**: `pnpm vitest run --typecheck test/types/openapi-decorators.test-d.ts`
- **Subtasks**:
  - [ ] PO — critérios de aceite
  - [ ] DEV — implementação + gate
  - [ ] QA — verificação independente
  - [ ] PO — aceite
  - [ ] Commit

## T-003: Decorator `@LambdaConfig`
- **REQ**: REQ-080
- **Graph node**: `src/decorators/lambda.ts` (planejado)
- **What**: `LambdaConfig` com `LambdaConfigOptions` (`name`, `memorySize`, `timeout`, `reservedConcurrency`, `environment`, `iamRoleStatements`, `description`, `tags`), aplicável a controller e método.
- **Where**: `src/decorators/lambda.ts`, `test/types/lambda-config.test-d.ts`
- **Depends on**: core/T-002
- **[P]**: P1
- **Done when**: o typecheck passa em classe e método nos modos B e C, e opções com tipo inválido falham.
- **Gate**: `pnpm vitest run --typecheck test/types/lambda-config.test-d.ts`
- **Subtasks**:
  - [ ] PO — critérios de aceite
  - [ ] DEV — implementação + gate
  - [ ] QA — verificação independente
  - [ ] PO — aceite
  - [ ] Commit

## T-004: Decorators de pipeline e `Reflector`
- **REQ**: REQ-060 (decorators), REQ-063, REQ-066
- **Graph node**: `src/decorators/pipeline.ts`, `src/pipeline/reflector.ts` (planejados)
- **What**:
  - `UseGuards`, `UseInterceptors`, `UseFilters` (somente classes), `Catch` e `SetMetadata`.
  - `Reflector.createDecorator<T>()`, que retorna um decorator no-op com `key`.
  - `get`, `getAllAndOverride` e `getAllAndMerge` lendo um registro de metadados; o registro é exposto internamente em `/runtime` para o código gerado (F08).
- **Where**: `src/decorators/pipeline.ts`, `src/pipeline/reflector.ts`, `test/reflector.spec.ts`
- **Depends on**: core/T-002, T-001
- **[P]**: P2
- **Done when**:
  - Os testes unitários registram metadados manualmente e validam as três formas de leitura (incluindo override e merge entre classe e handler).
  - O typecheck rejeita instâncias em `UseGuards`.
- **Gate**: `pnpm vitest run --typecheck test/reflector.spec.ts`
- **Subtasks**:
  - [ ] PO — critérios de aceite
  - [ ] DEV — implementação + gate
  - [ ] QA — verificação independente
  - [ ] PO — aceite
  - [ ] Commit

## T-005: Snapshot e inventário da API pública
- **REQ**: REQ-001 (superfície completa), mitigação de risco do design (quebras acidentais)
- **Graph node**: `dist/*.d.mts` (gerado)
- **What**:
  - Teste que compara a lista de exports de cada entrada com o inventário dos contratos das features core e surface.
  - Snapshot dos `.d.ts` públicos gerados pelo build, para detectar mudanças não intencionais.
- **Where**: `test/public-api.spec.ts`, `test/__snapshots__/public-api.spec.ts.snap`
- **Depends on**: core/T-001 … core/T-008, T-001 … T-004
- **[P]**: P3
- **Done when**:
  - O inventário bate com o design.
  - O snapshot está gravado.
  - Remover um export faz o teste falhar (verificado e revertido).
- **Gate**: `pnpm build && pnpm vitest run test/public-api.spec.ts`
- **Subtasks**:
  - [ ] PO — critérios de aceite
  - [ ] DEV — implementação + gate
  - [ ] QA — verificação independente
  - [ ] PO — aceite
  - [ ] Commit
