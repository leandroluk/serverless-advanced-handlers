# Spec: Motor de Resolução de DI — AOT com `ts-morph` (F05)

## Summary
Primeiro componente de **compilador** do pacote (tudo antes disso — F00/F01/F03/F04 — era runtime puro). Implementa a detecção do modo de decorators (A/B/C) e o motor de resolução estática de injeção de dependência: varre módulos (`@Module`) recursivamente, constrói o registro global de providers, resolve os parâmetros de construtor de cada controller/provider por tipo (ou token explícito via `@Inject`), detecta configuração fora do "subconjunto analisável" e dependência circular — tudo **sem executar o código do usuário**, só analisando a AST via `ts-morph`.

Referência de algoritmo (prosa, já revisada pelo usuário): [INSIGHT.md §6.1](../../../INSIGHT.md) (algoritmo), §6.2 (subconjunto analisável e lifecycle), §6.6 (modos de decorators).

**Risco "ts-morph × TypeScript 7" (CONCERNS.md) validado por protótipo antes deste spec** — `ts-morph` carrega compilador embutido próprio, sem depender da `devDependency typescript` do pacote; resolução de parâmetro através de barrel, leitura de `@Module`, detecção de ciclo, ordenação topológica e os dois casos do subconjunto analisável (interface sem `@Inject`, `SpreadElement`) confirmados funcionando.

Escopo: **Complex** (primeiro código de compilador; arquitetura interna nova, sem "Public Contract" prévio — ver [design.md](design.md)).

## Requirements
Referenciados do contrato `public-api` (sem duplicar o texto — já implementados como decorators/tipos no-op nas features F01a/F01b; aqui entra o **comportamento** de build):
- REQ-004 — detecção do modo de decorators (A/B/C) pelo tsconfig efetivo (incluindo `extends`).
- REQ-005 — decorators de classe/método iguais nos 3 modos (já implementado; aqui, consumido pela análise).
- REQ-006 — modo B: DI continua AOT; SWC só em arquivos com decorators remanescentes (fora do escopo desta feature — é do bundler, F06/F10; aqui só a detecção do modo).
- REQ-007 — marcadores de tipo válidos nos 3 modos, obrigatórios no C (já implementado; consumido pela análise no modo C).
- REQ-008 — warning no modo C com libs que exigem decorators legados (fora do escopo desta feature — é do bundler; aqui não).
- REQ-030 — `@Module({imports?, controllers?, providers?, exports?})` e `@Global()` (já implementado; aqui, a leitura/varredura).
- REQ-031 — `@Injectable({scope?})` (já implementado; aqui, a leitura de `scope` pra decidir instanciação).
- REQ-032 — formas de provider: classe, `useClass`, `useValue`, `useFactory` (`inject?`).
- REQ-033 — tokens: classe, string, `Symbol`, `InjectionToken`; `@Inject`/`@Optional` em parâmetro.
- REQ-034 — módulos dinâmicos (`X.forRoot({...})`) com argumentos literais/constantes/`process.env.*`.
- REQ-035 — lifecycle: `OnModuleInit` (top-level await no cold start), `Scope.DEFAULT`/`REQUEST`, `OnModuleDestroy` best effort (aqui, a leitura; a geração do código que efetivamente await/instancia é F06/F07).
- REQ-036 — configuração fora do subconjunto analisável (INSIGHT §6.2) gera erro de build com código, arquivo e linha.
- REQ-037 — dependência circular gera erro de build exibindo o ciclo completo.

## Affected Components (from graph)
Sem nó no grafo (`--code-only`) — `src/compiler/*` ainda não existe (é a primeira feature nessa pasta). `src/decorators/di.ts`, `src/di/{tokens,providers}.ts` e `src/class/types.ts` já existem (consumidos aqui, tipos não alterados).

## Out of Scope
- Geração de código (handlers, containers de teste) → F06 `method-slicing` / F07 `http-runtime` / F11 `testing`.
- Fatiamento por método (`compiler/slicer.ts`) → F06.
- Análise de rotas HTTP (`compiler/route-analyzer.ts`) → F07.
- Warning de libs legadas no modo C, transform SWC no modo B → F06/F10 (bundler).
- Execução real do `@Module` raiz a partir de `serverless.yml` (descoberta do entrypoint via config do plugin) → F10.
- Guards/interceptors/filters resolvidos pela mesma DI (`compiler/metadata-collector.ts`) → F08.

## Open Questions
- none — algoritmo e contrato já revisados pelo usuário na fase Complex original de `public-api`; risco de ferramenta (ts-morph) validado por protótipo antes deste spec.
