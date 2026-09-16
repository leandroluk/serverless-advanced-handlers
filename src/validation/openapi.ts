import * as z from 'zod';
import {getJsonSchemaOverride} from '#/validation/extensions';
import {resolveMeta} from '#/validation/meta';

/**
 * Geração do JSON Schema de transporte a partir de um schema `v` (REQ-019).
 *
 * É a ponte entre o motor de validação e o documento OpenAPI: o mesmo schema que valida a requisição
 * descreve o contrato publicado. Só a **geração** mora aqui — a aplicação dos aliases numa requisição real
 * (`decodeTransport`/`encodeTransport`) é do runtime HTTP (F07), e a montagem do `openapi.json` é de F09.
 *
 * Duas correções são aplicadas por cima do que o Zod gera sozinho, ambas via `override`:
 *
 * 1. **Extensões** — `v.boolish()`, `v.duration()` e `v.datetime()` são `union`/`codec` por dentro, e o Zod
 *    documentaria a estrutura interna (`anyOf` de `boolean` e string). O registry de
 *    `#/validation/extensions` guarda a representação de transporte de cada uma, aplicada aqui.
 * 2. **Aliases** — `.meta({name})` renomeia a propriedade no objeto pai (`firstName` no TS ⇄ `first_name`
 *    no transporte), e a própria chave `name` sai do JSON Schema, onde não é palavra reservada.
 */

/** `specVersion` da API ⇄ `target` do gerador do Zod. */
const JSON_SCHEMA_TARGETS = {
  /** OpenAPI 3.0 usa um dialeto próprio, anterior ao JSON Schema moderno (`exclusiveMinimum` booleano). */
  '3.0': 'openapi-3.0',
  /** OpenAPI 3.1 é JSON Schema 2020-12 puro. */
  '3.1': 'draft-2020-12',
} as const satisfies Record<'3.0' | '3.1', 'openapi-3.0' | 'draft-2020-12'>;

/** Chave do augmentation de `GlobalMeta` que não é palavra do JSON Schema e por isso nunca vai para a saída. */
const FRAMEWORK_META_KEY = 'name';

/**
 * Anotações que sobrevivem à substituição feita por uma extensão.
 *
 * São as chaves do allowlist de `.meta()` (ver `#/validation/meta`) que existem como palavra do JSON Schema e
 * não descrevem a **forma** do valor — só documentam. `id` fica de fora porque o Zod já o consome antes do
 * `override` (extrai o nó para `$defs` e deixa um `$ref` no lugar) e `name` porque some da saída sempre.
 */
const ANNOTATION_KEYS: readonly string[] = ['deprecated', 'description', 'examples', 'title'];

/** Qualquer schema do Zod, inclusive os do core (`z.core`), que é o tipo comum a toda a árvore. */
type AnySchema = z.core.$ZodType;

/**
 * `schema._zod.def` visto como bag de propriedades — mesma técnica de `#/validation/meta`.
 *
 * O `def` concreto muda a cada tipo de schema (`shape`, `element`, `innerType`, ...) e o tipo estático comum
 * (`$ZodTypeDef`) só declara `type`/`checks`/`error`; `unknown` (e não `any`) mantém cada leitura obrigada a
 * passar por um guard.
 */
function defOf(schema: AnySchema): Readonly<Record<string, unknown>> {
  return schema._zod.def as unknown as Readonly<Record<string, unknown>>;
}

/** Guard estrutural: qualquer schema do Zod 4 carrega a propriedade interna `_zod`. */
function isSchema(value: unknown): value is AnySchema {
  return typeof value === 'object' && value !== null && '_zod' in value;
}

/**
 * Representação registrada por `withJsonSchema` para `schema` **ou para o schema de que ele é clone**.
 *
 * `.meta()`, `.describe()` e afins não mutam o schema: devolvem um clone com `_zod.parent` apontando para o
 * original, e é esse clone que aparece na árvore. Sem subir a cadeia de `parent`, `v.duration()` seria
 * documentado corretamente mas `v.duration().meta({name: 'ttl'})` cairia na representação bruta do codec —
 * é a mesma cadeia que o `globalRegistry.get` do próprio Zod percorre para herdar metadados.
 */
function findJsonSchemaOverride(schema: AnySchema): Readonly<Record<string, unknown>> | undefined {
  for (let node: AnySchema | undefined = schema; node !== undefined; node = node._zod.parent) {
    const override = getJsonSchemaOverride(node);

    if (override !== undefined) {
      return override;
    }
  }

  return undefined;
}

/**
 * Troca o JSON Schema gerado pelo Zod pela representação registrada pela extensão, quando houver.
 *
 * A substituição é **total** nas chaves de forma: o que o Zod produziu (`anyOf` da union interna de
 * `boolish`, o formato de entrada do codec de `duration`) descreve a implementação, não o contrato, e um
 * resquício produziria um schema contraditório. Só as anotações já calculadas ({@link ANNOTATION_KEYS})
 * sobrevivem, para que `v.duration().meta({description: 'TTL'})` continue documentando o campo.
 */
function applyExtensionOverride(schema: AnySchema, jsonSchema: z.core.JSONSchema.BaseSchema): void {
  const override = findJsonSchemaOverride(schema);

  if (override === undefined) {
    return;
  }

  const target = jsonSchema as Record<string, unknown>;
  const annotations: Record<string, unknown> = {};

  for (const key of Object.keys(target)) {
    if (ANNOTATION_KEYS.includes(key)) {
      annotations[key] = target[key];
    }

    delete target[key];
  }

  Object.assign(target, override, annotations);
}

/**
 * Renomeia as propriedades do objeto para o `name` resolvido de cada campo (REQ-046, parte de geração).
 *
 * O nome vem de `resolveMeta`, não de `schema.meta()`: `.meta({name})` pode estar em qualquer ponto da cadeia
 * de wrappers do campo (`v.string().meta({name: 'first_name'}).optional()` e a forma inversa resolvem igual).
 *
 * `properties` é reconstruído em vez de mutado chave a chave para preservar a ordem de declaração do shape,
 * e `required` acompanha o novo nome — senão o objeto exigiria um campo que não existe mais.
 *
 * Dois campos que caem no mesmo nome de transporte (dois aliases iguais, ou um alias que colide com o nome TS
 * de outro campo) são um erro do schema, não algo a resolver por último-vence: o objeto gerado perderia um
 * campo silenciosamente e o `required` ficaria com a chave repetida.
 *
 * @throws {Error} `Duplicate transport name "<nome>" in object schema` na colisão descrita acima.
 */
function renameProperties(schema: AnySchema, jsonSchema: z.core.JSONSchema.BaseSchema): void {
  const def = defOf(schema);

  if (def.type !== 'object') {
    return;
  }

  const {shape} = def;

  if (typeof shape !== 'object' || shape === null) {
    return;
  }

  const renames = new Map<string, string>();
  const taken = new Set<string>();

  for (const [key, value] of Object.entries(shape)) {
    const name = isSchema(value) ? resolveMeta(value).name : undefined;
    const transportKey = typeof name === 'string' && name.length > 0 ? name : key;

    if (taken.has(transportKey)) {
      throw new Error(`[serverless-advanced-handlers] Duplicate transport name "${transportKey}" in object schema`);
    }

    taken.add(transportKey);

    if (transportKey !== key) {
      renames.set(key, transportKey);
    }
  }

  if (renames.size === 0) {
    return;
  }

  const {properties, required} = jsonSchema;

  if (properties !== undefined) {
    jsonSchema.properties = Object.fromEntries(
      Object.entries(properties).map(([key, value]) => [renames.get(key) ?? key, value])
    );
  }

  if (Array.isArray(required)) {
    jsonSchema.required = required.map(key => renames.get(key) ?? key);
  }
}

/**
 * `override` do gerador do Zod, chamado uma vez por nó da árvore (dos nós mais internos para os externos, já
 * com os `$ref` achatados).
 */
function overrideNode(ctx: {
  zodSchema: z.core.$ZodTypes;
  jsonSchema: z.core.JSONSchema.BaseSchema;
  path: (string | number)[];
}): void {
  applyExtensionOverride(ctx.zodSchema, ctx.jsonSchema);
  renameProperties(ctx.zodSchema, ctx.jsonSchema);

  // `name` descreve o transporte, não o valor: some da saída depois de já ter renomeado a propriedade acima.
  delete (ctx.jsonSchema as Record<string, unknown>)[FRAMEWORK_META_KEY];
}

/**
 * JSON Schema de `schema` no **formato de transporte** (`io: 'input'`), pronto para entrar num documento
 * OpenAPI da versão pedida (REQ-019).
 *
 * `io: 'input'` é o que descreve o que trafega na rede: `v.duration()` documenta `'5m' | número`, e não o
 * `number` em milissegundos que o handler recebe depois do decode. Tipos sem representação possível viram
 * `{}` (`unrepresentable: 'any'`) em vez de derrubar a geração do documento inteiro.
 *
 * `specVersion` escolhe o dialeto: `'3.1'` é JSON Schema 2020-12 (`exclusiveMinimum: 5`), `'3.0'` é o dialeto
 * próprio do OpenAPI 3.0 (`minimum: 5` + `exclusiveMinimum: true`), e só `'3.1'` traz `$schema`.
 *
 * ```ts
 * toOpenapiSchema(v.object({firstName: v.string().meta({name: 'first_name'})}), {specVersion: '3.1'});
 * // {type: 'object', properties: {first_name: {type: 'string'}}, required: ['first_name'], ...}
 * ```
 */
export function toOpenapiSchema(schema: z.ZodType, opts: {specVersion: '3.0' | '3.1'}): z.core.JSONSchema.BaseSchema {
  return z.toJSONSchema(schema, {
    io: 'input',
    target: JSON_SCHEMA_TARGETS[opts.specVersion],
    unrepresentable: 'any',
    override: overrideNode,
  });
}
