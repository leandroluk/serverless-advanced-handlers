# Stack (planejada — greenfield)

| Camada            | Tecnologia                         | Observações                                                        |
| :---------------- | :--------------------------------- | :----------------------------------------------------------------- |
| Linguagem         | TypeScript                         | Decorators nos modos A, B (padrão: `experimentalDecorators` + `emitDecoratorMetadata`) e C (TC39) |
| Transform modo B  | SWC                                | Só em arquivos com decorators remanescentes após o fatiamento; Vitest via `unplugin-swc` |
| Metadata modo B   | reflect-metadata                   | Injetado nos handlers apenas quando é dependência do projeto       |
| Validação         | Zod 4 (peer)                       | Codecs, `z.file`, `z.stringbool`, `GlobalMeta`, `z.toJSONSchema`   |
| Análise estática  | ts-morph                           | Usa a versão de TypeScript embutida; risco com TS 7 nativo         |
| Bundle (handlers) | esbuild (API)                      | ESM `.mjs`, banner `createRequire`, zip por função                 |
| Build da lib      | tsdown                             | Sucessor do tsup (sem manutenção)                                  |
| Deploy            | Serverless v3, osls 3.x / 4.x      | Mesma API de plugins; osls recomendado (mantido, sem login/licença); v4 upstream não é alvo |
| Runtime           | AWS Lambda `nodejs24.x` / `22.x`   | `nodejs20.x` em deprecation (updates bloqueados em 2026-09-30)     |
| Parser multipart  | `Response.formData()` (undici)     | Nativo do Node; sem dependência                                    |
| Testes            | Vitest                             | Plugin do compilador para DI em testes; coverage v8                |
| Lint              | oxlint                             | Regras espelhadas de `metha/.oxlintrc.json` (ver CONVENTIONS)      |
| Formatação        | oxfmt                              | Espelhado de `metha/.oxfmtrc.json`                                 |
| Commits           | commitlint + config-conventional   | Conventional Commits                                               |
| Git hooks         | lefthook                           | Espelhado de `metha/lefthook.yaml`, sem turbo (pacote único)       |
| Package manager   | pnpm                               | Mesmo do Metha                                                     |
