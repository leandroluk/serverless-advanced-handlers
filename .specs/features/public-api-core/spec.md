# Spec: API Pública — Core (F01a)

## Summary
Primeira metade da **superfície declarativa** do contrato definido em [public-api/spec.md](../public-api/spec.md) e
[public-api/design.md](../public-api/design.md). Cobre:
- entradas do pacote e fronteiras de dependência;
- primitivas de decorators duais;
- tipos de DI e de HTTP e o contrato de tipo de `AdvancedClass`;
- decorators e marcadores de DI e HTTP;
- `HttpResult` e exceções.

Tudo aqui é tipo, declaração ou decorator no-op (design, decisão 1); o comportamento é entregue pelas features F03–F12.
Escopo: **Large** (tasks explícitas em [tasks.md](tasks.md)).

## Requirements
Referenciados do contrato `public-api` (sem duplicar o texto):
- REQ-001, REQ-002 — entradas do pacote e fronteiras de dependência.
- REQ-005, REQ-007 (marcadores de DI e HTTP) — decorators duais e marcadores de tipo.
- REQ-020..026 (somente tipos) — contrato de `AdvancedClass`.
- REQ-030, REQ-031, REQ-033 (decorators) e REQ-031..035 (tipos) — injeção de dependência.
- REQ-040..045, REQ-049..051, REQ-053 — HTTP.

## Affected Components (from graph)
Greenfield — grafo indisponível (modo degradado). Componentes planejados:
- `src/decorators/dual.ts`, `src/decorators/di.ts`, `src/decorators/http.ts`
- `src/di/tokens.ts`, `src/di/providers.ts`
- `src/http/types.ts`, `src/http/status.ts`, `src/http/result.ts`, `src/http/exceptions.ts`
- `src/class/types.ts`

## Out of Scope
- Contratos e decorators de pipeline, OpenAPI, `@LambdaConfig` e snapshot da API → [public-api-surface](../public-api-surface/spec.md).
- Qualquer comportamento (validação, DI AOT, fatiamento, runtime, plugin, testes, uploads) → F03–F12.

## Open Questions
- none
