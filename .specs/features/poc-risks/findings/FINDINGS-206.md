# Findings: REQ-206 — Source maps encadeados (AST transform → bundle)

## Método

Experimento isolado no scratchpad da sessão (não commitado, diretório apagado ao final).
Ambiente: Node `v26.7.0`, `esbuild@0.28.2`, `ts-morph@28.0.0`, `source-map@0.8.0`, `typescript@7.0.2` (Windows).

**Arquivo original** (`src/user.controller.ts`, o alvo da resolução):

```ts
 1  import { greet } from './greeter';
 2
 3  export class UserController {
 4    list(): string[] {
 5      return ['alice', 'bob'];
 6    }
 7
 8    explode(name: string): string {
 9      const greeting = greet(name);
10      if (greeting.length > 0) {
11        throw new Error('boom');      // <- alvo: linha 11, coluna 7
12      }
13      return greeting;
14    }
15  }
```

**Etapa 1 — transformação de AST (simula o method-slicing do F06).**
`ts-morph` lê a classe, localiza `UserController#explode`, extrai os statements do corpo
(`getBodyOrThrow().getStatements()`, com as posições originais via `getLineAndColumnAtPos`)
e escreve um arquivo novo `generated/<id>.handler.ts` com o método promovido a
`export function handler(...)`. As linhas do corpo são copiadas verbatim, com a indentação
original preservada — o que faz o mapeamento ser um simples deslocamento de linha
(`origLine = genLine + delta`), com colunas idênticas.

O source map desta etapa (TS → TS) foi **emitido manualmente** com `SourceMapGenerator`
da lib `source-map` (duas mappings por linha do corpo: coluna 0 e a primeira coluna
não-branca), com `sourcesContent` embutido e o comentário `//# sourceMappingURL=...`
anexado ao arquivo gerado. Testadas as duas formas de anexar: **arquivo `.map` externo**
e **data URI base64 inline**.

> **Por que manual:** `ts-morph` **não emite source map em transformação TS → TS** — só em
> `emit()` (TS → JS), e esse map aponta para o arquivo de *entrada* do emit. Ver "Evidência", item 3.
> Isso não é uma perda de fidelidade do experimento: é exatamente a exigência que o F06 herda.

**Etapa 2 — bundle esbuild.** `esbuild.build({ bundle: true, platform: 'node', target: 'node22',
sourcemap: <true|'inline'>, sourcesContent: true, minify: <true|false>, format: <'cjs'|'esm'> })`
sobre um `main.ts` que importa e chama o handler gerado. esbuild detecta o
`//# sourceMappingURL` no arquivo de entrada e **encadeia** o map da etapa 1 no map final.

**Execução.** `node --enable-source-maps dist/<caso>.<js|mjs>`, erro lançado de propósito,
stack impresso. Além disso, resolução **manual** do stack cru (sem `--enable-source-maps`)
via `SourceMapConsumer.originalPositionFor()`, simulando o pós-processamento de um log
do CloudWatch.

## Resultado

A cadeia **sobrevive às duas transformações** em todas as combinações testadas, desde que
a etapa 1 emita e anexe seu próprio source map. Matriz executada:

| # | Etapa 1 (map) | Bundle | Frame resolvido |
| :--- | :--- | :--- | :--- |
| c1 | externo `.ts.map` | cjs, sem minify, map externo | `src/user.controller.ts:11:7` PASS |
| c2 | externo `.ts.map` | esm, sem minify, map externo | `src/user.controller.ts:11:7` PASS |
| c3 | externo `.ts.map` | esm, **minify**, map externo | `src/user.controller.ts:11:7` PASS |
| c4 | **inline** (data URI) | esm, **minify**, map **inline** | `src/user.controller.ts:11:7` PASS |
| c5 | **nenhum** (controle) | esm, minify, map externo | `generated/c5.handler.ts:7:13` FALHA — para no intermediário |
| c6 | externo **ausente em disco** | esm, map externo | `generated/c6.handler.ts:7:13` FALHA — **sem nenhum warning** |

Linha 11, coluna 7 é exatamente o `throw new Error('boom')` do arquivo original — resolução
posicional exata, não apenas "arquivo certo".

O `sources` do map final do bundle confirma o encadeamento antes mesmo de rodar: lista
`../src/user.controller.ts` (o **original**) e não o arquivo intermediário. No controle c5
lista `../generated/c5.handler.nomap.ts`.

**Onde a cadeia quebra quando quebra:** sempre na **etapa 1**, nunca em bundle → runtime.
São dois modos de falha, ambos silenciosos:

1. a transformação de AST não emite map (c5);
2. a transformação emite o comentário `sourceMappingURL` mas o `.map` referenciado não
   chega ao diretório onde o esbuild vai ler (c6) — **esbuild não emite warning nesse caso**
   (`result.warnings` veio vazio), simplesmente para de encadear.

## Evidência

**1. Stack final resolvido (caso c1, `node --enable-source-maps dist/bundle.js`):**

```
Error: boom
    at handler (<root>\src\user.controller.ts:11:7)
    at Object.<anonymous> (<root>\generated\main.ts:4:3)
    at Module._compile (node:internal/modules/cjs/loader:1934:14)
```

O mesmo stack **sem** `--enable-source-maps` aponta para `dist\bundle.js:10:11`
(código bundlado), e no controle c5 para `generated\c5.handler.ts:7:13` (intermediário).

**2. Resolução manual do stack cru via lib `source-map` (caso c3, esm + minify):**

```
frame CRU (sem --enable-source-maps):
  at l (file:///.../dist/c3.mjs:1:278)
resolvido manualmente via `source-map`:
  {"source":"../src/user.controller.ts","line":11,"column":6,"name":null}
  linha de origem: "      throw new Error('boom');"
```

(coluna 6 é 0-based na API da lib = coluna 7 do stack, 1-based.)

**3. `ts-morph` não encadeia nem emite map na etapa TS → TS:**

```
emit do ts-morph (TS->JS) produziu: generated\c1.handler.js, generated\c1.handler.js.map, ...
sources do map emitido pelo ts-morph: ["../../generated/c1.handler.ts"]
```

Note que `c1.handler.ts` **já continha** `//# sourceMappingURL=c1.handler.ts.map` apontando
para o original — e mesmo assim o `tsc`/`ts-morph` ignorou o map de entrada e mapeou para o
próprio arquivo intermediário. **`tsc` não encadeia source maps de entrada.** `esbuild` encadeia.

**4. `sources` do map final do bundle (prova do encadeamento, antes de executar):**

```
dist/bundle.js.map       -> ["../src/greeter.ts","../src/user.controller.ts","../generated/main.ts"]
dist/bundle.nomap.js.map -> ["../src/greeter.ts","../generated/explode.handler.nomap.ts","../generated/main.nomap.ts"]
```

## Veredito

**PASS.**

A premissa do REQ-206 se confirma: um erro lançado em código produzido por uma transformação
de AST e depois bundlado por esbuild resolve, via source map encadeado, para a linha e coluna
exatas do arquivo TypeScript original — inclusive com `minify: true`, em CJS e em ESM, com map
externo ou inline, tanto pelo `--enable-source-maps` do Node quanto por resolução manual com a
lib `source-map`.

O PASS é **condicional a uma exigência concreta**, não automático: a etapa de slicing precisa
produzir seu próprio source map. Como esse é exatamente o elo que falha em silêncio (c5/c6) e
que a ferramenta escolhida não dá de graça (item 3 da evidência), a condição vai para o Impacto
como requisito de design do F06, não como ressalva de veredito.

## Impacto

Consequências diretas para o design do compilador/slicer (F06) e do bundler:

1. **O slicer precisa emitir seu próprio source map TS → TS.** Não existe atalho: `ts-morph`
   (e o `tsc` por baixo dele) não emite map em transformação TS → TS, e no emit TS → JS ignora
   o map de entrada. O F06 deve ou (a) usar `SourceMapGenerator` da lib `source-map` diretamente,
   como neste experimento, ou (b) usar `magic-string` para o recorte textual, que gera o map como
   subproduto. **Recomendação: (b) `magic-string` para mover/reescrever o texto do método**, com
   `ts-morph` restrito ao papel de *localizar* os nós (offsets) — evita manter a contabilidade de
   linhas à mão.

2. **Preservar a indentação original ao mover o método.** Copiar as linhas verbatim (sem
   re-indentar) torna o mapeamento um deslocamento puro de linha, com colunas idênticas — foi o
   que deu resolução exata de coluna aqui. Re-indentar o código extraído obriga a mapear coluna a
   coluna, com muito mais superfície de erro. Se o F06 quiser saída bonita, que a re-indentação
   venha *depois*, de um formatador que também encadeie map (ou de nenhum).

3. **Preferir map inline (data URI) na saída da etapa de slicing.** O caso c6 mostra que um
   `.map` externo referenciado mas ausente faz o esbuild parar de encadear **sem warning
   nenhum**. Com o map inline no próprio `.ts` gerado, não existe arquivo para se perder entre
   o diretório de trabalho do slicer e a entrada do bundler. Custo: arquivos intermediários
   maiores — irrelevante, já que eles são efêmeros e não vão para o artefato.

4. **Esse elo precisa de teste de regressão automatizado no F06.** As duas formas de quebra são
   silenciosas — nada falha, nada avisa, o build passa e só se descobre quando um erro em
   produção aponta para um arquivo intermediário que ninguém escreveu. O teste é barato e já está
   esboçado aqui: bundlar uma fixture que lança, rodar com `--enable-source-maps`, e asserir
   `arquivo:linha:coluna` do frame de topo contra o `.ts` de origem. Vale asserir também o
   `sources` do map final (item 4 da evidência), que pega a quebra sem precisar executar.

5. **`sourcesContent: true` no bundle final.** Sem ele o map final referencia caminhos de fonte
   que não existem no ambiente Lambda, e a resolução manual de um stack de CloudWatch
   (`sourceContentFor`) fica impossível. O custo em bytes é aceitável; se o tamanho do artefato
   apertar, a alternativa é publicar os `.map` como artefato de build separado, fora do zip.

6. **O runtime (F07) deve ligar `--enable-source-maps`** via `NODE_OPTIONS` na configuração da
   function (ou o F10 deve fazê-lo por padrão), senão nada disso aparece no log. Fica como nota
   de pré-requisito para F07/F10.

Nenhuma decisão de arquitetura já tomada em `public-api/design.md` ou `CONCERNS.md` é refutada
por este experimento — ele adiciona exigências de implementação ao F06, não remove opções.
