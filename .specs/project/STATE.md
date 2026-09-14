# State

Last synced commit: none (repositório git ainda não inicializado)
**Last Updated:** 2026-09-14

## Current Work
Fase **Tasks** concluída para a superfície declarativa da API:
- F01a `public-api-core` (8 tasks);
- F01b `public-api-surface` (5 tasks);
- F00 `project-setup` (spec breve).

Fluxo de execução por task definido com as personas **PO / DEV / QA** em agentes separados (`.claude/agents/`: `po` Haiku 4.5, `dev` Opus 5 high, `qa` Sonnet 5 medium), documentado em CONVENTIONS.md, com subtasks por persona em cada task.

**F00 concluída** (commit inicial). Próximo passo: **Execute** da F01a `public-api-core`, onda P1 (T-001..T-005), com o fluxo PO → DEV → QA → PO → commit. Enquanto os agentes customizados não forem registrados (reinício da sessão), usa-se `general-purpose` com o modelo de cada persona.

## Todos
- [x] F00 `project-setup` — Execute phase
- [ ] public-api-core T-001: Entradas do pacote e fronteiras de dependência — Execute phase [P1]
- [ ] public-api-core T-002: Primitivas de decorators duais — Execute phase [P1]
- [x] public-api-core T-003: Tipos de DI (tokens e providers) — Execute phase [P1]
- [x] public-api-core T-004: Tipos de dados HTTP — Execute phase [P1]
- [ ] public-api-core T-005: Contrato de tipo de `AdvancedClass` — Execute phase [P1]
- [ ] public-api-core T-006: Decorators e marcadores de DI — Execute phase [P2]
- [ ] public-api-core T-007: Decorators e marcadores HTTP — Execute phase [P2]
- [ ] public-api-core T-008: `HttpResult` e exceções HTTP — Execute phase [P2]
- [ ] public-api-surface T-001: Contratos de pipeline e tokens globais — Execute phase [P1]
- [ ] public-api-surface T-002: Decorators OpenAPI — Execute phase [P1]
- [ ] public-api-surface T-003: Decorator `@LambdaConfig` — Execute phase [P1]
- [ ] public-api-surface T-004: Decorators de pipeline e `Reflector` — Execute phase [P2]
- [ ] public-api-surface T-005: Snapshot e inventário da API pública — Execute phase [P3]
- [ ] Especificar F02 `poc-risks`
- [ ] Construir o grafo quando houver código (`graph-spec-design . --code-only`) ou configurar chave de LLM para indexar as specs
- [ ] Criar docs de codebase STRUCTURE e INTEGRATIONS quando houver código

## Active Blockers
- none

## Recent Decisions (Last 15)
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
- [2026-09-14] Q1: classes aninhadas tipadas como instância via `v.instance(Cls)`; `Cls.encode` tipado como `output | input` para aceitar linhas cruas.
- [2026-09-14] v1 somente HTTP; multi-protocolo é visão futura com notas de viabilidade.

## Recent Progress (Last 10)
- [2026-09-14] public-api-core T-004 complete. Gate: 8/8 pass + `pnpm check`. QA PASS (11/11 AC; augmentation validada também pelo pacote gerado), PO ACCEPTED. SPEC_DEVIATION: `HttpStatus` = paridade NestJS (56 membros) + 511, sem códigos IANA ausentes no NestJS. Commit: `feat(http)` (este commit). [REQ-042, REQ-045, REQ-053]
- [2026-09-14] public-api-core T-003 complete. Gate: 22/22 pass + `pnpm check`. QA PASS (14/14 AC, sem defeitos), PO ACCEPTED. SPEC_DEVIATION: none. Commit: `feat(di)` (este commit). [REQ-031..035]
- [2026-09-14] F00 `project-setup` complete. Gate: 5/5 pass (install, check, lint:ci, test, build) + commit-msg hook validado. QA PASS (16/16 AC), PO ACCEPTED. SPEC_DEVIATION: 3 aceitas (normalização oxfmt; `pnpm-workspace.yaml` e `.prettierignore` extras; aceite do commit-msg via hook direto) — detalhes em project-setup/spec.md. Commit: `chore: setup project` (commit inicial).
- [2026-09-14] Fluxo PO/DEV/QA configurado: agentes `po`, `dev` e `qa` criados em `.claude/agents/`, CONVENTIONS.md atualizado e subtasks por persona adicionadas às tasks de F00, F01a e F01b.
- [2026-09-14] Tasks criadas: F01a `public-api-core` (8) e F01b `public-api-surface` (5); F00 `project-setup` especificada (Medium). pnpm 12.4.1 detectado e fixado na spec.
- [2026-09-14] F01 `public-api`: design.md criado; spec refinada (REQ-005, REQ-066, REQ-070) e Serverless v3 incluído (REQ-003, REQ-094); JSON Schema draft-07 do Zod validado para a config do plugin.
- [2026-09-14] F01 `public-api`: modos de decorators (REQ-004..008) e alvo osls (REQ-003, 090, 094) incorporados; INSIGHT §6.6 criado; protótipo validou decorators duais, TS1206 no TC39, marcadores de tipo e ausência de metadata no esbuild.
- [2026-09-14] F01 `public-api`: spec aprovada; REQ-101/104 ajustadas (overrides em objeto) e tipagem mutuamente excludente validada em protótipo.
- [2026-09-14] F01 `public-api`: discuss mode concluído (Q1–Q4 em context.md); `v.instance` e tipagem de `encode` validados em protótipo.
- [2026-09-14] F01 `public-api`: spec.md criado (Specify).## Lessons Learned (Last 5)
- [2026-09-14] Agentes definidos em `.claude/agents/` durante a sessão só ficam disponíveis após reiniciar; até lá, use `general-purpose` com `model` e as instruções do arquivo (o esforço não pode ser fixado). QA de tipos precisa de temporários dentro do escopo do tsconfig (`test/__qa__/`). pnpm 12 exige `allowBuilds` para o lefthook.
- [2026-09-14] esbuild ignora `emitDecoratorMetadata` (não emite `design:paramtypes`); bibliotecas dependentes de metadata exigem transform com SWC ou tsc antes do bundle.
- [2026-09-14] Uma função de decorator com assinatura dupla (`(target, key, descriptor)` & `(value, context)`) passa no type-check e roda nos modos legado e TC39; TC39 não aceita decorators de parâmetro (TS1206).
- [2026-09-14] osls 4 removeu `provider.request()`, AWS SDK v2, `variableResolvers` e `package.include/exclude`, e falha com configuração inválida por padrão.
- [2026-09-14] Exclusividade mútua em objetos TS: union discriminada com `?: never` nas chaves proibidas; em funções variádicas, tuple mapeado preserva a correlação token ↔ valor por argumento.
## Deferred Ideas
- Adaptadores de protocolo: SQS, EventBridge, AMQP (Amazon MQ), GraphQL (AppSync), contratos gRPC.
- `verifyMagicBytes` em `v.file()`.
- Helper de cliente `uploadForm()` para o fluxo S3.

## Degraded Mode
- graph-spec-design instalado, mas o grafo não foi gerado: não há código ainda e a indexação de `.md` exige chave de LLM (`ANTHROPIC_API_KEY` ou similar).
- Contexto carregado por leitura direta: STATE.md + spec da feature ativa por sessão.
