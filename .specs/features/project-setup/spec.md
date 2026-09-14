# Spec: Project Setup (F00)

## Summary
Estrutura inicial do repositório para implementar o framework, espelhando o monorepo Metha
([CONVENTIONS.md](../../codebase/CONVENTIONS.md), [TESTING.md](../../codebase/TESTING.md)):
- git e pnpm;
- TypeScript no modo de decorators B;
- build das 4 entradas do pacote;
- Vitest com testes de tipo;
- oxlint e oxfmt;
- Conventional Commits e lefthook.

Escopo: **Medium**. Design inline e tasks implícitas, com a lista de passos no Execute.

## Requirements
- REQ-001: Repositório git inicializado na branch `master` com `.gitignore` cobrindo `node_modules`, `dist`, `.coverage`, `.serverless-advanced`, `*.tsbuildinfo`, `.specs/graph/cache/` e `.qa/` (temporários do agente QA).
- REQ-002: `package.json` com:
  - `name: serverless-advanced-handlers` e `type: module`;
  - `exports` das 4 entradas (`.`, `./runtime` e `./testing` em ESM; `./plugin` em CJS; todas com `types`);
  - `engines.node >=22` e `packageManager` pnpm fixado;
  - dependências com versões exatas, `zod` `^4` em `peerDependencies`;
  - scripts de CONVENTIONS.md.
- REQ-003: `tsconfig.json` baseado em `metha/pkgs/config-typescript/base.json` no **modo B** (`experimentalDecorators` + `emitDecoratorMetadata`), com alias `#/*` → `./src/*` e `types: ["node"]`.
- REQ-004: `tsdown.config.ts` gera `dist/index.mjs`, `dist/runtime.mjs`, `dist/testing.mjs` (ESM) e `dist/plugin.cjs` (CJS), com declarações de tipo, a partir de barrels vazios (`export {}`) em `src/index.ts`, `src/runtime/index.ts`, `src/testing/index.ts` e `src/plugin/index.ts`.
- REQ-005: `vitest.config.ts` com a base do Metha (TESTING.md) e typecheck habilitado para `**/*.test-d.ts`.
- REQ-006: `.oxlintrc.json` e `.oxfmtrc.json` espelhados do Metha, sem os plugins e regras de turbo.
- REQ-007: `commitlint.config.ts` com `@commitlint/config-conventional`.
- REQ-008: `lefthook.yaml` conforme CONVENTIONS.md, com `stage_fixed: true` em `format` e `lint`; `prepare` executa `lefthook install`.

## Affected Components (from graph)
Greenfield — grafo indisponível (modo degradado). Somente arquivos de configuração e barrels vazios.

## Out of Scope
- Qualquer código de comportamento (features F01–F12).
- CI remota (GitHub Actions) — pode virar feature própria.
- Publicação no npm.

## Inline Design
- Versões iniciais iguais às do Metha quando existirem (`typescript` 6.0.3, `oxlint` 1.79.0, `oxfmt` 0.67.0, `lefthook` 2.1.10, `@commitlint/*` 21.2.x, `vitest` 5.0.0, `zod` 4.4.3). As demais (`tsdown`, `@types/aws-lambda`, `@types/node`) são fixadas na versão estável no momento da instalação.
- pnpm **12.4.1** (versão instalada na máquina; o Metha usa 10.33) fixado em `packageManager`.
- `stage_fixed: true` re-adiciona ao commit os arquivos corrigidos por `oxfmt`/`oxlint --fix` (resolve a pendência de CONVENTIONS.md).

## Subtasks (PO / DEV / QA)
- [x] PO — critérios de aceite a partir dos REQs e do "Done When" (16 ACs consolidados)
- [x] DEV — implementação + gate (5/5)
- [x] QA — verificação independente (AC-1..AC-16 PASS, sem defeitos)
- [x] PO — aceite (ACCEPTED)
- [x] Commit inicial (`chore: setup project`)

## Execution Notes (2026-09-14)
- **Versões fixadas na instalação:** `tsdown` 0.23.0 e `@types/aws-lambda` 8.10.163.
- **SPEC_DEVIATION 1:** `.oxfmtrc.json`, `.oxlintrc.json` e `package.json` foram normalizados pelo oxfmt (newline final, arrays em linha, ordem de chaves). Chaves e valores continuam iguais aos do Metha.
- **SPEC_DEVIATION 2:** arquivos extras.
  - `pnpm-workspace.yaml` com `allowBuilds: { lefthook: true }` e `saveExact: true`: sem ele o pnpm 12 falha com `ERR_PNPM_IGNORED_BUILDS`.
  - `.prettierignore`, lido pelo oxfmt, ignorando `.specs/`, `.claude/` e `INSIGHT.md`.
- **SPEC_DEVIATION 3:** o aceite de `chore: setup project` foi validado executando o hook `commit-msg` diretamente; o commit real é este commit inicial.
- **Ambiente:** a identidade global do git (`leandroluk <leandroluk@gmail.com>`) foi configurada por escolha do usuário.

## Done When (gate)
- `pnpm install`, `pnpm check`, `pnpm lint:ci`, `pnpm test` e `pnpm build` passam no esqueleto vazio.
- `pnpm build` gera os 4 artefatos com declarações de tipo.
- `git commit -m "bad message"` é rejeitado pelo hook `commit-msg`, e `git commit -m "chore: setup project"` é aceito.
