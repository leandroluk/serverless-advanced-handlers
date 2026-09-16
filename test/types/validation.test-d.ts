// Tipagem do motor `v` (REQ-010..REQ-016): reexport do Zod, extensões, v.infer/input/output e `.meta()`.
import {describe, expectTypeOf, it} from 'vitest';
import * as z from 'zod';

import type * as root from '#/index';
import {resolveMeta, validateMeta} from '#/validation/meta';
import {v} from '#/validation/v';
import type {
  BoolishOptions,
  ByteSize,
  DelimitedOptions,
  ZodBoolish,
  ZodDatetime,
  ZodDelimited,
  ZodDuration,
  ZodTimestamp,
} from '#/validation/v';

describe('v reexports Zod (REQ-010)', () => {
  it('exposes the Zod builders with their real types', () => {
    expectTypeOf(v.string()).toEqualTypeOf<z.ZodString>();
    expectTypeOf(v.number()).toEqualTypeOf<z.ZodNumber>();
    expectTypeOf(v.uuid()).toEqualTypeOf<z.ZodUUID>();
    expectTypeOf(v.codec).toEqualTypeOf<typeof z.codec>();
  });

  it('exposes v.infer / v.input / v.output', () => {
    const schema = v.object({id: v.string(), age: v.coerce.number()});

    expectTypeOf<v.infer<typeof schema>>().toEqualTypeOf<{id: string; age: number}>();
    expectTypeOf<v.output<typeof schema>>().toEqualTypeOf<{id: string; age: number}>();
    expectTypeOf<v.input<typeof schema>>().toEqualTypeOf<{id: string; age: unknown}>();
  });

  it('is reachable as a namespace from the package root', () => {
    expectTypeOf<typeof root.v.boolish>().toEqualTypeOf<typeof v.boolish>();
    expectTypeOf<typeof root.v.string>().toEqualTypeOf<typeof z.string>();
  });
});

describe('extension precedence (REQ-010)', () => {
  it('v.file is the extension, not z.file', () => {
    expectTypeOf(v.file).not.toEqualTypeOf<typeof z.file>();
    expectTypeOf(v.file({minSize: 1, maxSize: '1MB', mimetypes: ['image/png']})).toEqualTypeOf<z.ZodFile>();

    // @ts-expect-error z.file não aceita as opções da extensão
    z.file({maxSize: '1MB'});
  });
});

describe('v.boolish (REQ-011)', () => {
  it('is a union of boolean and a string codec', () => {
    expectTypeOf(v.boolish()).toEqualTypeOf<ZodBoolish>();
    expectTypeOf<v.input<ZodBoolish>>().toEqualTypeOf<string | boolean>();
    expectTypeOf<v.output<ZodBoolish>>().toEqualTypeOf<boolean>();
    expectTypeOf<v.infer<ZodBoolish>>().toEqualTypeOf<boolean>();
  });

  it('types its options', () => {
    expectTypeOf<BoolishOptions>().toEqualTypeOf<{truthy?: string[]; falsy?: string[]}>();
    v.boolish({truthy: ['sim'], falsy: ['nao']});

    // @ts-expect-error truthy é uma lista de strings
    v.boolish({truthy: [1]});
    // @ts-expect-error chave desconhecida
    v.boolish({maybe: ['talvez']});
  });
});

describe('v.delimited (REQ-012)', () => {
  it('propagates the element schema to the decoded array', () => {
    const roles = v.delimited(v.enum(['admin', 'editor']));

    expectTypeOf(roles).toEqualTypeOf<ZodDelimited<z.ZodEnum<{admin: 'admin'; editor: 'editor'}>>>();
    expectTypeOf<v.output<typeof roles>>().toEqualTypeOf<('admin' | 'editor')[]>();
    expectTypeOf<v.input<typeof roles>>().toEqualTypeOf<string | string[]>();
  });

  it('keeps coercion of the element visible on the output', () => {
    const ids = v.delimited(v.coerce.number());

    expectTypeOf<v.output<typeof ids>>().toEqualTypeOf<number[]>();
  });

  it('types its options', () => {
    expectTypeOf<DelimitedOptions>().toEqualTypeOf<{separator?: string}>();
    v.delimited(v.string(), {separator: '|'});

    // @ts-expect-error separator é uma string
    v.delimited(v.string(), {separator: 1});
    // @ts-expect-error o primeiro argumento é um schema
    v.delimited('string');
  });
});

describe('v.duration (REQ-013)', () => {
  it('decodes string | number to a number of milliseconds', () => {
    expectTypeOf(v.duration()).toEqualTypeOf<ZodDuration>();
    expectTypeOf<v.input<ZodDuration>>().toEqualTypeOf<string | number>();
    expectTypeOf<v.output<ZodDuration>>().toEqualTypeOf<number>();
  });

  it('takes no arguments', () => {
    expectTypeOf(v.duration).parameters.toEqualTypeOf<[]>();

    // @ts-expect-error duration() não recebe opções
    v.duration({unit: 'ms'});
  });
});

describe('v.datetime / v.timestamp (REQ-014)', () => {
  it('decodes ISO string | Date to Date', () => {
    expectTypeOf(v.datetime()).toEqualTypeOf<ZodDatetime>();
    expectTypeOf<v.input<ZodDatetime>>().toEqualTypeOf<string | Date>();
    expectTypeOf<v.output<ZodDatetime>>().toEqualTypeOf<Date>();
  });

  it('makes the input optional on timestamp, because of the default', () => {
    expectTypeOf(v.timestamp()).toEqualTypeOf<ZodTimestamp>();
    expectTypeOf<v.input<ZodTimestamp>>().toEqualTypeOf<string | Date | undefined>();
    expectTypeOf<v.output<ZodTimestamp>>().toEqualTypeOf<Date>();
  });
});

describe('v.file / ByteSize / v.parseBytes (REQ-015)', () => {
  it('returns a ZodFile', () => {
    expectTypeOf(v.file()).toEqualTypeOf<z.ZodFile>();
    expectTypeOf<v.output<z.ZodFile>>().toEqualTypeOf<File>();
  });

  it('types ByteSize as a number or a <number><unit> template', () => {
    expectTypeOf<ByteSize>().toEqualTypeOf<number | `${number}${'B' | 'KB' | 'MB' | 'GB'}`>();
    expectTypeOf(v.parseBytes('2MB')).toEqualTypeOf<number>();
    expectTypeOf(v.parseBytes(1024)).toEqualTypeOf<number>();

    // @ts-expect-error TB não é uma unidade suportada
    v.parseBytes('2TB');
    // `${number}` do TS é tolerante (aceita `'2 '` como número), então `'2 MB'` passa no tipo e é o
    // `parseBytes` em runtime que rejeita — ver test/validation-extensions.spec.ts.
    v.parseBytes('2 MB');
    // @ts-expect-error maxSize é um ByteSize
    v.file({maxSize: '2TB'});
    // @ts-expect-error chave desconhecida
    v.file({size: '2MB'});
  });
});

describe('.meta() augmentation (REQ-016)', () => {
  it('types the two keys added by the framework', () => {
    expectTypeOf(v.string().meta({name: 'first_name', examples: ['John']})).toEqualTypeOf<z.ZodString>();
    expectTypeOf(v.string().meta()).toExtend<{name?: string; examples?: string[]} | undefined>();

    // @ts-expect-error name é uma string
    v.string().meta({name: 1});
  });

  it('keeps the native Zod keys typed', () => {
    const schema = v.string().meta({id: 'FirstName', title: 'Nome', description: 'Primeiro nome', deprecated: true});

    expectTypeOf(schema).toEqualTypeOf<z.ZodString>();

    // @ts-expect-error description é uma string
    v.string().meta({description: 1});
  });

  it('types examples by the $input of the schema (AC-7)', () => {
    expectTypeOf(v.number().meta({examples: [42]})).toEqualTypeOf<z.ZodNumber>();
    expectTypeOf(v.number().meta()).toExtend<{examples?: number[]} | undefined>();

    // @ts-expect-error examples de um v.number() é number[]
    v.number().meta({examples: ['x']});
  });

  it('types examples by the input side of a codec, not the output', () => {
    // `v.boolish()` decodifica `string | boolean` -> `boolean`; os exemplos documentam o transporte.
    expectTypeOf(v.boolish().meta({examples: ['1', true]})).toEqualTypeOf<ZodBoolish>();
    expectTypeOf(v.datetime().meta({examples: ['2024-01-01T00:00:00.000Z', new Date(0)]})).toEqualTypeOf<ZodDatetime>();

    // @ts-expect-error o input de v.datetime() é string | Date, não number
    v.datetime().meta({examples: [0]});
  });

  it('cannot reject unknown keys by type alone — o index signature do Zod deixa passar', () => {
    const meta = v.string().meta({nmae: 'first_name'});

    expectTypeOf(meta).toEqualTypeOf<z.ZodString>();
  });
});

describe('resolveMeta / validateMeta (REQ-017, REQ-018)', () => {
  it('types the resolved metadata by the schema it came from', () => {
    expectTypeOf(resolveMeta(v.number()).examples).toEqualTypeOf<number[] | undefined>();
    expectTypeOf(resolveMeta(v.number()).name).toEqualTypeOf<string | undefined>();
    expectTypeOf(resolveMeta(v.string()).deprecated).toEqualTypeOf<boolean | undefined>();
  });

  it('accepts any Zod schema, wrapped or not', () => {
    expectTypeOf(resolveMeta(v.string().optional())).toBeObject();
    expectTypeOf(resolveMeta(z.object({id: z.string()}))).toBeObject();

    // @ts-expect-error resolveMeta recebe um schema, não um valor
    resolveMeta('string');
  });

  it('takes an optional root path and returns void', () => {
    expectTypeOf(validateMeta).returns.toEqualTypeOf<void>();
    validateMeta(v.string());
    validateMeta(v.string(), 'UserEntity');

    // @ts-expect-error o caminho é uma string
    validateMeta(v.string(), 1);
  });

  it('is reachable from the package root (AC-8)', () => {
    expectTypeOf<typeof root.resolveMeta>().toEqualTypeOf<typeof resolveMeta>();
    expectTypeOf<typeof root.validateMeta>().toEqualTypeOf<typeof validateMeta>();
  });
});

describe('v.infer over a schema built with the extensions (REQ-010)', () => {
  const UserQuery = v.object({
    active: v.boolish(),
    roles: v.delimited(v.enum(['admin', 'editor'])),
    ttl: v.duration(),
    createdAt: v.timestamp(),
    avatar: v.file({maxSize: '1MB'}),
  });

  type UserQuery = v.infer<typeof UserQuery>;

  it('infers the decoded shape', () => {
    expectTypeOf<UserQuery>().toEqualTypeOf<{
      active: boolean;
      roles: ('admin' | 'editor')[];
      ttl: number;
      createdAt: Date;
      avatar: File;
    }>();
  });

  it('infers the transport shape', () => {
    expectTypeOf<v.input<typeof UserQuery>>().toEqualTypeOf<{
      active: string | boolean;
      roles: string | string[];
      ttl: string | number;
      createdAt?: string | Date | undefined;
      avatar: File;
    }>();
  });

  it('rejects wrong decoded values', () => {
    // @ts-expect-error active é boolean depois do decode
    const active: UserQuery['active'] = 'true';
    // @ts-expect-error createdAt é Date depois do decode
    const createdAt: UserQuery['createdAt'] = '2024-01-01T00:00:00.000Z';
    // @ts-expect-error ttl é number depois do decode
    const ttl: UserQuery['ttl'] = '5m';

    expectTypeOf(active).toEqualTypeOf<boolean>();
    expectTypeOf(createdAt).toEqualTypeOf<Date>();
    expectTypeOf(ttl).toEqualTypeOf<number>();
  });
});
