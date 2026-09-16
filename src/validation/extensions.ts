import ms, {type StringValue} from 'ms';
import * as z from 'zod';

/**
 * Extensões primitivas do motor de validação `v` (REQ-011..REQ-015).
 *
 * Todas as extensões são **bidirecionais**: usam `z.codec` ou primitivas nativas do Zod, nunca `z.preprocess`
 * (que quebra `z.encode` com `Encountered unidirectional transform during encode`). Isso permite serializar
 * respostas pelo mesmo schema que valida a requisição.
 *
 * Este módulo é interno: o namespace público `v` (`#/validation/v`) reexporta apenas as extensões, não o
 * registry de JSON Schema (`withJsonSchema`/`getJsonSchemaOverride`), que é consumido por `#/validation/openapi`.
 */

// ---- Representação JSON Schema das extensões (registry interno) ----

/**
 * Representações JSON Schema customizadas, por instância de schema.
 *
 * `WeakMap` para não segurar schemas vivos: a chave é o próprio objeto do schema criado pela extensão.
 * Cada chamada de `boolish()`/`duration()`/`datetime()` cria uma instância nova, com sua própria entrada.
 */
const jsonSchemaOverrides = new WeakMap<object, Readonly<Record<string, unknown>>>();

/** Registra a representação JSON Schema de `schema` e devolve o próprio schema (encadeável). */
export function withJsonSchema<S extends z.ZodType>(schema: S, json: Record<string, unknown>): S {
  jsonSchemaOverrides.set(schema, Object.freeze({...json}));

  return schema;
}

/**
 * Representação JSON Schema registrada para `schema`, ou `undefined` quando não há override.
 *
 * Só a instância exata registrada é encontrada: wrappers (`.default()`, `.optional()`, ...) não são
 * desempacotados aqui — quem percorre a árvore é `toOpenapiSchema` (F03 T-003), que visita cada nó.
 */
export function getJsonSchemaOverride(schema: object): Readonly<Record<string, unknown>> | undefined {
  return jsonSchemaOverrides.get(schema);
}

// ---- Tamanhos legíveis ----

/** Tamanho em bytes, como número ou string legível (`'2MB'`, `'512KB'`). */
export type ByteSize = number | `${number}${'B' | 'KB' | 'MB' | 'GB'}`;

const BYTE_UNITS = {B: 1, KB: 1024, MB: 1024 ** 2, GB: 1024 ** 3} as const;

type ByteUnit = keyof typeof BYTE_UNITS;

/**
 * Converte um {@link ByteSize} para bytes. Números passam direto; strings são multiplicadas pela unidade
 * (base 1024) e truncadas para inteiro.
 *
 * @throws {Error} `Invalid size: <valor>` quando a string não casa com `<número><B|KB|MB|GB>`.
 */
export function parseBytes(size: ByteSize): number {
  if (typeof size === 'number') {
    return size;
  }

  const match = /^(\d+(?:\.\d+)?)(B|KB|MB|GB)$/.exec(size);

  if (!match) {
    throw new Error(`Invalid size: ${size}`);
  }

  const [, amount, unit] = match;

  return Math.floor(Number(amount) * BYTE_UNITS[unit as ByteUnit]);
}

// ---- boolish (REQ-011) ----

/** Listas de strings aceitas por {@link boolish}; sobrescrevem os defaults quando informadas. */
export type BoolishOptions = {
  /** Strings decodificadas como `true`. Default: `['true', '1', 'yes', 'on']`. */
  truthy?: string[];
  /** Strings decodificadas como `false`. Default: `['false', '0', 'no', 'off']`. */
  falsy?: string[];
};

/** Schema devolvido por {@link boolish}: `boolean` nativo ou string booleana. */
export type ZodBoolish = z.ZodUnion<[z.ZodBoolean, z.ZodCodec<z.ZodString, z.ZodBoolean>]>;

/**
 * Defaults de `truthy`/`falsy` fixados pelo REQ-011.
 *
 * O Zod aceita também `y`/`enabled` e `n`/`disabled` por padrão; o contrato do pacote é a lista abaixo,
 * então ela é passada explicitamente para `z.stringbool` em vez de herdar o default da lib.
 */
const DEFAULT_TRUTHY: readonly string[] = ['true', '1', 'yes', 'on'];
const DEFAULT_FALSY: readonly string[] = ['false', '0', 'no', 'off'];

/**
 * `boolean` nativo **ou** string booleana (`'true'`/`'1'`/`'yes'`/`'on'` e os falsy correspondentes),
 * comparada sem diferenciar maiúsculas. Qualquer outro valor gera issue.
 *
 * Resolve a armadilha do `z.coerce.boolean()`, que usa `Boolean(input)` e portanto decodifica `'false'`
 * como `true`. `encode` devolve um `boolean`. JSON Schema: `{type: 'boolean'}`.
 */
export function boolish(opts: BoolishOptions = {}): ZodBoolish {
  return withJsonSchema(
    z.union([
      z.boolean(),
      z.stringbool({
        truthy: opts.truthy ?? [...DEFAULT_TRUTHY],
        falsy: opts.falsy ?? [...DEFAULT_FALSY],
        case: 'insensitive',
      }),
    ]),
    {type: 'boolean'}
  );
}

// ---- delimited (REQ-012) ----

/** Separador usado por {@link delimited}. */
export type DelimitedOptions = {
  /** Separador dos itens. Default: `','`. */
  separator?: string;
};

/** Formato de transporte de {@link delimited}: uma string ou uma lista de strings. */
export type ZodDelimitedInput = z.ZodUnion<[z.ZodString, z.ZodArray<z.ZodString>]>;

/** Schema devolvido por {@link delimited}. */
export type ZodDelimited<T extends z.ZodType> = z.ZodCodec<ZodDelimitedInput, z.ZodArray<T>>;

const DELIMITED_INPUT: ZodDelimitedInput = z.union([z.string(), z.array(z.string())]);

/**
 * Lista separada por delimitador, como chega em query strings e headers.
 *
 * Decodifica `'a, b,,c'` e `['a,b', 'c']` para `['a', 'b', 'c']` (itens trimados, vazios descartados) e
 * valida cada item com `element`. `encode` refaz o `join` com o mesmo separador.
 *
 * No payload v2 do API Gateway, chaves repetidas (`?roles=a&roles=b`) já chegam unidas por vírgula — daí o
 * formato de entrada aceitar tanto `string` quanto `string[]`.
 */
export function delimited<T extends z.ZodType>(element: T, opts: DelimitedOptions = {}): ZodDelimited<T> {
  const {separator = ','} = opts;

  return z.codec(DELIMITED_INPUT, z.array(element), {
    decode: (value): z.input<T>[] =>
      (typeof value === 'string' ? value.split(separator) : value.flatMap(item => item.split(separator)))
        .map(item => item.trim())
        .filter(item => item.length > 0) as z.input<T>[],
    encode: (items): string => items.map(item => String(item)).join(separator),
  });
}

// ---- duration (REQ-013) ----

/** Formato de transporte de {@link duration}: string legível (`'5m'`) ou milissegundos. */
export type ZodDurationInput = z.ZodUnion<[z.ZodString, z.ZodNumber]>;

/** Schema devolvido por {@link duration}. */
export type ZodDuration = z.ZodCodec<ZodDurationInput, z.ZodNumber>;

const DURATION_INPUT: ZodDurationInput = z.union([z.string(), z.number()]);

/**
 * `ms(value)` tolerante: devolve `undefined` em vez de propagar erro.
 *
 * O `ms@2` devolve `undefined` para strings que não casam com o formato, mas **lança** para string vazia,
 * então as duas situações são normalizadas aqui.
 */
function parseDurationString(value: string): number | undefined {
  try {
    const parsed: number | undefined = ms(value as StringValue);

    return typeof parsed === 'number' && Number.isFinite(parsed) ? parsed : undefined;
  } catch {
    return undefined;
  }
}

/**
 * Duração legível (`'5m'`, `'1d'`, `'500ms'`) ou milissegundos, decodificada para um inteiro ≥ 0 em
 * milissegundos. String fora do formato gera a issue `Invalid duration: <valor>`.
 *
 * JSON Schema: `oneOf` entre string (com exemplos) e inteiro não negativo.
 */
export function duration(): ZodDuration {
  return withJsonSchema(
    z.codec(DURATION_INPUT, z.number().int().nonnegative(), {
      decode: (value, ctx): number => {
        if (typeof value === 'number') {
          return value;
        }

        const parsed = parseDurationString(value);

        if (parsed === undefined) {
          ctx.issues.push({code: 'custom', message: `Invalid duration: ${value}`, input: value});

          return z.NEVER;
        }

        return parsed;
      },
      encode: (millis): number => millis,
    }),
    {
      oneOf: [
        {type: 'string', examples: ['5m', '1d']},
        {type: 'integer', minimum: 0},
      ],
    }
  );
}

// ---- datetime / timestamp (REQ-014) ----

/** Formato de transporte de {@link datetime}: ISO 8601 (offset permitido) ou `Date` nativa. */
export type ZodDatetimeInput = z.ZodUnion<[z.ZodISODateTime, z.ZodDate]>;

/** Schema devolvido por {@link datetime}. */
export type ZodDatetime = z.ZodCodec<ZodDatetimeInput, z.ZodDate>;

/** Schema devolvido por {@link timestamp}: {@link datetime} com default `new Date()`. */
export type ZodTimestamp = z.ZodDefault<ZodDatetime>;

/**
 * Data ISO 8601 **com offset permitido** (`2024-03-01T12:00:00-03:00`) ou `Date` nativa, decodificada para
 * `Date`. `encode` devolve a ISO string em UTC.
 *
 * `z.iso.datetime()` rejeita offsets por padrão; aqui é usado `{offset: true}`.
 * JSON Schema: `{type: 'string', format: 'date-time'}`.
 */
export function datetime(): ZodDatetime {
  return withJsonSchema(
    z.codec(z.union([z.iso.datetime({offset: true}), z.date()]), z.date(), {
      decode: (value): Date => (value instanceof Date ? value : new Date(value)),
      encode: (date): string => date.toISOString(),
    }),
    {type: 'string', format: 'date-time'}
  );
}

/** {@link datetime} com default `new Date()`, avaliado a cada parse. */
export function timestamp(): ZodTimestamp {
  return datetime().default(() => new Date());
}

// ---- file (REQ-015) ----

/** Restrições de upload aplicadas por {@link file}. */
export type FileOptions = {
  /** Tamanho mínimo aceito, via `.min()`. */
  minSize?: ByteSize;
  /** Tamanho máximo aceito, via `.max()`. */
  maxSize?: ByteSize;
  /** Mimetypes aceitos, via `.mime()`. */
  mimetypes?: string[];
};

/**
 * `z.file()` com atalhos de tamanho e mimetype. Sem argumentos é equivalente a `z.file()`, e o schema
 * devolvido continua encadeável (`.min()`/`.max()`/`.mime()`).
 *
 * JSON Schema: `format: 'binary'`, gerado nativamente pelo Zod.
 */
export function file(opts: FileOptions = {}): z.ZodFile {
  let schema = z.file();

  if (opts.minSize !== undefined) {
    schema = schema.min(parseBytes(opts.minSize));
  }

  if (opts.maxSize !== undefined) {
    schema = schema.max(parseBytes(opts.maxSize));
  }

  if (opts.mimetypes) {
    schema = schema.mime(opts.mimetypes);
  }

  return schema;
}
