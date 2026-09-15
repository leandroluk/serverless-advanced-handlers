# State

Last synced commit: none (repositório git ainda não inicializado)
**Last Updated:** 2026-09-14

## Current Work
Fase **Tasks** concluída para a superfície declarativa da API:
- F01a `public-api-core` (8 tasks);
- F01b `public-api-surface` (5 tasks);
- F00 `project-setup` (spec breve).

Fluxo de execução por task definido com as personas **PO / DEV / QA** em agentes separados (`.claude/agents/`: `po` Haiku 4.5, `dev` Opus 5 high, `qa` Sonnet 5 medium), documentado em CONVENTIONS.md, com subtasks por persona em cada task.

**F00 concluída.** **F01a `public-api-core` concluída (8/8)**, cada task integrada no master com commit próprio. **F01b `public-api-surface` concluída (5/5)**, cada task integrada no master com commit próprio.
- T-001..T-005 concluídas. **F01b `public-api-surface` concluída (5/5).**

Execução paralela via git worktrees em `scratchpad/wt/`; o orquestrador aplica os patches e consolida os barrels. Agentes `po`/`dev`/`qa` registrados desde o reinício da sessão.

## Todos
- [x] F00 `project-setup` — Execute phase
- [x] public-api-core T-001: Entradas do pacote e fronteiras de dependência — Execute phase [P1]
- [x] public-api-core T-002: Primitivas de decorators duais — Execute phase [P1]
- [x] public-api-core T-003: Tipos de DI (tokens e providers) — Execute phase [P1]
- [x] public-api-core T-004: Tipos de dados HTTP — Execute phase [P1]
- [x] public-api-core T-005: Contrato de tipo de `AdvancedClass` — Execute phase [P1]
- [x] public-api-core T-006: Decorators e marcadores de DI — Execute phase [P2]
- [x] public-api-core T-007: Decorators e marcadores HTTP — Execute phase [P2]
- [x] public-api-core T-008: `HttpResult` e exceções HTTP — Execute phase [P2]
- [x] public-api-surface T-001: Contratos de pipeline e tokens globais — Execute phase [P1]
- [x] public-api-surface T-002: Decorators OpenAPI — Execute phase [P1]
- [x] public-api-surface T-003: Decorator `@LambdaConfig` — Execute phase [P1]
- [x] public-api-surface T-004: Decorators de pipeline e `Reflector` — Execute phase [P2]
- [x] public-api-surface T-005: Snapshot e inventário da API pública — Execute phase [P3]
- [x] Quick fix: tornar `InjectionToken<T>` nominal (ex.: campo privado) — hoje qualquer `{ description: string }` satisfaz `Token` (achado do DEV na public-api-core T-006)
- [x] Quick task: exceções HTTP 4xx/5xx restantes (autoria do usuário) — QA → PO → commit `feat(http)`
- [ ] Especificar F02 `poc-risks`
- [ ] Construir o grafo quando houver código (`graph-spec-design . --code-only`) ou configurar chave de LLM para indexar as specs
- [ ] Criar docs de codebase STRUCTURE e INTEGRATIONS quando houver código

## Active Blockers
- none

## Recent Decisions (Last 15)
- [2026-09-15] REQ-051 ampliada, a pedido do usuário (que implementou): uma subclasse de `HttpException` para cada status 4xx/5xx do `HttpStatus` (35 no total), com paridade NestJS. Tratada como quick task com QA e commit próprio.
- [2026-09-14] `AnyAdvancedClass` é a restrição para "qualquer classe `Class()`" (decorators de transporte, `instance()`, `ResponseSchema`), porque `AdvancedClass` puro rejeita classes concretas por contravariância do construtor (design decisão 15).
- [2026-09-14] Execução com personas PO/DEV/QA em agentes separados: `po` Haiku 4.5 (somente leitura), `dev` Opus 5 high, `qa` Sonnet 5 medium (verifica e reporta, sem editar; temporários em `.qa/`); até 3 ciclos DEV↔QA antes de escalar ao usuário; orquestrador faz os commits.
- [2026-09-14] Commits autorizados pelo usuário: um commit por task (Conventional Commits) com código, testes e specs/STATE (Spec Gate).
- [2026-09-14] Safety valve: superfície declarativa da API dividida em F01a `public-api-core` e F01b `public-api-surface`; comportamento segue nas features F03–F12.
- [2026-09-14] Design `public-api` concluído:
  - Decorators e marcadores são no-op em runtime (semântica só no compilador).
  - Decorator de parâmetro e marcador de tipo compartilham o identificador.
  - `@Catch` adicionado (REQ-066).
  - Config do plugin em Zod → tipo, defaults e JSON Schema draft-07.
  - Runtime modular; erros `SAH` por faixa; pacote instalável como devDependency.
- [2026-09-14] Serverless Framework v3 original também suportado, além de osls 3.x/4.x (mesma API de plugins; osls recomendado; matriz de testes com os três).
- [2026-09-14] Plugin compatível com osls 4: schema via `configSchemaHandler`, sem `provider.request()`/SDK v2/`variableResolvers`/`package.include`, opções de CLI tipadas.
- [2026-09-14] Alvo de deploy: osls 3.x/4.x (fork open-source do Serverless v3); Serverless Framework v4 upstream fora do escopo (exige login). `build.esbuild: false` removido.
- [2026-09-14] Modos de decorators A/B/C detectados pelo tsconfig; **B (legado + emitDecoratorMetadata) é o padrão**; SWC + `reflect-metadata` só onde necessário; marcadores de tipo para parâmetros (obrigatórios no C).
- [2026-09-14] Testes: `overrideProvider({ provide, useValue | useClass | useFactory, inject? })` no formato de provider do `@Module`, variádico, com estratégias mutuamente excludentes (tipagem e runtime); mesmo formato em `overrideGuard/Interceptor/Filter`.
- [2026-09-14] Ferramental: Vitest, oxlint + oxfmt, Conventional Commits (commitlint), lefthook e pnpm, espelhando o monorepo Metha (hooks sem turbo por ser pacote único).
- [2026-09-14] Q4: guards/interceptors/filters usam `ExecutionContext` com paridade NestJS + `Reflector` alimentado por metadados gerados no build.
- [2026-09-14] Q3: corpo de erro default compatível com NestJS; RFC 9457 via `errors.format: problem-json`.
- [2026-09-14] Q2: rota com corpo sem schema `Class()` gera erro de build por padrão; `responses.missingSchema: warn` rebaixa para warning.

## Recent Progress (Last 10)
- [2026-09-15] Quick fix: `InjectionToken<T>` tornado nominal (`declare private readonly __type: T`, antes público e opcional). Gate: typecheck 23/23 + suíte completa 480/480 + `pnpm check`/`lint:ci`/`build`. QA PASS (reproduziu rejeição TS2741/TS2322 e provou que os `@ts-expect-error` não eram mortos via revert temporário), PO ACCEPTED. Snapshot da API pública (T-005) atualizado para refletir a nova forma. Commit: `fix(di)` (este commit).
- [2026-09-15] public-api-surface T-005 complete. Gate: 4/4 + suíte completa 479/479 + `pnpm check`/`lint:ci`/`build`. QA PASS (reproduziu adversarial e determinismo independentemente), PO ACCEPTED. SPEC_DEVIATION: snapshot resolve chunks internos do tsdown e inlina 5 tipos de DI em vez de reexport vazio. **F01b `public-api-surface` concluída (5/5).** Commit: `test(public-api)` (este commit). [REQ-001]
- [2026-09-15] public-api-surface T-004 complete. Gate: spec 23/23 + typecheck 15/15 + `pnpm check`/`lint:ci`/`test` (475/475)/`build`. QA PASS, PO ACCEPTED. SPEC_DEVIATION: none. `/runtime` passa a exportar `defineReflectMetadata`. Commit: `feat(decorators)` pipeline/Reflector (este commit). [REQ-060, REQ-063, REQ-066]
- [2026-09-15] public-api-surface T-003 complete. Gate: typecheck 6/6 + spec de modos 7/7 + `pnpm check`/`lint:ci`/`test` (437/437)/`build`. QA PASS (D-1 corrigido), PO ACCEPTED. SPEC_DEVIATION: none. Commit: `feat(decorators)` LambdaConfig (este commit). [REQ-080]
- [2026-09-15] public-api-surface T-002 complete. Gate: typecheck 14/14 + spec de runtime 37/37 + `pnpm check`/`lint:ci`/`test` (424/424)/`build`. QA PASS, PO ACCEPTED. SPEC_DEVIATION: none. Commit: `feat(decorators)` OpenAPI (este commit). [REQ-070]
- [2026-09-15] Quick task (usuário) — exceções HTTP 4xx/5xx restantes complete. Gate: 258/258 + `pnpm test` 373/373. QA PASS, PO ACCEPTED. REQ-051 ampliada (35 subclasses). Integração feita com `git stash --keep-index` para separar do commit da T-007. Commit: `feat(http)` exceptions (este commit). [REQ-051]
- [2026-09-15] public-api-core T-007 complete. Gate: 18/18 pass + `pnpm check`. QA PASS (sem defeitos), PO ACCEPTED. SPEC_DEVIATION: none. **F01a `public-api-core` concluída (8/8).** Commit: `feat(decorators)` HTTP (este commit). [REQ-007, REQ-040..043, REQ-045, REQ-050]
- [2026-09-15] public-api-core T-001 complete. Gate: 7/7 pass + `pnpm check`/`lint:ci`/`test`. QA PASS (D-1 corrigido), PO ACCEPTED. SPEC_DEVIATION: `deps.neverBundle` no `tsdown.config.ts` (evita falso negativo do teste de fronteira). Commit: `test(boundaries)` (este commit). [REQ-001, REQ-002]
- [2026-09-14] public-api-core T-008 complete. Gate: 69/69 pass + `pnpm check`. QA PASS (sem defeitos), PO ACCEPTED. SPEC_DEVIATION: none. Commit: `feat(http)` exceptions (este commit). [REQ-049, REQ-051]
- [2026-09-14] public-api-core T-002 complete. Gate: 10/10 pass + `pnpm check`. QA PASS (sem defeitos), PO ACCEPTED. SPEC_DEVIATION: forma TC39 de `DualMethodDecorator` genérica em `This` (design decisão 16). Commit: `feat(decorators)` (este commit). [REQ-004, REQ-005, REQ-007]
## Lessons Learned (Last 5)
- [2026-09-14] Agentes definidos em `.claude/agents/` durante a sessão só ficam disponíveis após reiniciar; até lá, use `general-purpose` com `model` e as instruções do arquivo (o esforço não pode ser fixado). QA de tipos precisa de temporários dentro do escopo do tsconfig (`test/__qa__/`). pnpm 12 exige `allowBuilds` para pacotes com build script (lefthook, esbuild); worktrees instaladas com `--ignore-scripts` escondem isso, então é preciso validar `pnpm install` no master a cada integração.
- [2026-09-14] esbuild ignora `emitDecoratorMetadata` (não emite `design:paramtypes`); bibliotecas dependentes de metadata exigem transform com SWC ou tsc antes do bundle.
- [2026-09-14] Uma função de decorator com assinatura dupla (`(target, key, descriptor)` & `(value, context)`) passa no type-check e roda nos modos legado e TC39; TC39 não aceita decorators de parâmetro (TS1206).
- [2026-09-14] osls 4 removeu `provider.request()`, AWS SDK v2, `variableResolvers` e `package.include/exclude`, e falha com configuração inválida por padrão.
- [2026-09-14] Exclusividade mútua em objetos TS: union discriminada com `?: never` nas chaves proibidas; em funções variádicas, tuple mapeado preserva a correlação token ↔ valor por argumento.
## Deferred Ideas
- Adaptadores de protocolo: SQS, EventBridge, AMQP (Amazon MQ), GraphQL (AppSync), contratos gRPC.
- `verifyMagicBytes` em `v.file()`.
- `DualAccessorDecorator` para getters/setters (decorators de método não se aplicam a accessors — observação do QA na public-api-core T-002).
- Helper de cliente `uploadForm()` para o fluxo S3.

## Degraded Mode
- graph-spec-design instalado, mas o grafo não foi gerado: não há código ainda e a indexação de `.md` exige chave de LLM (`ANTHROPIC_API_KEY` ou similar).
- Contexto carregado por leitura direta: STATE.md + spec da feature ativa por sessão.
