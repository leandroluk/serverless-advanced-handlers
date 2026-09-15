# Spec: F02 `poc-risks`

## Summary

Antes de construir o compilador (`F05 di-aot`, `F06 method-slicing`), o runtime (`F07 http-runtime`) e o plugin (`F10 serverless-plugin`), validar por experimento os 7 riscos técnicos listados no [ROADMAP.md](../../project/ROADMAP.md) que, se errados, mudam decisões de arquitetura já tomadas em `public-api` (design.md) e em `CONCERNS.md`. Cada risco vira um **experimento isolado e descartável** (não faz parte do pacote publicado) com um **veredito escrito**: confirma a premissa, refuta (e propõe alternativa), ou é inconclusivo (e diz o que falta pra decidir).

Esta feature não produz código de produção. O entregável é conhecimento: um `FINDINGS.md` por risco, e as specs/design já existentes (`CONCERNS.md`, `public-api/design.md`, `ROADMAP.md`) atualizadas com o resultado de cada experimento.

## Requirements

- REQ-201: **Carregamento do plugin por subpath.** Confirmar que Serverless Framework v3 e osls 3.x/4.x conseguem `require()`/carregar um plugin declarado como `plugins: ['serverless-advanced-handlers/plugin']` (export CJS, subpath `./plugin` do `package.json`) — sem erro de resolução de módulo, nos três.
- REQ-202: **`nodejs24.x` no schema do provider.** Confirmar que o schema de validação de `provider.runtime` (AJV, via `configSchemaHandler` ou equivalente) aceita `nodejs24.x` sem rejeitar a config, em Serverless v3 e osls 3.x/4.x. Se algum rejeitar, documentar workaround (schema override) ou anotar como blocker até a franework atualizar.
- REQ-203: **`serverless-offline` nos três.** Confirmar que `serverless-offline` invoca localmente um handler mínimo registrado pelo plugin (sem lógica de compilador ainda — só o plugin registrando uma function via `initialize`), nos três motores.
- REQ-204: **Bundle ESM com dependência CJS real.** Escolher uma dependência real que só publica CJS (sem `exports.import`/`module`), bundlar um handler que a importa via `import` com esbuild (API programática, formato ESM, alvo `node22`/`node24`), e confirmar que o handler executa sem `ERR_REQUIRE_ESM` nem erro de interop ao rodar (localmente, via `node` puro).
- REQ-205: **SWC no modo B.** Confirmar que SWC transforma uma classe com decorators legado (`@Injectable`, `@Inject`) preservando `emitDecoratorMetadata` (`design:paramtypes`) de forma compatível com a implementação dual atual (`src/decorators/di.ts`) e legível por `reflect-metadata`.
- REQ-206: **Source maps encadeados.** Confirmar que um erro lançado em código gerado por uma transformação de AST (simulando o fatiamento — não precisa ser o slicer real) + bundle esbuild ainda resolve, via source map encadeado, para a linha original do arquivo TypeScript de origem.
- REQ-207: **Benchmark de granularidade (cold start).** Construir 3 variantes mínimas de handler (bootstrap NestJS completo por invocação; um bundle por controller; um bundle por método — nosso alvo) e medir cold start de cada uma. **Só a preparação dos 3 artefatos e do script de medição é parte desta feature** — a execução contra AWS Lambda real é um passo manual, sob autorização explícita do usuário (deploy tem custo e efeito em conta AWS real), documentado como próximo passo em `FINDINGS-207.md`.

## Affected Components (from graph)

Nenhum — o grafo (`--code-only`, ver STRUCTURE.md) não tem nós para `compiler/*`, `bundler/*` ou `plugin.ts` porque esse código não existe ainda (só o placeholder vazio em `src/plugin/index.ts`). Os experimentos são isolados do código do pacote (ver Out of Scope) e não tocam `src/`.

## Out of Scope

- Qualquer código de produção em `src/` (compilador, bundler, plugin real) — isso é F05/F06/F07/F10.
- Deploy real em conta AWS para o benchmark de cold start (REQ-207) sem autorização explícita prévia do usuário, ponto a ponto.
- Publicar qualquer artefato de POC no pacote npm: os experimentos são construídos no scratchpad da sessão (ou em worktree descartável), **nunca commitados como código** — só o veredito escrito (`FINDINGS-20N.md`) entra no repo.
- Serverless Framework v4 upstream (fora do escopo do projeto desde a decisão registrada em STATE_ARCHIVE.md / memória `no-serverless-v4`).
- Benchmark comparativo contra outros frameworks Node além do NestJS (não é o objetivo — é validar a proposta de valor da granularidade `method`, não fazer um benchmark de mercado).

## Known constraints (descobertas ao especificar)

- **AWS CLI configurado (`~/.aws/config`, perfil `default` com `login_session`), mas a rede deste ambiente falha na validação SSL contra endpoints AWS** (`SSL: CERTIFICATE_VERIFY_FAILED` em `sts get-caller-identity`). Ou seja: **não dá pra assumir que dá pra chamar a AWS real desta sessão** — REQ-207 precisa ser desenhado assumindo que a parte "deploy real + medir" roda fora desta sessão (localmente pelo usuário, ou em uma sessão/ambiente com rede liberada), e o que esta feature entrega é o artefato pronto pra isso + instruções.

## Open Questions

Nenhuma bloqueante — decisões abaixo tomadas por padrão razoável, documentadas para você revisar e pedir nova iteração se não concordar:

- **Onde rodar os experimentos:** scratchpad da sessão (`Bash`/worktree temporário), nunca no working tree principal do repo — evita poluir `git status`/`node_modules` do pacote com dependências de framework (Serverless, osls, serverless-offline) que não são devDependencies da lib.
- **Ordem de execução:** REQ-201→203 primeiro (mesma superfície: plugin loader + schema + offline, os três reaproveitam o mesmo `serverless.yml`/fixture mínima), depois REQ-204/205/206 (bundle/transform, independentes entre si, paralelizáveis), REQ-207 por último (depende de saber se granularidade `method` é viável, o que os riscos anteriores já sinalizam indiretamente).
- **Critério de "PASS" para riscos que revelarem workaround necessário** (ex.: REQ-202 se algum schema rejeitar `nodejs24.x`): PASS-COM-RESSALVA é aceitável — não precisa ser um "não" categórico pra ser útil; o que importa é ter o workaround documentado antes do F10 precisar dele.
