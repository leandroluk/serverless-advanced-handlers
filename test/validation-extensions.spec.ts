// Extensões primitivas do motor `v` (REQ-010..REQ-015): decode, encode, roundtrip e registry de JSON Schema.
import {describe, expect, it} from 'vitest';
import * as z from 'zod';

import {getJsonSchemaOverride} from '#/validation/extensions';
import * as root from '#/index';
import {v} from '#/validation/v';
import type {ByteSize} from '#/validation/v';

/**
 * A verificação end-to-end das representações JSON Schema (via `toOpenapiSchema`) é da T-003; aqui só o
 * registry interno é conferido — é ele que precisa estar populado para a T-003 funcionar.
 */
function overrideOf(schema: object): Readonly<Record<string, unknown>> | undefined {
  return getJsonSchemaOverride(schema);
}

describe('v.boolish (REQ-011)', () => {
  it('decodes native booleans', () => {
    expect(v.boolish().parse(true)).toBe(true);
    expect(v.boolish().parse(false)).toBe(false);
  });

  it('decodes the default truthy strings, case-insensitively', () => {
    const schema = v.boolish();
    const inputs = ['true', 'TRUE', 'True', '1', 'yes', 'YES', 'on', 'ON'];

    expect(inputs.map(input => [input, schema.parse(input)])).toEqual(inputs.map(input => [input, true]));
  });

  it('decodes the default falsy strings, case-insensitively', () => {
    const schema = v.boolish();
    const inputs = ['false', 'FALSE', 'False', '0', 'no', 'NO', 'off', 'OFF'];

    expect(inputs.map(input => [input, schema.parse(input)])).toEqual(inputs.map(input => [input, false]));
  });

  it('does not fall for the z.coerce.boolean trap', () => {
    expect(z.coerce.boolean().parse('false')).toBe(true);
    expect(v.boolish().parse('false')).toBe(false);
  });

  it('rejects values outside the lists with a readable issue', () => {
    const result = v.boolish().safeParse('banana');

    const issue = result.error?.issues[0] as {code: string; errors: {message: string}[][]} | undefined;

    expect(result.success).toBe(false);
    expect(issue?.code).toBe('invalid_union');
    expect((issue?.errors ?? []).flat().map(nested => nested.message)).toContain(
      'Invalid option: expected one of "true"|"1"|"yes"|"on"|"false"|"0"|"no"|"off"'
    );
  });

  it('rejects non-boolean, non-string inputs', () => {
    expect(v.boolish().safeParse(1).success).toBe(false);
    expect(v.boolish().safeParse(null).success).toBe(false);
    expect(v.boolish().safeParse(undefined).success).toBe(false);
    expect(v.boolish().safeParse({}).success).toBe(false);
  });

  it('keeps the contract list as default (Zod also accepts y/enabled; v does not)', () => {
    expect(v.boolish().safeParse('y').success).toBe(false);
    expect(v.boolish().safeParse('enabled').success).toBe(false);
  });

  it('encodes back to a boolean', () => {
    expect(z.encode(v.boolish(), true)).toBe(true);
    expect(z.encode(v.boolish(), false)).toBe(false);
  });

  it('overrides the defaults with custom truthy/falsy lists', () => {
    const schema = v.boolish({truthy: ['sim'], falsy: ['nao']});

    expect(schema.parse('sim')).toBe(true);
    expect(schema.parse('SIM')).toBe(true);
    expect(schema.parse('nao')).toBe(false);
    expect(schema.safeParse('true').success).toBe(false);
    expect(schema.safeParse('0').success).toBe(false);
    expect(schema.parse(true)).toBe(true);
  });

  it('overrides only the list that was informed', () => {
    const schema = v.boolish({truthy: ['sim']});

    expect(schema.parse('sim')).toBe(true);
    expect(schema.parse('off')).toBe(false);
    expect(schema.safeParse('yes').success).toBe(false);
  });

  it('registers {type: boolean} as its JSON Schema representation', () => {
    expect(overrideOf(v.boolish())).toEqual({type: 'boolean'});
    expect(overrideOf(v.boolish({truthy: ['sim']}))).toEqual({type: 'boolean'});
  });
});

describe('v.delimited (REQ-012)', () => {
  it('splits a single string by the separator', () => {
    expect(v.delimited(v.string()).parse('admin,editor')).toEqual(['admin', 'editor']);
  });

  it('flatMaps an array of strings', () => {
    expect(v.delimited(v.string()).parse(['a,b', 'c'])).toEqual(['a', 'b', 'c']);
  });

  it('trims items and drops the empty ones', () => {
    expect(v.delimited(v.string()).parse('a, b,,c ,')).toEqual(['a', 'b', 'c']);
    expect(v.delimited(v.string()).parse([' a , ', '', 'b'])).toEqual(['a', 'b']);
  });

  it('decodes an empty string to an empty array', () => {
    expect(v.delimited(v.string()).parse('')).toEqual([]);
  });

  it('validates each item with the element schema', () => {
    const roles = v.delimited(v.enum(['admin', 'editor']));

    expect(roles.parse('admin,editor')).toEqual(['admin', 'editor']);
    expect(roles.safeParse('admin,ghost').success).toBe(false);
  });

  it('pipes each item through the element schema (coercion)', () => {
    expect(v.delimited(v.coerce.number()).parse('1, 2,3')).toEqual([1, 2, 3]);
  });

  it('joins on encode', () => {
    expect(z.encode(v.delimited(v.string()), ['a', 'b'])).toBe('a,b');
  });

  it('is a bidirectional codec: encode(decode(x)) === x', () => {
    const schema = v.delimited(v.string());
    const transport = 'admin,editor';

    expect(z.encode(schema, schema.parse(transport))).toBe(transport);
  });

  it('uses "," by default and honours a custom separator', () => {
    const pipe = v.delimited(v.string(), {separator: '|'});

    expect(pipe.parse('a|b')).toEqual(['a', 'b']);
    expect(pipe.parse('a,b')).toEqual(['a,b']);
    expect(z.encode(pipe, ['a', 'b'])).toBe('a|b');
  });

  it('rejects inputs that are neither string nor string[]', () => {
    expect(v.delimited(v.string()).safeParse(42).success).toBe(false);
    expect(v.delimited(v.string()).safeParse([1, 2]).success).toBe(false);
  });
});

describe('v.duration (REQ-013)', () => {
  it('decodes readable durations to milliseconds', () => {
    expect(v.duration().parse('5m')).toBe(300_000);
    expect(v.duration().parse('1d')).toBe(86_400_000);
    expect(v.duration().parse('500ms')).toBe(500);
    expect(v.duration().parse('2 hours')).toBe(7_200_000);
  });

  it('accepts a non-negative integer of milliseconds as is', () => {
    expect(v.duration().parse(300_000)).toBe(300_000);
    expect(v.duration().parse(0)).toBe(0);
  });

  it('rejects an invalid duration string with a clear issue', () => {
    const result = v.duration().safeParse('banana');

    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.code).toBe('custom');
    expect(result.error?.issues[0]?.message).toBe('Invalid duration: banana');
  });

  it('rejects the empty string instead of letting ms throw', () => {
    const result = v.duration().safeParse('');

    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.message).toBe('Invalid duration: ');
  });

  it('rejects negative and non-integer durations', () => {
    expect(v.duration().safeParse('-5m').success).toBe(false);
    expect(v.duration().safeParse(-1).success).toBe(false);
    expect(v.duration().safeParse(1.5).success).toBe(false);
  });

  it('rejects inputs that are neither string nor number', () => {
    expect(v.duration().safeParse(null).success).toBe(false);
    expect(v.duration().safeParse(new Date()).success).toBe(false);
  });

  it('is a bidirectional codec: encode(decode(x)) === x for milliseconds', () => {
    const schema = v.duration();

    expect(z.encode(schema, schema.parse(300_000))).toBe(300_000);
    // A forma legível é normalizada para milissegundos no decode, então o encode devolve o número.
    expect(z.encode(schema, schema.parse('5m'))).toBe(300_000);
  });

  it('registers the oneOf JSON Schema representation', () => {
    expect(overrideOf(v.duration())).toEqual({
      oneOf: [
        {type: 'string', examples: ['5m', '1d']},
        {type: 'integer', minimum: 0},
      ],
    });
  });
});

describe('v.datetime (REQ-014)', () => {
  it('decodes an ISO 8601 string with offset', () => {
    expect(v.datetime().parse('2024-03-01T12:00:00-03:00')).toEqual(new Date('2024-03-01T15:00:00.000Z'));
  });

  it('decodes an ISO 8601 string in UTC', () => {
    expect(v.datetime().parse('2024-01-01T00:00:00.000Z')).toEqual(new Date('2024-01-01T00:00:00.000Z'));
  });

  it('decodes a native Date', () => {
    const date = new Date('2024-01-01T00:00:00.000Z');

    expect(v.datetime().parse(date)).toEqual(date);
  });

  it('rejects strings that are not ISO 8601', () => {
    expect(v.datetime().safeParse('banana').success).toBe(false);
    expect(v.datetime().safeParse('01/03/2024').success).toBe(false);
    expect(v.datetime().safeParse(1_700_000_000).success).toBe(false);
  });

  it('encodes back to an ISO string', () => {
    expect(z.encode(v.datetime(), new Date('2024-01-01T00:00:00.000Z'))).toBe('2024-01-01T00:00:00.000Z');
  });

  it('is a bidirectional codec: encode(decode(x)) === x for a UTC ISO string', () => {
    const schema = v.datetime();
    const transport = '2024-01-01T00:00:00.000Z';

    expect(z.encode(schema, schema.parse(transport))).toBe(transport);
  });

  it('registers the date-time JSON Schema representation', () => {
    expect(overrideOf(v.datetime())).toEqual({type: 'string', format: 'date-time'});
  });
});

describe('v.timestamp (REQ-014)', () => {
  it('defaults to the current date when the input is missing', () => {
    const before = Date.now();
    const parsed = v.timestamp().parse(undefined);
    const after = Date.now();

    expect(parsed).toBeInstanceOf(Date);
    expect(parsed.getTime()).toBeGreaterThanOrEqual(before);
    expect(parsed.getTime()).toBeLessThanOrEqual(after);
  });

  it('evaluates the default on every parse', () => {
    const schema = v.timestamp();

    expect(schema.parse(undefined).getTime()).toBeTypeOf('number');
    expect(schema.parse(undefined)).not.toBe(schema.parse(undefined));
  });

  it('still decodes explicit values like v.datetime', () => {
    expect(v.timestamp().parse('2024-03-01T12:00:00-03:00')).toEqual(new Date('2024-03-01T15:00:00.000Z'));
    expect(v.timestamp().safeParse('banana').success).toBe(false);
  });

  it('encodes back to an ISO string', () => {
    expect(z.encode(v.timestamp(), new Date('2024-01-01T00:00:00.000Z'))).toBe('2024-01-01T00:00:00.000Z');
  });

  it('keeps the date-time representation on the wrapped datetime', () => {
    const schema = v.timestamp();

    // O registry é por instância: o wrapper `.default()` não é a instância registrada, o codec interno é.
    expect(overrideOf(schema)).toBeUndefined();
    expect(overrideOf(schema.unwrap())).toEqual({type: 'string', format: 'date-time'});
  });
});

describe('v.parseBytes (REQ-015)', () => {
  it('passes numbers through', () => {
    expect(v.parseBytes(1024)).toBe(1024);
    expect(v.parseBytes(0)).toBe(0);
  });

  it('converts readable sizes using base 1024', () => {
    expect(v.parseBytes('1B')).toBe(1);
    expect(v.parseBytes('1KB')).toBe(1024);
    expect(v.parseBytes('2MB')).toBe(2_097_152);
    expect(v.parseBytes('1GB')).toBe(1_073_741_824);
  });

  it('accepts decimals and truncates to an integer', () => {
    expect(v.parseBytes('1.5KB')).toBe(1536);
    expect(v.parseBytes('0.5B')).toBe(0);
  });

  it('throws on a malformed size', () => {
    expect(() => v.parseBytes('2TB' as ByteSize)).toThrow('Invalid size: 2TB');
    expect(() => v.parseBytes('2 MB' as ByteSize)).toThrow('Invalid size: 2 MB');
    expect(() => v.parseBytes('MB' as ByteSize)).toThrow('Invalid size: MB');
  });
});

describe('v.file (REQ-015)', () => {
  const png = (bytes: number): File => new File(['x'.repeat(bytes)], 'a.png', {type: 'image/png'});

  it('is equivalent to z.file() when called without options', () => {
    const own = v.file();
    const native = z.file();

    expect(own.def.type).toBe(native.def.type);
    expect(own.def.checks ?? []).toHaveLength(0);
    expect(own.parse(png(10))).toBeInstanceOf(File);
    expect(own.safeParse('not a file').success).toBe(false);
  });

  it('applies minSize, maxSize and mimetypes as chained checks', () => {
    const schema = v.file({minSize: '1KB', maxSize: '2MB', mimetypes: ['image/png']});

    expect(schema.def.checks).toHaveLength(3);
    expect(schema.safeParse(png(2048)).success).toBe(true);
    expect(schema.safeParse(png(10)).success).toBe(false);
    expect(schema.safeParse(new File(['x'.repeat(2048)], 'a.txt', {type: 'text/plain'})).success).toBe(false);
  });

  it('applies each option independently', () => {
    expect(v.file({minSize: 1024}).def.checks).toHaveLength(1);
    expect(v.file({maxSize: 1024}).def.checks).toHaveLength(1);
    expect(v.file({mimetypes: ['image/png']}).def.checks).toHaveLength(1);
  });

  it('stays chainable', () => {
    const schema = v.file({minSize: '1KB'}).max(v.parseBytes('2MB'));

    expect(schema.def.checks).toHaveLength(2);
    expect(schema.safeParse(png(2048)).success).toBe(true);
  });

  it('generates format: binary in JSON Schema (native Zod, no override needed)', () => {
    expect(overrideOf(v.file())).toBeUndefined();
    expect(z.toJSONSchema(v.file(), {io: 'input', unrepresentable: 'any'})).toMatchObject({
      type: 'string',
      format: 'binary',
    });
  });
});

describe('v namespace (REQ-010)', () => {
  it('reexports the whole Zod surface', () => {
    expect(v.string).toBe(z.string);
    expect(v.object).toBe(z.object);
    expect(v.codec).toBe(z.codec);
    expect(v.iso).toBe(z.iso);
    expect(v.toJSONSchema).toBe(z.toJSONSchema);
    expect(v.NEVER).toBe(z.NEVER);
  });

  it('gives its own exports precedence over the reexported Zod ones', () => {
    // `file` é a única colisão real hoje: `v.file` é a extensão com opções, não `z.file`.
    expect(v.file).not.toBe(z.file);
    expect(v.file({maxSize: '1MB'}).def.checks).toHaveLength(1);
    // O `z.file` do Zod ignora as opções da extensão (nenhum check é aplicado).
    expect(z.file({maxSize: '1MB'} as never).def.checks ?? []).toHaveLength(0);
  });

  it('exposes exactly the documented extensions', () => {
    const extensions = ['boolish', 'delimited', 'duration', 'datetime', 'timestamp', 'file', 'parseBytes'];

    expect(extensions.filter(name => typeof (v as Record<string, unknown>)[name] !== 'function')).toEqual([]);
  });

  it('keeps the JSON Schema registry internal', () => {
    expect(v).not.toHaveProperty('withJsonSchema');
    expect(v).not.toHaveProperty('getJsonSchemaOverride');
  });

  it('is exported as a namespace from the package root', () => {
    expect(root.v).toBe(v);
  });
});
