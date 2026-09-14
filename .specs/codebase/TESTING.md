# Testing (planejado)

## Ferramenta
Vitest, com configuração base espelhada de `metha/pkgs/config-vitest/src/base.ts`:
- `globals: true`, `passWithNoTests: true`, `watch: false`
- `include`: `{src,test}/**/*.{e2e-test,e2e-spec,test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}`
- Coverage `v8` em `./.coverage`, incluindo `src/**`, excluindo `index.*` e `*.d.ts`/`*.d.mts`
- `testTimeout: 60000`, `hookTimeout: 30000`
- Alias `#/` → `src/`

## Camadas de teste
| Camada               | Alvo                                                                 | Estratégia                                                                                   |
| :------------------- | :------------------------------------------------------------------- | :------------------------------------------------------------------------------------------- |
| **Unit**             | `v` (decode, encode, JSON Schema), `Class()`, `resolveMeta`, runtime | Testes diretos por função                                                                     |
| **Type tests**       | Tipagem da API pública (REQ-022, REQ-023, REQ-026, REQ-016)          | Vitest typecheck (`*.test-d.ts` com `expectTypeOf`)                                          |
| **Compiler fixtures**| Analisador, DI, slicer, codegen, schema extractor                    | Apps em `test/fixtures/`; snapshots de fatias/handlers; asserções no bundle (código ausente)   |
| **Erros de build**   | Códigos `SAH<NNN>` (REQ-036, 037, 044, 054, 071, 072, 091)           | Fixture inválida por código de erro, verificando mensagem, arquivo e linha                   |
| **Modos de decorators** | Detecção (REQ-004), decorators duais (REQ-005), SWC + reflect-metadata (REQ-006), marcadores (REQ-007, 008) | Mesmas fixtures executadas com tsconfig nos modos A, B (padrão) e C |
| **Pipeline HTTP**    | Transporte, guards, validação, serialização, formatos de erro        | `moduleRef.createHttpApp().inject(...)` em memória (REQ-102)                                  |
| **Plugin**           | Hooks e registro de funções                                          | Matriz Serverless v3 × osls 3.x × osls 4.x em modo `package` sobre fixture; inspeção de `service.functions`     |
| **Uploads S3**       | Presign, `uploadToken`, `S3UploadedFile`                             | S3 mockado (sem AWS real) + testes de policy                                                 |

## Gate
Uma task só é concluída com `pnpm check` e `pnpm test` passando e com as specs/STATE atualizadas no mesmo commit.
