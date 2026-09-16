# Spec: Motor de Validação `v` (F03)

## Summary
Primeira feature de **comportamento** real do pacote (F00/F01a/F01b entregaram só tipos e decorators no-op). Implementa o namespace `v` definido no contrato [public-api/spec.md](../public-api/spec.md) e [public-api/design.md](../public-api/design.md) §Public Contracts — F03: reexport do Zod 4 com extensões bidirecionais (`z.codec`, nunca `preprocess`), augmentation tipada de `.meta()`, resolução de metadados através de wrappers (`resolveMeta`) e geração de JSON Schema no formato de transporte (`toOpenapiSchema`).

Referência de implementação completa (protótipo validado): [INSIGHT.md §7.1](../../../INSIGHT.md) e §7.4.

Escopo: **Medium** (task breakdown explícito em [tasks.md](tasks.md), sem ambiguidade de design — contrato e protótipo já existem).

## Requirements
Referenciados do contrato `public-api` (sem duplicar o texto):
- REQ-010 — `v` reexporta todo o Zod 4; exports próprios têm precedência.
- REQ-011 — `v.boolish({truthy?, falsy?})`.
- REQ-012 — `v.delimited(element, {separator?})`.
- REQ-013 — `v.duration()`.
- REQ-014 — `v.datetime()` / `v.timestamp()`.
- REQ-015 — `v.file({minSize?, maxSize?, mimetypes?})`.
- REQ-016 — Augmentation tipada de `GlobalMeta` (`name`, `examples`); `id` reservado.
- REQ-017 — Validação strict de metadados (chave desconhecida gera erro com o caminho do campo). Aqui entregue como **função pura reutilizável** (`validateMeta`); a integração como erro de build (`SAH400`) é do compilador (F06/F10).
- REQ-018 — `resolveMeta(schema)`.
- REQ-019 — `toOpenapiSchema(schema, {specVersion})`.

## Affected Components (from graph)
Sem nó no grafo (`--code-only`, ver STRUCTURE.md) — `src/validation/*` ainda não existe. Componentes planejados (design.md §New Components): `src/validation/v.ts`, `src/validation/extensions.ts`, `src/validation/meta.ts`, `src/validation/openapi.ts`.

## Out of Scope
- `Class()`/`instance()`/guard → [class-factory](../class-factory/spec.md) (F04). `v.ts` reexporta `instance` de `class/class-factory.ts` só depois que F04 existir (ver tasks.md, nota de integração).
- Integração como erro de build (`SAH400`, Schema Extractor) e chamada real de `resolveMeta`/`toOpenapiSchema` durante compilação → F06/F09/F10.
- `decodeTransport`/`encodeTransport` (aplicação de aliases numa requisição HTTP real) → F07 `http-runtime` (INSIGHT §7.4, "Como isso é executado em cada camada", item 1).

## Open Questions
- none — contrato, tipos e protótipo de referência já validados na fase Complex de `public-api`.
