/**
 * Motor de validação `v` (REQ-010): reexporta o Zod 4 inteiro — valores e tipos, incluindo `v.infer`,
 * `v.input` e `v.output` — e sobrepõe as extensões do pacote.
 *
 * **Por que isto não é `export * from 'zod'` + `export * as v from './v'` (a forma óbvia):** essa forma
 * mais direta faz o bundler de declarações (`rolldown-plugin-dts`, via tsdown) sintetizar um
 * `declare namespace` para representar `v` sempre que o módulo reexporta um pacote externo via
 * `export *` **e** tem outros exports — e essa sintetização descarta silenciosamente um dos dois lados
 * (ora o reexport do Zod, ora as extensões locais; qual lado sobrevive depende do resto do grafo de
 * módulos do bundle, não é nem consistente). Reproduzido isoladamente com o mesmo `tsdown`/
 * `rolldown-plugin-dts` desta versão do projeto: o runtime (`dist/index.mjs`) sempre fica correto — só
 * a declaração publicada (`dist/index.d.mts`) quebra silenciosamente, sem erro de build.
 *
 * A saída: declarar `v` como valor real (`const`, tipado por interseção `typeof z & typeof extensions`)
 * **e** um `namespace v { ... }` de mesmo nome só para os três utilitários de tipo do Zod usados como
 * `v.infer<T>`/`v.input<T>`/`v.output<T>` — merge de valor+namespace é um recurso nativo do TypeScript
 * (não um truque do bundler), e o bundler de declarações emite os dois lados corretamente porque não
 * precisa sintetizar nada: o `const` e o `namespace` já são declarações próprias do arquivo. Por isso
 * este é o único arquivo do pacote com `typescript/no-namespace` desligado (`.oxlintrc.json`).
 *
 * **Precedência:** as extensões abaixo vencem qualquer nome homônimo do Zod — hoje só `file` colide de
 * fato (`v.file` aceita `{minSize, maxSize, mimetypes}`, `z.file` não). Em runtime, a ordem do
 * `Object.assign` garante isso; no tipo, a interseção intercala as duas assinaturas como sobrecargas,
 * e como `v.file()` sem argumentos devolve o mesmo `z.ZodFile` nos dois lados, não há ambiguidade real.
 *
 * O registry de JSON Schema das extensões (`withJsonSchema`/`getJsonSchemaOverride`) **não** entra no
 * objeto `v`: é interno, consumido só por `#/validation/openapi`.
 */

import * as z from 'zod';
import {boolish, datetime, delimited, duration, file, parseBytes, timestamp} from '#/validation/extensions';

/**
 * Metadados tipados de `.meta()` (REQ-016).
 *
 * `GlobalMeta` é a interface que o Zod usa como tipo do `globalRegistry`; augmentá-la aqui dá tipo e
 * autocomplete às duas chaves do framework em qualquer `.meta()` do projeto **e** de quem consome o pacote
 * (basta o módulo entrar no programa — `import {v} from 'serverless-advanced-handlers'` já basta):
 *
 * - `name` — nome do campo no transporte (`first_name` na URL ⇄ `firstName` no TS), mesmo conceito do
 *   `name` de parâmetro OpenAPI. Aplicado em runtime por `decodeTransport`/`encodeTransport` (F07) e na
 *   geração do OpenAPI (T-003);
 * - `examples` — exemplos tipados pelo **input** do schema: `$input` é o marcador do Zod que
 *   `$replace<GlobalMeta, this>` troca pelo `input<T>` do schema em que `.meta()` foi chamado, então
 *   `v.number().meta({examples: ['x']})` é erro de tipo e `v.number().meta({examples: [42]})` passa.
 *   Prefira exemplos determinísticos: `new Date().toISOString()` gera um `openapi.json` diferente a cada
 *   build.
 *
 * As chaves nativas do Zod (`id`, `title`, `description`, `deprecated`) continuam valendo. `id` é
 * **reservado**: o Zod o usa para extrair o schema para `$defs`/`$ref` e o compilador o preenche com o nome
 * da classe para montar `components.schemas` — não use `id` em campos.
 *
 * **Limite da augmentation:** ela só *adiciona* membros. O Zod declara `[k: string]: unknown` em
 * `JSONSchemaMeta` (herdada por `GlobalMeta`), e não há como remover um index signature por augmentation —
 * ou seja, `.meta({nmae: 'x'})` **não** é erro de tipo. O rigor contra chaves desconhecidas é de
 * `validateMeta` (`#/validation/meta`), em tempo de build.
 */
declare module 'zod' {
  interface GlobalMeta {
    /** Nome do campo no transporte (query, header, body, ...), quando diferente do nome em TypeScript. */
    name?: string;
    /** Exemplos do valor **de entrada** do schema, usados na documentação OpenAPI. */
    examples?: z.$input[];
  }
}

const extensions = {boolish, datetime, delimited, duration, file, parseBytes, timestamp};

type V = typeof z & typeof extensions;

const v: V = Object.assign(Object.create(null), z, extensions) as V;

// eslint-disable-next-line typescript/no-namespace -- merge de valor+namespace (ver comentário acima); é a única forma de expor `v.infer<T>`/`v.input<T>`/`v.output<T>` junto com `v` como valor real. Os tipos auxiliares das extensões (`ZodBoolish`, `ByteSize`, ...) ficam fora do namespace — de propósito, ver nota abaixo.
namespace v {
  export type infer<T extends z.ZodType> = z.infer<T>;
  export type input<T extends z.ZodType> = z.input<T>;
  export type output<T extends z.ZodType> = z.output<T>;
}

export {v};

/**
 * Tipos auxiliares das extensões (retorno de `boolish`/`delimited`/etc. e suas opções) — importáveis
 * diretamente (`import type {ZodBoolish} from '#/validation/v'`), **não** como `v.ZodBoolish`: colocá-los
 * dentro do `namespace v` acima faz o bundler de declarações colapsar o alias num self-reference
 * (`type X = X`, reproduzido e confirmado — mesma classe de bug do comentário no topo do arquivo, desta
 * vez por causa do nome do membro do namespace coincidir com o nome já hospedado no topo do chunk
 * bundlado). Preferível a arriscar essa colisão silenciosa: `v.infer`/`input`/`output` são os únicos
 * utilitários de tipo que o contrato (REQ-010) exige em `v.`; os demais tipos abaixo são conveniência.
 */
export type {
  BoolishOptions,
  ByteSize,
  DelimitedOptions,
  FileOptions,
  ZodBoolish,
  ZodDatetime,
  ZodDelimited,
  ZodDelimitedInput,
  ZodDuration,
  ZodDurationInput,
  ZodTimestamp,
} from '#/validation/extensions';
