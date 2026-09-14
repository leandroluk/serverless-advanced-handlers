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
