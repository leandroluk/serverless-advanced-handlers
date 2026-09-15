# Findings: REQ-204 — Bundle ESM com dependência CJS real

## Método

Experimento isolado no scratchpad da sessão (não commitado, diretório apagado ao final).
Dependência escolhida: `jsonwebtoken@9.0.3` (sem `exports`, sem `type`, sem `module` no seu
`package.json` — CJS puro, e com árvore transitiva CJS realista via `jws`/`safe-buffer`).
`esbuild@0.28.2`, runtime Node `v26.7.0`.

Candidata originalmente sugerida no design.md, `bcryptjs`, foi descartada: a versão atual
(`3.0.3`) já é dual (`type: module` + `exports.import`) e não serve como caso CJS-only —
registrado aqui para quem for repetir o experimento no futuro.

Matriz testada: 6 variantes cruzando (a) `packages: bundle` vs `packages: external`, (b)
import default+destructuring vs import nomeado direto, (c) com/sem banner de mitigação.
Config base: `esbuild.build({bundle: true, format: 'esm', platform: 'node', target: 'node22'})`.
Execução: `node dist/<variante>/handler.mjs`.

## Resultado

**A configuração ingênua do enunciado falha — e falha de dois jeitos diferentes conforme a
política de `packages`, nenhum deles sendo o `ERR_REQUIRE_ESM` hipotetizado na spec** (ver
SPEC_DEVIATION):

1. **Dependência inlined no bundle (`packages: bundle`, o default)** →
   `Error: Dynamic require of "buffer" is not supported`. O esbuild não converte os
   `require()` de builtins Node dentro dos wrappers `__commonJS` em `import` estático — o
   bundle não emite nenhum `import` de `node:*` e deixa `__require("buffer"|"crypto"|"stream"|"util")`,
   que lança em runtime ESM. Gatilho: `safe-buffer@5.2.1/index.js:3`. Reproduz independente
   do estilo de import (confirmado com uma variante só-default).

   **Mitigação testada, funciona:** banner `createRequire(import.meta.url)` injetado via
   `esbuild.build({banner: {js: "..."}})`. O shim que o esbuild gera pro `__require` é
   `typeof require !== "undefined" ? require : <throw>` — basta um `require` real no escopo
   do módulo. Custo: +122 bytes no bundle.

2. **Dependência mantida externa (`packages: external`)** →
   `SyntaxError: Named export 'sign' not found`. Aqui o esbuild fez a coisa certa (deixou o
   `import` apontando pro pacote real); quem recusa é o próprio loader ESM do Node — o
   `cjs-module-lexer` não consegue inferir named exports de
   `module.exports = { sign: require('./sign'), verify: require('./verify'), ... }`, que é
   exatamente como `jsonwebtoken/index.js` está escrito.

   **Mitigação testada, funciona:** trocar `import { sign } from 'jsonwebtoken'` por
   `import jwt from 'jsonwebtoken'; const { sign } = jwt;` (default import + destructuring).
   O banner de `createRequire` **não resolve este caso** — testado e confirmado que não ajuda,
   porque o problema não é resolução de módulo, é a análise estática de exports do loader.

## Evidência

Erro 1 (dep inlined, sem banner):
```
file:///.../dist/inlined-noBanner/handler.mjs:1
...
Error: Dynamic require of "buffer" is not supported
    at __require2 (file:///.../dist/inlined-noBanner/handler.mjs:1:...)
```

Erro 1 resolvido (dep inlined, com banner `createRequire`):
```
$ node dist/inlined-withBanner/handler.mjs
token: eyJhbGciOiJIUzI1NiIs...
```

Erro 2 (dep externa, import nomeado direto):
```
SyntaxError: Named export 'sign' not found. The requested module 'jsonwebtoken' is a CommonJS
module, which may not support all module.exports as named exports.
```

Erro 2 resolvido (dep externa, default import + destructuring):
```
$ node dist/external-defaultImport/handler.mjs
token: eyJhbGciOiJIUzI1NiIs...
```

## Veredito

**PASS-COM-RESSALVA**

Bundlar um handler ESM que depende de um pacote CJS-only executa corretamente — mas não com a
config ingênua da premissa original, e não pelo motivo hipotetizado (`ERR_REQUIRE_ESM` nunca
apareceu). Existem duas armadilhas reais e independentes (uma por eixo de `packages`), ambas
com mitigação testada e barata. O risco desce de "pode inviabilizar output ESM" para "duas
armadilhas conhecidas, mitigadas".

Pendências fora do escopo desta task, registradas para quem for aprofundar depois: validar
contra `nodejs22.x`/`nodejs24.x` real da AWS (não só Node local — pode ser feito junto do
deploy de T-207); e o sub-caso de `require` verdadeiramente dinâmico de um arquivo próprio
não bundlado, que nem o banner cobre e que `jsonwebtoken` não exercita.

## Impacto

Consequências diretas para o design do bundler/compilador (F05/F06) e da doc de handlers (F10):

- **F06:** o banner de `createRequire` precisa ser **default e não-sobrescrevível** (sempre
  concatenado, nunca substituído por config do usuário) em qualquer output ESM que a lib gere
  — resolve a classe inteira de erro 1 de graça, sem pedir nada do autor do handler.
- **F06:** recomendo `packages: bundle` (inline, o default do esbuild) como padrão da lib —
  é o único dos dois eixos em que a lib consegue blindar o usuário sozinha com o banner;
  com `packages: external`, o resultado depende de como o usuário escreve o `import`, e a lib
  não tem como impedir isso sem reescrever o código do handler.
- **F06:** vale um smoke test no CI que roda o bundle gerado com `node` puro contra pelo menos
  uma dependência CJS-only real — build verde (`esbuild.build()` sem erro) não prova nada, os
  dois erros só aparecem em **execução**.
- **F10:** documentar explicitamente "prefira default import + destructuring com dependências
  CJS-only" na doc de handlers, já que o erro 2 não tem mitigação automática possível do lado
  da lib.

Nenhuma decisão já tomada em `public-api/design.md` ou `CONCERNS.md` é refutada — a viabilidade
do output ESM se confirma, com dois requisitos concretos de implementação a mais para o F06.

## SPEC_DEVIATION

O REQ-204 (redação da spec.md) nomeava `ERR_REQUIRE_ESM` como o erro esperado de falha. Esse
erro específico **não se materializou em nenhuma das 6 variantes testadas** — os dois modos de
falha reais são `Dynamic require of "X" is not supported` (dependência inlined) e
`SyntaxError: Named export 'X' not found` (dependência externa). Recomenda-se atualizar a
redação do risco correspondente em `CONCERNS.md` para refletir os erros reais em vez de
`ERR_REQUIRE_ESM`.
