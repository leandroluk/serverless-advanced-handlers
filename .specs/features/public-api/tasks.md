# Tasks: API Pública (contrato guarda-chuva)

Esta feature define o contrato ([spec.md](spec.md), [design.md](design.md)) e não tem tasks próprias. A safety valve
da skill (4 ondas de dependência) levou à divisão da superfície declarativa em duas features (decisão do usuário, 2026-09-14):

| Feature                                                  | Tasks | Ondas | Conteúdo                                                                                       |
| :------------------------------------------------------- | :---- | :---- | :--------------------------------------------------------------------------------------------- |
| [public-api-core](../public-api-core/tasks.md) (F01a)     | 8     | 2     | Entradas e fronteiras, decorators duais, tipos de DI e HTTP, `AdvancedClass`, decorators de DI e HTTP, exceções |
| [public-api-surface](../public-api-surface/tasks.md) (F01b) | 5   | 3     | Contratos de pipeline, OpenAPI, `@LambdaConfig`, decorators de pipeline e `Reflector`, snapshot da API |

O comportamento de cada REQ é entregue pelas features F03–F12 ([ROADMAP](../../project/ROADMAP.md)).
