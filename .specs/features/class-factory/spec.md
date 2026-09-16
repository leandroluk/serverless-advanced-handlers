# Spec: `Class()` Factory (F04)

## Summary
Implementa a função `Class(source)` e o companheiro `instance(Cls)`/`isServerlessAdvancedHandlersClass(value)`, definidos no contrato [public-api/spec.md](../public-api/spec.md) e tipados em `src/class/types.ts` (público-api-core T-005: `AdvancedClass`, `AnyAdvancedClass`, `ClassFactory`, `InstanceSchemaFactory`, `AdvancedClassGuard`). Esta feature implementa as **funções em runtime** cujo tipo já está travado por esses aliases — não redefine contrato.

Referência de implementação completa (protótipo validado): [INSIGHT.md §7.2](../../../INSIGHT.md) e §7.3.

Escopo: **Medium** (task breakdown explícito em [tasks.md](tasks.md), contrato e protótipo já existem).

## Requirements
Referenciados do contrato `public-api` (sem duplicar o texto):
- REQ-020 — `Class(source)` aceita `ZodObject` ou outra classe `Class()`.
- REQ-021 — Estáticos `object`, `shape`, `schema`, `omit`, `pick`, `partial` (reconstruídos sem herdar refinements), `extend`.
- REQ-022 — `parse`/`safeParse` retornam instância da subclasse chamadora (`this` genérico).
- REQ-023 — `encode` aceita instância ou objeto plano, aplica codecs, remove chaves desconhecidas.
- REQ-024 — `new Cls(data)` atribui sem validar.
- REQ-025 — `isServerlessAdvancedHandlersClass(value)` type guard via marcador `Symbol.for(...)`.
- REQ-026 — `v.instance(Cls)` (função `instance` implementada aqui, reexportada por `v.ts`).

## Affected Components (from graph)
Sem nó no grafo — `src/class/class-factory.ts` ainda não existe. Tipos já existem em `src/class/types.ts` (public-api-core T-005) e são consumidos aqui, não alterados.

## Out of Scope
- Descoberta AOT de classes `Class()` pela cadeia de herança (`ts-morph`) → F05/F06.
- Uso de `Class()` como schema de transporte HTTP (`@HttpBody(Cls)` etc.) → F07.
- `AdvancedClassGuard`/`isServerlessAdvancedHandlersClass` usado pelo compilador para distinguir `Class()` de `v.object` cru → F05/F06 (aqui só a função existe e funciona).

## Open Questions
- none — contrato, tipos e protótipo de referência já validados na fase Complex de `public-api` (design.md, decisão 15, sobre `AnyAdvancedClass`).
