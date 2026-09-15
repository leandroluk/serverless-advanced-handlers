# Findings: REQ-207 — Harness de benchmark de granularidade (cold start)

> **Nenhum deploy foi feito.** Nenhuma chamada saiu para a AWS. O que existe aqui é (a) os artefatos das variantes, buildados e executados localmente, (b) um proxy local de custo de inicialização e (c) o script de medição real, pronto e **não executado** — conforme `tasks.md` T-207 e `design.md` (Decision Log #4).

## Método

### Ambiente

- Windows 11, Node **v26.7.0**, npm **12.0.2**.
- Diretório descartável no scratchpad da sessão (`<scratchpad>/poc-risks/t-207/`), **apagado ao final**. `package.json`, `pnpm-lock.yaml`, `src/` e `node_modules/` da lib ficaram intocados.
- Dependências instaladas só ali: `esbuild@0.28.2` e `typescript@6.0.3` (mesmas versões do `devDependencies` da lib), `@types/node@26.0.0`, `@nestjs/core@11`, `@nestjs/common@11`, `@nestjs/platform-express@11`, `reflect-metadata@0.2.2`, `rxjs@7`.

### Decisão: NestJS real, não container DI simulado

A task deixava as duas opções. Escolhi o **pacote real** (`@nestjs/core` + `@nestjs/common` + `@nestjs/platform-express` + `reflect-metadata` + `rxjs`). Motivo: o que domina o cold start do approach tradicional **não é resolver providers** — é carregar os ~2,7 MB de módulos do framework antes de resolver qualquer coisa. Um container simulado reproduziria a parte barata (resolução) e apagaria a parte cara (carga do módulo), que é exatamente o que se quer medir. A separação `require` vs. `bootstrap` na tabela de Resultado confirma essa intuição: **62 ms de carga contra 53 ms de bootstrap** — um container simulado teria mostrado só a segunda metade.

### As variantes (mesmo trabalho de negócio nas quatro)

O trabalho de negócio é idêntico e vive num único módulo (`shared/order-domain.ts`, inlinado pelo esbuild em cada bundle, então cada bundle continua auto-contido): parsear o `body`, validar `customer` (string não vazia) e `amount` (número positivo), e devolver `200 {ok, orderId, customer, amount, total}` ou `400 {ok:false, errors[]}`.

| Variante | O que é | Como foi construída |
| :--- | :--- | :--- |
| **A** `a-nest-full` | Bootstrap NestJS completo por invocação | `AppModule` → `CoreModule` (`@Global`, 5 providers em cadeia: Config → Logger → Clock → Id → Metrics) + `OrdersModule` (`OrdersController` com 5 métodos, `OrdersService`, `OrdersRepository`). O handler chama `NestFactory.create(AppModule)` + `app.init()` + `app.get(OrdersController).create(...)` + `app.close()` **a cada invocação**, sem cache — proposital. |
| **B** `b-per-controller` | Um bundle por controller | Os mesmos 5 métodos (`create`/`get`/`list`/`update`/`remove`), cada um em seu módulo, mais uma tabela de rotas que casa `httpMethod` + `rawPath` dentro do handler. Sem DI, sem framework. |
| **B2** `b2-per-controller-heavy` | Um bundle por controller, **realista** | Igual a B, mas dois dos cinco métodos irmãos têm dependência real que o `POST /orders` não usa: `list` importa `rxjs`, `remove` importa `express`. |
| **C** `c-per-method` | Um bundle por método (alvo da lib) | Só o código de `POST /orders`. Sem tabela de rotas, sem os outros 4 métodos, sem container. |

**Por que B2 existe (desvio deliberado do roteiro, não é SPEC_DEVIATION).** Com B "limpa" (nenhum método com dependência externa), B e C ficam a 0,1 ms de distância — o número seria verdadeiro e inútil, porque sugeriria que a granularidade `method` não paga nada sobre `controller`. O custo real de agrupar por controller não está no roteamento: está em **carregar as dependências dos métodos irmãos que a invocação atual não vai usar**. B2 mede isso com dependências reais publicadas, e é a comparação que de fato informa F06. Mantive B na tabela como piso do overhead de roteamento puro.

### Build (config idêntica nas 4)

Duas etapas, as mesmas para todas as variantes:

1. **`tsc`** — um único `tsconfig.json` (`target: ES2022`, `module: commonjs`, `experimentalDecorators: true`, `emitDecoratorMetadata: true`). Necessário porque a variante A depende de `design:paramtypes` para a DI do Nest e **esbuild não emite metadata de decorator**. Aplicar `tsc` também em B/B2/C mantém a comparação justa (mesmo pipeline, só o conteúdo muda). Nota de ambiente: TS 6.0.3 exige `"ignoreDeprecations": "6.0"` para `moduleResolution: node10` e não faz auto-inclusão de `@types/node` sem `"types": ["node"]` explícito.
2. **`esbuild`** — API programática, opções literalmente compartilhadas via spread:

```js
const common = {
  bundle: true, platform: 'node', target: 'node22', format: 'cjs',
  minify: false, sourcemap: false, metafile: true, logLevel: 'error',
  external: ['@nestjs/microservices', '@nestjs/websockets', '@nestjs/platform-fastify',
             'class-transformer', 'class-validator', 'cache-manager', /* ...peers opcionais */],
};
```

`format: 'cjs'` e não ESM: `@nestjs/core` resolve peers opcionais por `require()` dinâmico dentro de `try/catch`, e T-204 já documentou que `Dynamic require` é o modo de falha real do bundle ESM. CJS mantém a variante A honesta sem precisar do banner `createRequire`; as outras três funcionariam em qualquer formato. A lista `external` cobre só peers opcionais do Nest que nenhuma variante usa em runtime (confirmado: A executa sem eles).

### Medição local-proxy — o que é e o que não é

**Não é cold start de AWS.** É o custo de inicialização que domina o cold start, medido no mesmo pipeline em que vai rodar. Para cada amostra, um **processo `node` novo** executa `bench/run-one.mjs <bundle>`, que mede com `performance.now()` (cujo `timeOrigin` é o início do processo):

- `nodeBootMs` — boot do próprio Node até o script começar (constante ~21 ms nas 4, serve de controle);
- `requireMs` — `require(bundle)` do zero → corresponde ao que a Lambda contabiliza como **Init Duration**;
- `firstInvokeMs` — primeira chamada `handler(event, {})` até a resposta;
- `initToFirstResponseMs` — a soma, que é a métrica comparativa.

30 amostras por variante, disparadas em **round-robin** entre as variantes (dilui deriva térmica/scheduler), com 2 rodadas de aquecimento descartadas.

O que o proxy **não** captura: download/descompactação do zip pela Lambda (que penaliza mais ainda os bundles grandes), inicialização da sandbox Firecracker, e o efeito do `memorySize` (que na Lambda escala CPU proporcionalmente, então a diferença absoluta em ms tende a ser **maior** em funções de pouca memória).

## Resultado

### Tamanho dos artefatos

| Variante | Bundle | Módulos inlinados | Zip pronto p/ deploy |
| :--- | ---: | ---: | ---: |
| A — bootstrap NestJS completo | **2 699,8 KB** | 776 | 534 889 B |
| B — um bundle por controller | **6,0 KB** | 8 | 1 745 B |
| B2 — controller c/ deps irmãs | **1 491,0 KB** | 373 | 346 088 B |
| C — um bundle por método | **3,0 KB** | 4 | 1 167 B |

### Tempo local-proxy (30 amostras, processo novo por amostra)

`node v26.7.0 | win32 x64`

| Variante | require p50 | 1ª invocação p50 | **init→1ª resposta p50** | p95 | min | média | boot node p50 |
| :--- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| A — NestJS completo | 62,22 ms | 53,10 ms | **114,62 ms** | 166,06 | 96,96 | 124,45 | 21,52 |
| B — por controller | 0,94 ms | 0,16 ms | **1,10 ms** | 1,96 | 1,00 | 1,19 | 21,16 |
| B2 — controller c/ deps irmãs | 41,64 ms | 0,17 ms | **41,81 ms** | 46,34 | 38,48 | 42,05 | 20,48 |
| C — por método | 0,84 ms | 0,12 ms | **1,00 ms** | 1,22 | 0,86 | 1,00 | 21,03 |

### Comparativo (base = C, granularidade alvo)

| Comparação | Bundle | init→1ª resposta | Leitura |
| :--- | ---: | ---: | :--- |
| A / C | **900×** | **≈ 115×** (+113,6 ms) | O custo do framework completo por cold start |
| B2 / C | **497×** | **≈ 42×** (+40,8 ms) | **O imposto dos métodos irmãos** — o número que importa para F06 |
| B / C | 2× | ≈ 1,1× (+0,10 ms) | Overhead de roteamento interno puro: praticamente zero |

O `boot do node` (~21 ms) é idêntico nas quatro, o que confirma que a diferença medida é atribuível ao artefato e não a ruído do processo.

### Contabilidade Init vs. Duration (importa para ler o número real depois)

A variante A, como escrita, faz o bootstrap **dentro** do handler: na Lambda, os ~62 ms de `require` cairiam em `Init Duration` e os ~53 ms de bootstrap em **toda** `Duration`, inclusive nas invocações mornas. O padrão real de mercado (promise de app cacheada no escopo do módulo) move os ~53 ms para dentro do `Init Duration` e zera o custo nas mornas. Em ambos os casos o total de cold start é o mesmo ~115 ms — muda só a coluna do REPORT em que ele aparece. Quem rodar a medição real precisa saber disso para não concluir que "o Init da A é só 62 ms".

## Evidência

Build (config idêntica nas 4):

```
[tsc] compilando src/ -> build/tsc ...
[esbuild] a-nest-full.cjs             -> 2764578 bytes (2699.8 KB), 776 modulos inlinados
[esbuild] b-per-controller.cjs        ->    6168 bytes (   6.0 KB),   8 modulos inlinados
[esbuild] b2-per-controller-heavy.cjs -> 1526750 bytes (1491.0 KB), 373 modulos inlinados
[esbuild] c-per-method.cjs            ->    3120 bytes (   3.0 KB),   4 modulos inlinados
```

Cada bundle executa com `node` puro, chamando o handler direto com um evento falso (`{rawPath:'/orders', httpMethod:'POST', body:'{"customer":"acme corp","amount":199.99}'}`):

```
a-nest-full             {"nodeBootMs":20.43,"requireMs":62.63,"firstInvokeMs":78.95,"statusCode":200,
                         "body":"{\"ok\":true,\"orderId\":\"ord-mu2xzzzq\",\"customer\":\"acme corp\",\"amount\":199.99,\"total\":219.99}"}
b-per-controller        {"nodeBootMs":19.54,"requireMs":0.91, "firstInvokeMs":0.16, "statusCode":200, ... "total\":219.99}"}
b2-per-controller-heavy {"nodeBootMs":22.82,"requireMs":46.94,"firstInvokeMs":0.18, "statusCode":200, ... "total\":219.99}"}
c-per-method            {"nodeBootMs":20.16,"requireMs":0.76, "firstInvokeMs":0.11, "statusCode":200, ... "total\":219.99}"}
```

Equivalência de comportamento — mesmo `total` (219,99) nas quatro no caminho feliz, e mesmo `400` com os mesmos erros no caminho negativo:

```
a-nest-full              invalido -> 400 {"ok":false,"errors":["customer: required non-empty string","amount: required positive number"]}
b-per-controller         invalido -> 400 {"ok":false,"errors":["customer: required non-empty string","amount: required positive number"]}
b2-per-controller-heavy  invalido -> 400 {"ok":false,"errors":["customer: required non-empty string","amount: required positive number"]}
c-per-method             invalido -> 400 {"ok":false,"errors":["customer: required non-empty string","amount: required positive number"]}
```

As outras 4 rotas do controller respondem (prova de que B/B2 são de fato um controller inteiro, não um método disfarçado):

```
B  GET    /orders    -> 200 []
B  DELETE /orders/x  -> 400 {"ok":false,"errors":["order x not found"]}
B2 GET    /orders    -> 200 []            # caminho que usa rxjs
B2 DELETE /orders/x  -> 400 {...}         # caminho que usa express
```

Zips prontos para `package.artifact`:

```
[zip] a-nest-full.zip             -> 534889 bytes
[zip] b-per-controller.zip        ->   1745 bytes
[zip] b2-per-controller-heavy.zip -> 346088 bytes
[zip] c-per-method.zip            ->   1167 bytes
```

## Script de medição real (pronto, não executado)

### Como forçar cold start de verdade

Não existe "flush" de sandbox na Lambda. O único mecanismo suportado é **mudar a configuração da function** (`update-function-configuration`): qualquer mudança descarta o execution environment atual, e a invocação seguinte paga `Init` obrigatoriamente. O script abaixo muda uma env var `COLD_NONCE` antes de cada amostra e espera `function-updated-v2`.

O número sai do `REPORT` do CloudWatch, campo `Init Duration`, lido via `--log-type Tail` (os últimos 4 KB do log vêm na própria resposta do `invoke`, em base64) — isso evita depender da latência de ingestão do CloudWatch Logs.

**Comando exato:**

```bash
# pré-requisitos: `sls deploy --stage dev` feito, AWS CLI v2 autenticada
node bench/measure-aws.mjs --service poc-granularity --stage dev --region us-east-1 --runs 10
# varredura de memória (CPU da Lambda escala com memorySize; a diferença muda de forma):
for m in 128 256 512 1024 1769; do node bench/measure-aws.mjs --runs 8 --memory $m; done
```

**`bench/measure-aws.mjs`** (verificado com `node --check`; **não executado**):

```js
#!/usr/bin/env node
import { execFileSync } from 'node:child_process';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

const RESPONSE_FILE = join(tmpdir(), 'poc-granularity-response.json');
const argv = process.argv.slice(2);
const arg = (name, def) => { const i = argv.indexOf(`--${name}`); return i >= 0 ? argv[i + 1] : def; };

const SERVICE = arg('service', 'poc-granularity');
const STAGE   = arg('stage', 'dev');
const REGION  = arg('region', process.env.AWS_REGION ?? 'us-east-1');
const RUNS    = Number(arg('runs', 10));
const MEMORY  = arg('memory', null);

const FUNCTIONS = [
  { id: 'A  bootstrap NestJS completo', fn: `${SERVICE}-${STAGE}-nestFull` },
  { id: 'B  um bundle por controller',  fn: `${SERVICE}-${STAGE}-perController` },
  { id: 'B2 controller c/ deps irmas',  fn: `${SERVICE}-${STAGE}-perControllerHeavy` },
  { id: 'C  um bundle por metodo',      fn: `${SERVICE}-${STAGE}-perMethod` },
];

const EVENT = {
  version: '2.0', rawPath: '/orders', httpMethod: 'POST',
  requestContext: { http: { method: 'POST', path: '/orders' } },
  body: JSON.stringify({ customer: 'acme corp', amount: 199.99 }),
};

const aws = args => execFileSync('aws', [...args, '--region', REGION], { encoding: 'utf8', maxBuffer: 32 * 1024 * 1024 });

/** Invalida o sandbox atual mudando a config; espera a function voltar a Active. */
function forceCold(fn, nonce) {
  const env = JSON.stringify({ Variables: { COLD_NONCE: String(nonce) } });
  const args = ['lambda', 'update-function-configuration', '--function-name', fn, '--environment', env];
  if (MEMORY) args.push('--memory-size', MEMORY);
  aws(args);
  aws(['lambda', 'wait', 'function-updated-v2', '--function-name', fn]);
}

/** Invoca e extrai Init Duration / Duration / Max Memory Used do REPORT. */
function invokeAndRead(fn) {
  const out = aws(['lambda', 'invoke', '--function-name', fn, '--log-type', 'Tail',
                   '--cli-binary-format', 'raw-in-base64-out', '--payload', JSON.stringify(EVENT),
                   '--query', 'LogResult', '--output', 'text', RESPONSE_FILE]);
  const log = Buffer.from(out.trim().split(/\s+/).pop(), 'base64').toString('utf8');
  const report = log.split('\n').find(l => l.startsWith('REPORT')) ?? '';
  const num = re => { const m = report.match(re); return m ? Number(m[1]) : null; };
  return {
    initMs:     num(/Init Duration: ([\d.]+) ms/),
    durationMs: num(/\tDuration: ([\d.]+) ms/),
    billedMs:   num(/Billed Duration: ([\d.]+) ms/),
    maxMemMb:   num(/Max Memory Used: (\d+) MB/),
    report,
  };
}

const pct = (a, p) => a.slice().sort((x, y) => x - y)[Math.min(a.length - 1, Math.floor((p / 100) * a.length))];
const rows = [];

for (const f of FUNCTIONS) {
  const inits = [], durations = [];
  for (let i = 0; i < RUNS; i++) {
    forceCold(f.fn, `${Date.now()}-${i}`);
    const r = invokeAndRead(f.fn);
    if (r.initMs == null) { console.warn(`[aviso] ${f.fn} run ${i}: sem "Init Duration" (warm?) - descartada`); continue; }
    inits.push(r.initMs); durations.push(r.durationMs);
    console.log(`${f.fn} run ${i + 1}/${RUNS}: init=${r.initMs}ms duration=${r.durationMs}ms mem=${r.maxMemMb}MB`);
  }
  rows.push(inits.length === 0
    ? { variante: f.id, amostras: 0, nota: 'nenhum Init Duration capturado' }
    : { variante: f.id, amostras: inits.length,
        'Init p50 (ms)': +pct(inits, 50).toFixed(1), 'Init p95 (ms)': +pct(inits, 95).toFixed(1),
        'Init min (ms)': +pct(inits, 0).toFixed(1), 'Duration p50 (ms)': +pct(durations, 50).toFixed(1) });
}
console.log(`\nregiao=${REGION} stage=${STAGE} memoria=${MEMORY ?? '(a do serverless.yml)'}`);
console.table(rows);
```

Portabilidade: o payload da resposta vai para arquivo temporário (não `/dev/stdout`), então o script roda igual no Windows.

**Alternativas** (se preferir não escrever script próprio): AWS Lambda Power Tuning (state machine do SAR) devolve a curva custo×latência por `memorySize` mas mede invocações **mornas** — não serve direto para cold start; e o X-Ray expõe o subsegmento `Initialization` por trace, útil para conferir o `Init Duration` do REPORT, com o custo de habilitar tracing nas 4 functions.

### `serverless.yml` — as variantes como functions separadas

Reaproveita a estrutura da fixture validada em T-201 (`plugins:` por subpath do pacote, `provider.runtime: nodejs24.x`). `package.individually: true` + `package.artifact` fazem subir **exatamente o bundle medido localmente**, sem o empacotador do framework interferir:

```yaml
service: poc-granularity
frameworkVersion: '3'

plugins:
  # T-201: este subpath resolve e instancia em serverless@3, osls@3 e osls@4.
  # Enquanto dist/plugin.cjs estiver vazio (0 bytes), COMENTAR esta seção —
  # o modo de falha é `TypeError: Plugin is not a constructor` (T-201, Evidência).
  - serverless-advanced-handlers/plugin

provider:
  name: aws
  runtime: nodejs24.x        # v3 upstream só avisa; o CFN sai correto (T-201 / REQ-202)
  region: us-east-1
  stage: ${opt:stage, 'dev'}
  architecture: arm64
  memorySize: 512
  timeout: 15
  logRetentionInDays: 1      # contém custo de log da POC
  versionFunctions: false

package:
  individually: true

functions:
  nestFull:
    handler: a-nest-full.handler
    description: 'Variante A - bootstrap NestJS completo por invocacao'
    package: { artifact: .artifacts/a-nest-full.zip }
  perController:
    handler: b-per-controller.handler
    description: 'Variante B - um bundle por controller (5 metodos, roteamento interno)'
    package: { artifact: .artifacts/b-per-controller.zip }
  perControllerHeavy:
    handler: b2-per-controller-heavy.handler
    description: 'Variante B2 - controller com deps reais em metodos irmaos (rxjs, express)'
    package: { artifact: .artifacts/b2-per-controller-heavy.zip }
  perMethod:
    handler: c-per-method.handler
    description: 'Variante C - um bundle por metodo (granularidade alvo da lib)'
    package: { artifact: .artifacts/c-per-method.zip }
```

Detalhes que custam uma iteração se ignorados: sem `events:` de propósito (a medição invoca direto pelo SDK/CLI, não precisa de API Gateway — menos superfície e menos custo); `architecture: arm64` deve ser mantido igual nas quatro; o handler aponta para `<id>.cjs` na raiz do zip (o runtime Node da Lambda resolve `.js`/`.mjs`/`.cjs`). O empacotamento dos zips é feito por `package-zips.mjs`, que copia cada bundle para a raiz de um zip próprio (`Compress-Archive` no Windows, `zip -j` no resto).

## Veredito

**PASS-COM-RESSALVA.**

`PASS` está fora de questão por construção: nenhum número de cold start real de AWS foi medido, e o `Done when` da T-207 não pede isso. O que a task pedia — "os 3 artefatos existem e buildam localmente sem erro; o script de medição está pronto e documentado (comando exato pra rodar)" — está **inteiramente cumprido**, com uma quarta variante a mais:

- as 4 variantes buildam com config esbuild idêntica e **executam** com `node` puro, produzindo o mesmo resultado de negócio no caminho feliz e no negativo;
- a medição local-proxy roda, é reprodutível (30 amostras, processo novo por amostra, round-robin, aquecimento descartado) e tem controle interno (boot do Node constante nas 4);
- o script de medição real está escrito, sintaticamente verificado, portável, e com o comando exato documentado — **não executado**.

**O que o proxy local já sugere** (indicativo, não definitivo):

1. A diferença entre "framework completo" e "por método" **não é marginal**: ~115 ms contra ~1 ms de custo de inicialização, e 900× de tamanho de bundle. Mesmo que a Lambda real mude a constante, uma diferença de duas ordens de grandeza não se inverte com mudança de ambiente — e tende a ficar **maior** lá, porque o proxy não cobra o download/descompactação dos 535 KB nem o efeito de CPU reduzida em memória baixa.
2. A diferença entre "por controller" e "por método" **depende inteiramente das dependências dos métodos irmãos**. Com métodos sem dependência externa, é ruído (0,10 ms). Com dois dos cinco métodos puxando `rxjs` e `express`, vira ~41 ms e 497× de bundle. Ou seja: a proposta de valor da granularidade `method` **não é o roteamento** — é o tree-shaking de fato entre métodos.

**Ressalvas honestas do método**, que o deploy real precisa resolver: (a) proxy local em Windows/Node 26, não Amazon Linux/`nodejs24.x` em Firecracker; (b) sem download/descompactação de artefato, que penaliza os grandes; (c) sem o efeito de `memorySize` sobre CPU; (d) a variante A faz bootstrap dentro do handler, o que desloca ~53 ms de `Init Duration` para `Duration` no REPORT real (ver "Contabilidade Init vs. Duration").

## Impacto

1. **`F06 method-slicing` — o achado #2 acima é o requisito, não o #1.** A justificativa da granularidade `method` que se sustenta em número é *isolamento de dependências entre métodos irmãos*, não economia de roteamento. Consequência concreta para o slicer: fatiar por método só entrega valor se o grafo de imports for recortado **por método** — se o slicer emitir um bundle por método mas mantiver o barrel/import compartilhado do controller, o resultado converge para B2 (~42×) em vez de C (~1×), e o esforço todo se perde. Vale registrar isso como critério de aceite do F06: *o bundle do método X não pode conter módulo alcançável apenas a partir do método Y*.
2. **`F06` — B como piso.** Roteamento interno custa ~0,1 ms. Se em algum ponto do design houver trade-off entre granularidade `method` e simplicidade de implementação, esse número diz que **agrupar métodos que compartilham exatamente as mesmas dependências é gratuito**. Pode virar otimização legítima (menos functions no CFN, menos cota) sem penalidade de cold start.
3. **`F10 serverless-plugin` — nada muda.** A fixture de T-201 serve sem alteração; `package.individually` + `artifact` por function é o modelo que o plugin vai gerar de qualquer jeito. Único ponto operacional: com granularidade `method`, o número de functions por serviço cresce rápido — o limite prático a vigiar é o de recursos por stack CloudFormation (500), a ~4 recursos por function. Não é achado desta task, mas é a consequência direta dela e cabe uma linha em `CONCERNS.md`.
4. **`CONCERNS.md` — sem linha nova de risco.** Nada aqui refuta premissa arquitetural. O risco "a granularidade `method` pode não valer o esforço" fica **rebaixado a indicativo favorável**, ainda pendente de número real de AWS antes de ser dado como resolvido.

## Próximo passo manual (requer autorização explícita do usuário)

**Nada disso foi feito. Cada passo abaixo gasta dinheiro em conta AWS real e precisa de "sim" explícito.**

Custo estimado: quatro functions, ~40 invocações e ~40 `update-function-configuration`, com log retido por 1 dia — dentro do free tier na prática; o gasto material é o tempo (o `wait function-updated-v2` domina, ~5–15 s por amostra, então ~10 min por rodada completa).

1. **Recriar o harness** (foi apagado — é descartável por design, `design.md` Decision Log #1). Recriá-lo é reescrever os fontes das 4 variantes descritos em "Método" e os dois scripts transcritos acima; `npm i esbuild@0.28.2 typescript@6.0.3 @types/node@26 @nestjs/core@11 @nestjs/common@11 @nestjs/platform-express@11 reflect-metadata@0.2.2 rxjs@7`.
2. **Buildar e empacotar:** `node build.mjs && node package-zips.mjs` → confere os 4 `.artifacts/*.zip`.
3. **Conferir credenciais:** `aws sts get-caller-identity`. ⚠️ **Nesta sessão isso falha com `SSL: CERTIFICATE_VERIFY_FAILED`** (constraint já registrada no `spec.md`) — os passos 3 a 6 exigem um ambiente com rede liberada para endpoints AWS.
4. **Deploy** (comentar a linha `plugins:` enquanto `dist/plugin.cjs` estiver vazio): `npx serverless deploy --stage dev --region us-east-1`. Confirmar que as 4 functions apareceram: `aws lambda list-functions --query "Functions[?starts_with(FunctionName,'poc-granularity-dev')].FunctionName"`.
5. **Medir:** `node bench/measure-aws.mjs --stage dev --region us-east-1 --runs 10`. Opcionalmente varrer `--memory 128 256 512 1024 1769`.
6. **Limpar (obrigatório, evita custo residual de log):** `npx serverless remove --stage dev --region us-east-1`.
7. **Fechar o veredito:** substituir a tabela local-proxy por `Init Duration` real e promover este findings a `PASS` (ou revisar o design de F06 se o número real contradisser o indicativo).
