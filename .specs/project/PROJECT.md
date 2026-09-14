# Project: serverless-advanced-handlers

## Vision
Framework no estilo **NestJS, pronto para AWS Lambda**: o desenvolvedor escreve Modules, Controllers,
Injectables e DTOs como no NestJS, e o build (AOT) transforma cada método em uma Lambda enxuta —
DI resolvida estaticamente, métodos fatiados, validação/serialização com Zod 4 e OpenAPI gerado no build.

Documento de visão completo: [INSIGHT.md](../../INSIGHT.md) (revisado em 2026-09-14).

## Goals
- DX com paridade NestJS sempre que não conflitar com AOT ou com o modelo de execução da Lambda.
- DI sem reflexão em runtime: o grafo é resolvido no build. `emitDecoratorMetadata`/`reflect-metadata` são suportados (modo B, padrão) apenas para compatibilidade com bibliotecas de terceiros.
- Modo de decorators detectado pelo tsconfig: A (legado), B (legado + metadata, padrão) e C (TC39).
- Uma Lambda por método (ou por controller, configurável) contendo apenas o código executado.
- Validação, serialização e documentação a partir de uma única definição (`Class(v.object(...))`).
- Erros de configuração detectados no build, com código, arquivo e linha.

## Non-Goals (v1)
- Protocolos não-HTTP (SQS, EventBridge, AMQP, GraphQL, gRPC) — visão futura.
- WebSockets, response streaming e SSE.
- Serverless Framework v4 upstream (exige login/licença).

## Principles
1. **Build-time sobre runtime:** tudo que puder ser decidido no build é decidido no build.
2. **Paridade NestJS por padrão;** divergências só quando o AOT ou a Lambda exigirem, e documentadas.
3. **Nomes explícitos por protocolo** (`@HttpBody`, `@HttpQuery`...) para evitar colisões futuras.
4. **Contrato analisável:** configurações fora do subconjunto estático geram erro de build, nunca comportamento silencioso.
5. **Nada de código de build no bundle da Lambda.**

## Stack
| Área             | Escolha                                                      |
| :--------------- | :----------------------------------------------------------- |
| Linguagem        | TypeScript — decorators nos modos A, B (padrão) e C (TC39)   |
| Transform modo B | SWC (`decoratorMetadata`) + `reflect-metadata`               |
| Validação        | Zod 4 (peer; codecs exigem ≥ 4.1; validado em 4.4.3)         |
| Análise AOT      | ts-morph                                                     |
| Bundle handlers  | API do esbuild (ESM, `.mjs`)                                 |
| Build da lib     | tsdown                                                       |
| Deploy           | Serverless Framework v3, osls 3.x ou osls 4.x (osls recomendado) |
| Runtime alvo     | Node.js 24 (`nodejs24.x`); Node.js 22 suportado              |
| Testes           | Vitest                                                       |
| Lint             | oxlint (plugins `typescript` e `vitest`)                     |
| Formatação       | oxfmt                                                        |
| Commits          | Conventional Commits (commitlint)                            |
| Git hooks        | lefthook (padrão do monorepo Metha)                          |
| Package manager  | pnpm                                                         |

## Package Entrypoints
| Entrada                                  | Público                    | Pode importar código de build? |
| :--------------------------------------- | :------------------------- | :----------------------------- |
| `serverless-advanced-handlers`           | Código do desenvolvedor    | Não                            |
| `serverless-advanced-handlers/runtime`   | Somente código gerado      | Não                            |
| `serverless-advanced-handlers/testing`   | Testes do desenvolvedor    | Sim (compilador)               |
| `serverless-advanced-handlers/plugin`    | Serverless Framework       | Sim                            |
