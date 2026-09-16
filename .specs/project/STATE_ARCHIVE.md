# State Archive

<!-- Auto-generated. Never edit manually. Read with: "show state history" -->

## Archive — 2026-09-14 (compaction 1)

### Decisions
- [2026-09-14] Stack atualizada: Serverless v4 (compatível osls), `nodejs24.x`, API do esbuild para handlers, tsdown para a lib.

---

## Archive — 2026-09-14 (compaction 2)

### Decisions
- [2026-09-14] `v` sem Proxy (`export * from 'zod'` + extensões); extensões como codecs; `v.file` = `z.file` + atalhos.
- [2026-09-14] `.meta()`: `name` = nome de transporte; `id` reservado (nome da classe); chaves desconhecidas barradas no build; merge via `resolveMeta`.
- [2026-09-14] `Class()`: `parse` retorna instância; guard `isServerlessAdvancedHandlersClass()`; `omit/pick/partial` reconstruídos sem refinements; alerta de `declare` em campos.

---

## Archive — 2026-09-14 (compaction 3)

### Decisions
- [2026-09-14] DI restrita a um subconjunto estaticamente analisável; fora dele, erro de build (INSIGHT §6.2).
- [2026-09-14] Fatiamento por método com ts-morph (transitivo em providers e DTOs), com regras de fallback.

---

## Archive — 2026-09-14 (compaction 4)

### Decisions
- [2026-09-14] OpenAPI 3.0 e 3.1 via Schema Extractor em build (processo filho carrega DTOs e chama `z.toJSONSchema`).
- [2026-09-14] Uploads acima de `inlineLimit` usam fluxo S3 transparente (presigned POST + `uploadToken`); controller não muda.

---

## Archive — 2026-09-14 (compaction 5)

### Decisions
- [2026-09-14] Mantidas as adições propostas: guards/interceptors/filters, tabela de riscos, Fase 0, `granularity`, plugin por subpath (`build.esbuild: false` depois removido com a troca para osls).

---

## Archive — 2026-09-14 (compaction 6)

### Lessons Learned
- [2026-09-14] esbuild não remove métodos de classe não usados — só o fatiamento no AST garante bundles mínimos.

---

## Archive — 2026-09-14 (compaction 7)

### Progress
- [2026-09-14] INSIGHT.md revisado em duas iterações; protótipos validaram `v`, `Class()`, `.meta()` tipado, multipart nativo, `S3UploadedFile` e fatiamento com ts-morph.
- [2026-09-14] Projeto inicializado: `.specs/` (PROJECT, ROADMAP, STATE, codebase/STACK, ARCHITECTURE, CONCERNS, CONVENTIONS, TESTING).

---

## Archive — 2026-09-14 (compaction 8)

### Progress
- [2026-09-14] F01 `public-api`: spec.md criado (Specify).
- [2026-09-14] F01 `public-api`: discuss mode concluído (Q1–Q4 em context.md); `v.instance` e tipagem de `encode` validados em protótipo.
- [2026-09-14] F01 `public-api`: spec aprovada; REQ-101/104 ajustadas (overrides em objeto) e tipagem mutuamente excludente validada em protótipo.
- [2026-09-14] F01 `public-api`: modos de decorators (REQ-004..008) e alvo osls (REQ-003, 090, 094) incorporados; INSIGHT §6.6 criado; protótipo validou decorators duais, TS1206 no TC39, marcadores de tipo e ausência de metadata no esbuild.
- [2026-09-14] F01 `public-api`: design.md criado; spec refinada (REQ-005, REQ-066, REQ-070) e Serverless v3 incluído (REQ-003, REQ-094); JSON Schema draft-07 do Zod validado para a config do plugin.
- [2026-09-14] Tasks criadas: F01a `public-api-core` (8) e F01b `public-api-surface` (5); F00 `project-setup` especificada (Medium). pnpm 12.4.1 detectado e fixado na spec.
- [2026-09-14] Fluxo PO/DEV/QA configurado: agentes `po`, `dev` e `qa` criados em `.claude/agents/`, CONVENTIONS.md atualizado e subtasks por persona adicionadas às tasks de F00, F01a e F01b.
- [2026-09-14] F00 `project-setup` complete. Gate: 5/5 pass (install, check, lint:ci, test, build) + commit-msg hook validado. QA PASS (16/16 AC), PO ACCEPTED. SPEC_DEVIATION: 3 aceitas (normalização oxfmt; `pnpm-workspace.yaml` e `.prettierignore` extras; aceite do commit-msg via hook direto). Commit: `chore: setup project` (commit inicial).

### Decisions
- [2026-09-14] v1 somente HTTP; multi-protocolo é visão futura com notas de viabilidade.
- [2026-09-14] Q1: classes aninhadas tipadas como instância via `v.instance(Cls)`; `Cls.encode` tipado como `output | input` para aceitar linhas cruas.
- [2026-09-14] Q2: rota com corpo sem schema `Class()` gera erro de build por padrão; `responses.missingSchema: warn` rebaixa para warning.
- [2026-09-14] Q3: corpo de erro default compatível com NestJS; RFC 9457 via `errors.format: problem-json`.
- [2026-09-14] Q4: guards/interceptors/filters usam `ExecutionContext` com paridade NestJS + `Reflector` alimentado por metadados gerados no build.
- [2026-09-14] Ferramental: Vitest, oxlint + oxfmt, Conventional Commits (commitlint), lefthook e pnpm, espelhando o monorepo Metha (hooks sem turbo por ser pacote único).

---

## Archive — 2026-09-15 (compaction 9)

### Progress
- [2026-09-14] public-api-core T-003 complete. Gate: 22/22 pass + `pnpm check`. QA PASS (14/14 AC, sem defeitos), PO ACCEPTED. SPEC_DEVIATION: none. Commit: `feat(di)`. [REQ-031..035]
- [2026-09-14] public-api-core T-004 complete. Gate: 8/8 pass + `pnpm check`. QA PASS (11/11 AC; augmentation validada também pelo pacote gerado), PO ACCEPTED. SPEC_DEVIATION: `HttpStatus` = paridade NestJS (56 membros) + 511, sem códigos IANA ausentes no NestJS. Commit: `feat(http)`. [REQ-042, REQ-045, REQ-053]
- [2026-09-15] public-api-surface T-001 complete. Gate: 17/17 pass + `pnpm check`. QA PASS (sem defeitos), PO ACCEPTED. SPEC_DEVIATION: none. Commit: `feat(pipeline)`. [REQ-060, REQ-062, REQ-065]
- [2026-09-14] public-api-core T-006 complete. Gate: 23/23 pass + `pnpm check`. QA PASS (sem defeitos), PO ACCEPTED. SPEC_DEVIATION: none. Commit: `feat(decorators)` DI. [REQ-004, REQ-005, REQ-007, REQ-030, REQ-031, REQ-033]
- [2026-09-14] public-api-core T-005 complete. Gate: 10/10 pass + `pnpm check`. QA PASS (D-1 ratificado, D-2 corrigido pelo DEV), PO ACCEPTED. SPEC_DEVIATION: `AnyAdvancedClass` (design decisão 15). Commit: `feat(class)`. [REQ-020..026]
- [2026-09-14] public-api-core T-002 complete. Gate: 10/10 pass + `pnpm check`. QA PASS (sem defeitos), PO ACCEPTED. SPEC_DEVIATION: forma TC39 de `DualMethodDecorator` genérica em `This` (design decisão 16). Commit: `feat(decorators)`. [REQ-004, REQ-005, REQ-007]
- [2026-09-14] public-api-core T-008 complete. Gate: 69/69 pass + `pnpm check`. QA PASS (sem defeitos), PO ACCEPTED. SPEC_DEVIATION: none. Commit: `feat(http)` exceptions. [REQ-049, REQ-051]
- [2026-09-15] public-api-core T-001 complete. Gate: 7/7 pass + `pnpm check`/`lint:ci`/`test`. QA PASS (D-1 corrigido), PO ACCEPTED. SPEC_DEVIATION: `deps.neverBundle` no `tsdown.config.ts` (evita falso negativo do teste de fronteira). Commit: `test(boundaries)`. [REQ-001, REQ-002]
- [2026-09-15] public-api-core T-007 complete. Gate: 18/18 pass + `pnpm check`. QA PASS (sem defeitos), PO ACCEPTED. SPEC_DEVIATION: none. **F01a `public-api-core` concluída (8/8).** Commit: `feat(decorators)` HTTP. [REQ-007, REQ-040..043, REQ-045, REQ-050]

---
