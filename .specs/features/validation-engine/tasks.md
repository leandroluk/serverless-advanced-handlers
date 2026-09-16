# Tasks: Motor de Validação `v` (F03)

**Pré-requisito:** F01 concluída (tipos e contrato já existem em `public-api/design.md` §Public Contracts).

**Ondas:** sequencial — T-002 depende de T-001, T-003 depende de T-002. Sem paralelismo real (funções pequenas, mesmo arquivo evolui).

**Gate comum a todas as tasks:** `pnpm check` (oxlint + tsc) além do gate específico.

**Commit:** um commit por task (Conventional Commits), com código, testes e atualização de `STATE.md`/`tasks.md` (Spec Gate).

**Fluxo por task:** subtasks PO → DEV → QA → PO → commit, cada persona em um agente próprio (ver CONVENTIONS.md).

---

## T-001: Reexport do Zod + extensões primitivas
- **REQ**: REQ-010, REQ-011, REQ-012, REQ-013, REQ-014, REQ-015
- **Graph node**: `src/validation/v.ts`, `src/validation/extensions.ts` (planejados)
- **What**:
  - `src/validation/v.ts`: `export * from 'zod'` + reexport das extensões de `extensions.ts` (exports próprios têm precedência sobre os do Zod — nomes que colidem, ex. nenhum hoje, mas documentar a regra).
  - `src/validation/extensions.ts`: `boolish`, `delimited`, `duration`, `datetime`, `timestamp`, `file`, `ByteSize`, `parseBytes` — implementação de referência em [INSIGHT.md §7.1](../../../INSIGHT.md), linhas ~690–763.
  - `v.duration()` precisa da lib `ms` — **adicionar como `dependencies` real do pacote** (é a primeira dependência de runtime do pacote; hoje só há `peerDependencies.zod`). Confirmar se a versão atual de `ms` exporta o tipo `StringValue` nativamente (`import ms, { type StringValue } from 'ms'`) antes de decidir se precisa de `@types/ms` também.
  - Exportar `v` como namespace no barrel raiz: `export * as v from '#/validation/v'` em `src/index.ts` (REQ-010).
- **Where**: `src/validation/v.ts`, `src/validation/extensions.ts`, `src/index.ts`, `test/validation-extensions.spec.ts`, `test/types/validation.test-d.ts`
- **Depends on**: nada (F01 concluída cobre o contrato)
- **[P]**: P1
- **Done when**:
  - `v.boolish()` aceita `boolean` e string truthy/falsy (default e customizado), rejeita outros valores, `encode` retorna `boolean`.
  - `v.delimited(v.string())` decodifica string única, array de strings e strings com múltiplos itens separados; `encode` faz join.
  - `v.duration()` decodifica `"5m"`/`"1d"`/número, rejeita string inválida com issue clara.
  - `v.datetime()` aceita ISO com offset e `Date`; `v.timestamp()` tem default `new Date()`. `v.encode` de ambos retorna ISO string.
  - `v.file()` sem args é idêntico a `z.file()`; `.min`/`.max`/`.mime` aplicados via opções.
  - `v.infer<>`/`v.input<>`/`v.output<>` funcionam sobre schemas construídos com `v`.
- **Gate**: `pnpm vitest run test/validation-extensions.spec.ts && pnpm vitest run --typecheck test/types/validation.test-d.ts`

## T-002: Augmentation de `.meta()` + `resolveMeta` + validação strict
- **REQ**: REQ-016, REQ-017, REQ-018
- **Graph node**: `src/validation/meta.ts` (planejado)
- **What**:
  - `declare module 'zod' { interface GlobalMeta { name?: string; examples?: $input[] } }` em `v.ts` (augmentation só *adiciona* — não é possível proibir chaves desconhecidas só com tipos, documentar isso no JSDoc).
  - `src/validation/meta.ts`: `resolveMeta(schema)` — percorre a cadeia de wrappers (`optional`, `nullable`, `default`, `prefault`, `catch`, `readonly`) de dentro para fora, `Object.assign` (mais externo vence). Referência: INSIGHT §7.4, linhas ~959–966.
  - `validateMeta(schema, path?)` — função pura que percorre um schema (recursivo em objetos/arrays/wrappers) e lança/retorna erro se algum `.meta()` tiver chave fora do allowlist (`name`, `examples`, `id`, `title`, `description`, `deprecated` — as nativas do Zod + as duas do augmentation), incluindo o caminho do campo na mensagem (ex.: `UserEntity.shape.name`). **Não é chamada em nenhum lugar ainda** — é utilitário para o compilador futuro (F06/F10) gerar `SAH400`; o teste desta task chama `validateMeta` diretamente.
- **Where**: `src/validation/meta.ts`, `src/validation/v.ts` (augmentation), `src/index.ts`, `test/validation-meta.spec.ts`, `test/types/validation.test-d.ts` (ampliar)
- **Depends on**: T-001 (precisa de `v.ts` existir)
- **[P]**: P2
- **Done when**:
  - `resolveMeta` funde metadados através de pelo menos 3 wrappers encadeados (`optional().meta(...)` sobre schema já com `.meta(...)`), com o mais externo vencendo em caso de chave repetida.
  - `resolveMeta` funciona também após `.min()`/`.max()` (herança nativa de refinement) e depois de `omit`/`pick`.
  - `validateMeta` aceita as chaves reservadas e rejeita uma chave desconhecida, com o caminho do campo na mensagem de erro.
  - `examples` é tipado pelo `$input` do schema no editor (teste de tipo: `v.number().meta({examples: ['x']})` é erro).
- **Gate**: `pnpm vitest run test/validation-meta.spec.ts && pnpm vitest run --typecheck test/types/validation.test-d.ts`

## T-003: `toOpenapiSchema`
- **REQ**: REQ-019
- **Graph node**: `src/validation/openapi.ts` (planejado)
- **What**: `toOpenapiSchema(schema, {specVersion: '3.0' | '3.1'})` — usa `z.toJSONSchema` com `io: 'input'`, mapeando `specVersion` pro `target` do Zod (`'3.0'` → `'openapi-3.0'`, `'3.1'` → `'draft-2020-12'`), `unrepresentable: 'any'`, e um `override` que (a) aplica as representações JSON Schema customizadas das extensões (`boolish` → `{type: 'boolean'}`, `duration` → `oneOf`, etc. — registry interno `WeakMap`, ver INSIGHT §7.1 `jsonSchemaOverrides`/`withJsonSchema`) e (b) renomeia propriedades do objeto pai pelo `meta.name` resolvido via `resolveMeta` (REQ-046, mas só a parte de geração — a aplicação em runtime é F07).
- **Where**: `src/validation/openapi.ts`, `src/validation/extensions.ts` (expor `withJsonSchema`/registry pro `openapi.ts` consumir), `src/index.ts`, `test/validation-openapi.spec.ts`
- **Depends on**: T-002 (usa `resolveMeta` para os aliases)
- **[P]**: P3
- **Done when**:
  - `toOpenapiSchema` de um schema com `v.boolish()` gera `{type: 'boolean'}` (não a representação bruta da union interna).
  - `toOpenapiSchema` de um schema com `v.duration()`/`v.datetime()`/`v.file()` gera a representação JSON Schema documentada em REQ-013/014/015.
  - Uma propriedade com `meta({name: 'first_name'})` aparece como `first_name` no objeto gerado (não como o nome do campo TS).
  - Funciona com `specVersion: '3.0'` e `'3.1'` (formatos diferentes onde aplicável, ex. `exclusiveMinimum`).
- **Gate**: `pnpm vitest run test/validation-openapi.spec.ts`

---

## Nota de integração futura (não é task desta feature)
Quando [class-factory](../class-factory/spec.md) (F04) existir, adicionar `export {instance} from '#/class/class-factory';` em `src/validation/v.ts` (e o tipo correspondente) — é um passo de F04, não de F03 (F03 não pode depender de F04, que ainda não existe).
