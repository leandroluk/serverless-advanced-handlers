# Roadmap

Fonte: [INSIGHT.md §11](../../INSIGHT.md). Cada feature referencia os REQs do contrato em
[features/public-api/spec.md](../features/public-api/spec.md).

| #   | Feature (slug)        | Fase INSIGHT | Depende de                          | Status               |
| :-- | :-------------------- | :----------- | :---------------------------------- | :------------------- |
| F00 | `project-setup`       | —            | —                                   | Concluída            |
| F01 | `public-api`          | —            | —                                   | Contrato concluído (spec + design) |
| F01a| `public-api-core`     | —            | F00, F01                            | Concluída (8/8)      |
| F01b| `public-api-surface`  | —            | F01a                                | Execute (3/5)        |
| F02 | `poc-risks`           | Fase 0       | F01                                 | Planejada            |
| F03 | `validation-engine`   | Fase 1       | F01                                 | Planejada            |
| F04 | `class-factory`       | Fase 1       | F03                                 | Planejada            |
| F05 | `di-aot`              | Fases 1–2    | F01                                 | Planejada            |
| F06 | `method-slicing`      | Fase 3       | F05, F02                            | Planejada            |
| F07 | `http-runtime`        | Fase 3       | F04, F05                            | Planejada            |
| F08 | `request-pipeline`    | Fase 3       | F05, F07                            | Planejada            |
| F09 | `openapi`             | Fase 4       | F03, F04, F07                       | Planejada            |
| F10 | `serverless-plugin`   | Fase 5       | F06, F07, F09                       | Planejada            |
| F11 | `testing`             | Fase 2       | F05, F07, F08                       | Planejada            |
| F12 | `uploads`             | Fase 6       | F07, F08, F10                       | Planejada            |

## Escopo das features
- **F00 project-setup:** `git init`, pnpm, `package.json` com `exports` das 4 entradas, `tsconfig`, tsdown, Vitest, oxlint, oxfmt, commitlint (Conventional Commits) e lefthook no padrão do Metha.
- **F01a public-api-core:** superfície declarativa, parte 1 — entradas e fronteiras, decorators duais, tipos de DI e HTTP, `AdvancedClass`, decorators de DI e HTTP, exceções (8 tasks).
- **F01b public-api-surface:** superfície declarativa, parte 2 — contratos de pipeline, OpenAPI, `@LambdaConfig`, decorators de pipeline e `Reflector`, snapshot da API (5 tasks).
- **F02 poc-risks:** carregamento do plugin por subpath no Serverless v3 e no osls 3.x/4.x; `nodejs24.x` nos schemas; serverless-offline nos três; bundle ESM com deps CJS reais; SWC no modo B; source maps das fatias; benchmark de cold start (NestJS × `controller` × `method`).
- **F03 validation-engine:** namespace `v`, extensões codec, augmentation de metadados, `resolveMeta`, `toOpenapiSchema`, validação strict de metadados.
- **F04 class-factory:** `Class()`, estáticos, instâncias, `encode`, guard, aninhamento tipado.
- **F05 di-aot:** decorators de DI, analisador de módulos, subconjunto analisável, grafo topológico, lifecycle e escopos; detecção do modo de decorators (A/B/C), decorators duais e marcadores de tipo.
- **F06 method-slicing:** fatiamento transitivo (controllers, providers, módulos de DTO, herança), fallbacks, source maps.
- **F07 http-runtime:** decorators HTTP, geração de handlers, transporte/aliases, exceções, `HttpResult`, erros.
- **F08 request-pipeline:** guards, interceptors, filters, `SetMetadata`/`Reflector` estáticos.
- **F09 openapi:** schema extractor, gerador 3.0/3.1, decorators OpenAPI, Swagger UI.
- **F10 serverless-plugin:** plugin para Serverless v3 e osls 3.x/4.x: hooks, schema de configuração, registro de funções, `@LambdaConfig`, bundler esbuild (+ SWC no modo B), offline, split de stacks.
- **F11 testing:** `Test.createTestingModule`, overrides, app HTTP em memória, plugin Vitest.
- **F12 uploads:** multipart inline e fluxo S3 (presign, `uploadToken`, `S3UploadedFile`, infraestrutura).
