# Findings: REQ-205 — SWC no modo B (decorators legado + emitDecoratorMetadata)

## Método

Experimento isolado no scratchpad da sessão (`poc-risks/t-205`, `npm init` local, apagado ao
final). Nenhuma dependência nova no `package.json` da lib; a fixture **não importa a lib** —
reproduz o padrão de `src/decorators/dual.ts` + `src/decorators/di.ts` (decorators no-op com
assinatura dual) num arquivo próprio.

**Versões:** `@swc/core` 1.16.2, `typescript` 6.0.3 (mesma versão fixada em `devDependencies`
da lib — a mais recente, `7.0.2`, remove `moduleResolution: node10` e não foi usada por isso),
`reflect-metadata` 0.2.2, Node v26.7.0, Windows.

**Fixture** (5 arquivos TS, 8 casos):

| Caso | Classe | O que exercita |
| :--- | :--- | :--- |
| 1 | `Logger` | `@Injectable()` sem construtor declarado |
| 2 | `Repository` | `@Injectable()` + 1 param de classe |
| 3 | `Service` | `@Injectable({scope})` + `Logger`, `Repository`, `@Inject(CONFIG) config: Config` (interface), `@Optional() retries?: number` |
| 4 | `ParamOnly` | só decorator de **parâmetro** (`@Inject`), sem decorator de classe |
| 5 | `Undecorated` | nenhum decorator (controle negativo) |
| 6 | `Early`/`Later` | forward reference: dependência declarada **depois** no mesmo arquivo |
| 7 | `Consumer` | dependência de classe em **outro arquivo** (`import {Dep}`) + interface via `import type` |
| 8 | `Holder` | `import` (sem `type`) de um módulo que só exporta tipo, com side effect observável |

**Config `tsc`:** `target: ES2023`, `module: CommonJS`, `strict`, `experimentalDecorators: true`,
`emitDecoratorMetadata: true` (espelha o `tsconfig.json` da lib, que já traz as duas flags).

**Config SWC** (API programática `transformFileSync`, equivalente a `.swcrc`):

```json
{
  "jsc": {
    "parser": {"syntax": "typescript", "decorators": true},
    "target": "es2023",
    "transform": {"legacyDecorator": true, "decoratorMetadata": true},
    "externalHelpers": false
  },
  "module": {"type": "commonjs"},
  "isModule": true
}
```

**Leitura do metadata:** o mesmo probe CJS (`require('reflect-metadata')` +
`Reflect.getOwnMetadata('design:paramtypes', Target)`) roda contra `out-tsc/` e `out-swc/`, e as
saídas JSON são comparadas com `diff`.

## Resultado

`design:paramtypes` — **idêntico nos 8 casos**, lido por `reflect-metadata` em runtime:

| Caso | `tsc` | SWC | Igual? |
| :--- | :--- | :--- | :--- |
| `Logger` (sem construtor) | *não emite* | *não emite* | sim |
| `Repository` | `[Logger]` | `[Logger]` | sim |
| `Service` | `[Logger, Repository, Object, Number]` | `[Logger, Repository, Object, Number]` | sim |
| `ParamOnly` (só param decorator) | `[Object]` | `[Object]` | sim |
| `Undecorated` | *não emite* | *não emite* | sim |
| `Early` → `Later` (forward ref) | `ReferenceError: Cannot access 'Later' before initialization` | mesmo `ReferenceError` | sim (falham igual) |
| `Consumer` (cross-file) | `[Dep, Object]`, e `paramtypes[0] === require('./dep').Dep` | idem, mesma identidade de classe | sim |
| `Holder` (módulo type-only) | `[Object]` | `[Object]` | sim (mas ver ressalva 2) |

Dois pontos onde as saídas **divergem**, nenhum deles em `design:paramtypes`:

1. **SWC emite `design:type = Function` a mais na classe.** Em toda classe decorada, SWC
   adiciona `_ts_metadata("design:type", Function)` junto do `design:paramtypes`; `tsc` não
   emite `design:type` em classes (só em propriedades/métodos).
   `Reflect.getOwnMetadataKeys(Service)` devolve `["design:paramtypes"]` no `tsc` e
   `["design:paramtypes", "design:type"]` no SWC.
2. **SWC não elide import de módulo usado só como tipo** (caso 8).
   `import {OnlyType} from './types-only'` (sem `type`), com `OnlyType` usado apenas como tipo
   de parâmetro: `tsc` elide o `require`; SWC o mantém, e o side effect do módulo executa em
   runtime. O `design:paramtypes` continua `[Object]` nos dois — a divergência é de grafo de
   módulos/bundle, não de metadata.

Diferença de forma (não de valor) na emissão: SWC guarda cada tipo com
`typeof X === "undefined" ? Object : X`, enquanto `tsc` referencia o identificador direto — é
justamente o que permite ao SWC acertar `Object` para interfaces sem fazer type-checking. Nos
casos de TDZ (forward reference) o `typeof` sobre um `class`/`let` não inicializado lança do
mesmo jeito, então o comportamento observável continua igual ao do `tsc`.

## Evidência

`tsc` (`out-tsc/fixture.js`):
```js
exports.Service = Service = __decorate([
    (0, decorators_1.Injectable)({ scope: 'REQUEST' }),
    __param(2, (0, decorators_1.Inject)(exports.CONFIG)),
    __param(3, (0, decorators_1.Optional)()),
    __metadata("design:paramtypes", [Logger,
        Repository, Object, Number])
], Service);
```

SWC (`out-swc/fixture.js`):
```js
Service = _ts_decorate([
    (0, _decorators.Injectable)({ scope: 'REQUEST' }),
    _ts_param(2, (0, _decorators.Inject)(CONFIG)),
    _ts_param(3, (0, _decorators.Optional)()),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        typeof Logger === "undefined" ? Object : Logger,
        typeof Repository === "undefined" ? Object : Repository,
        typeof Config === "undefined" ? Object : Config,
        Number
    ])
], Service);
```

Probe em runtime (`Reflect.getOwnMetadata('design:paramtypes', Service)`), idêntico nos dois builds:
```json
"Service": {
  "hasOwnParamtypes": true,
  "paramtypes": ["Logger", "Repository", "Object", "Number"]
}
```

`diff` completo das saídas dos probes (`tsc` vs. SWC) — as únicas linhas que diferem:
```
13c13,14
<       "design:paramtypes"
---
>       "design:paramtypes",
>       "design:type"
...
"ServiceDesignType": "undefined"   (tsc)
"ServiceDesignType": "Function"    (swc)
```

Cross-file (caso 7) — `diff` vazio, incluindo a checagem de identidade da classe:
```json
{"ConsumerParamtypes": ["Dep", "Object"], "firstParamIsDepClass": true}
```

Caso 8 (módulo type-only), `require`s emitidos:
```
tsc  → require("./decorators")
swc  → require("./decorators") + require("./types-only")   // side effect executa
```

## Veredito

**PASS-COM-RESSALVA**

`design:paramtypes` emitido pelo SWC em modo decorators legado é equivalente ao do `tsc` em
todos os casos testados — incluindo interface→`Object`, `@Inject`/`@Optional` em parâmetro,
decorator só de parâmetro, ausência de emissão em classe não decorada, cross-file com
identidade de classe preservada e o mesmo modo de falha em forward reference — e é legível por
`reflect-metadata` sem nenhuma adaptação. A premissa do modo B se sustenta.

As duas ressalvas não invalidam a premissa, mas precisam estar escritas:

1. `design:type = Function` extra na classe. Inofensivo (chave distinta, não colide com
   `design:paramtypes`); só quebraria código que assertasse igualdade exata sobre
   `Reflect.getOwnMetadataKeys(Target)`.
2. Import de módulo type-only não elidido quando escrito sem `import type`. Não afeta o
   metadata, mas afeta o grafo de módulos — side effect executado e código morto arrastado pro
   bundle, o que importa para o fatiamento por método (F06) e para o bundler (F05).

Não testado (fora do escopo desta task): decorators de método/propriedade (`design:type`,
`design:returntype`), modo TC39 (modo C, onde `emitDecoratorMetadata` não se aplica), e o
pipeline real SWC → esbuild encadeado.

## Impacto

**Nenhuma mudança no design do modo B.** A implementação dual atual
(`src/decorators/{dual,di}.ts`) já é compatível com SWC como está — os decorators são no-op,
e o que o modo B consome (`design:paramtypes`) é produzido de forma equivalente.

Dois itens a registrar para as features seguintes:

- **F05/F06 (bundler/fatiamento):** exigir `import type` para imports usados só como tipo,
  senão o SWC arrasta o módulo pro bundle. A lib já usa `import type` em `di.ts` e tem
  `isolatedModules: true`; vale transformar isso em regra explícita de `CONVENTIONS.md`/lint
  em vez de convenção implícita, e é um candidato a linha de `CONCERNS.md` (severidade baixa,
  mitigação conhecida).
- Qualquer verificação futura sobre as chaves de metadata de uma classe deve checar
  **presença de `design:paramtypes`**, nunca o conjunto exato de `getOwnMetadataKeys` — ele
  varia entre `tsc` e SWC.
