# Findings: REQ-201, REQ-202, REQ-203 - Plugin loader + nodejs24.x + serverless-offline

> Arquivo unico para os 3 REQs (opcao prevista em `tasks.md` T-201, "Entrega"). Justificativa: os tres sub-riscos compartilham a mesma fixture, o mesmo `serverless.yml` e a mesma matriz de 3 motores; separar em 3 arquivos duplicaria Metodo e Evidencia sem acrescentar nada.

## Metodo

### Ambiente

- Windows 11, Node **v26.7.0**, npm **12.0.2**, registry `https://registry.npmjs.org/`.
- Diretorio de trabalho descartavel no scratchpad da sessao (`<scratchpad>/poc-risks/t-201/`), **apagado ao final**. Nada foi instalado, commitado ou alterado no repositorio principal - `package.json`, `pnpm-lock.yaml`, `src/` e `node_modules/` do pacote ficaram intocados.
- Tres subdiretorios independentes, cada um com seu proprio `package.json` (`npm init -y`) e `node_modules` proprio.

### Pacotes: o que e "osls"

`osls` e publicado no npm como pacote proprio (fork comunitario do Serverless Framework). `npm view osls dist-tags`:

```json
{ "legacy": "3.78.0", "beta": "4.0.0-beta.2", "alpha": "4.0.0-alpha.1", "latest": "4.3.1" }
```

Ou seja: a linha **3.x e a dist-tag `legacy`** (3.78.0) e a **4.x e a `latest`** (4.3.1). O pacote expoe os bins `sls`, `osls` **e `serverless`** (`npm view osls@4.3.1 bin`), e declara `engines.node: "^20.19.0 || ^22.13.0 || >=24"`.

### Decisao de instalacao: alias npm

`serverless-offline` declara `peerDependencies: { "serverless": "^3.2.0" }` (v13) e `{ "serverless": "^4.0.0" }` (v14). Instalar `osls` sob o nome `osls` deixaria esse peer insatisfeito. Instalei via **alias npm** (`serverless@npm:osls@<versao>`), que resolve o peer e mantem `require('serverless')` funcionando:

| Diretorio | Comando exato |
| :--- | :--- |
| `sls-v3` | `npm install --no-save serverless@3.40.0 serverless-offline@13.10.1` |
| `osls-v3` | `npm install --no-save "serverless@npm:osls@3.78.0" serverless-offline@13.10.1` |
| `osls-v4` | `npm install --no-save "serverless@npm:osls@4.3.1" serverless-offline@14.8.2` |

Versoes confirmadas em runtime: `osls version: 3.78.0 (local)`, `osls version: 4.3.1 (local)`, `framework 3.40.0 (local)`.

### Decisao de fixture do plugin (e por que)

O artefato real do repo, `dist/plugin.cjs`, tem **0 bytes** - e o placeholder `export {}` de `src/plugin/index.ts` compilado. Um modulo CJS sem export nao e construtor, entao usa-lo sozinho produziria um `FAIL` que **nao diz nada sobre resolucao de modulo**, que e o risco de REQ-201.

Por isso usei uma fixture **com as duas variantes**, num pacote local em `node_modules/serverless-advanced-handlers/` que **espelha o `exports` real do `package.json` do repo** (mesmo `"type": "module"`, mesmas condicoes `types`/`require`/`default` apontando para `.cjs`):

| Subpath | Conteudo | Para que |
| :--- | :--- | :--- |
| `./plugin` | classe CJS real (`module.exports = class`) que loga no construtor e registra `hooks.initialize` | testar resolucao **e** instanciacao (REQ-201) |
| `./plugin-empty` | **copia byte-a-byte do `dist/plugin.cjs` real** (0 bytes) | controle: isolar "nao resolve" de "resolve mas nao e construtor" |
| `./plugin-schemafix` | classe que percorre `configSchemaHandler.schema` e estende o enum de runtime | testar o workaround de REQ-202 |

Ou seja: fidelidade total no **mecanismo de resolucao** (subpath exports de pacote ESM apontando para `.cjs`), mais um plugin com corpo real para que a evidencia de carregamento seja positiva e nao ambigua.

### Fixtures `serverless.yml` e comandos

Configs rodadas com `--config <arquivo>`: `sls-base.yml` (sem plugin, `nodejs20.x` - controle), `sls-plugin.yml` (plugin, `nodejs20.x`), `sls-n24.yml` (plugin + `nodejs24.x`), `sls-n24-strict.yml` (idem + `configValidationMode: error`), `sls-n24-fix.yml` (idem + `plugin-schemafix`), `sls-offline.yml` (plugin + `serverless-offline` + `nodejs24.x`), `sls-emptyplugin.yml` (subpath do placeholder vazio).

Comandos por motor: `sls print`, `sls package` (+ inspecao do `Runtime` no CloudFormation gerado), `sls invoke local --function dummy`, e `sls offline start --httpPort <p>` seguido de `GET /dummy`. Credenciais AWS falsas via env - nenhum comando precisou de rede AWS; **nenhum deploy foi feito**.

## Resultado por motor

| Motor | REQ-201 (plugin carrega) | REQ-202 (nodejs24.x aceito) | REQ-203 (offline invoca) |
|---|---|---|---|
| Serverless v3 (`serverless@3.40.0`) | **PASS** - construtor executado em `print`, `package`, `invoke local` e `offline` | **PASS-COM-RESSALVA** - enum do schema para em `nodejs20.x`: emite `Warning`, `rc=0`, e o CloudFormation sai com `nodejs24.x` correto; **erro fatal** sob `configValidationMode: error` (workaround validado) | **PASS** - `serverless-offline@13.10.1`, `GET /dummy` -> HTTP 200 |
| osls 3.x (`osls@3.78.0`) | **PASS** | **PASS** - `nodejs24.x` ja esta no enum; sem warning, passa ate com `configValidationMode: error` | **PASS** - `serverless-offline@13.10.1`, HTTP 200 |
| osls 4.x (`osls@4.3.1`) | **PASS** | **PASS** - idem, sem warning, passa em modo estrito | **PASS** - `serverless-offline@14.8.2`, HTTP 200 |

Nenhum motor ficou `INCONCLUSIVO`: os tres instalaram do registry publico sem incidente.

## Evidencia

### REQ-201 - subpath resolve e instancia nos tres

```
# sls-v3:   sls print --config sls-plugin.yml
[POC-PLUGIN] constructed; subpath=serverless-advanced-handlers/plugin; sls=3.40.0
[POC-PLUGIN] hook:initialize
rc=0
# osls-v3:  mesmo comando
[POC-PLUGIN] constructed; subpath=serverless-advanced-handlers/plugin; sls=3.78.0
[POC-PLUGIN] hook:initialize
rc=0
# osls-v4:  mesmo comando
[POC-PLUGIN] constructed; subpath=serverless-advanced-handlers/plugin; sls=4.3.1
[POC-PLUGIN] hook:initialize
rc=0
```

Controle com o `dist/plugin.cjs` **real** (0 bytes), identico nos tres motores - note que o erro e de *instanciacao*, nao de resolucao:

```
Error:
TypeError: Plugin is not a constructor
    at PluginManager.addPlugin (.../node_modules/serverless/lib/classes/plugin-manager.js:91:28)
rc=1
```

Baseline do resolver do Node, sem framework nenhum: `node -e "require('serverless-advanced-handlers/plugin')"` -> `require subpath OK -> function ServerlessAdvancedHandlersPlugin`.

### REQ-202 - o enum de `provider.runtime` por motor

```
$ grep -o "nodejs2[0-9]\.x" node_modules/serverless/lib/plugins/aws/provider.js | sort -u
sls-v3   -> nodejs20.x
osls-v3  -> nodejs20.x  nodejs22.x  nodejs24.x
osls-v4  -> nodejs20.x  nodejs22.x  nodejs24.x
```

Serverless v3 upstream, modo padrao (`sls print`/`sls package`) - avisa mas **nao rejeita**:

```
Warning: Invalid configuration encountered
  at 'provider.runtime': must be equal to one of the allowed values [dotnet6, go1.x, java21, ...,
  nodejs14.x, nodejs16.x, nodejs18.x, nodejs20.x, provided, ...]
...
Service packaged (63s)
rc=0
```

E o template gerado sai correto nos tres (`.serverless/cloudformation-template-update-stack.json`):

```
CFN Runtime: DummyLambdaFunction -> nodejs24.x     # sls-v3, osls-v3 e osls-v4
```

Serverless v3 com `configValidationMode: error` - ai sim e fatal:

```
Error:
Configuration error at 'provider.runtime': must be equal to one of the allowed values [...]
rc=1
```

**Workaround validado** (mesma config estrita + `plugin-schemafix` carregado antes): `rc=0`, sem erro. Detalhe que custou uma iteracao e importa para F10: `configSchemaHandler.schema.properties.provider.properties.runtime` **nao tem `enum`** - e `{ "$ref": "#/definitions/awsLambdaRuntime" }`. A primeira tentativa de patch falhou com `[POC-SCHEMAFIX] nao achei enum em provider.runtime; shape=["$ref"]`. O patch que funciona percorre o schema inteiro e estende todo array `enum` que contenha `nodejs20.x`:

```js
// no construtor do plugin, antes da validacao
(function walk(node) {
  if (!node || typeof node !== 'object') return;
  if (Array.isArray(node.enum) && node.enum.includes('nodejs20.x') && !node.enum.includes('nodejs24.x')) {
    node.enum.push('nodejs24.x');
  }
  for (const k of Object.keys(node)) walk(node[k]);
})(serverless.configSchemaHandler.schema);
```

osls 3.x e 4.x passam em modo estrito **sem** esse patch (`rc=0`).

### REQ-203 - `serverless-offline` nos tres

Servidores subidos em portas distintas (3101/3102/3103) a partir de `sls-offline.yml` (`nodejs24.x` + plugin via subpath + `serverless-offline`):

```
Server ready: http://localhost:3101    # serverless@3.40.0  + serverless-offline@13.10.1
Server ready: http://localhost:3102    # osls@3.78.0        + serverless-offline@13.10.1
Server ready: http://localhost:3103    # osls@4.3.1         + serverless-offline@14.8.2
```

Requisicoes HTTP reais contra a function dummy:

```
localhost:3101 -> 200 {"ok":true,"from":"poc-t201-dummy","path":"/dummy"}
localhost:3102 -> 200 {"ok":true,"from":"poc-t201-dummy","path":"/dummy"}
localhost:3103 -> 200 {"ok":true,"from":"poc-t201-dummy","path":"/dummy"}
```

Log do lado do servidor (osls 3.x), confirmando que foi a Lambda que respondeu:

```
GET /dummy (lambda: dummy)
(lambda: dummy) RequestId: dda525cf-...  Duration: 79.70 ms  Billed Duration: 80 ms
```

`sls invoke local --function dummy` tambem funciona nos tres (`{"statusCode":200,...}`, `rc=0`) - **desde que `serverless-offline` nao esteja na lista de plugins**; ver Impacto.

## Veredito

**REQ-201: PASS.** O subpath `serverless-advanced-handlers/plugin` de um pacote `"type": "module"` cujo `exports["./plugin"]` so tem `require`/`default` apontando para um `.cjs` resolve e instancia sem erro em Serverless v3 (3.40.0), osls 3.78.0 e osls 4.3.1. O modelo de empacotamento assumido em `public-api/design.md` esta confirmado. Ressalva nao-bloqueante: a ausencia da condicao `import` nesse subpath e o que faz o osls 4.x cair em `default` -> `.cjs` e funcionar; manter o shape `require` + `default` -> `.cjs` e parte do contrato validado, nao um detalhe incidental.

**REQ-202: PASS nos osls; PASS-COM-RESSALVA no Serverless v3 upstream.** osls 3.x e 4.x ja tem `nodejs24.x` no enum e aceitam ate em `configValidationMode: error`. Serverless v3.40.0 tem enum congelado em `nodejs20.x`: no modo padrao so avisa e o CloudFormation gerado sai correto com `nodejs24.x` (ou seja, nao e blocker de deploy), mas quebra sob validacao estrita. Existe workaround testado e ele cabe naturalmente no construtor do nosso plugin - que e exatamente onde precisa estar. Veredito agregado: **PASS-COM-RESSALVA**, no criterio ja acordado em `spec.md` (Open Questions).

**REQ-203: PASS.** `serverless-offline` invoca a function dummy localmente nos tres motores, com a fixture usando `nodejs24.x` e o plugin carregado por subpath. Par de versoes que funciona: offline 13.x para as linhas 3.x (peer `serverless ^3.2.0`) e offline 14.x para osls 4.x (peer `serverless ^4.0.0`).

## Impacto

Nada refuta a premissa arquitetural - F10 pode seguir como desenhado. Mas quatro coisas descobertas aqui precisam virar requisito ou nota:

1. **`CONCERNS.md` - nova linha (ressalva de REQ-202):** Serverless Framework v3 upstream <= 3.40.0 nao conhece `nodejs24.x`. Mitigacao validada: o plugin estende o enum do `configSchemaHandler` no construtor. Sem isso, usuarios com `configValidationMode: error` quebram. Risco rebaixado de "possivel blocker" para "requisito de implementacao do plugin".

2. **`F10 serverless-plugin` - requisito novo:** o plugin **deve** aplicar o patch de schema no construtor, percorrendo o schema inteiro (o `provider.runtime` e um `$ref` para `#/definitions/awsLambdaRuntime`; ler `properties.provider.properties.runtime.enum` **nao funciona** - comprovado). Idealmente condicionado a "so se `nodejs24.x` ainda nao estiver no enum", para virar no-op em osls.

3. **`F10` - o `dist/plugin.cjs` precisa ter `module.exports = <classe>`.** O placeholder vazio atual falha identico nos tres motores com `TypeError: Plugin is not a constructor`. Isso nao e novidade conceitual, mas fica registrado que o modo de falha e esse (e nao erro de resolucao), o que e util se aparecer em bug report.

4. **Nota de DX para documentacao/`TESTING.md`, nao bloqueante:** ter `serverless-offline` na lista de `plugins` faz `sls invoke local` **travar indefinidamente** nos tres motores (reproduzido com timeout de 120 s; sem o offline na lista, o mesmo comando retorna em segundos). E comportamento do `serverless-offline`, nao nosso, mas vai bater em quem usar nossa fixture - vale uma linha no guia de uso. Menor ainda: no Windows o `serverless-offline` faz bind em `localhost`/`::1` e **nao** em `127.0.0.1`; smoke tests devem usar `localhost`.

Nenhuma mudanca necessaria em `public-api/design.md` - o `exports` map atual esta validado como esta.
