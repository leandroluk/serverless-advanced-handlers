# Tasks: F02 `poc-risks`

**Pré-requisito:** F01 concluída (não há dependência técnica real — é dependência de prioridade do ROADMAP).

**Ondas:**
- **P1:** T-201, T-204, T-205, T-206 (independentes entre si).
- **P2:** T-207 (reaproveita a fixture `serverless.yml` de T-201).

**Sem commit de código de experimento.** Cada task produz `.specs/features/poc-risks/findings/FINDINGS-<REQ>.md`; o orquestrador revisa a evidência (papel de PO substituto) e commita o(s) `FINDINGS-*.md` junto com qualquer atualização de `CONCERNS.md`/`ROADMAP.md` que o veredito exigir (Spec Gate). Não há QA dedicado nesta feature (ver design.md, Decision Log #3).

**Ambiente de trabalho:** scratchpad da sessão (`<scratchpad>/poc-risks/<slug>/`), nunca worktree git, nunca dependência nova em `package.json` da lib.

---

## T-201: Plugin loader + `nodejs24.x` no schema + `serverless-offline`
- **REQ**: REQ-201, REQ-202, REQ-203
- **What**: fixture mínima (`serverless.yml` com `plugins: ['<pkg>/plugin']`, `provider.runtime: nodejs24.x`, uma function dummy) testada contra `serverless@3`, `osls@3` e `osls@4`, cada um num subdiretório próprio com seu próprio `package.json`/lockfile local. Para cada motor: (a) `sls package`/`sls print` carrega o plugin sem erro de resolução de módulo; (b) a config com `nodejs24.x` não é rejeitada pelo schema; (c) `serverless-offline` invoca a function dummy localmente.
- **Depends on**: nada
- **[P]**: P1
- **Done when**: os 3×3 resultados (3 motores × 3 sub-riscos) estão documentados, cada um com veredito. Falha de instalação de algum motor (registro não acessível, etc.) é `INCONCLUSIVO` para aquele motor, não bloqueia os outros.
- **Entrega**: `findings/FINDINGS-201.md`, `findings/FINDINGS-202.md`, `findings/FINDINGS-203.md` (pode ser um único arquivo com as 3 seções se a evidência for compartilhada — decisão do DEV, documentar a escolha)
- **[x] Concluída.** Veredito: REQ-201 PASS, REQ-202 PASS-COM-RESSALVA (Serverless v3 tem `nodejs20.x` congelado no enum — patch de schema é requisito do F10), REQ-203 PASS nos 3 motores. Achado extra: `serverless-offline` na lista de plugins trava `sls invoke local` indefinidamente nos 3 (nota pra TESTING.md).

## T-204: Bundle ESM com dependência CJS real
- **REQ**: REQ-204
- **What**: escolher uma dependência real publicada só em CJS (sem `exports.import`), montar um handler mínimo que a importa via `import`, bundlar com esbuild (API programática, `format: 'esm'`, `target: 'node22'`), rodar o bundle com `node` puro e confirmar execução sem `ERR_REQUIRE_ESM`/erro de interop.
- **Depends on**: nada
- **[P]**: P1
- **Done when**: o bundle roda e produz a saída esperada, OU falha de forma reprodutível (nesse caso, documentar o erro exato e ao menos uma mitigação testada — ex.: `esbuild.build({banner, define})`, `createRequire`, etc.)
- **Entrega**: `findings/FINDINGS-204.md`
- **[x] Concluída.** Veredito: PASS-COM-RESSALVA. `ERR_REQUIRE_ESM` da spec original não se materializou (SPEC_DEVIATION registrada); os erros reais são `Dynamic require` (dep inlined, mitigado com banner `createRequire`) e `Named export not found` (dep external, mitigado com default import).

## T-205: SWC no modo B (decorators legado + `emitDecoratorMetadata`)
- **REQ**: REQ-205
- **What**: fixture isolada (cópia mínima do padrão de `src/decorators/di.ts` — não importar a lib) com uma classe usando `@Injectable`/`@Inject`, transformada por `@swc/core` com decorators legado habilitados, confirmando que `design:paramtypes` é emitido e legível por `reflect-metadata` do mesmo jeito que `tsc` emitiria.
- **Depends on**: nada
- **[P]**: P1
- **Done when**: comparação lado a lado (saída do `tsc` vs. saída do SWC) para o mesmo arquivo mostra metadata equivalente, OU divergência documentada com o que muda.
- **Entrega**: `findings/FINDINGS-205.md`
- **[x] Concluída.** Veredito: PASS-COM-RESSALVA. `design:paramtypes` idêntico ao `tsc` em 8 cenários; ressalvas inofensivas (design:type extra, import type-only não elidido — regra a formalizar pro F06).

## T-206: Source maps encadeados (transformação de AST → bundle)
- **REQ**: REQ-206
- **What**: arquivo TS de origem com um erro proposital → transformação simples via `ts-morph`/`typescript` (ex.: mover um método pra um arquivo novo, gerando source map da transformação) → bundle esbuild (gerando seu próprio source map) → executar e capturar o stack trace → confirmar que ferramentas padrão (`source-map`/Node `--enable-source-maps`) resolvem o stack de volta pra linha do arquivo TS original.
- **Depends on**: nada
- **[P]**: P1
- **Done when**: o stack trace resolvido aponta pra linha certa do arquivo original, OU a cadeia quebra em algum ponto (documentar onde: transformação→bundle ou bundle→runtime).
- **Entrega**: `findings/FINDINGS-206.md`
- **[x] Concluída.** Veredito: PASS. Cadeia resolve à linha/coluna exata do TS original; requisito concreto pro F06: o slicer precisa emitir seu próprio source map (nem `ts-morph` nem `tsc` fazem isso em TS→TS).

## T-207: Harness de benchmark de granularidade (cold start)
- **REQ**: REQ-207
- **What**: 3 variantes mínimas de handler Lambda (bootstrap NestJS completo por invocação; um bundle por controller com N métodos; um bundle por método — granularidade alvo), cada uma pronta para deploy (reaproveitando a fixture `serverless.yml` de T-201), mais um script que mede cold start (ex.: invocar via SDK/CLI e ler `Init Duration` do log, ou medir localmente como proxy quando não houver deploy).
- **Depends on**: T-201 (fixture `serverless.yml`)
- **[P]**: P2
- **Done when**: os 3 artefatos existem e buildam localmente sem erro; o script de medição está pronto e documentado (comando exato pra rodar). **Deploy real em AWS não faz parte desta task** — fica registrado como próximo passo manual, sob autorização explícita, em `findings/FINDINGS-207.md`.
- **Entrega**: `findings/FINDINGS-207.md` (com o veredito necessariamente `INCONCLUSIVO` ou `PASS-COM-RESSALVA` até o deploy real acontecer — nunca `PASS` sem número medido)
