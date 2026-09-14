# Spec: API Pública — Surface (F01b)

## Summary
Segunda metade da **superfície declarativa** do contrato definido em [public-api/spec.md](../public-api/spec.md) e
[public-api/design.md](../public-api/design.md). Cobre:
- contratos e tokens de pipeline;
- decorators OpenAPI e `@LambdaConfig`;
- decorators de pipeline e `Reflector`;
- snapshot e inventário da API pública.

Depende da [public-api-core](../public-api-core/spec.md). Escopo: **Large** (tasks explícitas em [tasks.md](tasks.md)).

## Requirements
Referenciados do contrato `public-api`:
- REQ-060, REQ-062, REQ-063, REQ-065, REQ-066 — pipeline (contratos, tokens, decorators e `Reflector`).
- REQ-070 — decorators OpenAPI.
- REQ-080 — `@LambdaConfig`.
- REQ-001 (superfície completa) — snapshot e inventário da API pública.

## Affected Components (from graph)
Greenfield — grafo indisponível (modo degradado). Componentes planejados:
- `src/pipeline/contracts.ts`, `src/pipeline/tokens.ts`, `src/pipeline/reflector.ts`
- `src/decorators/pipeline.ts`, `src/decorators/openapi.ts`, `src/decorators/lambda.ts`
- `test/public-api.spec.ts` (snapshot)

## Out of Scope
- Execução do pipeline, geração do mapa de metadados e OpenAPI em build → F08 e F09.
- Planejamento de funções e aplicação de `@LambdaConfig` → F10.

## Open Questions
- none
