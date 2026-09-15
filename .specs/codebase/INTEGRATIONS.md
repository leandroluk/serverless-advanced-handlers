# Integrations

Estado real do código (F00, F01a `public-api-core`, F01b `public-api-surface` — todas concluídas). Nenhuma integração externa está implementada em runtime ainda: as features entregues até aqui são a **superfície declarativa pura** (decorators, tipos, contratos), sem qualquer lógica de compilador, empacotamento ou I/O. Isto é esperado pelo roadmap (ver [PROJECT.md](../project/PROJECT.md) / [ROADMAP.md](../project/ROADMAP.md)) — as integrações abaixo são **planejadas para fases futuras**, não presentes hoje.

## Hoje (F00/F01a/F01b)

| Dependência        | Onde                                  | Papel                                                                 |
| :------------------ | :-------------------------------------- | :----------------------------------------------------------------------- |
| `zod` (`^4`)        | `peerDependencies` em `package.json`     | Declarada mas **ainda não usada** em `src/` — a camada `v`/`Class()` (validação/schema, INSIGHT §7) é feature futura |
| TypeScript (decorators legado/TC39) | `src/decorators/*.ts`      | Decorators duais (`DualClassDecorator` etc.) — no-op em runtime, semântica só para o compilador futuro |
| Vitest 5             | `test/**`                              | Testes de runtime + typecheck (`*.test-d.ts`); projeto `dist` roda `pnpm build` via `globalSetup` |
| tsdown               | build da lib (`tsdown.config.ts`)        | Gera `dist/*.mjs`/`*.d.mts` para as 4 entradas do pacote                    |
| oxlint + oxfmt       | `pnpm check`/`lint:ci`                   | Lint e formatação                                                          |
| lefthook             | `.git/hooks` (instalado via `pnpm prepare`) | `pre-commit` (check/format/lint) e `commit-msg` (commitlint)               |
| graphify (`graph-spec-design`) | `.specs/graph/` (gerado nesta sessão, `--code-only`) | Índice de grafo do código para navegação (não indexa `.specs/*.md` — sem chave de LLM) |

## Planejadas (fases futuras, ver ROADMAP.md)

| Integração                          | Fase alvo (aprox.)            | Nota                                                                 |
| :------------------------------------ | :------------------------------- | :----------------------------------------------------------------------- |
| Serverless Framework v3 / osls 3.x-4.x | plugin (`compiler`/`bundler`)   | Plugin lê `serverless.yml`, registra functions no lifecycle `initialize`, empacota em `before:package:createDeploymentArtifacts`. **Serverless v4 upstream fora do escopo** (exige login) — ver [[no-serverless-v4]] |
| ts-morph                              | `compiler/ast-analyzer.ts` (planejado) | Fatiamento por método (handler-per-method), análise estática de DI      |
| esbuild (API programática)            | `bundler/esbuild-bundler.ts` (planejado) | Bundle de cada fatia; `keepNames: true` necessário (ver CONCERNS.md)     |
| AWS S3 (via SDK, não fixado ainda)     | fluxo de upload (`http/uploads`, planejado) | Presigned POST + `uploadToken`, sem limite prático de tamanho             |
| SWC + `reflect-metadata`               | modo B (decorators legado)       | Só quando `tsconfig` tem decorators remanescentes sem marker TC39        |
| `z.toJSONSchema` (Schema Extractor)    | build, processo filho            | Gera OpenAPI 3.0/3.1 a partir dos `Class()`                                |

## Fronteiras de import (REQ-001/002, já testadas)

`src/index.ts` (raiz) e `src/runtime/index.ts` nunca importam `ts-morph`, `esbuild` ou `typescript` — validado por `test/boundaries.spec.ts` com `deps.neverBundle` no `tsdown.config.ts` (evita falso-negativo do teste). Essas dependências ficam reservadas para a entrada `./plugin`, ainda vazia.
