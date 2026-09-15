# Architecture (planejada — greenfield)

Detalhes completos em [INSIGHT.md](../../INSIGHT.md). Resumo das camadas:

## Estado atual (F00/F01a/F01b concluídas)

Apenas a camada `Dev` (entrada raiz `.`) e um fragmento mínimo de `Run` (`/runtime`, só `defineReflectMetadata`) existem em código. `Build` (`/plugin`) e o restante de `Run`/`Test` (`/testing`) são placeholders vazios — o diagrama abaixo permanece a visão-alvo, não o estado atual. Ver [STRUCTURE.md](STRUCTURE.md) para o mapeamento real de `src/` e [INTEGRATIONS.md](INTEGRATIONS.md) para o que está de fato conectado hoje.

```mermaid
flowchart LR
    subgraph Dev [Entrada raiz]
        V[validation: v, resolveMeta, toOpenapiSchema]
        C[class: Class, isServerlessAdvancedHandlersClass]
        D[decorators: DI, HTTP, pipeline, OpenAPI, LambdaConfig]
    end
    subgraph Build [Entrada /plugin]
        A[compiler/ast-analyzer] --> R[compiler/di-resolver]
        R --> S[compiler/slicer]
        S --> G[compiler/code-generator]
        A --> X[compiler/schema-extractor] --> O[compiler/openapi-generator]
        G --> B[bundler/esbuild-bundler]
        P[plugin.ts: hooks Serverless] --> A
        P --> B
    end
    subgraph Run [Entrada /runtime]
        H[http-handler, transport, errors, uploads]
    end
    subgraph Test [Entrada /testing]
        T[Test.createTestingModule, createHttpApp, vitest plugin]
    end
    G -. gera código que importa .-> H
    T --> A
    Dev -. usado por .-> Build
```

## Fronteiras
- **Raiz e `/runtime`** nunca importam `ts-morph`, `esbuild` ou `typescript` (REQ-002).
- **Decorators** não têm efeito em runtime nas Lambdas: são lidos pelo compilador e removidos das fatias.
- **Schemas** são executados em build somente dentro do processo filho do Schema Extractor.
