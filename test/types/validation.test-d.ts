// Tipagem do motor `v` (REQ-010..REQ-015): reexport do Zod, precedência das extensões e v.infer/input/output.
import {describe, expectTypeOf, it} from 'vitest';
import * as z from 'zod';

import type * as root from '#/index';
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
