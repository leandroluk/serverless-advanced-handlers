# Concerns (planejados — greenfield)

Semeado a partir da tabela de riscos da [INSIGHT.md §10](../../INSIGHT.md).

| Componente / Tema            | Risco                                                                                   | Mitigação planejada                                   |
| :--------------------------- | :-------------------------------------------------------------------------------------- | :---------------------------------------------------- |
| `compiler/slicer.ts`         | Bundles incorretos se o fatiamento remover código usado; herança e `this` dinâmico      | Fallbacks conservadores + warnings; testes de fixtures |
| `compiler/di-resolver.ts`    | Configurações não analisáveis aceitas silenciosamente                                   | Erros SAH com arquivo/linha                           |
| Source maps das fatias       | Stack traces apontando para código gerado                                               | Validar na F02 (magic-string / encadeamento esbuild)  |
| CloudFormation               | 500 recursos por stack (~80–90 rotas com uma Lambda por método)                          | Split de stacks; `granularity: controller`            |
| Nome de função Lambda        | Limite de 64 caracteres                                                                 | Chaves curtas + hash estável                          |
| Plugin (Serverless v3/osls)  | Loader pode não resolver `pkg/plugin`; schema pode não aceitar `nodejs24.x`; APIs removidas no osls 4; Serverless v3 sem manutenção | Validar na F02; alternativa: pacote separado; plugin sem `provider.request`/SDK v2 |
| ts-morph × TypeScript 7      | TS nativo sem a API JS do compilador                                                    | TS embutido no ts-morph; acompanhar nova API          |
| Schema Extractor             | Efeitos colaterais ao importar DTOs no build                                            | Regra documentada + warning                           |
| Modo B (padrão)              | SWC aumenta o tempo de build; `reflect-metadata` soma ao cold start                     | SWC só em arquivos com decorators remanescentes; import só se a dependência existir |
| Matriz de modos A/B/C        | Triplica os cenários de teste do compilador                                             | Fixtures parametrizadas por tsconfig                  |
| Plugin do Vitest (testing)   | Reescrita de `Test.createTestingModule` falha com metadados dinâmicos                    | Exigir metadados analisáveis (SAH100); testes dedicados |
| Superfície pública           | ~150 exports na raiz; quebras acidentais de tipos                                       | Testes de tipo por área + snapshot do `.d.ts` público |
| `tsconfig.json` sem `noEmit`   | `tsc` executado sem `--noEmit` (ou tsconfig que estende o raiz) emite `.js`/`.d.ts` dentro de `src/` | Scripts usam `tsc --noEmit`; avaliar `noEmit: true` sem quebrar a geração de tipos do tsdown |
| Nomes de classes no bundle   | Minificação do esbuild sem `keepNames` altera `name` de exceções (e de classes usadas em mensagens/erros) | Bundler da F10 com `keepNames: true` + teste |
| INIT da Lambda               | Limite de 10s para `onModuleInit`/factories async                                       | Documentação                                          |
| Fluxo S3 de uploads          | Complexidade alta e mudança de contrato para o cliente                                  | Última fase; OpenAPI + helper de cliente              |
