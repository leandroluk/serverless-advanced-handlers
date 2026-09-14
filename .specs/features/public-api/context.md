# Context: public-api — decisões do discuss mode (2026-09-14)

## Q1 — Tipagem de classes aninhadas (REQ-026)
- **Decisão:** `v.instance(Cls)`.
- **Opções consideradas:** `v.instance(Cls)`, `Cls.ref()`, `Cls.schema()` como método.
- **Motivo:** o TypeScript não tem `this` polimórfico em propriedades estáticas; um helper genérico tipa o campo como `InstanceType<typeof Cls>` e preserva `Cls.schema` como propriedade.

## Q2 — Resposta sem schema (REQ-048, REQ-054, REQ-093)
- **Decisão:** erro de build por padrão; `responses.missingSchema: warn` rebaixa para warning e serializa com `JSON.stringify` (sem sanitização).
- **Motivo (usuário):** a premissa do projeto é documentação completa; o erro por padrão garante response documentado em todas as rotas e evita vazamento de campos.
- **Exceção:** métodos `void` / `Promise<void>` não exigem schema.

## Q3 — Formato do corpo de erro (REQ-052, REQ-055, REQ-093)
- **Decisão:** default compatível com NestJS (`{ statusCode, message, error }`); RFC 9457 disponível via `errors.format: problem-json`.
- **Motivo (usuário):** RFC 9457 é pouco visto no ecossistema Node/NestJS; paridade facilita migração de clientes; a escolha fica configurável.
- **Nota:** RFC 9457 tem suporte nativo em Spring (`ProblemDetail`) e ASP.NET Core (`ProblemDetails`), por isso permanece como opção.

## Q4 — Contexto de guards, interceptors e filters (REQ-062, REQ-063, REQ-065)
- **Decisão:** `ExecutionContext` com paridade NestJS + `Reflector`.
- **Motivo:** migração direta de guards e interceptors escritos para NestJS.
- **Implicação de design:** decorators são removidos das fatias; o `Reflector` lê um mapa de metadados gerado no build, indexado pelas referências de `getHandler()` e `getClass()`.

## Ajuste pós-revisão — API de overrides em testes (REQ-101, REQ-104)
- **Decisão:** `overrideProvider({ provide, useValue | useClass | useFactory })`, com as três formas mutuamente excludentes; o mesmo formato vale para `overrideGuard`, `overrideInterceptor` e `overrideFilter`. A função é variádica para vários overrides em uma chamada.
- **Motivo (usuário):** o encadeamento do NestJS (`.overrideProvider(token).useValue(...)`) é verboso e difícil de ler; o objeto espelha o formato de providers do `@Module`.
- **Tipagem:** union discriminada com `?: never` nas chaves proibidas; tipo do valor derivado do token (classe ou `InjectionToken<T>`); `useValue` como `Partial<T>` para facilitar mocks.

## Modos de decorators (REQ-004 a REQ-008)
- **Decisão:** suportar os três modos, detectados pelo tsconfig efetivo — A (legado), **B (legado + `emitDecoratorMetadata`, padrão)** e C (TC39).
- **Motivo:** o público do NestJS usa bibliotecas que dependem de metadata (TypeORM, class-transformer); o modo C sai barato porque o compilador já lê os tipos anotados.
- **Evidências (protótipo):**
  - As mesmas funções de decorator passam no type-check nos dois modos e detectam o modo em runtime.
  - Decorator de parâmetro no TC39 gera `TS1206`.
  - Marcadores de tipo (`HttpBody<T>`, `Inject<typeof TOKEN, T>`) compilam nos dois modos.
  - O esbuild não emite `design:paramtypes` (o `tsc` emite), por isso o SWC entra no modo B.
- **Custos aceitos:** matriz de testes A/B/C; duas sintaxes de parâmetro nos modos A e B (decorators como principal); SWC e `reflect-metadata` limitados a arquivos/dependências que realmente precisam.

## Alvo de deploy: osls em vez do Serverless Framework v4 (REQ-003, REQ-090, REQ-094)
- **Decisão:** o plugin mira o **osls 3.x e 4.x** (fork open-source do Serverless Framework v3 mantido pelos mantenedores do Bref). O Serverless Framework v4 upstream não é alvo.
- **Motivo (usuário):** o v4 upstream exige login; não há interesse em suportá-lo.
- **Consequências:**
  - `build: { esbuild: false }` sai da configuração (só se aplicava ao v4 upstream).
  - O schema de configuração precisa ser registrado, pois o osls 4 falha com configuração inválida por padrão.
  - O plugin não pode usar APIs removidas no osls 4 (`provider.request()`, SDK v2, `variableResolvers`, `package.include/exclude`).
  - `frameworkVersion: '3 || 4'`.
- **Ajuste (2026-09-14):** o **Serverless Framework v3 original** também é suportado.
  - A API de plugins é a mesma do osls 3.x/4.x, e respeitar as restrições do osls 4 garante compatibilidade com os três.
  - O osls continua recomendado, porque o Serverless v3 não recebe mais atualizações.
  - Testes do plugin rodam na matriz Serverless v3 × osls 3.x × osls 4.x.

## Pendências não bloqueantes
- Q5 (REQ-090, REQ-094): validar na F02 `poc-risks`:
  - se o loader do Serverless v3 e do osls 3.x/4.x resolve `serverless-advanced-handlers/plugin`;
  - se o schema aceita `nodejs24.x`;
  - se o serverless-offline funciona com o osls 4.
