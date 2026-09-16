# Conventions (planejadas — espelhadas do monorepo Metha)

Referências: `C:\dev\github.com\leandroluk\metha\{lefthook.yaml,.oxlintrc.json,.oxfmtrc.json,commitlint.config.ts}`.

## Formatação — oxfmt
```json
{ "bracketSpacing": false, "singleQuote": true, "trailingComma": "es5", "arrowParens": "avoid", "printWidth": 120 }
```

## Lint — oxlint
- Plugins: `typescript`, `vitest`.
- Regras principais (erro):
  - `typescript/no-explicit-any`
  - `typescript/no-namespace`
  - `typescript/explicit-function-return-type`
  - `typescript/no-floating-promises`
  - `typescript/no-unused-vars` (ignora `^_`)
  - `prefer-const`, `no-var`, `eqeqeq`, `no-unneeded-ternary`
  - `curly: all`
- Exceções em `*.test.*` / `*.spec.*`: `no-explicit-any`, `no-floating-promises` e `explicit-function-return-type` desligadas.
- Exceção em `src/validation/v.ts`: `no-namespace` desligado — merge de valor+namespace é a única forma de expor `v.infer<T>` sem cair no bug de bundling documentado em `public-api/design.md` (decisão 17). Único arquivo do pacote com essa exceção; qualquer novo caso precisa da mesma justificativa.
- Ignorados: `dist`, `node_modules`, `coverage`/`.coverage`, `*.config.*`.
- **Impacto no código do INSIGHT:** os trechos com `any` (ex.: `AdvancedClass<any>`, casts em `Class()`) precisam ser reescritos com `unknown`/tipos auxiliares ou justificados com `oxlint-disable-next-line` na implementação.

## TypeScript
Base espelhada de `metha/pkgs/config-typescript/base.json`:
- `target: ES2023`, `module: Preserve`, `moduleResolution: bundler`
- `strict`, `noUncheckedIndexedAccess`, `isolatedModules`
- `declaration` e `declarationMap`
- Alias interno `#/*` → `./src/*` (também em `package.json#imports`)

**Modo de decorators:** o repositório usa o **modo B**, que é o padrão do framework e igual ao Metha: `experimentalDecorators: true` + `emitDecoratorMetadata: true`. As fixtures de teste cobrem também os modos A e C.

## Commits — Conventional Commits
- commitlint com `@commitlint/config-conventional`.
- Tipos: `feat`, `fix`, `docs`, `refactor`, `test`, `perf`, `build`, `ci`, `chore`, `style`, `revert`.
- Escopos sugeridos: `validation`, `class`, `di`, `http`, `pipeline`, `openapi`, `compiler`, `slicer`, `bundler`, `plugin`, `runtime`, `testing`, `uploads`, `specs`.
- Spec Gate: código + testes + atualização de `STATE.md`/`spec.md`/`tasks.md` no mesmo commit atômico.

## Fluxo de execução por task — PO / DEV / QA
Cada persona roda em um agente próprio, definido em `.claude/agents/`:

| Persona | Agente | Modelo      | Esforço | Permissões                                                      |
| :------ | :----- | :---------- | :------ | :-------------------------------------------------------------- |
| PO      | `po`   | Haiku 4.5   | padrão  | Somente leitura (`Read`, `Glob`, `Grep`)                         |
| DEV     | `dev`  | Opus 5      | high    | Edita código e testes; sem commit                               |
| QA      | `qa`   | Sonnet 5    | medium  | Não edita o projeto; temporários só em `.qa/` e `test/__qa__/` (ignorados pelo git); sem operações git que alterem estado |

Subtasks de cada task:
1. **PO — refinamento:** gera critérios de aceite (`AC-n`) a partir dos REQs e do "Done when". Ambiguidades voltam ao usuário.
2. **DEV — implementação:** implementa o escopo, escreve os testes e roda o gate + `pnpm check`.
3. **QA — verificação:** reexecuta gate e check, confere cada `AC-n` e roda cenários adversariais. Defeitos voltam ao DEV; após 3 ciclos sem `PASS`, o problema escala para o usuário.
4. **PO — aceite:** compara o relatório do QA com os `AC-n`.
5. **Orquestrador (sessão principal):** marca a task em `tasks.md`, atualiza `STATE.md` e faz o commit atômico (Spec Gate).

Regras de contexto e paralelismo:
- Cada agente recebe só a task, os `AC-n`, CONVENTIONS.md, TESTING.md e trechos de spec/design, conforme a regra de sub-agentes da skill.
- Tasks da mesma onda `[P]` podem ter DEV e QA em paralelo. O orquestrador consolida barrels compartilhados e faz os commits em sequência, adicionando só os arquivos de cada task.

## Git hooks — lefthook
Adaptado do Metha para pacote único (sem turbo):

```yaml
commit-msg:
  commands:
    commitlint:
      run: pnpm commitlint --edit {1}

pre-commit:
  commands:
    format:
      run: pnpm oxfmt --write .
    check:
      run: pnpm check # oxlint + tsc --noEmit
    lint:
      run: pnpm lint  # oxlint --fix

pre-push:
  commands:
    build:
      run: pnpm build
    test:
      run: pnpm test
```

> A decidir na F00: `stage_fixed: true` em `format`/`lint`, para re-adicionar ao commit os arquivos corrigidos automaticamente.

## Scripts (`package.json`)
| Script     | Comando                                  |
| :--------- | :--------------------------------------- |
| `prepare`  | `lefthook install`                       |
| `build`    | `tsdown`                                 |
| `format`   | `oxfmt --write .`                        |
| `lint`     | `oxlint src test --fix`                  |
| `lint:ci`  | `oxfmt --check . && oxlint src test`     |
| `check`    | `oxlint src test && tsc --noEmit`        |
| `test`     | `vitest run`                             |
| `test:ci`  | `vitest run --coverage`                  |
