# Tasks: Motor de Resolução de DI — AOT com `ts-morph` (F05)

**Pré-requisito:** F01 concluída (decorators/tipos de DI já existem). Nenhuma dependência de F03/F04.

**Ondas:**
- **P1:** T-001, T-002 (independentes entre si).
- **P2:** T-003 (depende de T-001 e T-002).

**Gate comum:** `pnpm check` (oxlint + tsc). **Importante:** `src/compiler/**` só pode importar `ts-morph`/`typescript` — é justamente o código que `test/boundaries.spec.ts` espera encontrar do lado de fora de `deps.neverBundle`; **nenhum arquivo de `src/compiler/` é exportado por `src/index.ts` nem por `src/runtime/index.ts`** (REQ-002) — os testes importam direto de `#/compiler/*`, sem tocar em `src/index.ts` ou no snapshot de `public-api.spec.ts`.

**`ts-morph` como devDependency:** confirmar que está listado no array `buildTimeOnly` de `tsdown.config.ts` antes da T-001 (já deveria estar, junto de `ts-morph|typescript|esbuild`).

**Commit:** um commit por task (Conventional Commits), com código, testes e atualização de `STATE.md`/`tasks.md` (Spec Gate).

**Fluxo por task:** subtasks PO → DEV → QA → PO → commit, cada persona em um agente próprio (ver CONVENTIONS.md).

---

## T-001: Catálogo de erros do compilador + detector de modo de decorators
- **REQ**: REQ-004
- **What**:
  - `src/compiler/errors.ts`: classe `CompilerError extends Error` com `code: string`, `filePath: string`, `line: number`; `message` formatado como `[serverless-advanced-handlers] SAH<code> <mensagem> at <arquivo>:<linha>`. Construtor recebe `(code, message, node: Node)` e extrai `filePath`/`line` do próprio nó `ts-morph` (`node.getSourceFile().getFilePath()`, `node.getStartLineNumber()`).
  - `src/compiler/decorator-mode.ts`: `detectDecoratorMode(project: Project): 'A' | 'B' | 'C'` — lê `project.getCompilerOptions()` (já resolvido com `extends`); `experimentalDecorators && emitDecoratorMetadata` → `'B'`; só `experimentalDecorators` → `'A'`; nenhum → `'C'`.
- **Where**: `src/compiler/errors.ts`, `src/compiler/decorator-mode.ts`, `test/compiler/errors.spec.ts`, `test/compiler/decorator-mode.spec.ts`
- **Depends on**: nada
- **[P]**: P1
- **Done when**:
  - `CompilerError` formata a mensagem exatamente como o padrão documentado, com arquivo e linha reais de uma fixture.
  - `detectDecoratorMode` retorna `'A'`/`'B'`/`'C'` corretamente pra 3 fixtures de tsconfig (uma por modo), incluindo um tsconfig que usa `extends` (confirma que o efetivo é lido, não só o arquivo raiz).
- **Gate**: `pnpm vitest run test/compiler/errors.spec.ts test/compiler/decorator-mode.spec.ts`
- **[x] Concluída.** Gate: 17/17 + `pnpm check`/`lint:ci`/`test` (723/723, junto com T-002)/`build`. QA PASS (gate reexecutado do zero, boundary REQ-002 confirmado por grep no `dist/`), PO ACCEPTED.
- **Notas de execução:** 5 fixtures de tsconfig, não 3 — `mode-a-extends` (override local vence base) além de `mode-b-extends` (herança pura), cobrindo precedência de `extends`. `CompilerError.code` guarda só a parte numérica (`'101'`, não `'SAH101'`) — convenção que T-002/T-003 seguem. `ts-morph@28.0.0` instalado como devDependency (já coberto por `buildTimeOnly` em `tsdown.config.ts`).

## T-002: Analisador de AST genérico
- **REQ**: REQ-033, REQ-036 (parcial — a validação em si; o disparo pleno do erro é usado por T-003)
- **What**:
  - `src/compiler/ast-analyzer.ts`:
    - `readDecoratorArgument(node, decoratorName): Node | undefined`.
    - `readAnalyzableArray(arrayLiteralOrUndefined, allowedKinds): Node[]` — lança `CompilerError` `SAH100` no primeiro elemento fora de `allowedKinds` (ex.: `SyntaxKind.SpreadElement`, `ConditionalExpression`).
    - `resolveIdentifierToClass(node): ClassDeclaration | undefined` — via `getSymbol()`/`getAliasedSymbol()`, funciona através de barrels (confirmado por protótipo).
    - `resolveTypeToClass(type): ClassDeclaration | undefined` — mesma ideia a partir de um `Type`.
- **Where**: `src/compiler/ast-analyzer.ts`, `test/compiler/ast-analyzer.spec.ts`
- **Depends on**: T-001 (usa `CompilerError`)
- **[P]**: P1
- **Done when**:
  - `readAnalyzableArray` aceita um array literal só com identificadores/chamadas reconhecidas e lança `SAH100` (com arquivo/linha corretos) num array com `SpreadElement`.
  - `resolveIdentifierToClass`/`resolveTypeToClass` resolvem através de um barrel (`export * from`) até a classe concreta, e retornam `undefined` pra uma interface (não lançam — quem decide se é erro é o `di-resolver.ts`).
- **Gate**: `pnpm vitest run test/compiler/ast-analyzer.spec.ts`
- **[x] Concluída.** Gate: 25/25 + `pnpm check`/`lint:ci`/`test` (723/723)/`build`. QA PASS (reproduziu isoladamente o caso `providers: getProviders()` sem a validação extra, confirmou `Repo<User>` vs `Promise<Logger>`, testou ciclo de re-export circular sem loop infinito), PO ACCEPTED.
- **Notas de execução:** `readAnalyzableArray` também lança `SAH100` quando o valor não é `ArrayLiteralExpression` (não só quando tem elemento fora de `allowedKinds`) — o PO confirmou que isso já estava explícito no design.md, não é desvio. `resolveTypeToClass` resolve a raiz de um genérico que é classe (`Repo<User>` → `Repo`); só wrappers cujo símbolo não é classe (`Promise<T>`) dão `undefined`. Guarda de ciclo por `compilerSymbol` no laço de resolução de alias.

## T-003: Resolvedor de DI (algoritmo completo)
- **REQ**: REQ-030, REQ-031, REQ-032, REQ-033, REQ-034, REQ-036, REQ-037
- **What**: `src/compiler/di-resolver.ts`, implementando o algoritmo completo de [design.md](design.md) — `resolveAppGraph(project, rootModule): AppGraph`:
  1. Varredura recursiva de módulos (`@Module`, `@Global()`, módulos dinâmicos `X.forRoot(...)` com validação `SAH105`).
  2. Registro global de providers (`@Global()` + `exports` diretos, não transitivos).
  3. Resolução de parâmetro de construtor (`@Inject`/tipo, `@Optional()`, `useFactory.inject`) → `SAH103` se não resolver a uma classe e não tiver `@Inject`.
  4. Lookup de escopo → `SAH101` (não encontrado) / `SAH104` (existe mas não exportado).
  5. Grafo de dependências + detecção de ciclo (DFS) → `SAH102` com o ciclo completo na mensagem.
  6. Ordenação topológica (folhas primeiro).
- **Where**: `src/compiler/di-resolver.ts`, `test/compiler/di-resolver.spec.ts`, fixtures em `test/compiler/fixtures/**` (múltiplos cenários: módulo simples, `@Global()`, dinâmico, ciclo, provider não exportado, `useFactory`, interface sem `@Inject`, array com spread)
- **Depends on**: T-001, T-002
- **[P]**: P2
- **Done when**:
  - Fixture com 3 módulos encadeados (`AppModule → UsersModule → DatabaseModule`) resolve a `AppGraph` correta, com ordem topológica leaves-first.
  - `@Global()` num módulo torna seu provider visível de um módulo que não o importa diretamente.
  - Provider existente mas não exportado por um módulo importado → `SAH104` (não `SAH101`).
  - Ciclo de 2 e de 3 classes → `SAH102` com o ciclo completo na mensagem, nos dois tamanhos.
  - Parâmetro de interface sem `@Inject` → `SAH103`; com `@Inject(TOKEN)` (token = `Symbol`/`InjectionToken` const) → resolve.
  - `providers: [...spread]` → `SAH100`.
  - `useFactory` com `inject: [TOKEN, {token: OTHER, optional: true}]` resolvido corretamente, incluindo o caso `optional` ausente do grafo sem erro.
- **Gate**: `pnpm vitest run test/compiler/di-resolver.spec.ts`
