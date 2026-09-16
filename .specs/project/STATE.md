# State

Last synced commit: 6f6dcc2
**Last Updated:** 2026-09-15

## Current Work
**F00 `project-setup`, F01a `public-api-core` (8/8) e F01b `public-api-surface` (5/5) concluídas** — cada task integrada no master com commit próprio, fluxo PO/DEV/QA em agentes separados (`.claude/agents/`: `po` Haiku 4.5, `dev` Opus 5 high, `qa` Sonnet 5 medium), documentado em CONVENTIONS.md.

Além das 21 tasks, dois itens fora do fluxo de feature: quick task do usuário (35 exceções 4xx/5xx) e quick fix (`InjectionToken<T>` nominal), ambos com QA/PO/commit próprios.

Grafo do código construído (`graphify . --code-only`, 930 nós/1890 arestas/43 comunidades) e docs de codebase `STRUCTURE.md`/`INTEGRATIONS.md` criados.

**F02 `poc-risks` concluída (5/5).** Nenhum risco refutado; a maioria ganhou requisitos concretos de implementação para F06/F10 — ver `.specs/codebase/CONCERNS.md` e `.specs/features/poc-risks/findings/`. Único item em aberto: deploy real em AWS pra REQ-207 virar `PASS` (proxy local já é indicativo forte), sob autorização explícita futura.

**F03 `validation-engine` e F04 `class-factory` especificadas (Tasks).** Não precisaram de nova Specify/Design — REQ-010..026 e os contratos públicos (`Class`, `v`, `instance`) já existiam em `public-api/spec.md`/`design.md` desde a fase Complex original; só faltava o breakdown em tasks e a execução. F03: 3 tasks sequenciais (`v` core → meta/resolveMeta → toOpenapiSchema). F04: 2 tasks sequenciais (`Class()`+guard → `instance()`+integração com `v`). Nenhuma execução ainda.

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
- [x] Especificar F02 `poc-risks`
- [x] Design phase para F02 `poc-risks`
- [x] Tasks phase para F02 `poc-risks` (T-201, T-204, T-205, T-206 em P1; T-207 em P2)
- [x] Execute F02 T-201: plugin loader + `nodejs24.x` + `serverless-offline` (Serverless v3, osls 3.x/4.x) — PASS-COM-RESSALVA
- [x] Execute F02 T-204: bundle ESM com dependência CJS real — PASS-COM-RESSALVA
- [x] Execute F02 T-205: SWC no modo B (decorators legado + `emitDecoratorMetadata`) — PASS-COM-RESSALVA
- [x] Execute F02 T-206: source maps encadeados (AST transform → bundle) — PASS
- [x] Execute F02 T-207: harness de benchmark de granularidade (sem deploy real) — PASS-COM-RESSALVA
- [x] Commit F02 T-207: findings + CONCERNS.md atualizado (**F02 `poc-risks` fica 5/5 completa**)
- [ ] Deploy real em AWS pra fechar REQ-207 como PASS — requer autorização explícita do usuário + ambiente com rede liberada (esta sessão falha SSL contra endpoints AWS)
- [ ] Instalar o hook de pós-commit do graphify (`.git/hooks/post-commit`) — bloqueado pelo classificador de auto mode nesta sessão; até lá, rodar `graphify update . --no-viz --code-only` manualmente após cada commit relevante
- [x] Especificar F03 `validation-engine` (Tasks: T-001..T-003)
- [x] Especificar F04 `class-factory` (Tasks: T-001..T-002)
- [x] Execute F03 T-001: reexport do Zod + extensões primitivas (`v.boolish`, `v.delimited`, `v.duration`, `v.datetime`/`timestamp`, `v.file`) — PASS, com fix de um bug real de bundling do tsdown (ver decisão)
- [x] Execute F03 T-002: augmentation de `.meta()` + `resolveMeta` + `validateMeta` — PASS
- [x] Execute F03 T-003: `toOpenapiSchema` — PASS. **F03 `validation-engine` concluída (3/3).**
- [x] Execute F04 T-001: `Class()` + `isServerlessAdvancedHandlersClass` — PASS
- [x] Execute F04 T-002: `instance()` + integração com `v` — PASS. **F04 `class-factory` concluída (2/2).**

## Active Blockers
- none

## Recent Decisions (Last 15)
- [2026-09-15] Descoberto e corrigido bug real de bundling em `tsdown`/`rolldown-plugin-dts` (0.23.0/0.28.5): `export * as v from './v'` descarta silenciosamente um dos dois lados (reexport externo ou exports locais) quando `v.ts` combina os dois. Fix: `v` como `const` (interseção de tipos) + `namespace v` de mesmo nome (merge valor+namespace) só para `infer/input/output`; tipos auxiliares ficam fora do namespace (self-reference se entrarem). Documentado em `public-api/design.md` decisão 17 — padrão obrigatório para qualquer reexport futuro de SDK externo como namespace (candidato: F09 openapi).
- [2026-09-15] F03 `validation-engine` e F04 `class-factory` vão direto pra Tasks (sem Specify/Design novos): REQ-010..026 e os `Public Contracts` já existiam em `public-api/design.md` desde a fase Complex original. F03 = 3 tasks sequenciais (`v` core, precisa adicionar `ms` como primeira `dependencies` real do pacote → meta/resolveMeta → toOpenapiSchema). F04 = 2 tasks sequenciais (`Class()`+guard → `instance()`, que integra com `v.ts`). Restrição: `src/class/types.ts` já é API pública travada pelo snapshot de public-api-surface T-005 — nenhuma task pode alterá-lo.
- [2026-09-15] F02 `poc-risks` design + tasks concluídos: 5 tasks (T-201/204/205/206 em P1, T-207 em P2). Harness de cada experimento é descartável (scratchpad, nunca worktree git, nunca dependência nova em `package.json` da lib) — só o veredito escrito (`FINDINGS-<REQ>.md`) é commitado. Sem QA dedicado (não há código pra verificar); orquestrador substitui o PO revisando a evidência.
- [2026-09-15] F02 `poc-risks` especificada (REQ-201..207, um risco do ROADMAP por REQ). Escopo: experimentos descartáveis fora de `src/` (scratchpad/worktree, nunca commitados como código), só o veredito escrito entra no repo. REQ-207 (benchmark de cold start) para no artefato pronto — deploy real em AWS fica sob autorização explícita, sessão separada. Descoberta: AWS CLI configurado mas rede desta sessão falha SSL contra endpoints AWS.
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
## Recent Progress (Last 10)
- [2026-09-16] class-factory T-002 complete. Gate: 47/47 + 12/12 + `pnpm check`/`lint:ci`/`test` (681/681)/`build`. QA PASS (consumidor isolado via `pnpm link:` fora do monorepo), PO ACCEPTED. SPEC_DEVIATION: `instance` entra no objeto `extensions` de `v.ts` (não um `export {instance} from` solto, que não funcionaria com `v` sendo `const`). **F04 `class-factory` concluída (2/2).** Commit: `feat(class)` instance (este commit). [REQ-026]
- [2026-09-15] class-factory T-001 complete. Gate: 31/31 + 7/7 + `pnpm check`/`test` (660/660)/`build`. QA PASS (consumidor externo real, teste adversarial de ordem entre subclasses), PO ACCEPTED. SPEC_DEVIATION: `encode()` só funciona partindo do output (limitação real do `z.encode`, documentada, não corrigida — tipo travado não permite mudança). Commit: `feat(class)` factory (este commit). [REQ-020..025]
- [2026-09-15] validation-engine T-003 complete. Gate: 35/35 + `pnpm check`/`lint:ci`/`test` (622/622)/`build`. QA PASS (reproduziu isoladamente o problema do clone em `.meta()` e a colisão de nome de transporte), PO ACCEPTED. SPEC_DEVIATION: busca de override sobe `_zod.parent` (mesma técnica do `globalRegistry` nativo do Zod), preservação seletiva de anotações. **F03 `validation-engine` concluída (3/3).** Commit: `feat(validation)` openapi (este commit). [REQ-019]
- [2026-09-15] validation-engine T-002 complete. Gate: 25/25 + 27/27 + `pnpm check`/`test` (587/587)/`build`. QA PASS (consumidor externo real, `z.lazy()` recursivo sem loop, formatos de caminho extras verificados), PO ACCEPTED. `nonoptional` aceito como 7º wrapper além dos 6 da spec. Commit: `feat(validation)` meta (este commit). [REQ-016..018]
- [2026-09-15] validation-engine T-001 complete. Gate: 55/55 + 18/18 + `pnpm check`/`lint:ci`/`test` (553/553)/`build`. QA PASS (reproduziu isoladamente o bug de bundling do tsdown e validou o fix com pacote consumidor real via `tsc --strict`), PO ACCEPTED. SPEC_DEVIATION: fix real de um bug de bundling que quebrava REQ-010 na declaração publicada (ver Recent Decisions). `ms@2.1.3` é a primeira `dependencies` real do pacote. Commit: `feat(validation)` (este commit). [REQ-010..015]
- [2026-09-15] F02 `poc-risks` T-207 complete — harness de 4 variantes (A NestJS completo, B/B2 por controller, C por método), buildam e executam localmente. Proxy local: A ~115 ms/900× bundle vs. C; B2 (deps de métodos irmãos) ~42 ms/497× vs. C; B (sem deps irmãs) ~0,1 ms. Script de medição AWS real pronto, não executado (SSL falha nesta sessão contra endpoints AWS; requer autorização explícita + rede liberada). **F02 `poc-risks` concluída (5/5).** `CONCERNS.md` atualizado com critério de aceite pro F06 (bundle do método X não pode conter módulo só alcançável a partir do método Y). Commit: `docs(poc-risks)` T-207 (este commit).
- [2026-09-15] F02 `poc-risks` P1 (T-201, T-204, T-205, T-206) complete — 4 agentes DEV em paralelo, experimentos descartáveis fora do repo. REQ-201 PASS, REQ-202 PASS-COM-RESSALVA (Serverless v3 sem `nodejs24.x` no enum, patch de schema necessário no F10), REQ-203 PASS (3 motores); REQ-204 PASS-COM-RESSALVA (`ERR_REQUIRE_ESM` refutado, dois outros erros reais mitigados); REQ-205 PASS-COM-RESSALVA (SWC ≡ tsc em `design:paramtypes`); REQ-206 PASS (source maps encadeados, com requisito concreto pro slicer do F06). `CONCERNS.md` e `spec.md` atualizados com os achados. T-207 (P2) pendente. Commit: `docs(poc-risks)` findings (este commit).
- [2026-09-15] Grafo do código construído (`graphify . --code-only`, sem chave de LLM): 930 nós, 1890 arestas, 43 comunidades, sem ciclos de import. Criados `STRUCTURE.md` e `INTEGRATIONS.md`; `ARCHITECTURE.md`/`CONCERNS.md` anotados com o estado atual do código. Hook de pós-commit não instalado (bloqueado pelo auto mode).
- [2026-09-15] Quick fix: `InjectionToken<T>` tornado nominal (`declare private readonly __type: T`, antes público e opcional). Gate: typecheck 23/23 + suíte completa 480/480 + `pnpm check`/`lint:ci`/`build`. QA PASS (reproduziu rejeição TS2741/TS2322 e provou que os `@ts-expect-error` não eram mortos via revert temporário), PO ACCEPTED. Snapshot da API pública (T-005) atualizado para refletir a nova forma. Commit: `fix(di)` (este commit).
- [2026-09-15] public-api-surface T-005 complete. Gate: 4/4 + suíte completa 479/479 + `pnpm check`/`lint:ci`/`build`. QA PASS (reproduziu adversarial e determinismo independentemente), PO ACCEPTED. SPEC_DEVIATION: snapshot resolve chunks internos do tsdown e inlina 5 tipos de DI em vez de reexport vazio. **F01b `public-api-surface` concluída (5/5).** Commit: `test(public-api)` (este commit). [REQ-001]
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
- Grafo construído em 2026-09-15 com `graphify . --code-only` (930 nós, 1890 arestas, 43 comunidades) — sem chave de LLM (`ANTHROPIC_API_KEY`/`GEMINI_API_KEY`/etc.), então **não indexa `.specs/*.md`**: `graphify query "o que implementa REQ-001?"` não funciona; usar leitura direta das specs para perguntas de requisito.
- Hook de pós-commit não instalado (bloqueado pelo auto mode); atualizar manualmente com `graphify update . --no-viz --code-only` após commits que mudem `src/`.
- Relatório: [`.specs/graph/GRAPH_REPORT.md`](../graph/GRAPH_REPORT.md). Docs de codebase `STRUCTURE.md`/`INTEGRATIONS.md` criados a partir dele.
