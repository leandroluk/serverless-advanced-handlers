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

---

## Archive — 2026-09-15 (compaction 9)

### Progress
- [2026-09-14] public-api-core T-003 complete. Gate: 22/22 pass + `pnpm check`. QA PASS (14/14 AC, sem defeitos), PO ACCEPTED. SPEC_DEVIATION: none. Commit: `feat(di)`. [REQ-031..035]

---
